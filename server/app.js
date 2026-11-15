import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

import { getStore, persistState, resetStoreToSeed, addActivity, getDatabaseStatus } from './data/store.js';
import {
  verifyPasscode,
  hashPasscode,
  signSessionToken,
  isDemoModeEnabled,
} from './security/passcodeAuth.js';
import {
  sanitizeMemberPayload,
  sessionReaderMiddleware,
  requireAuth,
  errorHandler,
} from './middleware/auth.js';
import {
  PasscodeSchema,
  SignupSchema,
  buildDashboardPayload,
  buildUnauthenticatedDashboard,
} from './schemas/validation.js';
import { registerCareRoutes } from './routes/careRoutes.js';
import { registerAiAndReminderRoutes } from './routes/aiAndReminderRoutes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST_DIR = path.resolve(__dirname, '../dist');

function sanitizeEnvValue(val) {
  return String(val || '').trim().replace(/^["']|["']$/g, '').trim();
}

function issueAuthSession(store, member) {
  const sanitizedMember = sanitizeMemberPayload(member);
  const token = signSessionToken({
    id: member.id,
    name: member.name,
    role: member.role,
    permissions: member.permissions,
  });
  return {
    sanitizedMember,
    token,
    dashboard: buildDashboardPayload(store, sanitizedMember),
  };
}

/**
 * Configures and returns the Express application instance for KinCare AI.
 */
export function createApp() {
  const app = express();

  app.set('trust proxy', 1);

  // Security & Performance Middleware
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    })
  );
  app.use(cors());
  app.use(compression());
  app.use(express.json({ limit: '5mb' }));

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    validate: { xForwardedForHeader: false },
    message: { error: 'Too many authentication attempts, please try again shortly.' },
  });

  app.use(sessionReaderMiddleware);

  // 1. Health & Readiness Endpoint
  app.get('/api/health', (_req, res) => {
    const store = getStore();
    const dbStatus = getDatabaseStatus();
    const demoMode = isDemoModeEnabled();
    res.status(200).json({
      status: 'healthy',
      service: 'kincare-ai-elderly-care-platform',
      timestamp: new Date().toISOString(),
      database: dbStatus,
      security: {
        demoMode,
        authEnforced: true,
        sessionSecretConfigured: Boolean(sanitizeEnvValue(process.env.SESSION_SECRET)),
        enforceSessionSecret: process.env.ENFORCE_SESSION_SECRET === 'true',
      },
      googleServices: {
        geminiSdk: '@google/genai',
        model: sanitizeEnvValue(process.env.GEMINI_MODEL) || 'gemini-3.5-flash-lite',
        geminiConfigured: Boolean(sanitizeEnvValue(process.env.GEMINI_API_KEY)),
        resendConfigured: Boolean(sanitizeEnvValue(process.env.RESEND_API_KEY)),
        alertRecipient: sanitizeEnvValue(process.env.ALERT_EMAIL_RECIPIENT) || '9553943884pavan@gmail.com',
        cloudRunReady: true,
      },
      ecosystemStats: {
        medicationsCount: store.medications.length,
        appointmentsCount: store.appointments.length,
        careCircleMembersCount: store.careCircleMembers.length,
        proactiveEmailsSent: store.emailLogs.length,
      },
    });
  });

  // 2. Public Care Circle Roster (never exposes plaintext passcodes or hints)
  app.get('/api/public-members', (_req, res) => {
    const store = getStore();
    const members = store.careCircleMembers.map((m) => ({
      id: m.id,
      name: m.name,
      role: m.role,
      roleLabel: m.roleLabel,
      relationship: m.relationship,
      email: m.email,
      avatarColor: m.avatarColor,
    }));
    res.json({
      elderName: store.elderProfile.name,
      elderPreferredName: store.elderProfile.preferredName,
      demoMode: isDemoModeEnabled(),
      members,
    });
  });

  // 3. Passcode-Based Authentication & Account Registration
  app.post('/api/auth/verify-passcode', authLimiter, (req, res) => {
    const parsed = PasscodeSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Please enter a valid 4 to 8 digit passcode.' });
    }

    const { passcode, memberId, email } = parsed.data;
    const cleanEmail = String(email || '').trim().toLowerCase();
    const store = getStore();
    const demoMode = isDemoModeEnabled();

    let matchedMember = null;
    if (memberId) {
      const candidate = store.careCircleMembers.find((m) => m.id === memberId);
      if (candidate && verifyPasscode(passcode, candidate.passcodeHash)) {
        matchedMember = candidate;
      }
    } else if (cleanEmail) {
      matchedMember = store.careCircleMembers.find(
        (m) => m.email.toLowerCase() === cleanEmail && verifyPasscode(passcode, m.passcodeHash)
      );
    } else {
      matchedMember = store.careCircleMembers.find((m) => verifyPasscode(passcode, m.passcodeHash));
    }

    if (!matchedMember && demoMode && passcode === '000000') {
      matchedMember = store.careCircleMembers[0];
    }

    if (!matchedMember) {
      return res.status(401).json({
        error: demoMode
          ? 'Invalid email or passcode. Try demo passcodes: 123456 (Elderly Person), 654321 (Family Member), or 112233 (Caregiver).'
          : 'Invalid email or passcode.',
      });
    }

    addActivity(matchedMember.name, matchedMember.role, `Signed in via secure passcode (${matchedMember.roleLabel}).`);
    persistState();

    const { sanitizedMember, token, dashboard } = issueAuthSession(store, matchedMember);
    return res.json({
      authenticated: true,
      demoMode,
      token,
      member: sanitizedMember,
      dashboard,
    });
  });

  // Explicit Demo 1-Tap Sign-In (only allowed when DEMO_MODE is enabled)
  app.post('/api/auth/demo-login', authLimiter, (req, res) => {
    if (!isDemoModeEnabled()) {
      return res.status(403).json({
        error: 'Demo quick sign-in is disabled in production. Please sign in with your email and passcode.',
      });
    }

    const { memberId, role } = req.body || {};
    const store = getStore();
    let matchedMember = null;

    if (memberId) {
      matchedMember = store.careCircleMembers.find((m) => m.id === memberId);
    }
    if (!matchedMember && role) {
      const normalizedRole = role === 'caregiver' ? 'caretaker' : role;
      matchedMember = store.careCircleMembers.find((m) => m.role === normalizedRole);
    }
    if (!matchedMember) {
      matchedMember = store.careCircleMembers[0];
    }

    if (!matchedMember) {
      return res.status(404).json({ error: 'Demo member not found.' });
    }

    addActivity(matchedMember.name, matchedMember.role, `Signed in via Demo Mode (${matchedMember.roleLabel}).`);
    persistState();

    const { sanitizedMember, token, dashboard } = issueAuthSession(store, matchedMember);
    return res.json({
      authenticated: true,
      demoMode: true,
      token,
      member: sanitizedMember,
      dashboard,
    });
  });

  app.post('/api/auth/signup', authLimiter, (req, res) => {
    const parsed = SignupSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Please fill in your name, valid email address, and a 4 to 8 digit passcode.',
        details: parsed.error.flatten(),
      });
    }

    const data = parsed.data;
    const store = getStore();
    const normalizedRole = data.role === 'caregiver' ? 'caretaker' : data.role;

    const roleConfig = {
      elder: {
        roleLabel: 'Elderly Person (Centre of Care)',
        avatarColor: 'bg-teal-600',
        permissions: ['view', 'add', 'edit', 'delete', 'approve_autonomy', 'log_adherence'],
      },
      family: {
        roleLabel: `Family Member (${data.relationship || 'Family'})`,
        avatarColor: 'bg-indigo-600',
        permissions: ['view', 'add', 'edit', 'log_adherence', 'trigger_reminders'],
      },
      caretaker: {
        roleLabel: `Caregiver (${data.relationship || 'Nurse / Attendant'})`,
        avatarColor: 'bg-amber-600',
        permissions: ['view', 'add', 'edit', 'log_adherence', 'trigger_reminders'],
      },
    };

    if (data.mode === 'new_profile' && data.elderName.trim()) {
      const cleanElderName = data.elderName.trim();
      store.elderProfile.name = cleanElderName;
      store.elderProfile.preferredName = cleanElderName.split(' ')[0];
      if (data.elderAge && Number(data.elderAge) > 0) {
        store.elderProfile.age = Number(data.elderAge);
      }
      if (data.elderConditions.trim()) {
        store.elderProfile.conditions = data.elderConditions
          .split(',')
          .map((c) => c.trim())
          .filter(Boolean);
      }
      if (data.phone && normalizedRole === 'elder') {
        store.elderProfile.emergencyPhone = data.phone;
      }
      const primaryElder = store.careCircleMembers.find((m) => m.role === 'elder');
      if (primaryElder) {
        primaryElder.name = cleanElderName;
        if (data.phone && normalizedRole === 'elder') {
          primaryElder.phone = data.phone;
        }
      }
    }

    const cfg = roleConfig[normalizedRole];
    const newMember = {
      id: `member-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      name: data.name.trim(),
      role: normalizedRole,
      roleLabel: cfg.roleLabel,
      relationship: normalizedRole === 'elder' ? 'Self' : data.relationship || 'Care Circle',
      email: data.email.trim(),
      phone: data.phone || '+91 98450 00000',
      passcodeHash: hashPasscode(data.passcode),
      avatarColor: cfg.avatarColor,
      permissions: cfg.permissions,
      notifyOnMissedMed: true,
      notifyOnUpcomingDose: true,
      notifyOnAppointment: true,
    };

    if (normalizedRole === 'elder') {
      store.careCircleMembers.unshift(newMember);
    } else {
      store.careCircleMembers.push(newMember);
    }

    addActivity(
      newMember.name,
      newMember.role,
      `Created new account and joined Care Circle as ${newMember.roleLabel}.`
    );
    persistState();

    const { sanitizedMember, token, dashboard } = issueAuthSession(store, newMember);
    return res.status(201).json({
      authenticated: true,
      demoMode: isDemoModeEnabled(),
      token,
      member: sanitizedMember,
      elderProfile: store.elderProfile,
      dashboard,
    });
  });

  // 4. Unified Dashboard Data
  app.get('/api/dashboard', (req, res) => {
    const store = getStore();
    const demoMode = isDemoModeEnabled();
    const sanitizedMembers = store.careCircleMembers.map((m) => sanitizeMemberPayload(m));
    const authenticatedMember = req.user
      ? sanitizedMembers.find((m) => m.id === req.user.id) || null
      : null;

    if (!authenticatedMember) {
      return res.json(buildUnauthenticatedDashboard(demoMode));
    }

    return res.json(buildDashboardPayload(store, authenticatedMember));
  });

  // 5. Domain Route Modules
  registerCareRoutes(app);
  registerAiAndReminderRoutes(app);

  // 6. Reset Demo Data Endpoint (only enabled in Demo Mode)
  app.post('/api/reset-demo', requireAuth, (_req, res) => {
    if (!isDemoModeEnabled()) {
      return res.status(403).json({
        error: 'Demo reset is disabled in production.',
      });
    }
    const fresh = resetStoreToSeed();
    res.json({ reset: true, medicationsCount: fresh.medications.length });
  });

  // JSON 404 for unknown API endpoints
  app.use('/api/*', (_req, res) => {
    res.status(404).json({ error: 'API endpoint not found' });
  });

  // Serve built React SPA in production
  if (fs.existsSync(DIST_DIR)) {
    app.use(express.static(DIST_DIR));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api')) return next();
      res.sendFile(path.join(DIST_DIR, 'index.html'));
    });
  }

  app.use(errorHandler);

  return app;
}
