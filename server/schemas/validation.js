import { z } from 'zod';
import { isDemoModeEnabled } from '../security/passcodeAuth.js';
import { sanitizeMemberPayload } from '../middleware/auth.js';

export const PasscodeSchema = z.object({
  passcode: z.string().min(4).max(12),
  memberId: z.string().optional(),
  email: z.string().optional(),
});

export const SignupSchema = z.object({
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

export const NewMemberSchema = z.object({
  name: z.string().min(2),
  role: z.enum(['elder', 'family', 'caretaker', 'caregiver']),
  relationship: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
  passcode: z.string().min(4).max(8),
});

export const MedicationSchema = z.object({
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

/**
 * Recomputes today's adherence bar in store.adherenceHistory.
 */
export function syncTodayAdherence(store) {
  const total = store.medications.length;
  const taken = store.medications.filter((m) => m.status === 'taken').length;
  if (store.adherenceHistory.length > 0) {
    const todayBar = store.adherenceHistory[store.adherenceHistory.length - 1];
    todayBar.total = total;
    todayBar.taken = taken;
    todayBar.adherencePct = total > 0 ? Math.round((taken / total) * 100) : 100;
  }
}

/**
 * Builds the full authenticated dashboard payload shared by /api/dashboard and auth routes.
 */
export function buildDashboardPayload(store, authenticatedMember) {
  const sanitizedMembers = store.careCircleMembers.map((m) => sanitizeMemberPayload(m));
  const totalMeds = store.medications.length;
  const takenMeds = store.medications.filter((m) => m.status === 'taken').length;
  const missedMeds = store.medications.filter((m) => m.status === 'missed').length;
  const upcomingMeds = store.medications.filter((m) => m.status === 'upcoming').length;
  const adherenceRate = totalMeds > 0 ? Math.round((takenMeds / totalMeds) * 100) : 100;

  return {
    authenticatedMember,
    demoMode: isDemoModeEnabled(),
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
  };
}

/**
 * Builds an unauthenticated /api/dashboard response with PHI fields redacted.
 */
export function buildUnauthenticatedDashboard(demoMode) {
  return {
    authenticatedMember: null,
    authRequired: true,
    demoMode,
    elderProfile: null,
    careCircleMembers: [],
    medications: [],
    routines: [],
    appointments: [],
    adherenceHistory: [],
    vitalsLog: [],
    autonomyDecisions: [],
    emailLogs: [],
    activityFeed: [],
    summaryMetrics: {
      totalMeds: 0,
      takenMeds: 0,
      missedMeds: 0,
      upcomingMeds: 0,
      adherenceRate: 0,
      lowStockCount: 0,
    },
  };
}

/**
 * Parses a positive integer or falls back cleanly.
 */
export function toPositiveInt(val, fallback) {
  const n = Number(val);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : fallback;
}
