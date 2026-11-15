import { getStore, persistState, addActivity } from '../data/store.js';
import { hashPasscode } from '../security/passcodeAuth.js';
import { dispatchProactiveEmail } from '../services/emailService.js';
import { generateIntelligentCaregiverAlert } from '../services/geminiService.js';
import {
  sanitizeMemberPayload,
  requireAuth,
  requireRoles,
  asyncHandler,
} from '../middleware/auth.js';
import {
  NewMemberSchema,
  MedicationSchema,
  syncTodayAdherence,
  toPositiveInt,
} from '../schemas/validation.js';

/**
 * Registers Care Circle member, medication, routine, appointment, vitals, and autonomy routes.
 */
export function registerCareRoutes(app) {
  // Care Circle Member Management
  app.post('/api/care-circle/members', requireAuth, requireRoles('elder', 'family'), (req, res) => {
    const parsed = NewMemberSchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ error: 'Invalid Care Circle member details', details: parsed.error.flatten() });
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
    res.status(201).json({ member: sanitizeMemberPayload(newMember) });
  });

  app.patch('/api/care-circle/members/:id', requireAuth, (req, res) => {
    const store = getStore();
    const member = store.careCircleMembers.find((m) => m.id === req.params.id);
    if (!member) {
      return res.status(404).json({ error: 'Care circle member not found' });
    }
    if (req.user.id !== member.id && !['elder', 'family'].includes(req.user.role)) {
      return res.status(403).json({
        error: 'Forbidden: only the member, elder, or family coordinator can edit preferences.',
      });
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
    res.json({ member: sanitizeMemberPayload(member) });
  });

  app.delete('/api/care-circle/members/:id', requireAuth, requireRoles('elder', 'family'), (req, res) => {
    const store = getStore();
    const idx = store.careCircleMembers.findIndex((m) => m.id === req.params.id);
    if (idx === -1) {
      return res.status(404).json({ error: 'Care circle member not found' });
    }
    if (store.careCircleMembers[idx].role === 'elder') {
      return res.status(400).json({ error: 'Primary elderly care profile cannot be deleted.' });
    }
    const [removed] = store.careCircleMembers.splice(idx, 1);
    addActivity(req.user.name, req.user.role, `Removed ${removed.name} from Care Circle access.`);
    persistState();
    res.json({ deleted: true, id: removed.id });
  });

  // Medication Schedule CRUD & Adherence Tracking
  app.post('/api/medications', requireAuth, (req, res) => {
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
    syncTodayAdherence(store);
    addActivity(
      newMed.lastActionBy,
      data.actorRole || req.user?.role || 'family',
      `Added medication "${newMed.name} (${newMed.dosage})" at ${newMed.scheduledTime}.`
    );
    persistState();
    res.status(201).json({ medication: newMed });
  });

  app.put(
    '/api/medications/:id',
    requireAuth,
    asyncHandler(async (req, res) => {
      const store = getStore();
      const idx = store.medications.findIndex((m) => m.id === req.params.id);
      if (idx === -1) {
        return res.status(404).json({ error: 'Medication not found' });
      }

      const current = store.medications[idx];
      const previousStatus = current.status;
      const { actorName: rawActorName, actorRole: rawActorRole, ...medPatch } = req.body || {};
      const actorName = rawActorName || req.user?.name || store.elderProfile.name;
      const actorRole = rawActorRole || req.user?.role || 'elder';

      const updated = {
        ...current,
        ...medPatch,
        id: current.id,
        lastUpdatedAt: new Date().toISOString(),
        lastActionBy: actorName,
      };

      if (medPatch.stockRemaining !== undefined) {
        const parsedStock = Number(medPatch.stockRemaining);
        updated.stockRemaining =
          Number.isFinite(parsedStock) && parsedStock >= 0 ? Math.trunc(parsedStock) : current.stockRemaining;
      }
      if (medPatch.refillThreshold !== undefined) {
        const parsedThreshold = Number(medPatch.refillThreshold);
        updated.refillThreshold =
          Number.isFinite(parsedThreshold) && parsedThreshold >= 1
            ? Math.trunc(parsedThreshold)
            : current.refillThreshold;
      }

      if (
        previousStatus !== 'taken' &&
        updated.status === 'taken' &&
        medPatch.stockRemaining === undefined &&
        updated.stockRemaining > 0
      ) {
        updated.stockRemaining = Math.max(0, updated.stockRemaining - 1);
      } else if (
        previousStatus === 'taken' &&
        updated.status !== 'taken' &&
        medPatch.stockRemaining === undefined
      ) {
        updated.stockRemaining = (Number(updated.stockRemaining) || 0) + 1;
      }

      store.medications[idx] = updated;
      store.medications.sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));
      syncTodayAdherence(store);

      let autoEmailDispatched = null;
      if (previousStatus !== updated.status) {
        addActivity(
          actorName,
          actorRole,
          `Marked ${updated.name} (${updated.dosage}) as ${updated.status.toUpperCase()}.`
        );

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
    })
  );

  app.delete('/api/medications/:id', requireAuth, (req, res) => {
    const store = getStore();
    const idx = store.medications.findIndex((m) => m.id === req.params.id);
    if (idx === -1) {
      return res.status(404).json({ error: 'Medication not found' });
    }
    const removed = store.medications.splice(idx, 1)[0];
    syncTodayAdherence(store);
    const actorName = req.query.actorName || req.user?.name || 'Care Circle Member';
    addActivity(actorName, req.user?.role || 'family', `Removed ${removed.name} from daily schedule.`);
    persistState();
    res.json({ deleted: true, id: removed.id });
  });

  // Daily Healthcare Routines CRUD
  app.post('/api/routines', requireAuth, (req, res) => {
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

  app.patch('/api/routines/:id', requireAuth, (req, res) => {
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

  app.delete('/api/routines/:id', requireAuth, (req, res) => {
    const store = getStore();
    const idx = store.routines.findIndex((r) => r.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Routine not found' });
    const removed = store.routines.splice(idx, 1)[0];
    persistState();
    res.json({ deleted: true, id: removed.id });
  });

  // Medical Appointments CRUD
  app.post('/api/appointments', requireAuth, (req, res) => {
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
    addActivity(
      actorName || 'Care Circle',
      'family',
      `Scheduled appointment with ${appointment.doctorName} on ${appointment.date}.`
    );
    persistState();
    res.status(201).json({ appointment });
  });

  app.put('/api/appointments/:id', requireAuth, (req, res) => {
    const store = getStore();
    const idx = store.appointments.findIndex((a) => a.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Appointment not found' });

    const { actorName, actorRole, ...apptPatch } = req.body || {};
    const updatedAppt = {
      ...store.appointments[idx],
      ...apptPatch,
      id: store.appointments[idx].id,
    };
    store.appointments[idx] = updatedAppt;
    store.appointments.sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')));
    addActivity(
      actorName || req.user?.name || 'Care Circle',
      actorRole || req.user?.role || 'family',
      `Updated appointment with ${updatedAppt.doctorName}.`
    );
    persistState();
    res.json({ appointment: updatedAppt });
  });

  app.delete('/api/appointments/:id', requireAuth, (req, res) => {
    const store = getStore();
    const idx = store.appointments.findIndex((a) => a.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Appointment not found' });
    const removed = store.appointments.splice(idx, 1)[0];
    addActivity('Care Circle', 'family', `Cancelled appointment with ${removed.doctorName}.`);
    persistState();
    res.json({ deleted: true, id: removed.id });
  });

  // Vitals & Elder Mood Log
  app.post('/api/vitals', requireAuth, (req, res) => {
    const {
      systolic = 125,
      diastolic = 80,
      heartRate = 72,
      bloodSugarMgDl = 110,
      mood = 'Comfortable',
      loggedBy,
    } = req.body || {};

    const store = getStore();
    const entry = {
      id: `vital-${Date.now()}`,
      recordedAt: new Date().toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      systolic: toPositiveInt(systolic, 125),
      diastolic: toPositiveInt(diastolic, 80),
      heartRate: toPositiveInt(heartRate, 72),
      bloodSugarMgDl: toPositiveInt(bloodSugarMgDl, 110),
      mood: String(mood || 'Comfortable').trim() || 'Comfortable',
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

  // Elder Autonomy & Decision-Making Endpoints
  app.post('/api/autonomy', requireAuth, (req, res) => {
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

  app.patch('/api/autonomy/:id', requireAuth, requireRoles('elder'), (req, res) => {
    const store = getStore();
    const item = store.autonomyDecisions.find((d) => d.id === req.params.id);
    if (!item) return res.status(404).json({ error: 'Autonomy proposal not found' });

    const { status, elderResponseNote } = req.body;
    if (status) item.status = status;
    if (elderResponseNote !== undefined) item.elderResponseNote = elderResponseNote;

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

  app.put('/api/elder-profile', requireAuth, requireRoles('elder', 'family'), (req, res) => {
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

    const primaryElder = store.careCircleMembers.find((m) => m.role === 'elder');
    if (primaryElder) {
      primaryElder.name = store.elderProfile.name;
      if (store.elderProfile.emergencyPhone) {
        primaryElder.phone = store.elderProfile.emergencyPhone;
      }
    }

    addActivity(
      req.user?.name || 'Care Circle',
      req.user?.role || 'family',
      `Updated patient medical profile for ${store.elderProfile.name}.`
    );
    persistState();
    res.json({ elderProfile: store.elderProfile });
  });

  app.put('/api/elder-profile/autonomy', requireAuth, requireRoles('elder', 'family'), (req, res) => {
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
}
