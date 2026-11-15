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
});
