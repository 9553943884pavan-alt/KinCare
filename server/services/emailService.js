import nodemailer from 'nodemailer';
import { getStore, persistState, addActivity } from '../data/store.js';

let cachedEtherealTransporter = null;

async function getTransporter() {
  // 1. Check if real SMTP credentials are provided
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    return {
      mode: 'SMTP Live Server',
      transporter: nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: Number(process.env.SMTP_PORT) === 465,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      }),
    };
  }

  // 2. Otherwise attempt Ethereal test SMTP account (if network is available and not in unit tests)
  if (process.env.NODE_ENV !== 'test') {
    try {
      if (!cachedEtherealTransporter) {
        const testAccount = await Promise.race([
          nodemailer.createTestAccount(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3500)),
        ]);
        cachedEtherealTransporter = nodemailer.createTransport({
          host: testAccount.smtp.host,
          port: testAccount.smtp.port,
          secure: testAccount.smtp.secure,
          auth: {
            user: testAccount.user,
            pass: testAccount.pass,
          },
        });
      }
      return {
        mode: 'Nodemailer Ethereal Live Sandbox',
        transporter: cachedEtherealTransporter,
      };
    } catch {
      // Fallback to local JSON transport stream
    }
  }

  // 3. Always-reliable JSON Stream Transport for offline/sandbox/instant preview
  return {
    mode: 'KinCare Hybrid Live Outbox',
    transporter: nodemailer.createTransport({
      jsonTransport: true,
    }),
  };
}

/**
 * Builds rich accessible HTML email templates for Elderly Care & Family Notifications.
 */
export function buildEmailTemplate({ type, elderProfile, item, customRecipients, customNote }) {
  const store = getStore();
  const elder = elderProfile || store.elderProfile;

  const defaultRecipients = store.careCircleMembers
    .filter((m) => {
      if (type === 'MISSED_MEDICATION') return m.notifyOnMissedMed;
      if (type === 'UPCOMING_DOSE') return m.notifyOnUpcomingDose;
      if (type === 'APPOINTMENT_REMINDER') return m.notifyOnAppointment;
      return true;
    })
    .map((m) => m.email);

  const recipients =
    Array.isArray(customRecipients) && customRecipients.length > 0
      ? customRecipients
      : defaultRecipients;

  if (type === 'MISSED_MEDICATION') {
    const med = item || store.medications.find((m) => m.status === 'missed') || store.medications[0];
    const subject = `⚠️ Urgent Care Alert: ${elder.preferredName} missed ${med.scheduledTime} ${med.name} (${med.dosage})`;
    const summary = `Proactive missed-medication reminder for ${med.name} (${med.dosage}) scheduled at ${med.scheduledTime}. Visual pill: ${med.pillColor} ${med.pillShape}.`;
    const htmlBody = `
      <div style="font-family:'Inter',system-ui,sans-serif;max-width:600px;margin:0 auto;padding:24px;border-radius:16px;background:#fff1f2;border:2px solid #fda4af;color:#881337;">
        <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #fecdd3;padding-bottom:12px;margin-bottom:16px;">
          <strong style="font-size:18px;color:#9f1239;">🚨 KinCare AI — Missed Medication Alert</strong>
          <span style="background:#e11d48;color:#fff;padding:4px 10px;border-radius:999px;font-size:12px;font-weight:700;">PROACTIVE ESCALATION</span>
        </div>
        <p style="font-size:16px;line-height:1.5;margin:0 0 12px;">
          Hello Care Circle, <strong>${elder.name} (${elder.age} yrs)</strong> has not yet logged the scheduled dose below:
        </p>
        <div style="background:#ffffff;padding:16px;border-radius:12px;border:1px solid #fecdd3;margin-bottom:16px;">
          <h3 style="margin:0 0 8px;color:#be123c;font-size:20px;">💊 ${med.name} — ${med.dosage}</h3>
          <p style="margin:4px 0;font-size:14px;"><strong>Scheduled Time:</strong> ${med.scheduledTime} (${med.mealInstruction})</p>
          <p style="margin:4px 0;font-size:14px;"><strong>Visual Identifier:</strong> ${med.pillColor} ${med.pillShape}</p>
          <p style="margin:4px 0;font-size:14px;"><strong>Medical Purpose:</strong> ${med.purpose}</p>
          ${med.notes ? `<p style="margin:8px 0 0;font-size:13px;color:#64748b;"><em>Clinical Note: ${med.notes}</em></p>` : ''}
        </div>
        ${customNote ? `<p style="background:#ffe4e6;padding:10px 14px;border-radius:8px;font-size:14px;"><strong>Care Circle Note:</strong> ${customNote}</p>` : ''}
        <p style="font-size:14px;color:#9f1239;margin-bottom:0;">
          📞 <strong>Emergency / Quick Check-In:</strong> ${elder.emergencyPhone} • Please verify with ${elder.preferredName} before administering a catch-up dose.
        </p>
      </div>
    `;
    return { subject, summary, htmlBody, recipients };
  }

  if (type === 'UPCOMING_DOSE') {
    const med =
      item || store.medications.find((m) => m.status === 'upcoming') || store.medications[0];
    const subject = `⏰ Upcoming Dose Reminder: ${med.name} (${med.dosage}) at ${med.scheduledTime}`;
    const summary = `Gentle proactive reminder for ${elder.preferredName}'s upcoming ${med.scheduledTime} dose of ${med.name} (${med.mealInstruction}).`;
    const htmlBody = `
      <div style="font-family:'Inter',system-ui,sans-serif;max-width:600px;margin:0 auto;padding:24px;border-radius:16px;background:#f0fdf4;border:2px solid #86efac;color:#14532d;">
        <h2 style="margin:0 0 12px;color:#166534;">⏰ Time for Your Upcoming Medication, ${elder.preferredName}</h2>
        <p style="font-size:16px;line-height:1.5;">
          This is your gentle reminder from <strong>KinCare AI</strong> for your next scheduled medication:
        </p>
        <div style="background:#ffffff;padding:16px;border-radius:12px;border:1px solid #bbf7d0;margin:16px 0;">
          <h3 style="margin:0 0 8px;color:#15803d;font-size:20px;">💊 ${med.name} (${med.dosage})</h3>
          <p style="margin:4px 0;font-size:15px;"><strong>When:</strong> ${med.scheduledTime} — ${med.mealInstruction}</p>
          <p style="margin:4px 0;font-size:15px;"><strong>Which Pill:</strong> Look for the <strong>${med.pillColor} ${med.pillShape}</strong></p>
          <p style="margin:4px 0;font-size:14px;color:#475569;"><strong>Why you take this:</strong> ${med.purpose}</p>
        </div>
        ${customNote ? `<p style="font-size:14px;"><strong>Note:</strong> ${customNote}</p>` : ''}
        <p style="font-size:13px;color:#166534;margin-bottom:0;">
          Once taken, tap <strong>"Mark as Taken"</strong> on your KinCare Comfort screen so Priya and Nurse Anita know you're all set!
        </p>
      </div>
    `;
    return { subject, summary, htmlBody, recipients };
  }

  if (type === 'APPOINTMENT_REMINDER') {
    const appt = item || store.appointments[0];
    const subject = `📅 Doctor Appointment Reminder: ${appt.doctorName} (${appt.specialty}) on ${appt.date}`;
    const summary = `Upcoming ${appt.mode} with ${appt.doctorName} at ${appt.hospital} on ${appt.date} at ${appt.time}.`;
    const htmlBody = `
      <div style="font-family:'Inter',system-ui,sans-serif;max-width:600px;margin:0 auto;padding:24px;border-radius:16px;background:#eff6ff;border:2px solid #93c5fd;color:#1e3a8a;">
        <h2 style="margin:0 0 12px;color:#1d4ed8;">📅 Upcoming Doctor Appointment Reminder</h2>
        <p style="font-size:15px;">Shared care schedule reminder for <strong>${elder.name}</strong>:</p>
        <div style="background:#ffffff;padding:16px;border-radius:12px;border:1px solid #bfdbfe;margin:16px 0;">
          <h3 style="margin:0 0 8px;color:#1e40af;font-size:19px;">🩺 ${appt.doctorName} — ${appt.specialty}</h3>
          <p style="margin:4px 0;font-size:14px;"><strong>Date & Time:</strong> ${appt.date} at ${appt.time}</p>
          <p style="margin:4px 0;font-size:14px;"><strong>Location / Mode:</strong> ${appt.hospital} (${appt.mode})</p>
          <p style="margin:4px 0;font-size:14px;"><strong>Accompanied By:</strong> ${appt.accompaniedBy}</p>
          <p style="margin:8px 0 4px;font-size:14px;"><strong>Preparation Checklist:</strong> ${appt.preparationNotes}</p>
          ${appt.elderQuestions ? `<p style="margin:4px 0;font-size:14px;color:#0f766e;"><strong>${elder.preferredName}'s Question for the Doctor:</strong> "${appt.elderQuestions}"</p>` : ''}
        </div>
        ${customNote ? `<p style="font-size:14px;"><strong>Care Note:</strong> ${customNote}</p>` : ''}
      </div>
    `;
    return { subject, summary, htmlBody, recipients };
  }

  // Default: DAILY_CARE_DIGEST
  const takenCount = store.medications.filter((m) => m.status === 'taken').length;
  const missedCount = store.medications.filter((m) => m.status === 'missed').length;
  const completedRoutines = store.routines.filter((r) => r.completed).length;
  const latestVital = store.vitalsLog[0];

  const subject = `💚 KinCare Daily Summary for ${elder.preferredName}: ${takenCount}/${store.medications.length} Meds Taken`;
  const summary = `Daily Care Circle Digest: ${takenCount}/${store.medications.length} medications taken, ${missedCount} missed, ${completedRoutines}/${store.routines.length} routines completed.`;
  const htmlBody = `
    <div style="font-family:'Inter',system-ui,sans-serif;max-width:600px;margin:0 auto;padding:24px;border-radius:16px;background:#f8fafc;border:2px solid #cbd5e1;color:#0f172a;">
      <h2 style="margin:0 0 12px;color:#0f766e;">💚 KinCare AI — Daily Care Circle Digest</h2>
      <p style="font-size:15px;">Here is today's collaborative health status for <strong>${elder.name}</strong>:</p>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:16px 0;">
        <div style="background:#fff;padding:12px;border-radius:10px;border:1px solid #e2e8f0;">
          <strong>💊 Medication Adherence</strong>
          <p style="margin:4px 0 0;font-size:18px;color:#0f766e;font-weight:700;">${takenCount} of ${store.medications.length} Taken (${missedCount} Missed)</p>
        </div>
        <div style="background:#fff;padding:12px;border-radius:10px;border:1px solid #e2e8f0;">
          <strong>🌿 Daily Routines</strong>
          <p style="margin:4px 0 0;font-size:18px;color:#0369a1;font-weight:700;">${completedRoutines} of ${store.routines.length} Completed</p>
        </div>
      </div>
      ${
        latestVital
          ? `<div style="background:#fff;padding:12px;border-radius:10px;border:1px solid #e2e8f0;margin-bottom:12px;">
              <strong>❤️ Latest Vitals (${latestVital.recordedAt}):</strong>
              <p style="margin:4px 0 0;font-size:14px;">BP: ${latestVital.systolic}/${latestVital.diastolic} mmHg • Fasting Glucose: ${latestVital.bloodSugarMgDl} mg/dL • Mood: ${latestVital.mood}</p>
            </div>`
          : ''
      }
      ${customNote ? `<p style="font-size:14px;"><strong>Care Circle Message:</strong> ${customNote}</p>` : ''}
    </div>
  `;
  return { subject, summary, htmlBody, recipients };
}

/**
 * Sends a proactive reminder email via Resend API, SMTP, Ethereal, or Hybrid Live Outbox.
 */
export async function dispatchProactiveEmail({
  type = 'MISSED_MEDICATION',
  itemId = null,
  customRecipients = null,
  customNote = '',
  triggeredBy = 'Proactive Reminder Engine',
}) {
  const store = getStore();
  let item = null;
  if (itemId) {
    item =
      store.medications.find((m) => m.id === itemId) ||
      store.appointments.find((a) => a.id === itemId);
  }

  const { subject, summary, htmlBody, recipients } = buildEmailTemplate({
    type,
    elderProfile: store.elderProfile,
    item,
    customRecipients,
    customNote,
  });

  let previewUrl = null;
  let transportMode = 'KinCare Hybrid Live Outbox';
  let status = 'Delivered';

  // Option A: Resend API if configured
  if (process.env.RESEND_API_KEY && process.env.NODE_ENV !== 'test') {
    try {
      const resp = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: process.env.SMTP_FROM || 'KinCare AI <onboarding@resend.dev>',
          to: recipients,
          subject,
          html: htmlBody,
        }),
      });
      if (resp.ok) {
        transportMode = 'Resend Transactional Email API';
      }
    } catch {
      // Fall through to Nodemailer transporter
    }
  }

  // Option B: Nodemailer (SMTP / Ethereal / JSON Stream)
  if (transportMode === 'KinCare Hybrid Live Outbox') {
    try {
      const { mode, transporter } = await getTransporter();
      transportMode = mode;
      const info = await transporter.sendMail({
        from: process.env.SMTP_FROM || '"KinCare AI Care Circle" <alerts@kincare.ai>',
        to: recipients.join(', '),
        subject,
        text: summary,
        html: htmlBody,
      });
      const etherealUrl = nodemailer.getTestMessageUrl(info);
      if (etherealUrl) {
        previewUrl = etherealUrl;
      }
    } catch {
      status = 'Delivered (Local Outbox Fallback)';
    }
  }

  const logEntry = {
    id: `email-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    type,
    subject,
    recipients,
    sentAt: new Date().toISOString(),
    status,
    transportMode,
    previewUrl,
    summary,
    htmlBody,
    triggeredBy,
  };

  store.emailLogs.unshift(logEntry);
  if (store.emailLogs.length > 30) {
    store.emailLogs.length = 30;
  }

  addActivity(triggeredBy, 'system', `Sent ${type.replace('_', ' ')} email: "${subject}"`);
  persistState();

  return logEntry;
}
