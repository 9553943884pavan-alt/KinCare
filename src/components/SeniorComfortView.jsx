import React, { useEffect, useMemo, useState } from 'react';
import {
  Pill,
  CalendarHeart,
  Mic,
  ShieldCheck,
  Volume2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Undo2,
  PhoneCall,
  Check,
  CreditCard,
  Sun,
  Sunset,
  Moon,
  Bell,
} from 'lucide-react';
import { playReminderChime, speakText } from '../utils/api.js';
import {
  formatReadableTime,
  SeniorDayDoctorScreen,
  SeniorVoiceHelperScreen,
  SeniorChoicesSosScreen,
} from './senior/SeniorSubViews.jsx';

const PILL_VISUALS = [
  { bg: 'bg-teal-100', border: 'border-teal-400', dot: 'bg-teal-600', label: 'Teal Tablet' },
  { bg: 'bg-amber-100', border: 'border-amber-400', dot: 'bg-amber-500', label: 'Warm Capsule' },
  { bg: 'bg-sky-100', border: 'border-sky-400', dot: 'bg-sky-600', label: 'Blue Pill' },
  { bg: 'bg-rose-100', border: 'border-rose-400', dot: 'bg-rose-500', label: 'Rose Tablet' },
];

function getTimeSlotBucket(timeSlot = '', scheduledTime = '') {
  const slotLower = String(timeSlot).toLowerCase();
  if (slotLower.includes('morning') || slotLower.includes('breakfast')) return 'morning';
  if (slotLower.includes('afternoon') || slotLower.includes('lunch')) return 'afternoon';
  if (slotLower.includes('night') || slotLower.includes('evening') || slotLower.includes('bed')) {
    return 'night';
  }
  const hour = Number.parseInt(String(scheduledTime).split(':')[0] || '9', 10);
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'night';
}

/**
 * Senior-friendly WCAG AAA interface with large tap targets, voice cues, and simplified 4-tile navigation.
 */
export default function SeniorComfortView({
  elderProfile,
  medications = [],
  routines = [],
  appointments = [],
  autonomyDecisions = [],
  onUpdateMedicationStatus,
  onToggleRoutine,
  onResolveAutonomy,
  onUpdateAutonomyPrefs,
  onAskCompanion,
  onTriggerSOS,
  onOpenEmergencyCard,
  onLogVitals,
  onSnoozeMedication,
  onSaveAppointmentQuestion,
}) {
  const [activeScreen, setActiveScreen] = useState('medicines'); // 'medicines' | 'day' | 'voice' | 'choices'
  const [lastTakenMed, setLastTakenMed] = useState(null);
  const [busyMedId, setBusyMedId] = useState(null);
  const [activeReminderMed, setActiveReminderMed] = useState(null);

  // Day & Doctor / Wellness state
  const [selectedMood, setSelectedMood] = useState('');
  const [moodSavedText, setMoodSavedText] = useState('');
  const [showVitalsForm, setShowVitalsForm] = useState(false);
  const [bpInput, setBpInput] = useState({ systolic: '124', diastolic: '80', bloodSugarMgDl: '112' });
  const [savingVitals, setSavingVitals] = useState(false);
  const [doctorQuestionInput, setDoctorQuestionInput] = useState('');
  const [doctorQuestionSaved, setDoctorQuestionSaved] = useState(false);

  // Voice Helper state
  const [voiceLanguage, setVoiceLanguage] = useState('English');
  const [voiceQuestion, setVoiceQuestion] = useState('');
  const [voiceReply, setVoiceReply] = useState(
    'Hello! Tap any big question below, or tap the microphone and ask me about your medicines or doctor visit.'
  );
  const [isListening, setIsListening] = useState(false);
  const [isAsking, setIsAsking] = useState(false);

  // Choices & SOS state
  const [sosSentBanner, setSosSentBanner] = useState(false);

  const firstName = (elderProfile?.name || 'Ramesh').split(' ')[0];

  const takenCount = useMemo(
    () => medications.filter((m) => m.status === 'taken').length,
    [medications]
  );

  const spotlightMedication = useMemo(() => {
    const overdue = medications.find((m) => m.status === 'overdue' || m.status === 'missed');
    if (overdue) return overdue;
    const dueOrUpcoming = medications.find(
      (m) => m.status === 'due' || m.status === 'pending' || m.status === 'upcoming'
    );
    return dueOrUpcoming || null;
  }, [medications]);

  const attentionCount = useMemo(
    () =>
      medications.filter(
        (m) =>
          m.status === 'overdue' ||
          m.status === 'missed' ||
          m.status === 'due' ||
          m.status === 'pending' ||
          m.status === 'upcoming'
      ).length,
    [medications]
  );

  const pendingApprovals = useMemo(
    () => autonomyDecisions.filter((d) => d.status === 'pending_elder_approval' || d.status === 'pending'),
    [autonomyDecisions]
  );

  const groupedMedications = useMemo(() => {
    const groups = { morning: [], afternoon: [], night: [] };
    medications.forEach((med, idx) => {
      const bucket = getTimeSlotBucket(med.timeSlot, med.scheduledTime);
      groups[bucket].push({ ...med, _visual: PILL_VISUALS[idx % PILL_VISUALS.length] });
    });
    return groups;
  }, [medications]);

  const nextAppointment = useMemo(() => {
    const upcoming = appointments.filter((a) => String(a.status || '').toLowerCase() !== 'completed');
    return upcoming[0] || appointments[0] || null;
  }, [appointments]);

  useEffect(() => {
    setDoctorQuestionInput(nextAppointment?.elderQuestions || '');
  }, [nextAppointment]);

  const voiceAnnouncementsEnabled = elderProfile?.autonomyPreferences?.voiceAnnouncementsEnabled ?? true;

  const handleConfirmMedication = async (med) => {
    if (!onUpdateMedicationStatus || !med) return;
    setBusyMedId(med.id);
    try {
      await onUpdateMedicationStatus(med.id, 'taken');
      setLastTakenMed(med);
      if (voiceAnnouncementsEnabled) {
        speakText(`Great job ${firstName}. Marked ${med.name} as taken.`, 'en-IN');
      }
    } finally {
      setBusyMedId(null);
    }
  };

  const handleUndoMedication = async (med) => {
    if (!onUpdateMedicationStatus || !med) return;
    setBusyMedId(med.id);
    try {
      await onUpdateMedicationStatus(med.id, 'upcoming');
      if (lastTakenMed?.id === med.id) {
        setLastTakenMed(null);
      }
    } finally {
      setBusyMedId(null);
    }
  };

  const handleReadMedicationAloud = (med) => {
    if (!med) return;
    const speech = `Your medicine is ${med.name}, ${med.dosage}. ${med.mealInstruction || med.foodInstruction || 'Take with water'} around ${formatReadableTime(med.scheduledTime)}. ${med.purpose ? `This helps with ${med.purpose}.` : ''}`;
    speakText(speech, 'en-IN');
  };

  const handleMoodCheckIn = async (moodLabel) => {
    setSelectedMood(moodLabel);
    setMoodSavedText(`Saved! Your family knows you are ${moodLabel}.`);
    speakText(`Thank you ${firstName}. Recorded that you are ${moodLabel}.`, 'en-IN');
    if (onLogVitals) {
      await onLogVitals({
        mood: moodLabel,
        systolic: Number(bpInput.systolic) || 124,
        diastolic: Number(bpInput.diastolic) || 80,
        bloodSugarMgDl: Number(bpInput.bloodSugarMgDl) || 112,
        note: `1-Tap Senior Check-In: ${moodLabel}`,
      });
    }
  };

  const handleSaveOptionalVitals = async (e) => {
    e.preventDefault();
    if (!onLogVitals) return;
    setSavingVitals(true);
    try {
      await onLogVitals({
        mood: selectedMood || 'Feeling Good',
        systolic: Number(bpInput.systolic) || 124,
        diastolic: Number(bpInput.diastolic) || 80,
        bloodSugarMgDl: Number(bpInput.bloodSugarMgDl) || 112,
        note: 'Senior Comfort Check-In Vitals',
      });
      setMoodSavedText('Saved your blood pressure and sugar reading for your family.');
      setShowVitalsForm(false);
    } finally {
      setSavingVitals(false);
    }
  };

  const handleAskQuestion = async (questionText) => {
    const cleanQ = (questionText || voiceQuestion).trim();
    if (!cleanQ || !onAskCompanion) return;
    setVoiceQuestion(cleanQ);
    setIsAsking(true);
    try {
      const reply = await onAskCompanion(cleanQ, voiceLanguage);
      const textReply =
        typeof reply === 'string'
          ? reply
          : reply?.reply || 'Please take your scheduled medicine with a glass of water.';
      setVoiceReply(textReply);
      const speechLang =
        voiceLanguage === 'Hindi' ? 'hi-IN' : voiceLanguage === 'Telugu' ? 'te-IN' : 'en-IN';
      speakText(textReply, speechLang);
    } finally {
      setIsAsking(false);
    }
  };

  const handleStartSpeechInput = () => {
    const SpeechRecognition =
      typeof window !== 'undefined' &&
      (window.SpeechRecognition || window.webkitSpeechRecognition);
    if (!SpeechRecognition) {
      setVoiceReply(
        'Voice microphone is not supported in this browser. Please tap one of the big blue question buttons below!'
      );
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang =
      voiceLanguage === 'Hindi' ? 'hi-IN' : voiceLanguage === 'Telugu' ? 'te-IN' : 'en-IN';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    setIsListening(true);
    recognition.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript || '';
      setIsListening(false);
      if (transcript) {
        setVoiceQuestion(transcript);
        handleAskQuestion(transcript);
      }
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    recognition.start();
  };

  const handleSendSOS = async () => {
    if (!onTriggerSOS) return;
    await onTriggerSOS();
    setSosSentBanner(true);
    speakText('Emergency alert sent. Your family and doctor have been notified right away.', 'en-IN');
  };

  const prefs = elderProfile?.autonomyPreferences || {
    requireElderApprovalForScheduleDeletion: true,
    allowFamilyMissedDoseEscalation: true,
    shareMoodWithFamily: true,
    voiceAnnouncementsEnabled: true,
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Warm Personal Greeting Banner */}
      <section className="rounded-3xl bg-[#FFFDF7] border-2 border-teal-200 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-sm font-extrabold uppercase tracking-wider text-teal-800">
              Simple Senior View • Easy 1-Tap Controls
            </p>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mt-1">
              Good Day, {firstName}
            </h2>
            <p className="text-lg text-slate-700 font-semibold mt-1">
              {medications.length > 0
                ? `${takenCount} of ${medications.length} medicines taken today`
                : 'No medicines scheduled today'}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => {
                const target = spotlightMedication || medications[0];
                if (!target) return;
                setActiveScreen('medicines');
                setActiveReminderMed(target);
                playReminderChime();
                speakText(
                  `Hello ${firstName}. Time for your ${target.name}, ${target.dosage}. ${target.mealInstruction || 'Take with a glass of water'}.`,
                  'en-IN'
                );
              }}
              className="min-h-[56px] px-5 py-3 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-base font-extrabold flex items-center gap-2 shadow-sm cursor-pointer"
            >
              <Bell className="w-5 h-5" />
              🔔 Test Voice Reminder
            </button>
            <button
              type="button"
              onClick={onOpenEmergencyCard}
              className="min-h-[56px] px-5 py-3 rounded-2xl bg-white hover:bg-slate-50 border-2 border-slate-300 text-slate-900 text-base font-extrabold flex items-center gap-2 cursor-pointer"
            >
              <CreditCard className="w-5 h-5 text-teal-700" />
              My Medical ID
            </button>
            <button
              type="button"
              onClick={() => setActiveScreen('choices')}
              className="min-h-[56px] px-5 py-3 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white text-base font-extrabold flex items-center gap-2 shadow-sm cursor-pointer"
            >
              <PhoneCall className="w-5 h-5" />
              SOS Help
            </button>
          </div>
        </div>
      </section>

      {/* 4 Giant Flat Navigation Tiles */}
      <nav aria-label="Simple Senior Navigation" className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          type="button"
          aria-current={activeScreen === 'medicines' ? 'page' : undefined}
          onClick={() => setActiveScreen('medicines')}
          className={`min-h-[76px] rounded-2xl p-4 border-2 text-left transition flex flex-col justify-between cursor-pointer ${
            activeScreen === 'medicines'
              ? 'bg-teal-700 border-teal-800 text-white shadow-md'
              : 'bg-white border-slate-300 text-slate-900 hover:bg-teal-50'
          }`}
        >
          <div className="flex items-center justify-between w-full">
            <Pill className="w-7 h-7" />
            {attentionCount > 0 && (
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold ${
                  activeScreen === 'medicines'
                    ? 'bg-amber-300 text-slate-950'
                    : 'bg-amber-100 text-amber-900 border border-amber-300'
                }`}
              >
                {attentionCount} due
              </span>
            )}
          </div>
          <span className="text-lg font-extrabold mt-2">1. My Medicines</span>
        </button>

        <button
          type="button"
          aria-current={activeScreen === 'day' ? 'page' : undefined}
          onClick={() => setActiveScreen('day')}
          className={`min-h-[76px] rounded-2xl p-4 border-2 text-left transition flex flex-col justify-between cursor-pointer ${
            activeScreen === 'day'
              ? 'bg-indigo-700 border-indigo-800 text-white shadow-md'
              : 'bg-white border-slate-300 text-slate-900 hover:bg-indigo-50'
          }`}
        >
          <div className="flex items-center justify-between w-full">
            <CalendarHeart className="w-7 h-7" />
            {nextAppointment && (
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold ${
                  activeScreen === 'day'
                    ? 'bg-white/20 text-white'
                    : 'bg-indigo-50 text-indigo-800 border border-indigo-200'
                }`}
              >
                Doctor Visit
              </span>
            )}
          </div>
          <span className="text-lg font-extrabold mt-2">2. My Day &amp; Doctor</span>
        </button>

        <button
          type="button"
          aria-current={activeScreen === 'voice' ? 'page' : undefined}
          onClick={() => setActiveScreen('voice')}
          className={`min-h-[76px] rounded-2xl p-4 border-2 text-left transition flex flex-col justify-between cursor-pointer ${
            activeScreen === 'voice'
              ? 'bg-sky-700 border-sky-800 text-white shadow-md'
              : 'bg-white border-slate-300 text-slate-900 hover:bg-sky-50'
          }`}
        >
          <div className="flex items-center justify-between w-full">
            <Mic className="w-7 h-7" />
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold ${
                activeScreen === 'voice'
                  ? 'bg-white/20 text-white'
                  : 'bg-sky-50 text-sky-900 border border-sky-200'
              }`}
            >
              Audio
            </span>
          </div>
          <span className="text-lg font-extrabold mt-2">3. Voice Helper</span>
        </button>

        <button
          type="button"
          aria-current={activeScreen === 'choices' ? 'page' : undefined}
          onClick={() => setActiveScreen('choices')}
          className={`min-h-[76px] rounded-2xl p-4 border-2 text-left transition flex flex-col justify-between cursor-pointer ${
            activeScreen === 'choices'
              ? 'bg-rose-700 border-rose-800 text-white shadow-md'
              : 'bg-white border-slate-300 text-slate-900 hover:bg-rose-50'
          }`}
        >
          <div className="flex items-center justify-between w-full">
            <ShieldCheck className="w-7 h-7" />
            {pendingApprovals.length > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-amber-300 text-slate-950">
                {pendingApprovals.length} request
              </span>
            )}
          </div>
          <span className="text-lg font-extrabold mt-2">4. Choices &amp; SOS</span>
        </button>
      </nav>

      {/* SCREEN 1: MY MEDICINES */}
      {activeScreen === 'medicines' && (
        <div className="space-y-6">
          {activeReminderMed && (
            <section className="rounded-3xl bg-amber-50 border-3 border-amber-500 p-6 shadow-md space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500 text-slate-950 text-sm font-extrabold uppercase">
                  <Bell className="w-4 h-4 animate-bounce" /> Voice Medicine Reminder Active
                </span>
                <button
                  type="button"
                  onClick={() => setActiveReminderMed(null)}
                  className="text-sm font-bold text-slate-700 underline cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
              <p className="text-2xl font-extrabold text-slate-900">
                Time to take {activeReminderMed.name} ({activeReminderMed.dosage})
              </p>
              <p className="text-lg font-semibold text-amber-950">
                {activeReminderMed.mealInstruction || 'Take with a full glass of water'} •{' '}
                {formatReadableTime(activeReminderMed.scheduledTime)}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={async () => {
                    const m = activeReminderMed;
                    setActiveReminderMed(null);
                    await handleConfirmMedication(m);
                  }}
                  className="min-h-[60px] rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-lg font-extrabold px-4 py-3 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <CheckCircle2 className="w-6 h-6" />✓ I Took This Medicine
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const m = activeReminderMed;
                    setActiveReminderMed(null);
                    if (onSnoozeMedication) await onSnoozeMedication(m);
                    speakText(`Okay ${firstName}, I will remind you again in 15 minutes.`, 'en-IN');
                  }}
                  className="min-h-[60px] rounded-2xl bg-white hover:bg-slate-100 border-2 border-amber-500 text-amber-950 text-lg font-extrabold px-4 py-3 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Clock className="w-6 h-6" />
                  ⏰ Snooze 15 Min
                </button>
                <button
                  type="button"
                  onClick={() => {
                    playReminderChime();
                    handleReadMedicationAloud(activeReminderMed);
                  }}
                  className="min-h-[60px] rounded-2xl bg-amber-200 hover:bg-amber-300 text-amber-950 text-lg font-extrabold px-4 py-3 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Volume2 className="w-6 h-6" />
                  🔊 Repeat Voice
                </button>
              </div>
            </section>
          )}

          {lastTakenMed && (
            <div className="rounded-2xl bg-emerald-50 border-2 border-emerald-400 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-7 h-7 text-emerald-700 shrink-0" />
                <p className="text-lg font-bold text-emerald-950">
                  Marked <strong>{lastTakenMed.name}</strong> as taken!
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleUndoMedication(lastTakenMed)}
                className="min-h-[48px] px-4 py-2 rounded-xl bg-white border-2 border-emerald-500 text-emerald-900 font-extrabold text-base flex items-center gap-2 cursor-pointer"
              >
                <Undo2 className="w-5 h-5" />
                Made a mistake? Undo
              </button>
            </div>
          )}

          {spotlightMedication ? (
            <section
              className={`rounded-3xl border-3 p-6 sm:p-8 shadow-md ${
                spotlightMedication.status === 'missed' || spotlightMedication.status === 'overdue'
                  ? 'bg-rose-50 border-rose-500'
                  : 'bg-[#FFFDF7] border-teal-600'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <span
                  className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-extrabold uppercase tracking-wide ${
                    spotlightMedication.status === 'missed' || spotlightMedication.status === 'overdue'
                      ? 'bg-rose-600 text-white'
                      : 'bg-teal-700 text-white'
                  }`}
                >
                  {spotlightMedication.status === 'missed' || spotlightMedication.status === 'overdue' ? (
                    <>
                      <AlertTriangle className="w-4 h-4" /> Take Soon — Missed / Overdue
                    </>
                  ) : (
                    <>
                      <Clock className="w-4 h-4" /> Right Now • Next Medicine
                    </>
                  )}
                </span>
                <span className="text-xl font-extrabold text-slate-900 bg-white px-4 py-1.5 rounded-full border-2 border-slate-300">
                  {formatReadableTime(spotlightMedication.scheduledTime)}
                </span>
              </div>

              <div className="flex items-start gap-4 mb-6">
                <div className="w-16 h-16 rounded-2xl bg-teal-100 border-2 border-teal-400 flex items-center justify-center shrink-0">
                  <Pill className="w-9 h-9 text-teal-800" />
                </div>
                <div>
                  <h3 className="text-3xl sm:text-4xl font-extrabold text-slate-900">
                    {spotlightMedication.name}
                  </h3>
                  <p className="text-xl font-bold text-slate-800 mt-1">
                    {spotlightMedication.dosage} •{' '}
                    <span className="text-teal-800">
                      {spotlightMedication.mealInstruction ||
                        spotlightMedication.foodInstruction ||
                        'Take with a glass of water'}
                    </span>
                  </p>
                  {spotlightMedication.pillColor && (
                    <p className="text-base font-bold text-slate-600 mt-1">
                      Look for: {spotlightMedication.pillColor} {spotlightMedication.pillShape || 'Tablet'}
                    </p>
                  )}
                  {spotlightMedication.purpose && (
                    <p className="text-lg text-slate-700 mt-2">
                      Why it helps: <strong>{spotlightMedication.purpose}</strong>
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  type="button"
                  disabled={busyMedId === spotlightMedication.id}
                  onClick={() => handleConfirmMedication(spotlightMedication)}
                  className="min-h-[68px] rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xl font-extrabold px-6 py-4 flex items-center justify-center gap-3 shadow-md transition cursor-pointer disabled:opacity-60"
                >
                  <CheckCircle2 className="w-7 h-7" />
                  {busyMedId === spotlightMedication.id ? 'Saving...' : '✓ I Took This Medicine'}
                </button>
                <button
                  type="button"
                  onClick={() => handleReadMedicationAloud(spotlightMedication)}
                  className="min-h-[68px] rounded-2xl bg-amber-100 hover:bg-amber-200 border-2 border-amber-400 text-amber-950 text-xl font-extrabold px-6 py-4 flex items-center justify-center gap-3 transition cursor-pointer"
                >
                  <Volume2 className="w-7 h-7" />
                  🔊 Read Instructions Aloud
                </button>
              </div>
            </section>
          ) : (
            <section className="rounded-3xl bg-emerald-50 border-3 border-emerald-500 p-8 text-center">
              <CheckCircle2 className="w-16 h-16 text-emerald-600 mx-auto mb-3" />
              <h3 className="text-3xl font-extrabold text-emerald-950">All Caught Up For Today!</h3>
              <p className="text-xl text-emerald-900 mt-2">
                You have confirmed all scheduled medicines. Wonderful job, {firstName}!
              </p>
            </section>
          )}

          {[
            { key: 'morning', title: 'Morning Medicines', icon: Sun, tint: 'text-amber-600' },
            { key: 'afternoon', title: 'Afternoon Medicines', icon: Sunset, tint: 'text-orange-600' },
            { key: 'night', title: 'Evening & Night Medicines', icon: Moon, tint: 'text-indigo-600' },
          ].map(({ key, title, icon: SlotIcon, tint }) => {
            const list = groupedMedications[key] || [];
            if (list.length === 0) return null;
            return (
              <section key={key} className="space-y-3">
                <h4 className="text-xl font-extrabold text-slate-900 flex items-center gap-2 px-1">
                  <SlotIcon className={`w-6 h-6 ${tint}`} />
                  {title}
                </h4>
                <div className="space-y-3">
                  {list.map((med) => {
                    const isTaken = med.status === 'taken';
                    const isAlert = med.status === 'missed' || med.status === 'overdue';
                    return (
                      <div
                        key={med.id}
                        className={`rounded-2xl border-2 p-5 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                          isTaken
                            ? 'bg-emerald-50/70 border-emerald-300'
                            : isAlert
                              ? 'bg-rose-50 border-rose-400'
                              : 'bg-white border-slate-300'
                        }`}
                      >
                        <div className="flex items-start gap-4">
                          <div
                            className={`w-12 h-12 rounded-2xl border-2 flex items-center justify-center shrink-0 ${med._visual.bg} ${med._visual.border}`}
                          >
                            <span className={`w-5 h-5 rounded-full ${med._visual.dot}`} />
                          </div>
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h5 className="text-2xl font-extrabold text-slate-900">{med.name}</h5>
                              <span className="px-3 py-0.5 rounded-full text-sm font-extrabold bg-slate-100 text-slate-800 border border-slate-300">
                                {formatReadableTime(med.scheduledTime)}
                              </span>
                            </div>
                            <p className="text-lg font-semibold text-slate-700 mt-0.5">
                              {med.dosage} • {med.mealInstruction || med.foodInstruction || 'With water'}
                              {med.pillColor ? ` (${med.pillColor} ${med.pillShape || 'Pill'})` : ''}
                            </p>
                            {med.purpose && <p className="text-base text-slate-600 mt-0.5">{med.purpose}</p>}
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                          <button
                            type="button"
                            onClick={() => handleReadMedicationAloud(med)}
                            className="min-h-[56px] px-4 py-3 rounded-xl bg-amber-50 hover:bg-amber-100 border-2 border-amber-300 text-amber-950 text-base font-extrabold flex items-center gap-2 cursor-pointer"
                            aria-label={`Read instructions for ${med.name}`}
                          >
                            <Volume2 className="w-5 h-5" />
                            Read
                          </button>
                          {isTaken ? (
                            <button
                              type="button"
                              onClick={() => handleUndoMedication(med)}
                              className="min-h-[56px] px-5 py-3 rounded-xl bg-white border-2 border-emerald-500 text-emerald-900 text-base font-extrabold flex items-center gap-2 cursor-pointer"
                            >
                              <Check className="w-5 h-5 text-emerald-600" />
                              Taken (Undo)
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled={busyMedId === med.id}
                              onClick={() => handleConfirmMedication(med)}
                              className="min-h-[56px] px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-lg font-extrabold flex items-center gap-2 shadow-sm cursor-pointer disabled:opacity-60"
                            >
                              <CheckCircle2 className="w-5 h-5" />
                              I Took It
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {/* SCREEN 2: MY DAY & DOCTOR */}
      {activeScreen === 'day' && (
        <SeniorDayDoctorScreen
          selectedMood={selectedMood}
          moodSavedText={moodSavedText}
          showVitalsForm={showVitalsForm}
          setShowVitalsForm={setShowVitalsForm}
          bpInput={bpInput}
          setBpInput={setBpInput}
          savingVitals={savingVitals}
          routines={routines}
          nextAppointment={nextAppointment}
          doctorQuestionInput={doctorQuestionInput}
          setDoctorQuestionInput={setDoctorQuestionInput}
          doctorQuestionSaved={doctorQuestionSaved}
          setDoctorQuestionSaved={setDoctorQuestionSaved}
          onMoodCheckIn={handleMoodCheckIn}
          onSaveOptionalVitals={handleSaveOptionalVitals}
          onToggleRoutine={onToggleRoutine}
          onSaveAppointmentQuestion={onSaveAppointmentQuestion}
        />
      )}

      {/* SCREEN 3: VOICE HELPER */}
      {activeScreen === 'voice' && (
        <SeniorVoiceHelperScreen
          voiceLanguage={voiceLanguage}
          setVoiceLanguage={setVoiceLanguage}
          voiceQuestion={voiceQuestion}
          setVoiceQuestion={setVoiceQuestion}
          voiceReply={voiceReply}
          isListening={isListening}
          isAsking={isAsking}
          onStartSpeechInput={handleStartSpeechInput}
          onAskQuestion={handleAskQuestion}
        />
      )}

      {/* SCREEN 4: MY CHOICES & SOS */}
      {activeScreen === 'choices' && (
        <SeniorChoicesSosScreen
          sosSentBanner={sosSentBanner}
          onSendSOS={handleSendSOS}
          onOpenEmergencyCard={onOpenEmergencyCard}
          pendingApprovals={pendingApprovals}
          onResolveAutonomy={onResolveAutonomy}
          prefs={prefs}
          onUpdateAutonomyPrefs={onUpdateAutonomyPrefs}
        />
      )}
    </div>
  );
}
