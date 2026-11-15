const TOKEN_KEY = 'kincare_session_token';
const GEMINI_KEY_STORAGE = 'kincare_custom_gemini_key';

export function getStoredToken() {
  return localStorage.getItem(TOKEN_KEY) || '';
}

export function setStoredToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export function getCustomGeminiKey() {
  return localStorage.getItem(GEMINI_KEY_STORAGE) || '';
}

export function setCustomGeminiKey(key) {
  if (key) localStorage.setItem(GEMINI_KEY_STORAGE, key.trim());
  else localStorage.removeItem(GEMINI_KEY_STORAGE);
}

export async function apiFetch(endpoint, options = {}) {
  const token = getStoredToken();
  const geminiKey = getCustomGeminiKey();

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(geminiKey ? { 'x-gemini-api-key': geminiKey } : {}),
    ...(options.headers || {}),
  };

  const response = await fetch(endpoint, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `Request failed with status ${response.status}`);
  }
  return data;
}

/**
 * Speaks text aloud using the browser's native Web Speech Synthesis API for Senior Accessibility.
 */
export function speakText(text, lang = 'en-IN') {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return false;
  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = 0.92; // Slightly slower, clearer cadence for elderly comprehension
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
    return true;
  } catch {
    return false;
  }
}

/**
 * Generates and downloads an .ics calendar file for a medical appointment.
 */
export function downloadAppointmentICS(appt, elderName) {
  const cleanDate = (appt.date || '2026-11-20').replace(/-/g, '');
  const cleanTime = (appt.time || '10:30').replace(':', '') + '00';
  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//KinCare AI//Elderly Care Platform//EN',
    'BEGIN:VEVENT',
    `UID:${appt.id}@kincare.ai`,
    `DTSTAMP:${cleanDate}T080000Z`,
    `DTSTART:${cleanDate}T${cleanTime}`,
    `SUMMARY:Doctor Appointment: ${appt.doctorName} (${appt.specialty}) - ${elderName}`,
    `LOCATION:${appt.hospital} (${appt.mode})`,
    `DESCRIPTION:Accompanied by: ${appt.accompaniedBy}\\nPreparation: ${appt.preparationNotes}\\nQuestions: ${appt.elderQuestions || 'None'}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');

  const safeDoctorSlug = String(appt?.doctorName || 'Doctor')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-|-$/g, '') || 'Doctor';
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `KinCare-Appointment-${safeDoctorSlug}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Plays a gentle two-tone chime via the Web Audio API ahead of spoken voice reminders.
 */
export function playReminderChime() {
  if (typeof window === 'undefined') return false;
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return false;
  try {
    const ctx = new AudioCtx();
    const notes = [523.25, 659.25]; // C5 -> E5 gentle warm chime
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.18);
      gain.gain.setValueAtTime(0.001, ctx.currentTime + idx * 0.18);
      gain.gain.exponentialRampToValueAtTime(0.14, ctx.currentTime + idx * 0.18 + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.18 + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + idx * 0.18);
      osc.stop(ctx.currentTime + idx * 0.18 + 0.36);
    });
    setTimeout(() => {
      if (ctx && typeof ctx.close === 'function') {
        ctx.close().catch(() => {});
      }
    }, 800);
    return true;
  } catch {
    return false;
  }
}

/**
 * Downloads a structured CSV clinical & medication adherence summary for family/doctors.
 */
export function exportAdherenceReportCSV({
  elderProfile,
  medications = [],
  vitalsLog = [],
  appointments = [],
}) {
  const esc = (val) => `"${String(val ?? '').replace(/"/g, '""')}"`;
  const rows = [
    ['KinCare AI Care Report', elderProfile?.name || 'Patient', `Age: ${elderProfile?.age || ''}`, `Blood Group: ${elderProfile?.bloodGroup || ''}`],
    [],
    ['MEDICATION SCHEDULE & ADHERENCE'],
    ['Time', 'Slot', 'Medication', 'Dosage', 'Status', 'Meal Instruction', 'Stock Remaining', 'Purpose'],
    ...medications.map((m) => [
      m.scheduledTime,
      m.timeSlot,
      m.name,
      m.dosage,
      m.status,
      m.mealInstruction,
      m.stockRemaining,
      m.purpose,
    ]),
    [],
    ['RECENT VITALS & MOOD'],
    ['Recorded At', 'BP (mmHg)', 'Heart Rate (bpm)', 'Glucose (mg/dL)', 'Mood'],
    ...vitalsLog.map((v) => [
      v.recordedAt,
      `${v.systolic}/${v.diastolic}`,
      v.heartRate || 72,
      v.bloodSugarMgDl,
      v.mood,
    ]),
    [],
    ['MEDICAL APPOINTMENTS'],
    ['Date', 'Time', 'Doctor', 'Specialty', 'Hospital', 'Status', 'Patient Questions'],
    ...appointments.map((a) => [
      a.date,
      a.time,
      a.doctorName,
      a.specialty,
      a.hospital,
      a.status,
      a.elderQuestions,
    ]),
  ];

  const csvText = rows.map((r) => r.map(esc).join(',')).join('\r\n');
  const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `KinCare-Care-Report-${(elderProfile?.preferredName || 'Patient').replace(/\s+/g, '-')}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
