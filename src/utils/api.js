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

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `KinCare-Appointment-${appt.doctorName.replace(/\s+/g, '-')}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
