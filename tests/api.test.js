import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../server/app.js';
import { resetStoreToSeed } from '../server/data/store.js';

const app = createApp();

describe('KinCare AI — Elderly Care & Medication Management Platform API', () => {
  beforeEach(() => {
    resetStoreToSeed();
  });

  it('GET /api/health returns healthy status and Google services configuration', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
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
    const createRes = await request(app).post('/api/medications').send({
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
      .send({ status: 'taken', actorName: 'Ramesh Sharma' });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.medication.status).toBe('taken');
    expect(updateRes.body.medication.stockRemaining).toBe(29);

    // Delete medication
    const delRes = await request(app).delete(`/api/medications/${medId}`);
    expect(delRes.status).toBe(200);
    expect(delRes.body.deleted).toBe(true);
  });

  it('Automatically dispatches a proactive email reminder when a medication is marked missed', async () => {
    const dashBefore = await request(app).get('/api/dashboard');
    const targetMed = dashBefore.body.medications.find((m) => m.status === 'upcoming');

    const missRes = await request(app)
      .put(`/api/medications/${targetMed.id}`)
      .send({ status: 'missed', actorName: 'System Monitor' });

    expect(missRes.status).toBe(200);
    expect(missRes.body.autoEmailDispatched).toBeTruthy();
    expect(missRes.body.autoEmailDispatched.type).toBe('MISSED_MEDICATION');
  });

  it('Proactively dispatches email reminders for upcoming doses, missed meds, and appointments', async () => {
    const sendRes = await request(app).post('/api/reminders/send').send({
      type: 'UPCOMING_DOSE',
      customNote: 'Remember to drink a full glass of warm water.',
    });
    expect(sendRes.status).toBe(201);
    expect(sendRes.body.emailLog.type).toBe('UPCOMING_DOSE');
    expect(sendRes.body.emailLog.htmlBody).toContain('KinCare AI');

    const scanRes = await request(app).post('/api/reminders/auto-scan');
    expect(scanRes.status).toBe(200);
    expect(scanRes.body.dispatchedCount).toBeGreaterThanOrEqual(2);
  });

  it('Manages doctor appointments, daily healthcare routines, and elder autonomy consent', async () => {
    const apptRes = await request(app).post('/api/appointments').send({
      doctorName: 'Dr. R. K. Murthy',
      specialty: 'Geriatric Physiotherapy',
      hospital: 'Fortis Clinic',
      date: '2026-12-01',
      time: '11:00',
    });
    expect(apptRes.status).toBe(201);

    const consentRes = await request(app)
      .patch('/api/autonomy/consent-1')
      .send({ status: 'approved_by_elder', elderResponseNote: 'Approved for 9:00 PM.' });
    expect(consentRes.status).toBe(200);
    expect(consentRes.body.decision.status).toBe('approved_by_elder');
  });

  it('Provides AI medication interaction checking, prescription scanning, and care companion responses', async () => {
    const interRes = await request(app).post('/api/ai/interactions').send({});
    expect(interRes.status).toBe(200);
    expect(interRes.body.overallSafetyScore).toBeGreaterThan(70);
    expect(Array.isArray(interRes.body.interactions)).toBe(true);

    const scanRes = await request(app)
      .post('/api/ai/scan-prescription')
      .send({ text: 'Amlodipine 5mg Once Daily Morning after breakfast' });
    expect(scanRes.status).toBe(200);
    expect(scanRes.body.extractedMedications.length).toBeGreaterThan(0);

    const chatRes = await request(app)
      .post('/api/ai/companion')
      .send({ message: 'What is my next tablet today?', language: 'English' });
    expect(chatRes.status).toBe(200);
    expect(chatRes.body.reply).toBeTruthy();
  });

  it('POST /api/reminders/simulate-9am-missed detects unconfirmed 9:00 AM dose and triggers caregiver alert', async () => {
    const res = await request(app)
      .post('/api/reminders/simulate-9am-missed')
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
      .send({
        proposedBy: 'Priya Sharma (Family)',
        title: 'Shift Evening Walk to 5:30 PM',
        reason: 'Cooler evening weather for comfort.',
      });
    expect(proposalRes.status).toBe(201);
    const decisionId = proposalRes.body.decision.id;

    const resolveRes = await request(app)
      .patch(`/api/autonomy/${decisionId}`)
      .send({ status: 'approved_by_elder' });
    expect(resolveRes.status).toBe(200);
    expect(resolveRes.body.decision.status).toBe('approved_by_elder');

    const routineRes = await request(app)
      .post('/api/routines')
      .send({ title: 'Evening Joint Mobility Stretch', time: '17:30' });
    expect(routineRes.status).toBe(201);
    const routineId = routineRes.body.routine.id;

    const delRoutineRes = await request(app).delete(`/api/routines/${routineId}`);
    expect(delRoutineRes.status).toBe(200);
    expect(delRoutineRes.body.deleted).toBe(true);
  });

  it('persists authenticatedMember, updates elder profile, and manages care circle notification toggles & member removal', async () => {
    const authRes = await request(app)
      .post('/api/auth/verify-passcode')
      .send({ passcode: '654321' });
    expect(authRes.status).toBe(200);
    expect(authRes.body.token).toBeTruthy();

    const dashRes = await request(app)
      .get('/api/dashboard')
      .set('Authorization', `Bearer ${authRes.body.token}`);
    expect(dashRes.status).toBe(200);
    expect(dashRes.body.authenticatedMember).toBeTruthy();
    expect(dashRes.body.authenticatedMember.role).toBe('family');

    const profileRes = await request(app)
      .put('/api/elder-profile')
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
      .send({ notifyOnMissedMed: false });
    expect(patchMemberRes.status).toBe(200);
    expect(patchMemberRes.body.member.notifyOnMissedMed).toBe(false);

    const delMemberRes = await request(app).delete(`/api/care-circle/members/${memberId}`);
    expect(delMemberRes.status).toBe(200);
    expect(delMemberRes.body.deleted).toBe(true);
    expect(delMemberRes.body.id).toBe(memberId);
  });
});
