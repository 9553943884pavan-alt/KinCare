import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createApp } from '../server/app.js';
import {
  resetStoreToSeed,
  reopenDatabaseForTest,
  getDatabaseStatus,
} from '../server/data/store.js';
import {
  signSessionToken,
  isDemoModeEnabled,
  validateProductionSecret,
} from '../server/security/passcodeAuth.js';

const app = createApp();

let elderToken;
let familyToken;
let caretakerToken;

describe('KinCare AI — Elderly Care & Medication Management Platform API', () => {
  beforeEach(() => {
    resetStoreToSeed();
    elderToken = signSessionToken({
      id: 'member-elder-1',
      name: 'Ramesh Sharma',
      role: 'elder',
      permissions: ['view', 'add', 'edit', 'delete', 'approve_autonomy', 'log_adherence', 'trigger_reminders'],
    });
    familyToken = signSessionToken({
      id: 'member-family-1',
      name: 'Priya Sharma',
      role: 'family',
      permissions: ['view', 'add', 'edit', 'log_adherence', 'trigger_reminders'],
    });
    caretakerToken = signSessionToken({
      id: 'member-caretaker-1',
      name: 'Nurse Anita Rao',
      role: 'caretaker',
      permissions: ['view', 'add', 'edit', 'log_adherence', 'trigger_reminders'],
    });
  });

  it('GET /api/health returns healthy status, database status, and Google services configuration', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
    expect(res.body.database).toBeTruthy();
    expect(res.body.database.engine).toBe('sqlite');
    expect(res.body.security.authEnforced).toBe(true);
    expect(res.body.googleServices.geminiSdk).toBe('@google/genai');
    expect(res.body.googleServices.model).toBeTruthy();
    expect(res.body.googleServices.alertRecipient).toBe('9553943884pavan@gmail.com');
    expect(res.body.googleServices.cloudRunReady).toBe(true);
  });

  it('POST /api/auth/verify-passcode authenticates Elder, Family, and Caretaker passcodes securely', async () => {
    // 1. Valid Elder passcode (123456)
    const elderRes = await request(app)
      .post('/api/auth/verify-passcode')
      .send({ passcode: '123456' });
    expect(elderRes.status).toBe(200);
    expect(elderRes.body.authenticated).toBe(true);
    expect(elderRes.body.member.role).toBe('elder');
    expect(elderRes.body.member.passcodePlainHint).toBeUndefined();
    expect(elderRes.body.member.passcodeHash).toBeUndefined();
    expect(elderRes.body.token).toBeTruthy();

    // 2. Valid Family passcode (654321)
    const famRes = await request(app)
      .post('/api/auth/verify-passcode')
      .send({ passcode: '654321' });
    expect(famRes.status).toBe(200);
    expect(famRes.body.member.role).toBe('family');

    // 3. Invalid passcode rejected with 401
    const badRes = await request(app)
      .post('/api/auth/verify-passcode')
      .send({ passcode: '999999' });
    expect(badRes.status).toBe(401);
  });

  it('Supports full CRUD and adherence tracking on medication schedules', async () => {
    // Add new medication
    const createRes = await request(app)
      .post('/api/medications')
      .set('Authorization', `Bearer ${familyToken}`)
      .send({
        name: 'Aspirin Enteric Coated',
        dosage: '75 mg',
        scheduledTime: '14:00',
        timeSlot: 'Afternoon',
        mealInstruction: 'After lunch',
        purpose: 'Cardiovascular Support',
        pillColor: 'White',
        pillShape: 'Round Tablet',
      });
    expect(createRes.status).toBe(201);
    const medId = createRes.body.medication.id;

    // Mark medication as taken
    const updateRes = await request(app)
      .put(`/api/medications/${medId}`)
      .set('Authorization', `Bearer ${elderToken}`)
      .send({ status: 'taken', actorName: 'Ramesh Sharma' });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.medication.status).toBe('taken');
    expect(updateRes.body.medication.stockRemaining).toBe(29);

    // Delete medication
    const delRes = await request(app)
      .delete(`/api/medications/${medId}`)
      .set('Authorization', `Bearer ${familyToken}`);
    expect(delRes.status).toBe(200);
    expect(delRes.body.deleted).toBe(true);
  });

  it('Automatically dispatches a proactive email reminder when a medication is marked missed', async () => {
    const dashBefore = await request(app)
      .get('/api/dashboard')
      .set('Authorization', `Bearer ${familyToken}`);
    const targetMed = dashBefore.body.medications.find((m) => m.status === 'upcoming');

    const missRes = await request(app)
      .put(`/api/medications/${targetMed.id}`)
      .set('Authorization', `Bearer ${familyToken}`)
      .send({ status: 'missed', actorName: 'System Monitor' });

    expect(missRes.status).toBe(200);
    expect(missRes.body.autoEmailDispatched).toBeTruthy();
    expect(missRes.body.autoEmailDispatched.type).toBe('MISSED_MEDICATION');
  });

  it('Proactively dispatches email reminders for upcoming doses, missed meds, and appointments', async () => {
    const sendRes = await request(app)
      .post('/api/reminders/send')
      .set('Authorization', `Bearer ${familyToken}`)
      .send({
        type: 'UPCOMING_DOSE',
        customNote: 'Remember to drink a full glass of warm water.',
      });
    expect(sendRes.status).toBe(201);
    expect(sendRes.body.emailLog.type).toBe('UPCOMING_DOSE');
    expect(sendRes.body.emailLog.htmlBody).toContain('KinCare AI');

    const scanRes = await request(app)
      .post('/api/reminders/auto-scan')
      .set('Authorization', `Bearer ${familyToken}`);
    expect(scanRes.status).toBe(200);
    expect(scanRes.body.dispatchedCount).toBeGreaterThanOrEqual(2);
  });

  it('Manages doctor appointments, daily healthcare routines, and elder autonomy consent', async () => {
    const apptRes = await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${familyToken}`)
      .send({
        doctorName: 'Dr. R. K. Murthy',
        specialty: 'Geriatric Physiotherapy',
        hospital: 'Fortis Clinic',
        date: '2026-12-01',
        time: '11:00',
      });
    expect(apptRes.status).toBe(201);

    const consentRes = await request(app)
      .patch('/api/autonomy/consent-1')
      .set('Authorization', `Bearer ${elderToken}`)
      .send({ status: 'approved_by_elder', elderResponseNote: 'Approved for 9:00 PM.' });
    expect(consentRes.status).toBe(200);
    expect(consentRes.body.decision.status).toBe('approved_by_elder');
  });

  it('Provides AI medication interaction checking, prescription scanning, and care companion responses', async () => {
    const interRes = await request(app)
      .post('/api/ai/interactions')
      .set('Authorization', `Bearer ${caretakerToken}`)
      .send({});
    expect(interRes.status).toBe(200);
    expect(interRes.body.overallSafetyScore).toBeGreaterThan(70);
    expect(Array.isArray(interRes.body.interactions)).toBe(true);

    const scanRes = await request(app)
      .post('/api/ai/scan-prescription')
      .set('Authorization', `Bearer ${caretakerToken}`)
      .send({ text: 'Amlodipine 5mg Once Daily Morning after breakfast' });
    expect(scanRes.status).toBe(200);
    expect(scanRes.body.extractedMedications.length).toBeGreaterThan(0);

    const chatRes = await request(app)
      .post('/api/ai/companion')
      .set('Authorization', `Bearer ${elderToken}`)
      .send({ message: 'What is my next tablet today?', language: 'English' });
    expect(chatRes.status).toBe(200);
    expect(chatRes.body.reply).toBeTruthy();
  });

  it('POST /api/reminders/simulate-9am-missed detects unconfirmed 9:00 AM dose and triggers caregiver alert', async () => {
    const res = await request(app)
      .post('/api/reminders/simulate-9am-missed')
      .set('Authorization', `Bearer ${familyToken}`)
      .send({ force: true });
    expect(res.status).toBe(201);
    expect(res.body.simulated).toBe(true);
    expect(res.body.medication.scheduledTime).toBe('09:00');
    expect(res.body.medication.status).toBe('missed');
    expect(res.body.aiInsight).toBeTruthy();
    expect(res.body.emailLog.recipients).toContain('9553943884pavan@gmail.com');
    expect(res.body.emailLog.htmlBody).toContain('Intelligent Caregiver Notification Insights');
  });

  it('POST /api/auth/signup creates a new member account and allows email + passcode login', async () => {
    const signupRes = await request(app)
      .post('/api/auth/signup')
      .send({
        mode: 'join_circle',
        role: 'family',
        name: 'Pavan Kumar',
        email: 'pavan.family.test@example.com',
        phone: '+91 90000 11223',
        relationship: 'Son',
        passcode: '778899',
      });
    expect(signupRes.status).toBe(201);
    expect(signupRes.body.token).toBeTruthy();
    expect(signupRes.body.member.name).toBe('Pavan Kumar');
    expect(signupRes.body.member.role).toBe('family');
    expect(signupRes.body.member.email).toBe('pavan.family.test@example.com');
    expect(signupRes.body.member.passcodePlainHint).toBeUndefined();
    expect(signupRes.body.member.passcodeHash).toBeUndefined();

    const loginRes = await request(app)
      .post('/api/auth/verify-passcode')
      .send({
        email: 'pavan.family.test@example.com',
        passcode: '778899',
      });
    expect(loginRes.status).toBe(200);
    expect(loginRes.body.token).toBeTruthy();
    expect(loginRes.body.member.name).toBe('Pavan Kumar');
  });

  it('supports editing appointments, proposing/resolving elder autonomy decisions, and deleting routines', async () => {
    const createAppt = await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${familyToken}`)
      .send({
        doctorName: 'Dr. Kavita Iyer',
        specialty: 'Endocrinology',
        hospital: 'Fortis Care',
        date: '2026-11-28',
        time: '11:00',
      });
    expect(createAppt.status).toBe(201);
    const apptId = createAppt.body.appointment.id;

    const editAppt = await request(app)
      .put(`/api/appointments/${apptId}`)
      .set('Authorization', `Bearer ${familyToken}`)
      .send({
        doctorName: 'Dr. Kavita Iyer',
        time: '15:30',
        hospital: 'Apollo Main',
      });
    expect(editAppt.status).toBe(200);
    expect(editAppt.body.appointment.time).toBe('15:30');
    expect(editAppt.body.appointment.hospital).toBe('Apollo Main');

    const proposalRes = await request(app)
      .post('/api/autonomy')
      .set('Authorization', `Bearer ${familyToken}`)
      .send({
        proposedBy: 'Priya Sharma (Family)',
        title: 'Shift Evening Walk to 5:30 PM',
        reason: 'Cooler evening weather for comfort.',
      });
    expect(proposalRes.status).toBe(201);
    const decisionId = proposalRes.body.decision.id;

    const resolveRes = await request(app)
      .patch(`/api/autonomy/${decisionId}`)
      .set('Authorization', `Bearer ${elderToken}`)
      .send({ status: 'approved_by_elder' });
    expect(resolveRes.status).toBe(200);
    expect(resolveRes.body.decision.status).toBe('approved_by_elder');

    const routineRes = await request(app)
      .post('/api/routines')
      .set('Authorization', `Bearer ${familyToken}`)
      .send({ title: 'Evening Joint Mobility Stretch', time: '17:30' });
    expect(routineRes.status).toBe(201);
    const routineId = routineRes.body.routine.id;

    const delRoutineRes = await request(app)
      .delete(`/api/routines/${routineId}`)
      .set('Authorization', `Bearer ${familyToken}`);
    expect(delRoutineRes.status).toBe(200);
    expect(delRoutineRes.body.deleted).toBe(true);
  });

  it('persists authenticatedMember, updates elder profile, and manages care circle notification toggles & member removal', async () => {
    const authRes = await request(app)
      .post('/api/auth/verify-passcode')
      .send({ passcode: '654321' });
    expect(authRes.status).toBe(200);
    expect(authRes.body.token).toBeTruthy();

    const famToken = authRes.body.token;
    const dashRes = await request(app)
      .get('/api/dashboard')
      .set('Authorization', `Bearer ${famToken}`);
    expect(dashRes.status).toBe(200);
    expect(dashRes.body.authenticatedMember).toBeTruthy();
    expect(dashRes.body.authenticatedMember.role).toBe('family');

    const profileRes = await request(app)
      .put('/api/elder-profile')
      .set('Authorization', `Bearer ${famToken}`)
      .send({
        age: 75,
        bloodGroup: 'O+',
        conditions: 'Hypertension, Mild Knee Osteoarthritis',
        allergies: 'Penicillin',
      });
    expect(profileRes.status).toBe(200);
    expect(profileRes.body.elderProfile.age).toBe(75);
    expect(profileRes.body.elderProfile.conditions).toEqual([
      'Hypertension',
      'Mild Knee Osteoarthritis',
    ]);
    expect(profileRes.body.elderProfile.allergies).toEqual(['Penicillin']);

    const addMemberRes = await request(app)
      .post('/api/care-circle/members')
      .set('Authorization', `Bearer ${famToken}`)
      .send({
        name: 'Dr. Kavita Rao',
        role: 'caregiver',
        relationship: 'Visiting Nurse',
        email: 'kavita@example.com',
        phone: '+91 98000 00000',
        passcode: '778899',
      });
    expect(addMemberRes.status).toBe(201);
    const memberId = addMemberRes.body.member.id;

    const patchMemberRes = await request(app)
      .patch(`/api/care-circle/members/${memberId}`)
      .set('Authorization', `Bearer ${famToken}`)
      .send({ notifyOnMissedMed: false });
    expect(patchMemberRes.status).toBe(200);
    expect(patchMemberRes.body.member.notifyOnMissedMed).toBe(false);

    const delMemberRes = await request(app)
      .delete(`/api/care-circle/members/${memberId}`)
      .set('Authorization', `Bearer ${famToken}`);
    expect(delMemberRes.status).toBe(200);
    expect(delMemberRes.body.deleted).toBe(true);
    expect(delMemberRes.body.id).toBe(memberId);
  });

  it('restores stock on medication undo, escapes HTML in emails, survives empty arrays, and sanitizes vitals/profile sync', async () => {
    const dashBefore = await request(app)
      .get('/api/dashboard')
      .set('Authorization', `Bearer ${familyToken}`);
    const med = dashBefore.body.medications.find((m) => m.status === 'upcoming');
    const initialStock = med.stockRemaining;

    // 1. Taking reduces stock by 1, undoing back to upcoming restores stock by +1 and syncs adherenceHistory
    const takeRes = await request(app)
      .put(`/api/medications/${med.id}`)
      .set('Authorization', `Bearer ${elderToken}`)
      .send({ status: 'taken', actorName: 'Ramesh Sharma', actorRole: 'elder' });
    expect(takeRes.status).toBe(200);
    expect(takeRes.body.medication.stockRemaining).toBe(initialStock - 1);
    expect(takeRes.body.medication.actorName).toBeUndefined();

    const undoRes = await request(app)
      .put(`/api/medications/${med.id}`)
      .set('Authorization', `Bearer ${elderToken}`)
      .send({ status: 'upcoming', actorName: 'Ramesh Sharma' });
    expect(undoRes.status).toBe(200);
    expect(undoRes.body.medication.stockRemaining).toBe(initialStock);

    // 2. HTML escaping in proactive email body
    const xssRes = await request(app)
      .post('/api/reminders/send')
      .set('Authorization', `Bearer ${familyToken}`)
      .send({
        type: 'UPCOMING_DOSE',
        customNote: '<script>alert("xss")</script> Drink warm water',
      });
    expect(xssRes.status).toBe(201);
    expect(xssRes.body.emailLog.htmlBody).not.toContain('<script>');
    expect(xssRes.body.emailLog.htmlBody).toContain('&lt;script&gt;');

    // 3. Profile sync & non-numeric vitals sanitization
    const profRes = await request(app)
      .put('/api/elder-profile')
      .set('Authorization', `Bearer ${familyToken}`)
      .send({ name: 'Mohan Verma', emergencyPhone: '+91 99999 88888' });
    expect(profRes.status).toBe(200);
    const syncedDash = await request(app)
      .get('/api/dashboard')
      .set('Authorization', `Bearer ${familyToken}`);
    const elderMember = syncedDash.body.careCircleMembers.find((m) => m.role === 'elder');
    expect(elderMember.name).toBe('Mohan Verma');
    expect(elderMember.phone).toBe('+91 99999 88888');

    const badVitals = await request(app)
      .post('/api/vitals')
      .set('Authorization', `Bearer ${elderToken}`)
      .send({ systolic: 'not-a-number', diastolic: '', heartRate: -5, bloodSugarMgDl: 'abc' });
    expect(badVitals.status).toBe(201);
    expect(Number.isFinite(badVitals.body.vital.systolic)).toBe(true);
    expect(badVitals.body.vital.systolic).toBe(125);
    expect(badVitals.body.vital.bloodSugarMgDl).toBe(110);

    // 4. Deleting all medications and appointments still allows SOS and AI companion doctor query
    for (const m of syncedDash.body.medications) {
      await request(app)
        .delete(`/api/medications/${m.id}`)
        .set('Authorization', `Bearer ${elderToken}`);
    }
    for (const a of syncedDash.body.appointments) {
      await request(app)
        .delete(`/api/appointments/${a.id}`)
        .set('Authorization', `Bearer ${elderToken}`);
    }

    const emptySosRes = await request(app)
      .post('/api/sos')
      .set('Authorization', `Bearer ${elderToken}`)
      .send({});
    expect(emptySosRes.status).toBe(201);
    expect(emptySosRes.body.sosDispatched).toBe(true);

    const emptyApptChat = await request(app)
      .post('/api/ai/companion')
      .set('Authorization', `Bearer ${elderToken}`)
      .send({ message: 'When is my next doctor appointment?', language: 'English' });
    expect(emptyApptChat.status).toBe(200);
    expect(emptyApptChat.body.reply).toContain('no upcoming doctor appointments');

    // 5. Unknown API route returns JSON 404
    const notFoundRes = await request(app).get('/api/does-not-exist');
    expect(notFoundRes.status).toBe(404);
    expect(notFoundRes.body.error).toBe('API endpoint not found');
  });

  // Regression Test 1: Public members & unauthenticated dashboard do not leak passcodes or PHI
  it('never exposes demoPasscodeHint, passcodePlainHint, or PHI to unauthenticated callers', async () => {
    const pubRes = await request(app).get('/api/public-members');
    expect(pubRes.status).toBe(200);
    expect(Array.isArray(pubRes.body.members)).toBe(true);
    expect(pubRes.body.members.length).toBeGreaterThan(0);
    for (const m of pubRes.body.members) {
      expect(m.id).toBeTruthy();
      expect(m.name).toBeTruthy();
      expect(m.role).toBeTruthy();
      expect(m.email).toBeTruthy();
      expect(m.demoPasscodeHint).toBeUndefined();
      expect(m.passcodePlainHint).toBeUndefined();
      expect(m.passcodeHash).toBeUndefined();
    }

    const unauthDash = await request(app).get('/api/dashboard');
    expect(unauthDash.status).toBe(200);
    expect(unauthDash.body.authenticatedMember).toBeNull();
    expect(unauthDash.body.authRequired).toBe(true);
    expect(unauthDash.body.elderProfile).toBeNull();
    expect(unauthDash.body.medications).toEqual([]);
    expect(unauthDash.body.careCircleMembers).toEqual([]);
  });

  // Regression Test 2: Enforce authentication (401) and role authorization (403) on protected routes
  it('enforces authentication (401) and role-based authorization (403) across protected /api/* routes', async () => {
    const unauthenticatedRequests = [
      request(app).post('/api/medications').send({ name: 'Test Med', dosage: '5mg' }),
      request(app).put('/api/medications/med-1').send({ status: 'taken' }),
      request(app).delete('/api/medications/med-1'),
      request(app).post('/api/routines').send({ title: 'Walk' }),
      request(app).post('/api/appointments').send({ doctorName: 'Dr. Test', date: '2026-12-01' }),
      request(app).post('/api/vitals').send({ systolic: 120 }),
      request(app).patch('/api/autonomy/consent-1').send({ status: 'approved_by_elder' }),
      request(app).put('/api/elder-profile').send({ age: 75 }),
      request(app).delete('/api/care-circle/members/member-caretaker-1'),
      request(app).post('/api/reset-demo'),
    ];

    const responses = await Promise.all(unauthenticatedRequests);
    for (const res of responses) {
      expect(res.status).toBe(401);
    }

    // Caretaker cannot approve/decline elder autonomy or manage Care Circle members/profile
    const forbiddenAutonomy = await request(app)
      .patch('/api/autonomy/consent-1')
      .set('Authorization', `Bearer ${caretakerToken}`)
      .send({ status: 'approved_by_elder' });
    expect(forbiddenAutonomy.status).toBe(403);

    const forbiddenDeleteMember = await request(app)
      .delete('/api/care-circle/members/member-family-1')
      .set('Authorization', `Bearer ${caretakerToken}`);
    expect(forbiddenDeleteMember.status).toBe(403);

    const forbiddenProfile = await request(app)
      .put('/api/elder-profile')
      .set('Authorization', `Bearer ${caretakerToken}`)
      .send({ age: 80 });
    expect(forbiddenProfile.status).toBe(403);

    // Elder is authorized to resolve autonomy decisions
    const allowedAutonomy = await request(app)
      .patch('/api/autonomy/consent-1')
      .set('Authorization', `Bearer ${elderToken}`)
      .send({ status: 'approved_by_elder' });
    expect(allowedAutonomy.status).toBe(200);
  });

  // Regression Test 3: Enforce strong SESSION_SECRET and DEMO_MODE disabled by default in production
  it('requires strong SESSION_SECRET and gates demo shortcuts behind DEMO_MODE in production', async () => {
    expect(isDemoModeEnabled({ NODE_ENV: 'production' })).toBe(false);
    expect(isDemoModeEnabled({ NODE_ENV: 'production', DEMO_MODE: 'true' })).toBe(true);

    expect(() => validateProductionSecret({ NODE_ENV: 'production', SESSION_SECRET: '' })).toThrow();
    expect(() =>
      validateProductionSecret({
        NODE_ENV: 'production',
        SESSION_SECRET: 'kincare-super-secure-hmac-secret-2026',
      })
    ).toThrow();
    expect(
      validateProductionSecret({
        NODE_ENV: 'production',
        SESSION_SECRET: 'a9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0',
      })
    ).toBe(true);

    const prevDemoMode = process.env.DEMO_MODE;
    process.env.DEMO_MODE = 'false';
    try {
      const demoLoginRes = await request(app)
        .post('/api/auth/demo-login')
        .send({ memberId: 'member-elder-1' });
      expect(demoLoginRes.status).toBe(403);

      const universalCodeRes = await request(app)
        .post('/api/auth/verify-passcode')
        .send({ passcode: '000000' });
      expect(universalCodeRes.status).toBe(401);

      const resetRes = await request(app)
        .post('/api/reset-demo')
        .set('Authorization', `Bearer ${elderToken}`);
      expect(resetRes.status).toBe(403);
    } finally {
      if (prevDemoMode === undefined) {
        delete process.env.DEMO_MODE;
      } else {
        process.env.DEMO_MODE = prevDemoMode;
      }
    }
  });

  // Regression Test 4: Persistent SQLite WAL database survival across simulated server restarts
  it('persists medications and profile updates across simulated process restarts via SQLite WAL', async () => {
    const tempDbPath = path.join(os.tmpdir(), `kincare-persist-test-${Date.now()}.sqlite`);
    try {
      reopenDatabaseForTest(tempDbPath);
      resetStoreToSeed();

      const createMedRes = await request(app)
        .post('/api/medications')
        .set('Authorization', `Bearer ${elderToken}`)
        .send({
          name: 'Persistent Vitamin D3',
          dosage: '1000 IU',
          scheduledTime: '12:00',
          timeSlot: 'Afternoon',
        });
      expect(createMedRes.status).toBe(201);

      const profileUpdateRes = await request(app)
        .put('/api/elder-profile')
        .set('Authorization', `Bearer ${familyToken}`)
        .send({ location: 'Hyderabad, India' });
      expect(profileUpdateRes.status).toBe(200);

      // Simulate restart by closing SQLite handle and clearing in-memory cache
      reopenDatabaseForTest(tempDbPath);

      const dbStatus = getDatabaseStatus();
      expect(dbStatus.engine).toBe('sqlite');
      expect(dbStatus.persistent).toBe(true);

      const dashAfterRestart = await request(app)
        .get('/api/dashboard')
        .set('Authorization', `Bearer ${elderToken}`);
      expect(dashAfterRestart.status).toBe(200);
      expect(dashAfterRestart.body.elderProfile.location).toBe('Hyderabad, India');
      expect(
        dashAfterRestart.body.medications.some((m) => m.name === 'Persistent Vitamin D3')
      ).toBe(true);
    } finally {
      reopenDatabaseForTest(':memory:');
      resetStoreToSeed();
      for (const suffix of ['', '-wal', '-shm']) {
        const candidate = `${tempDbPath}${suffix}`;
        if (fs.existsSync(candidate)) {
          fs.unlinkSync(candidate);
        }
      }
    }
  });
});
