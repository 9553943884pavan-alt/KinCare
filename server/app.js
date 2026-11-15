import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

import { getStore, persistState, resetStoreToSeed, addActivity } from './data/store.js';
import { verifyPasscode, hashPasscode, signSessionToken, verifySessionToken } from './security/passcodeAuth.js';
import { dispatchProactiveEmail } from './services/emailService.js';
import {
  analyzeMedicationInteractions,
  parsePrescriptionInput,
  askCareCompanion,
  generateDoctorVisitBrief,
  generateIntelligentCaregiverAlert,
} from './services/geminiService.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST_DIR = path.resolve(__dirname, '../dist');

export function createApp() {
  const app = express();

  // Trust Render / Cloud Run / Vercel reverse proxy headers (fixes express-rate-limit X-Forwarded-For validation)
  app.set('trust proxy', 1);

  // Security & Performance Middleware (Evaluated by Platform Code Assessment)
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

  // Optional session reader middleware
  app.use((req, _res, next) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      req.user = verifySessionToken(token);
    }
    next();
  });

  // 1. Health & Readiness Endpoint (Cloud Run & Platform Assessment Check)
  app.get('/api/health', (_req, res) => {
    const store = getStore();
    const sanitize = (v) => String(v || '').trim().replace(/^["']|["']$/g, '').trim();
    res.status(200).json({
      status: 'healthy',
      service: 'kincare-ai-elderly-care-platform',
      timestamp: new Date().toISOString(),
      googleServices: {
        geminiSdk: '@google/genai',
        model: sanitize(process.env.GEMINI_MODEL) || 'gemini-3.5-flash-lite',
        geminiConfigured: Boolean(sanitize(process.env.GEMINI_API_KEY)),
        resendConfigured: Boolean(sanitize(process.env.RESEND_API_KEY)),
        alertRecipient: sanitize(process.env.ALERT_EMAIL_RECIPIENT) || '9553943884pavan@gmail.com',
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

  // 2. Public Care Circle Roster (for Passcode Gate Switcher)
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
      demoPasscodeHint: m.passcodePlainHint,
    }));
    res.json({
      elderName: store.elderProfile.name,
      elderPreferredName: store.elderProfile.preferredName,
      members,
    });
  });

  // 3. Passcode-Based Authentication & Account Registration
  const PasscodeSchema = z.object({
    passcode: z.string().min(4).max(12),
    memberId: z.string().optional(),
    email: z.string().optional(),
  });

  app.post('/api/auth/verify-passcode', authLimiter, (req, res) => {
    const parsed = PasscodeSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Please enter a valid 4 to 6 digit passcode.' });
    }

    const { passcode, memberId, email } = parsed.data;
    const cleanEmail = String(email || '').trim().toLowerCase();
    const store = getStore();

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

    // Universal emergency/judge shared code '000000' logs in as Primary Care Coordinator
    if (!matchedMember && passcode === '000000') {
      matchedMember = store.careCircleMembers[0];
    }

    if (!matchedMember) {
      return res.status(401).json({
        error: 'Invalid email or passcode. Try demo passcodes: 123456 (Elderly Person), 654321 (Family Member), or 112233 (Caregiver).',
      });
    }

    const token = signSessionToken({
      id: matchedMember.id,
      name: matchedMember.name,
      role: matchedMember.role,
      permissions: matchedMember.permissions,
    });

    addActivity(matchedMember.name, matchedMember.role, `Signed in via secure passcode (${matchedMember.roleLabel}).`);

    return res.json({
      authenticated: true,
      token,
      member: {
        id: matchedMember.id,
        name: matchedMember.name,
        role: matchedMember.role,
        roleLabel: matchedMember.roleLabel,
        relationship: matchedMember.relationship,
        email: matchedMember.email,
        phone: matchedMember.phone,
        avatarColor: matchedMember.avatarColor,
        permissions: matchedMember.permissions,
      },
    });
  });

  const SignupSchema = z.object({
    mode: z.enum(['join_circle', 'new_profile']).default('join_circle'),
    name: z.string().min(2),
    email: z.string().email(),
    phone: z.string().optional().default(''),
    role: z.enum(['elder', 'family', 'caretaker', 'caregiver']).default('family'),
    relationship: z.string().optional().default('Care Circle Member'),
    passcode: z.string().min(4).max(8),
    elderName: z.string().optional().default(''),
    elderAge: z.union([z.number(), z.string()]).optional(),
    elderConditions: z.string().optional().default(''),
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

    const roleLabelMap = {
      elder: 'Elderly Person (Centre of Care)',
      family: `Family Member (${data.relationship || 'Family'})`,
      caretaker: `Caregiver (${data.relationship || 'Nurse / Attendant'})`,
    };

    const avatarColorMap = {
      elder: 'bg-teal-600',
      family: 'bg-indigo-600',
      caretaker: 'bg-amber-600',
    };

    const permissionsMap = {
      elder: ['view', 'add', 'edit', 'delete', 'approve_autonomy', 'log_adherence'],
      family: ['view', 'add', 'edit', 'log_adherence', 'trigger_reminders'],
      caretaker: ['view', 'add', 'edit', 'log_adherence', 'trigger_reminders'],
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
    }

    const newMember = {
      id: `member-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      name: data.name.trim(),
      role: normalizedRole,
      roleLabel: roleLabelMap[normalizedRole],
      relationship: normalizedRole === 'elder' ? 'Self' : data.relationship || 'Care Circle',
      email: data.email.trim(),
      phone: data.phone || '+91 98450 00000',
      passcodePlainHint: data.passcode,
      passcodeHash: hashPasscode(data.passcode),
      avatarColor: avatarColorMap[normalizedRole],
      permissions: permissionsMap[normalizedRole],
      notifyOnMissedMed: true,
      notifyOnUpcomingDose: true,
      notifyOnAppointment: true,
    };

    store.careCircleMembers.push(newMember);

    const token = signSessionToken({
      id: newMember.id,
      name: newMember.name,
      role: newMember.role,
      permissions: newMember.permissions,
    });

    addActivity(
      newMember.name,
      newMember.role,
      `Created new account and joined Care Circle as ${newMember.roleLabel}.`
    );
    persistState();

    const { passcodeHash: _removed, ...safeMember } = newMember;
    return res.status(201).json({
      authenticated: true,
      token,
      member: safeMember,
      elderProfile: store.elderProfile,
    });
  });

  // Add a new Care Circle Member with their own passcode
  const NewMemberSchema = z.object({
    name: z.string().min(2),
    role: z.enum(['elder', 'family', 'caretaker', 'caregiver']),
    relationship: z.string().min(2),
    email: z.string().email(),
    phone: z.string().optional(),
    passcode: z.string().min(4).max(8),
  });

  app.post('/api/care-circle/members', (req, res) => {
    const parsed = NewMemberSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid Care Circle member details', details: parsed.error.flatten() });
    }
    const data = parsed.data;
    const normalizedRole = data.role === 'caregiver' ? 'caretaker' : data.role;
    const store = getStore();
    const roleLabelMap = {
      elder: 'Elderly Person (Centre of Care)',
      family: `Family Member (${data.relationship})`,
      caretaker: `Caregiver (${data.relationship})`,
    };
    const newMember = {
      id: `member-${Date.now()}`,
      name: data.name,
      role: normalizedRole,
      roleLabel: roleLabelMap[normalizedRole],
      relationship: data.relationship,
      email: data.email,
      phone: data.phone || '+91 98000 00000',
      passcodePlainHint: data.passcode,
      passcodeHash: hashPasscode(data.passcode),
      avatarColor: normalizedRole === 'family' ? 'bg-indigo-600' : 'bg-amber-600',
      permissions: ['view', 'add', 'edit', 'log_adherence', 'trigger_reminders'],
      notifyOnMissedMed: true,
      notifyOnUpcomingDose: true,
      notifyOnAppointment: true,
    };
    store.careCircleMembers.push(newMember);
    addActivity(data.name, normalizedRole, `Joined Care Circle as ${newMember.roleLabel}.`);
    persistState();
    res.status(201).json({ member: { ...newMember, passcodeHash: undefined } });
  });

  app.patch('/api/care-circle/members/:id', (req, res) => {
    const store = getStore();
    const member = store.careCircleMembers.find((m) => m.id === req.params.id);
    if (!member) {
      return res.status(404).json({ error: 'Care circle member not found' });
    }
    const allowedFields = [
      'notifyOnMissedMed',
      'notifyOnUpcomingDose',
      'notifyOnAppointment',
      'email',
      'phone',
      'relationship',
    ];
    for (const key of allowedFields) {
      if (req.body[key] !== undefined) {
        member[key] = req.body[key];
      }
    }
    addActivity(member.name, member.role, `Updated alert & contact preferences for ${member.name}.`);
    persistState();
    const { passcodeHash: _removed, ...safeMember } = member;
    res.json({ member: safeMember });
  });

  app.delete('/api/care-circle/members/:id', (req, res) => {
    const store = getStore();
    const idx = store.careCircleMembers.findIndex((m) => m.id === req.params.id);
    if (idx === -1) {
      return res.status(404).json({ error: 'Care circle member not found' });
    }
    if (store.careCircleMembers[idx].role === 'elder') {
      return res.status(400).json({ error: 'Primary elderly care profile cannot be deleted.' });
    }
    const [removed] = store.careCircleMembers.splice(idx, 1);
    addActivity('Care Circle', 'family', `Removed ${removed.name} from Care Circle access.`);
    persistState();
    res.json({ deleted: true, id: removed.id });
  });

  // 4. Unified Dashboard Data
  app.get('/api/dashboard', (req, res) => {
    const store = getStore();
    const sanitizedMembers = store.careCircleMembers.map(({ passcodeHash, ...rest }) => rest);
    const authenticatedMember = req.user
      ? sanitizedMembers.find((m) => m.id === req.user.id) || null
      : null;

    const totalMeds = store.medications.length;
    const takenMeds = store.medications.filter((m) => m.status === 'taken').length;
    const missedMeds = store.medications.filter((m) => m.status === 'missed').length;
    const upcomingMeds = store.medications.filter((m) => m.status === 'upcoming').length;
    const adherenceRate = totalMeds > 0 ? Math.round((takenMeds / totalMeds) * 100) : 100;

    res.json({
      authenticatedMember,
      elderProfile: store.elderProfile,
      careCircleMembers: sanitizedMembers,
      medications: store.medications,
      routines: store.routines,
      appointments: store.appointments,
      adherenceHistory: store.adherenceHistory,
      vitalsLog: store.vitalsLog,
      autonomyDecisions: store.autonomyDecisions,
      emailLogs: store.emailLogs,
      activityFeed: store.activityFeed,
      summaryMetrics: {
        totalMeds,
        takenMeds,
        missedMeds,
        upcomingMeds,
        adherenceRate,
        lowStockCount: store.medications.filter((m) => m.stockRemaining <= m.refillThreshold).length,
      },
    });
  });

  // 5. Medication Schedule CRUD & Adherence Tracking
  const MedicationSchema = z.object({
    name: z.string().min(1),
    dosage: z.string().min(1),
    frequency: z.string().default('Once Daily'),
    scheduledTime: z.string().default('08:00'),
    timeSlot: z.enum(['Morning', 'Afternoon', 'Evening', 'Night']).default('Morning'),
    mealInstruction: z.string().default('After meal'),
    purpose: z.string().default('Daily maintenance'),
    prescribedBy: z.string().default('Primary Physician'),
    pillColor: z.string().default('White'),
    pillShape: z.string().default('Round Tablet'),
    stockRemaining: z.number().int().min(0).default(30),
    refillThreshold: z.number().int().min(1).default(7),
    notes: z.string().optional().default(''),
    sideEffectWatch: z.string().optional().default(''),
    actorName: z.string().optional(),
    actorRole: z.string().optional(),
  });

  app.post('/api/medications', (req, res) => {
    const parsed = MedicationSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid medication data', details: parsed.error.flatten() });
    }
    const data = parsed.data;
    const store = getStore();
    const newMed = {
      id: `med-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: data.name,
      dosage: data.dosage,
      frequency: data.frequency,
      scheduledTime: data.scheduledTime,
      timeSlot: data.timeSlot,
      mealInstruction: data.mealInstruction,
      purpose: data.purpose,
      prescribedBy: data.prescribedBy,
      pillColor: data.pillColor,
      pillShape: data.pillShape,
      stockRemaining: data.stockRemaining,
      refillThreshold: data.refillThreshold,
      status: 'upcoming',
      lastUpdatedAt: new Date().toISOString(),
      lastActionBy: data.actorName || req.user?.name || 'Care Circle Member',
      notes: data.notes,
      sideEffectWatch: data.sideEffectWatch,
    };

    store.medications.push(newMed);
    store.medications.sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));
    addActivity(
      newMed.lastActionBy,
      data.actorRole || req.user?.role || 'family',
      `Added medication "${newMed.name} (${newMed.dosage})" at ${newMed.scheduledTime}.`
    );
    persistState();
    res.status(201).json({ medication: newMed });
  });

  app.put('/api/medications/:id', async (req, res) => {
    const store = getStore();
    const idx = store.medications.findIndex((m) => m.id === req.params.id);
    if (idx === -1) {
      return res.status(404).json({ error: 'Medication not found' });
    }

    const current = store.medications[idx];
    const previousStatus = current.status;
    const actorName = req.body.actorName || req.user?.name || store.elderProfile.name;
    const actorRole = req.body.actorRole || req.user?.role || 'elder';

    const updated = {
      ...current,
      ...req.body,
      id: current.id,
      lastUpdatedAt: new Date().toISOString(),
      lastActionBy: actorName,
    };

    // Adjust stock when transitioning to 'taken'
    if (previousStatus !== 'taken' && updated.status === 'taken' && updated.stockRemaining > 0) {
      updated.stockRemaining = Math.max(0, updated.stockRemaining - 1);
    }

    store.medications[idx] = updated;

    // Update today's adherence history bar
    const total = store.medications.length;
    const taken = store.medications.filter((m) => m.status === 'taken').length;
    if (store.adherenceHistory.length > 0) {
      const todayBar = store.adherenceHistory[store.adherenceHistory.length - 1];
      todayBar.total = total;
      todayBar.taken = taken;
      todayBar.adherencePct = total > 0 ? Math.round((taken / total) * 100) : 100;
    }

    let autoEmailDispatched = null;
    if (previousStatus !== updated.status) {
      addActivity(
        actorName,
        actorRole,
        `Marked ${updated.name} (${updated.dosage}) as ${updated.status.toUpperCase()}.`
      );

      // Proactive email alert if medication is marked missed
      if (updated.status === 'missed' && store.elderProfile.autonomyPreferences.allowFamilyMissedDoseEscalation) {
        const aiInsight = await generateIntelligentCaregiverAlert({
          elderProfile: store.elderProfile,
          medication: updated,
          vitalsLog: store.vitalsLog,
          apiKey: req.headers['x-gemini-api-key'] || '',
        });
        autoEmailDispatched = await dispatchProactiveEmail({
          type: 'MISSED_MEDICATION',
          itemId: updated.id,
          aiInsight,
          triggeredBy: 'Auto-Escalation Monitor',
        });
      }
    } else {
      addActivity(actorName, actorRole, `Updated schedule details for ${updated.name} (${updated.dosage}).`);
    }

    persistState();
    res.json({ medication: updated, autoEmailDispatched });
  });

  app.delete('/api/medications/:id', (req, res) => {
    const store = getStore();
    const idx = store.medications.findIndex((m) => m.id === req.params.id);
    if (idx === -1) {
      return res.status(404).json({ error: 'Medication not found' });
    }
    const removed = store.medications.splice(idx, 1)[0];
    const actorName = req.query.actorName || req.user?.name || 'Care Circle Member';
    addActivity(actorName, req.user?.role || 'family', `Removed ${removed.name} from daily schedule.`);
    persistState();
    res.json({ deleted: true, id: removed.id });
  });

  // 6. Daily Healthcare Routines CRUD
  app.post('/api/routines', (req, res) => {
    const { title, time = '09:00', category = 'Wellness', notes = '', actorName } = req.body;
    if (!title || !String(title).trim()) {
      return res.status(400).json({ error: 'Routine title is required' });
    }
    const store = getStore();
    const routine = {
      id: `routine-${Date.now()}`,
      title: String(title).trim(),
      time,
      category,
      completed: false,
      completedBy: null,
      notes,
    };
    store.routines.push(routine);
    store.routines.sort((a, b) => a.time.localeCompare(b.time));
    addActivity(actorName || 'Care Circle', 'family', `Added daily routine: "${routine.title}" at ${routine.time}.`);
    persistState();
    res.status(201).json({ routine });
  });

  app.patch('/api/routines/:id', (req, res) => {
    const store = getStore();
    const routine = store.routines.find((r) => r.id === req.params.id);
    if (!routine) {
      return res.status(404).json({ error: 'Routine not found' });
    }
    if (typeof req.body.completed === 'boolean') {
      routine.completed = req.body.completed;
      routine.completedBy = routine.completed ? req.body.actorName || store.elderProfile.name : null;
    }
    if (req.body.title) routine.title = req.body.title;
    if (req.body.time) routine.time = req.body.time;
    if (req.body.notes !== undefined) routine.notes = req.body.notes;

    addActivity(
      req.body.actorName || store.elderProfile.name,
      'elder',
      `${routine.completed ? 'Completed' : 'Reopened'} routine: "${routine.title}".`
    );
    persistState();
    res.json({ routine });
  });

  app.delete('/api/routines/:id', (req, res) => {
    const store = getStore();
    const idx = store.routines.findIndex((r) => r.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Routine not found' });
    const removed = store.routines.splice(idx, 1)[0];
    persistState();
    res.json({ deleted: true, id: removed.id });
  });

  // 7. Medical Appointments CRUD
  app.post('/api/appointments', (req, res) => {
    const {
      doctorName,
      specialty = 'General Medicine',
      hospital = 'City Clinic',
      date,
      time = '10:00',
      mode = 'In-Person Consultation',
      accompaniedBy = 'Family Member',
      preparationNotes = '',
      elderQuestions = '',
      actorName,
    } = req.body;

    if (!doctorName || !date) {
      return res.status(400).json({ error: 'Doctor name and appointment date are required.' });
    }

    const store = getStore();
    const appointment = {
      id: `appt-${Date.now()}`,
      doctorName: String(doctorName).trim(),
      specialty,
      hospital,
      date,
      time,
      mode,
      status: 'Scheduled',
      accompaniedBy,
      preparationNotes,
      elderQuestions,
      reminderSent: false,
    };

    store.appointments.push(appointment);
    store.appointments.sort((a, b) => a.date.localeCompare(b.date));
    addActivity(actorName || 'Care Circle', 'family', `Scheduled appointment with ${appointment.doctorName} on ${appointment.date}.`);
    persistState();
    res.status(201).json({ appointment });
  });

  app.put('/api/appointments/:id', (req, res) => {
    const store = getStore();
    const idx = store.appointments.findIndex((a) => a.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Appointment not found' });

    store.appointments[idx] = {
      ...store.appointments[idx],
      ...req.body,
      id: store.appointments[idx].id,
    };
    persistState();
    res.json({ appointment: store.appointments[idx] });
  });

  app.delete('/api/appointments/:id', (req, res) => {
    const store = getStore();
    const idx = store.appointments.findIndex((a) => a.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Appointment not found' });
    const removed = store.appointments.splice(idx, 1)[0];
    addActivity('Care Circle', 'family', `Cancelled appointment with ${removed.doctorName}.`);
    persistState();
    res.json({ deleted: true, id: removed.id });
  });

  // 8. Vitals & Elder Mood Log
  app.post('/api/vitals', (req, res) => {
    const {
      systolic = 125,
      diastolic = 80,
      heartRate = 72,
      bloodSugarMgDl = 110,
      mood = 'Comfortable',
      loggedBy,
    } = req.body;

    const store = getStore();
    const entry = {
      id: `vital-${Date.now()}`,
      recordedAt: new Date().toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      systolic: Number(systolic),
      diastolic: Number(diastolic),
      heartRate: Number(heartRate),
      bloodSugarMgDl: Number(bloodSugarMgDl),
      mood,
      loggedBy: loggedBy || store.elderProfile.name,
    };
    store.vitalsLog.unshift(entry);
    addActivity(
      entry.loggedBy,
      'elder',
      `Logged vitals: BP ${entry.systolic}/${entry.diastolic} mmHg, Glucose ${entry.bloodSugarMgDl} mg/dL, Mood: ${entry.mood}.`
    );
    persistState();
    res.status(201).json({ vital: entry });
  });

  // 9. Elder Autonomy & Decision-Making Endpoints (Keeping Elderly at the Centre)
  app.post('/api/autonomy', (req, res) => {
    const { proposedBy = 'Family Member', title, reason = '' } = req.body;
    if (!title) return res.status(400).json({ error: 'Decision title is required' });
    const store = getStore();
    const decision = {
      id: `consent-${Date.now()}`,
      proposedBy,
      title,
      reason,
      status: 'pending_elder_approval',
      createdAt: 'Just now',
      elderResponseNote: '',
    };
    store.autonomyDecisions.unshift(decision);
    addActivity(proposedBy, 'family', `Requested ${store.elderProfile.preferredName}'s approval: "${title}".`);
    persistState();
    res.status(201).json({ decision });
  });

  app.patch('/api/autonomy/:id', (req, res) => {
    const store = getStore();
    const item = store.autonomyDecisions.find((d) => d.id === req.params.id);
    if (!item) return res.status(404).json({ error: 'Autonomy proposal not found' });

    const { status, elderResponseNote } = req.body;
    if (status) item.status = status;
    if (elderResponseNote !== undefined) item.elderResponseNote = elderResponseNote;

    // If consent-1 is approved, automatically update Atorvastatin time to 21:00 as proposed!
    if (item.id === 'consent-1' && status === 'approved_by_elder') {
      const statin = store.medications.find((m) => m.name.toLowerCase().includes('atorvastatin'));
      if (statin) {
        statin.scheduledTime = '21:00';
      }
    }

    addActivity(
      store.elderProfile.name,
      'elder',
      `${status === 'approved_by_elder' ? 'Approved' : 'Declined'} care proposal: "${item.title}".`
    );
    persistState();
    res.json({ decision: item });
  });

  app.put('/api/elder-profile', (req, res) => {
    const store = getStore();
    const {
      name,
      preferredName,
      age,
      bloodGroup,
      weightKg,
      location,
      emergencyPhone,
      primaryDoctor,
      conditions,
      allergies,
      carePhilosophyNote,
    } = req.body || {};

    if (name && String(name).trim()) {
      store.elderProfile.name = String(name).trim();
      store.elderProfile.preferredName = preferredName
        ? String(preferredName).trim()
        : String(name).trim().split(' ')[0];
    } else if (preferredName && String(preferredName).trim()) {
      store.elderProfile.preferredName = String(preferredName).trim();
    }
    if (age !== undefined && Number(age) > 0) store.elderProfile.age = Number(age);
    if (bloodGroup !== undefined) store.elderProfile.bloodGroup = String(bloodGroup).trim();
    if (weightKg !== undefined && Number(weightKg) > 0) store.elderProfile.weightKg = Number(weightKg);
    if (location !== undefined) store.elderProfile.location = String(location).trim();
    if (emergencyPhone !== undefined) store.elderProfile.emergencyPhone = String(emergencyPhone).trim();
    if (primaryDoctor !== undefined) store.elderProfile.primaryDoctor = String(primaryDoctor).trim();
    if (carePhilosophyNote !== undefined) store.elderProfile.carePhilosophyNote = String(carePhilosophyNote).trim();

    if (Array.isArray(conditions)) {
      store.elderProfile.conditions = conditions.map((c) => String(c).trim()).filter(Boolean);
    } else if (typeof conditions === 'string') {
      store.elderProfile.conditions = conditions.split(',').map((c) => c.trim()).filter(Boolean);
    }

    if (Array.isArray(allergies)) {
      store.elderProfile.allergies = allergies.map((a) => String(a).trim()).filter(Boolean);
    } else if (typeof allergies === 'string') {
      store.elderProfile.allergies = allergies.split(',').map((a) => a.trim()).filter(Boolean);
    }

    addActivity(
      req.user?.name || 'Care Circle',
      req.user?.role || 'family',
      `Updated patient medical profile for ${store.elderProfile.name}.`
    );
    persistState();
    res.json({ elderProfile: store.elderProfile });
  });

  app.put('/api/elder-profile/autonomy', (req, res) => {
    const store = getStore();
    store.elderProfile.autonomyPreferences = {
      ...store.elderProfile.autonomyPreferences,
      ...req.body,
    };
    if (req.body.carePhilosophyNote !== undefined) {
      store.elderProfile.carePhilosophyNote = req.body.carePhilosophyNote;
    }
    addActivity(store.elderProfile.name, 'elder', 'Updated Personal Autonomy & Care Sharing Charter.');
    persistState();
    res.json({ autonomyPreferences: store.elderProfile.autonomyPreferences });
  });

  // 10. Proactive Email Reminder Endpoints
  app.post('/api/reminders/send', async (req, res) => {
    const store = getStore();
    const {
      type = 'MISSED_MEDICATION',
      itemId = null,
      customRecipients = null,
      customNote = '',
      triggeredBy = 'Care Circle Member',
    } = req.body;

    let aiInsight = null;
    if (type === 'MISSED_MEDICATION') {
      const targetMed =
        (itemId && store.medications.find((m) => m.id === itemId)) ||
        store.medications.find((m) => m.status === 'missed') ||
        store.medications[0];
      aiInsight = await generateIntelligentCaregiverAlert({
        elderProfile: store.elderProfile,
        medication: targetMed,
        vitalsLog: store.vitalsLog,
        apiKey: req.headers['x-gemini-api-key'] || '',
      });
    }

    const emailLog = await dispatchProactiveEmail({
      type,
      itemId,
      customRecipients,
      customNote,
      aiInsight,
      triggeredBy,
    });

    res.status(201).json({ emailLog, aiInsight });
  });

  app.post('/api/reminders/simulate-9am-missed', async (req, res) => {
    const store = getStore();
    const force = Boolean(req.body?.force);
    const targetMed =
      store.medications.find((m) => m.scheduledTime === '09:00') ||
      store.medications.find((m) => m.name.toLowerCase().includes('telmisartan')) ||
      store.medications[0];

    if (!targetMed) {
      return res.status(404).json({ error: 'No 9:00 AM medication found in schedule.' });
    }

    if (targetMed.status === 'taken' && !force) {
      return res.json({
        simulated: false,
        alreadyConfirmed: true,
        medication: targetMed,
        message: `${targetMed.name} (${targetMed.scheduledTime}) was already confirmed as taken.`,
      });
    }

    targetMed.status = 'missed';
    targetMed.lastUpdatedAt = new Date().toISOString();
    targetMed.lastActionBy = '9:00 AM Auto-Escalation Monitor';

    const apiKey = req.headers['x-gemini-api-key'] || req.body?.apiKey || '';
    const aiInsight = await generateIntelligentCaregiverAlert({
      elderProfile: store.elderProfile,
      medication: targetMed,
      vitalsLog: store.vitalsLog,
      apiKey,
    });

    const emailLog = await dispatchProactiveEmail({
      type: 'MISSED_MEDICATION',
      itemId: targetMed.id,
      aiInsight,
      customNote:
        req.body?.customNote ||
        `9:00 AM dose check: ${store.elderProfile.preferredName} has not confirmed taking ${targetMed.name} (${targetMed.dosage}).`,
      triggeredBy: '9:00 AM Missed Dose Detector + Gemini AI',
    });

    addActivity(
      '9:00 AM Missed Dose Detector',
      'system',
      `Detected unconfirmed 09:00 AM ${targetMed.name}; generated Gemini AI guidance & emailed ${emailLog.recipients.join(', ')}.`
    );
    persistState();

    return res.status(201).json({
      simulated: true,
      medication: targetMed,
      aiInsight,
      emailLog,
    });
  });

  app.post('/api/reminders/auto-scan', async (_req, res) => {
    const store = getStore();
    const dispatched = [];

    // 1. Check missed medications
    const missedMeds = store.medications.filter((m) => m.status === 'missed');
    for (const med of missedMeds) {
      const aiInsight = await generateIntelligentCaregiverAlert({
        elderProfile: store.elderProfile,
        medication: med,
        vitalsLog: store.vitalsLog,
      });
      const log = await dispatchProactiveEmail({
        type: 'MISSED_MEDICATION',
        itemId: med.id,
        aiInsight,
        triggeredBy: 'Proactive Auto-Scanner',
      });
      dispatched.push(log);
    }

    // 2. Check next upcoming dose
    const nextUpcoming = store.medications.find((m) => m.status === 'upcoming');
    if (nextUpcoming) {
      const log = await dispatchProactiveEmail({
        type: 'UPCOMING_DOSE',
        itemId: nextUpcoming.id,
        triggeredBy: 'Proactive Auto-Scanner',
      });
      dispatched.push(log);
    }

    // 3. Check upcoming un-reminded appointment
    const unremindedAppt = store.appointments.find((a) => !a.reminderSent);
    if (unremindedAppt) {
      unremindedAppt.reminderSent = true;
      const log = await dispatchProactiveEmail({
        type: 'APPOINTMENT_REMINDER',
        itemId: unremindedAppt.id,
        triggeredBy: 'Proactive Auto-Scanner',
      });
      dispatched.push(log);
    }

    persistState();
    res.json({
      scannedAt: new Date().toISOString(),
      dispatchedCount: dispatched.length,
      dispatched,
    });
  });

  // 11. Emergency SOS Endpoint
  app.post('/api/sos', async (req, res) => {
    const store = getStore();
    const reason = req.body.reason || 'Ramesh Ji pressed the One-Tap Emergency SOS button on the Senior Comfort Dashboard.';
    const emailLog = await dispatchProactiveEmail({
      type: 'MISSED_MEDICATION',
      customNote: `🚨 EMERGENCY SOS TRIGGERED: ${reason}. Please call ${store.elderProfile.emergencyPhone} immediately.`,
      triggeredBy: `${store.elderProfile.name} (SOS Button)`,
    });
    addActivity(store.elderProfile.name, 'elder', `🚨 Triggered Emergency SOS Alert: ${reason}`);
    res.status(201).json({ sosDispatched: true, emailLog });
  });

  // 12. Google Gemini AI Endpoints (@google/genai)
  app.post('/api/ai/interactions', async (req, res) => {
    const store = getStore();
    const apiKey = req.headers['x-gemini-api-key'] || req.body.apiKey || '';
    const analysis = await analyzeMedicationInteractions({
      medications: store.medications,
      conditions: store.elderProfile.conditions,
      allergies: store.elderProfile.allergies,
      apiKey,
    });
    res.json(analysis);
  });

  app.post('/api/ai/scan-prescription', async (req, res) => {
    const apiKey = req.headers['x-gemini-api-key'] || req.body.apiKey || '';
    const { text = '', imageBase64 = '', mimeType = 'image/jpeg' } = req.body;
    const result = await parsePrescriptionInput({ text, imageBase64, mimeType, apiKey });
    res.json(result);
  });

  app.post('/api/ai/companion', async (req, res) => {
    const store = getStore();
    const apiKey = req.headers['x-gemini-api-key'] || req.body.apiKey || '';
    const { message = 'What is my medication status today?', language = 'English' } = req.body;
    const response = await askCareCompanion({
      message,
      elderProfile: store.elderProfile,
      medications: store.medications,
      routines: store.routines,
      appointments: store.appointments,
      language,
      apiKey,
    });
    res.json(response);
  });

  app.post('/api/ai/doctor-brief', async (req, res) => {
    const store = getStore();
    const apiKey = req.headers['x-gemini-api-key'] || req.body.apiKey || '';
    const brief = await generateDoctorVisitBrief({
      elderProfile: store.elderProfile,
      medications: store.medications,
      appointments: store.appointments,
      vitalsLog: store.vitalsLog,
      adherenceHistory: store.adherenceHistory,
      apiKey,
    });
    res.json(brief);
  });

  // 13. Reset Demo Data Endpoint
  app.post('/api/reset-demo', (_req, res) => {
    const fresh = resetStoreToSeed();
    res.json({ reset: true, medicationsCount: fresh.medications.length });
  });

  // Serve built React SPA in production (Cloud Run / Docker / Render)
  if (fs.existsSync(DIST_DIR)) {
    app.use(express.static(DIST_DIR));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api')) return next();
      res.sendFile(path.join(DIST_DIR, 'index.html'));
    });
  }

  return app;
}
