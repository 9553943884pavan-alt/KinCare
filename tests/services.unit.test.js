import { describe, it, expect, vi } from 'vitest';
import {
  hashPasscode,
  verifyPasscode,
  signSessionToken,
  verifySessionToken,
  isDemoModeEnabled,
  validateProductionSecret,
} from '../server/security/passcodeAuth.js';
import {
  analyzeMedicationInteractions,
  parsePrescriptionInput,
  askCareCompanion,
  generateDoctorVisitBrief,
  generateIntelligentCaregiverAlert,
} from '../server/services/geminiService.js';
import { buildEmailTemplate } from '../server/services/emailService.js';

describe('passcodeAuth security utilities', () => {
  it('hashes and verifies passcodes correctly and rejects invalid inputs', () => {
    const hash = hashPasscode('246810');
    expect(hash).toContain(':');
    expect(verifyPasscode('246810', hash)).toBe(true);
    expect(verifyPasscode(' 246810 ', hash)).toBe(true);
    expect(verifyPasscode('999999', hash)).toBe(false);
    expect(verifyPasscode('', hash)).toBe(false);
    expect(verifyPasscode('246810', 'malformed-no-colon')).toBe(false);
    expect(verifyPasscode('246810', 'salt-only:')).toBe(false);
    expect(verifyPasscode('246810', null)).toBe(false);
  });

  it('signs and verifies HMAC session tokens and rejects tampered or expired tokens', () => {
    const token = signSessionToken({ id: 'member-1', role: 'elder', name: 'Raghav' });
    const decoded = verifySessionToken(token);
    expect(decoded).toBeTruthy();
    expect(decoded.id).toBe('member-1');
    expect(decoded.role).toBe('elder');
    expect(decoded.exp).toBeGreaterThan(decoded.iat);

    const [encoded, signature] = token.split('.');
    const flippedChar = signature[0] === 'a' ? 'b' : 'a';
    const tampered = `${encoded}.${flippedChar}${signature.slice(1)}`;
    expect(verifySessionToken(tampered)).toBeNull();
    expect(verifySessionToken('invalid-token')).toBeNull();
    expect(verifySessionToken('')).toBeNull();

    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(1_000_000);
    let expiredToken;
    try {
      expiredToken = signSessionToken({ id: 'member-expired', role: 'family' });
    } finally {
      nowSpy.mockRestore();
    }
    expect(verifySessionToken(expiredToken)).toBeNull();
  });

  it('evaluates demo mode flags and enforces production SESSION_SECRET strength', () => {
    expect(isDemoModeEnabled({ DEMO_MODE: 'true', NODE_ENV: 'production' })).toBe(true);
    expect(isDemoModeEnabled({ DEMO_MODE: '1', NODE_ENV: 'production' })).toBe(true);
    expect(isDemoModeEnabled({ DEMO_MODE: 'false', NODE_ENV: 'development' })).toBe(false);
    expect(isDemoModeEnabled({ DEMO_MODE: '0', NODE_ENV: 'test' })).toBe(false);
    expect(isDemoModeEnabled({ NODE_ENV: 'production' })).toBe(false);
    expect(isDemoModeEnabled({ NODE_ENV: 'development' })).toBe(true);

    expect(() =>
      validateProductionSecret({
        NODE_ENV: 'production',
        DEMO_MODE: 'false',
        SESSION_SECRET: 'short',
      })
    ).toThrow(/SESSION_SECRET/i);

    expect(() =>
      validateProductionSecret({
        NODE_ENV: 'production',
        DEMO_MODE: 'false',
        SESSION_SECRET: 'kincare-super-secure-hmac-secret-2026',
      })
    ).toThrow(/SESSION_SECRET/i);

    expect(
      validateProductionSecret({
        NODE_ENV: 'production',
        DEMO_MODE: 'false',
        SESSION_SECRET: 'a-very-strong-unique-production-hmac-secret-987654',
      })
    ).toBe(true);

    expect(
      validateProductionSecret({
        NODE_ENV: 'production',
        DEMO_MODE: 'true',
        SESSION_SECRET: '',
      })
    ).toBe(true);
  });
});

describe('geminiService deterministic AI fallbacks', () => {
  const sampleElder = {
    name: 'Raghav Rao',
    age: 76,
    conditions: ['Hypertension', 'Type 2 Diabetes'],
  };

  const sampleMeds = [
    {
      name: 'Amlodipine',
      dosage: '5mg',
      scheduledTime: '08:00',
      timeSlot: 'Morning',
      takenToday: true,
    },
    {
      name: 'Metformin',
      dosage: '500mg',
      scheduledTime: '13:00',
      timeSlot: 'Afternoon',
      takenToday: false,
    },
  ];

  it('analyzes medication interactions without live API credentials', async () => {
    const result = await analyzeMedicationInteractions({
      medications: sampleMeds,
      conditions: sampleElder.conditions,
      allergies: ['Penicillin'],
      apiKey: '',
    });

    expect(typeof result.overallSafetyScore).toBe('number');
    expect(result.safetyStatus).toBeTruthy();
    expect(Array.isArray(result.interactions)).toBe(true);
    expect(Array.isArray(result.elderFriendlyTips)).toBe(true);
    expect(result.engine).toBeTruthy();
  });

  it('parses known prescriptions, shorthand strings, and empty inputs safely', async () => {
    const amlo = await parsePrescriptionInput({ text: 'Tab Amlodipine 5mg OD morning', apiKey: '' });
    expect(Array.isArray(amlo.extractedMedications)).toBe(true);
    expect(amlo.extractedMedications.length).toBeGreaterThan(0);
    expect(amlo.plainLanguageSummary).toBeTruthy();

    const panto = await parsePrescriptionInput({ text: 'Pan 40 before breakfast', apiKey: '' });
    expect(panto.extractedMedications.some((m) => /pantoprazole/i.test(m.name))).toBe(true);

    const custom = await parsePrescriptionInput({ text: 'Atorvastatin 10mg HS', apiKey: '' });
    expect(custom.extractedMedications.length).toBeGreaterThan(0);

    const empty = await parsePrescriptionInput({ text: '', apiKey: '' });
    expect(Array.isArray(empty.extractedMedications)).toBe(true);
    expect(empty.plainLanguageSummary).toBeTruthy();
  });

  it('answers care companion queries in English and Hindi across intents', async () => {
    const nextMed = await askCareCompanion({
      message: 'Which medicine is next for me today?',
      elderProfile: sampleElder,
      medications: sampleMeds,
      language: 'English',
      apiKey: '',
    });
    expect(nextMed.reply).toBeTruthy();

    const doctorQ = await askCareCompanion({
      message: 'When is my next doctor appointment?',
      elderProfile: sampleElder,
      appointments: [
        {
          title: 'Cardiology Review',
          doctorName: 'Dr. Mehta',
          dateTime: '2026-11-20T10:00:00Z',
          clinic: 'Apollo Clinic',
        },
      ],
      language: 'Hindi',
      apiKey: '',
    });
    expect(doctorQ.reply).toContain('Namaste');

    const symptomQ = await askCareCompanion({
      message: 'I feel slight dizziness after standing up',
      elderProfile: sampleElder,
      medications: sampleMeds,
      apiKey: '',
    });
    expect(symptomQ.reply).toBeTruthy();
  });

  it('generates structured doctor visit briefs and caregiver alerts', async () => {
    const brief = await generateDoctorVisitBrief({
      elderProfile: sampleElder,
      medications: sampleMeds,
      appointments: [
        {
          title: 'Cardiology Review',
          doctorName: 'Dr. Mehta',
          dateTime: '2026-11-20T10:00:00Z',
          clinic: 'Apollo Clinic',
        },
      ],
      vitalsLog: [{ bloodPressure: '126/80', bloodSugar: '112 mg/dL', heartRate: '74 bpm' }],
      adherenceHistory: [{ adherenceRate: 94 }],
      apiKey: '',
    });
    expect(brief.patientName).toBe('Raghav Rao');
    expect(Array.isArray(brief.keyObservations)).toBe(true);
    expect(Array.isArray(brief.questionsForDoctor)).toBe(true);
    expect(brief.questionsForDoctor.length).toBeGreaterThan(0);

    const alert = await generateIntelligentCaregiverAlert({
      elderProfile: sampleElder,
      medication: sampleMeds[1],
      vitalsLog: [{ bloodPressure: '148/92' }],
      apiKey: '',
    });
    expect(alert.urgency).toBeTruthy();
    expect(alert.headline).toBeTruthy();
    expect(alert.guidance).toBeTruthy();
  });
});

describe('emailService template builder and XSS escaping', () => {
  const maliciousElder = {
    name: 'Raghav <script>alert("xss")</script>',
    email: 'elder@example.com',
  };

  it('generates templates for all notification types and escapes unsafe HTML', () => {
    const types = [
      'MISSED_MEDICATION',
      'UPCOMING_DOSE',
      'APPOINTMENT_REMINDER',
      'DAILY_CARE_DIGEST',
    ];

    for (const type of types) {
      const result = buildEmailTemplate({
        type,
        elderProfile: maliciousElder,
        item: {
          name: 'Amlodipine <img src=x onerror=alert(1)>',
          dosage: '5mg',
          scheduledTime: '08:00',
          title: 'Clinic <script>evil()</script>',
          doctorName: 'Dr. Mehta',
          dateTime: '2026-11-20 10:00',
          clinic: 'City Hospital',
          adherenceRate: 92,
          takenCount: 4,
          totalCount: 5,
        },
        customRecipients: ['care@example.com'],
        customNote: '<script>stealCookie()</script>',
      });

      expect(result.subject).toBeTruthy();
      expect(result.summary).toBeTruthy();
      expect(result.recipients).toContain('care@example.com');
      expect(result.htmlBody).not.toContain('<script>');
      expect(result.htmlBody).not.toContain('<img src=x onerror=alert(1)>');
      expect(result.htmlBody).toContain('&lt;script&gt;');
    }
  });
});
