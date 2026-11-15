import { getStore, persistState, addActivity } from '../data/store.js';
import { requireAuth, asyncHandler } from '../middleware/auth.js';
import { syncTodayAdherence } from '../schemas/validation.js';
import { dispatchProactiveEmail } from '../services/emailService.js';
import {
  analyzeMedicationInteractions,
  parsePrescriptionInput,
  askCareCompanion,
  generateDoctorVisitBrief,
  generateIntelligentCaregiverAlert,
} from '../services/geminiService.js';

/**
 * Registers Proactive Email Reminders, Emergency SOS, and Google Gemini AI routes.
 */
export function registerAiAndReminderRoutes(app) {
  // Proactive Email Reminder Endpoints
  app.post(
    '/api/reminders/send',
    requireAuth,
    asyncHandler(async (req, res) => {
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
    })
  );

  app.post(
    '/api/reminders/simulate-9am-missed',
    requireAuth,
    asyncHandler(async (req, res) => {
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
      syncTodayAdherence(store);

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
    })
  );

  app.post(
    '/api/reminders/auto-scan',
    requireAuth,
    asyncHandler(async (_req, res) => {
      const store = getStore();
      const dispatched = [];

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

      const nextUpcoming = store.medications.find((m) => m.status === 'upcoming');
      if (nextUpcoming) {
        const log = await dispatchProactiveEmail({
          type: 'UPCOMING_DOSE',
          itemId: nextUpcoming.id,
          triggeredBy: 'Proactive Auto-Scanner',
        });
        dispatched.push(log);
      }

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
    })
  );

  // Emergency SOS Endpoint
  app.post(
    '/api/sos',
    requireAuth,
    asyncHandler(async (req, res) => {
      const store = getStore();
      const reason =
        req.body.reason || 'Ramesh Ji pressed the One-Tap Emergency SOS button on the Senior Comfort Dashboard.';
      const emailLog = await dispatchProactiveEmail({
        type: 'MISSED_MEDICATION',
        customNote: `🚨 EMERGENCY SOS TRIGGERED: ${reason}. Please call ${store.elderProfile.emergencyPhone} immediately.`,
        triggeredBy: `${req.user.name} (SOS Button)`,
      });
      addActivity(req.user.name, req.user.role, `🚨 Triggered Emergency SOS Alert: ${reason}`);
      persistState();
      res.status(201).json({ sosDispatched: true, emailLog });
    })
  );

  // Google Gemini AI Endpoints (@google/genai)
  app.post(
    '/api/ai/interactions',
    requireAuth,
    asyncHandler(async (req, res) => {
      const store = getStore();
      const apiKey = req.headers['x-gemini-api-key'] || req.body.apiKey || '';
      const analysis = await analyzeMedicationInteractions({
        medications: store.medications,
        conditions: store.elderProfile.conditions,
        allergies: store.elderProfile.allergies,
        apiKey,
      });
      res.json(analysis);
    })
  );

  app.post(
    '/api/ai/scan-prescription',
    requireAuth,
    asyncHandler(async (req, res) => {
      const apiKey = req.headers['x-gemini-api-key'] || req.body.apiKey || '';
      const { text = '', imageBase64 = '', mimeType = 'image/jpeg' } = req.body;
      const result = await parsePrescriptionInput({ text, imageBase64, mimeType, apiKey });
      res.json(result);
    })
  );

  app.post(
    '/api/ai/companion',
    requireAuth,
    asyncHandler(async (req, res) => {
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
    })
  );

  app.post(
    '/api/ai/doctor-brief',
    requireAuth,
    asyncHandler(async (req, res) => {
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
    })
  );
}
