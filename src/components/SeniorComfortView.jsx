import React, { useMemo, useState } from 'react';
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
  HeartPulse,
  Sparkles,
  Check,
  X,
  CreditCard,
  ChevronDown,
  ChevronUp,
  Sun,
  Sunset,
  Moon,
  Send,
} from 'lucide-react';
import { speakText } from '../utils/api.js';

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

function formatReadableTime(timeStr = '09:00') {
  const [hStr, mStr = '00'] = String(timeStr).split(':');
  const h = Number.parseInt(hStr, 10);
  if (Number.isNaN(h)) return timeStr;
  const suffix = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${mStr.padStart(2, '0')} ${suffix}`;
}

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
}) {
  const [activeScreen, setActiveScreen] = useState('medicines'); // 'medicines' | 'day' | 'voice' | 'choices'
  const [lastTakenMed, setLastTakenMed] = useState(null);
  const [busyMedId, setBusyMedId] = useState(null);

  // Day & Doctor / Wellness state
  const [selectedMood, setSelectedMood] = useState('');
  const [moodSavedText, setMoodSavedText] = useState('');
  const [showVitalsForm, setShowVitalsForm] = useState(false);
  const [bpInput, setBpInput] = useState({ systolic: '124', diastolic: '80', bloodSugarMgDl: '112' });
  const [savingVitals, setSavingVitals] = useState(false);

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

  // Right Now / Next Due Spotlight Medication
  const spotlightMedication = useMemo(() => {
    const overdue = medications.find((m) => m.status === 'overdue' || m.status === 'missed');
    if (overdue) return overdue;
    const dueOrPending = medications.find((m) => m.status === 'due' || m.status === 'pending');
    if (dueOrPending) return dueOrPending;
    return null;
  }, [medications]);

  const attentionCount = useMemo(
    () =>
      medications.filter(
        (m) => m.status === 'overdue' || m.status === 'missed' || m.status === 'due' || m.status === 'pending'
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
    const upcoming = appointments.filter((a) => a.status !== 'completed');
    return upcoming[0] || appointments[0] || null;
  }, [appointments]);

  const handleConfirmMedication = async (med) => {
    if (!onUpdateMedicationStatus || !med) return;
    setBusyMedId(med.id);
    try {
      await onUpdateMedicationStatus(med.id, 'taken');
      setLastTakenMed(med);
      speakText(`Great job ${firstName}. Marked ${med.name} as taken.`, 'en-IN');
    } finally {
      setBusyMedId(null);
    }
  };

  const handleUndoMedication = async (med) => {
    if (!onUpdateMedicationStatus || !med) return;
    setBusyMedId(med.id);
    try {
      await onUpdateMedicationStatus(med.id, 'pending');
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
    recognition.onerror = () => {
      setIsListening(false);
    };
    recognition.onend = () => {
      setIsListening(false);
    };
    recognition.start();
  };

  const handleSendSOS = async () => {
    if (!onTriggerSOS) return;
    await onTriggerSOS();
    setSosSentBanner(true);
    speakText(
      'Emergency alert sent. Your family and doctor have been notified right away.',
      'en-IN'
    );
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

      {/* GrandPad-Style 4 Giant Flat Navigation Tiles (One Task at a Time) */}
      <nav
        aria-label="Simple Senior Navigation"
        className="grid grid-cols-2 sm:grid-cols-4 gap-3"
      >
        <button
          type="button"
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
          <span className="text-lg font-extrabold mt-2">2. My Day & Doctor</span>
        </button>

        <button
          type="button"
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
          <span className="text-lg font-extrabold mt-2">4. Choices & SOS</span>
        </button>
      </nav>

      {/* SCREEN 1: MY MEDICINES */}
      {activeScreen === 'medicines' && (
        <div className="space-y-6">
          {/* Forgiving Undo Banner */}
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

          {/* Hero Spotlight Card: Right Now / Next Medicine */}
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
                  {spotlightMedication.status === 'missed' ||
                  spotlightMedication.status === 'overdue' ? (
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
              <h3 className="text-3xl font-extrabold text-emerald-950">
                All Caught Up For Today!
              </h3>
              <p className="text-xl text-emerald-900 mt-2">
                You have confirmed all scheduled medicines. Wonderful job, {firstName}!
              </p>
            </section>
          )}

          {/* Clean Grouped Schedule by Time of Day */}
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
                            {med.purpose && (
                              <p className="text-base text-slate-600 mt-0.5">{med.purpose}</p>
                            )}
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
        <div className="space-y-6">
          {/* 1-Tap Mood Check-In */}
          <section className="rounded-3xl bg-[#FFFDF7] border-2 border-indigo-200 p-6 sm:p-8 shadow-sm">
            <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              How Are You Feeling Today?
            </h3>
            <p className="text-lg text-slate-700 mt-1">
              Just tap one face below so your family knows you are doing okay.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-5">
              {[
                { emoji: '😊', label: 'Feeling Good', activeBg: 'bg-emerald-600 text-white border-emerald-700' },
                { emoji: '😴', label: 'A Bit Tired', activeBg: 'bg-amber-500 text-slate-950 border-amber-600' },
                { emoji: '🤕', label: 'Need Check-In', activeBg: 'bg-rose-600 text-white border-rose-700' },
              ].map((item) => {
                const active = selectedMood === item.label;
                return (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => handleMoodCheckIn(item.label)}
                    className={`min-h-[92px] rounded-2xl border-2 p-4 flex flex-col items-center justify-center gap-2 text-xl font-extrabold transition cursor-pointer ${
                      active
                        ? `${item.activeBg} shadow-md`
                        : 'bg-white border-slate-300 text-slate-900 hover:bg-indigo-50'
                    }`}
                  >
                    <span className="text-4xl">{item.emoji}</span>
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>

            {moodSavedText && (
              <div className="mt-4 rounded-2xl bg-emerald-50 border-2 border-emerald-400 p-4 text-lg font-bold text-emerald-900 flex items-center gap-2">
                <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                {moodSavedText}
              </div>
            )}

            {/* Collapsible Optional BP / Sugar Numbers */}
            <div className="mt-5 pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setShowVitalsForm((prev) => !prev)}
                className="min-h-[48px] text-base font-extrabold text-indigo-800 hover:text-indigo-950 flex items-center gap-2 cursor-pointer"
              >
                <HeartPulse className="w-5 h-5" />
                Record Blood Pressure or Sugar Numbers (Optional)
                {showVitalsForm ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </button>

              {showVitalsForm && (
                <form onSubmit={handleSaveOptionalVitals} className="grid grid-cols-1 sm:grid-cols-4 gap-3 mt-4">
                  <label className="block">
                    <span className="text-sm font-bold text-slate-700">BP Top (Systolic)</span>
                    <input
                      type="number"
                      value={bpInput.systolic}
                      onChange={(e) => setBpInput({ ...bpInput, systolic: e.target.value })}
                      className="mt-1 w-full rounded-xl border-2 border-slate-300 px-4 py-3 text-lg font-bold"
                    />
                  </label>
                  <label className="block">
                    <span className="text-sm font-bold text-slate-700">BP Bottom</span>
                    <input
                      type="number"
                      value={bpInput.diastolic}
                      onChange={(e) => setBpInput({ ...bpInput, diastolic: e.target.value })}
                      className="mt-1 w-full rounded-xl border-2 border-slate-300 px-4 py-3 text-lg font-bold"
                    />
                  </label>
                  <label className="block">
                    <span className="text-sm font-bold text-slate-700">Blood Sugar</span>
                    <input
                      type="number"
                      value={bpInput.bloodSugarMgDl}
                      onChange={(e) => setBpInput({ ...bpInput, bloodSugarMgDl: e.target.value })}
                      className="mt-1 w-full rounded-xl border-2 border-slate-300 px-4 py-3 text-lg font-bold"
                    />
                  </label>
                  <div className="flex items-end">
                    <button
                      type="submit"
                      disabled={savingVitals}
                      className="w-full min-h-[54px] rounded-xl bg-indigo-700 hover:bg-indigo-800 text-white text-base font-extrabold px-4 py-3 cursor-pointer"
                    >
                      {savingVitals ? 'Saving...' : 'Save Numbers'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </section>

          {/* Daily Care Routines */}
          <section className="rounded-3xl bg-white border-2 border-slate-300 p-6 sm:p-8 shadow-sm">
            <h3 className="text-2xl font-extrabold text-slate-900 mb-4">Today&apos;s Daily Habits</h3>
            <div className="space-y-3">
              {routines.map((routine) => (
                <button
                  key={routine.id}
                  type="button"
                  onClick={() => onToggleRoutine && onToggleRoutine(routine.id, !routine.completed)}
                  className={`w-full min-h-[68px] rounded-2xl border-2 p-4 text-left flex items-center justify-between gap-4 transition cursor-pointer ${
                    routine.completed
                      ? 'bg-emerald-50 border-emerald-400 text-emerald-950'
                      : 'bg-slate-50 border-slate-300 text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <div>
                    <p className="text-xl font-extrabold">{routine.title}</p>
                    <p className="text-base text-slate-600">{routine.time}</p>
                  </div>
                  <span
                    className={`px-4 py-2 rounded-xl text-base font-extrabold shrink-0 ${
                      routine.completed
                        ? 'bg-emerald-600 text-white'
                        : 'bg-white border-2 border-slate-400 text-slate-800'
                    }`}
                  >
                    {routine.completed ? 'Done ✓' : 'Tap When Done'}
                  </span>
                </button>
              ))}
              {routines.length === 0 && (
                <p className="text-lg text-slate-600">No extra routines set for today.</p>
              )}
            </div>
          </section>

          {/* Next Doctor Appointment */}
          <section className="rounded-3xl bg-sky-50 border-2 border-sky-300 p-6 sm:p-8 shadow-sm">
            <h3 className="text-2xl font-extrabold text-slate-900 mb-3">Next Doctor Visit</h3>
            {nextAppointment ? (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <p className="text-2xl font-extrabold text-sky-950">{nextAppointment.doctorName}</p>
                  <p className="text-lg font-bold text-sky-800">
                    {nextAppointment.specialty} • {nextAppointment.hospital}
                  </p>
                  <p className="text-xl font-extrabold text-slate-900 mt-2">
                    📅 {nextAppointment.date} at {formatReadableTime(nextAppointment.time)}
                  </p>
                  {nextAppointment.notes && (
                    <p className="text-base text-slate-700 mt-1">Note: {nextAppointment.notes}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() =>
                    speakText(
                      `Your next doctor appointment is with ${nextAppointment.doctorName} on ${nextAppointment.date} at ${formatReadableTime(nextAppointment.time)} at ${nextAppointment.hospital}.`,
                      'en-IN'
                    )
                  }
                  className="min-h-[60px] px-6 py-3 rounded-2xl bg-sky-700 hover:bg-sky-800 text-white text-lg font-extrabold flex items-center gap-2 shrink-0 cursor-pointer"
                >
                  <Volume2 className="w-6 h-6" />
                  Read Aloud
                </button>
              </div>
            ) : (
              <p className="text-lg text-slate-700">No upcoming doctor appointments scheduled.</p>
            )}
          </section>
        </div>
      )}

      {/* SCREEN 3: VOICE HELPER */}
      {activeScreen === 'voice' && (
        <section className="rounded-3xl bg-[#FFFDF7] border-2 border-sky-300 p-6 sm:p-8 space-y-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                KinCare Voice Helper
              </h3>
              <p className="text-lg text-slate-700 mt-1">
                Ask any question in simple words and listen to the answer.
              </p>
            </div>
            <div className="inline-flex rounded-2xl bg-slate-100 p-1.5 border border-slate-300">
              {['English', 'Hindi', 'Telugu'].map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => setVoiceLanguage(lang)}
                  className={`px-4 py-2 rounded-xl text-base font-extrabold cursor-pointer ${
                    voiceLanguage === lang
                      ? 'bg-sky-700 text-white shadow-xs'
                      : 'text-slate-800 hover:bg-white'
                  }`}
                >
                  {lang}
                </button>
              ))}
            </div>
          </div>

          {/* Giant Microphone Button */}
          <button
            type="button"
            onClick={handleStartSpeechInput}
            className={`w-full min-h-[84px] rounded-3xl text-2xl font-extrabold flex items-center justify-center gap-3 shadow-md transition cursor-pointer ${
              isListening
                ? 'bg-rose-600 text-white animate-pulse'
                : 'bg-sky-700 hover:bg-sky-800 text-white'
            }`}
          >
            <Mic className="w-8 h-8" />
            {isListening ? 'Listening... Please Speak Now' : '🎙️ Tap & Speak Your Question'}
          </button>

          {/* 3 Large 1-Tap Question Cards */}
          <div>
            <p className="text-base font-extrabold uppercase tracking-wider text-slate-600 mb-3">
              Or Tap a Common Question:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                'What is my next medicine today?',
                'Did I already take my morning pills?',
                'When is my next doctor visit?',
              ].map((q) => (
                <button
                  key={q}
                  type="button"
                  disabled={isAsking}
                  onClick={() => handleAskQuestion(q)}
                  className="min-h-[72px] rounded-2xl bg-sky-50 hover:bg-sky-100 border-2 border-sky-300 p-4 text-left text-lg font-extrabold text-sky-950 flex items-center gap-2 cursor-pointer"
                >
                  <Sparkles className="w-5 h-5 text-sky-700 shrink-0" />
                  <span>{q}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Optional Text Question Box */}
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={voiceQuestion}
              onChange={(e) => setVoiceQuestion(e.target.value)}
              placeholder="Or type your question here..."
              className="flex-1 min-h-[56px] rounded-2xl border-2 border-slate-300 px-5 py-3 text-lg font-semibold bg-white"
            />
            <button
              type="button"
              disabled={isAsking || !voiceQuestion.trim()}
              onClick={() => handleAskQuestion(voiceQuestion)}
              className="min-h-[56px] px-7 py-3 rounded-2xl bg-teal-700 hover:bg-teal-800 text-white text-lg font-extrabold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Send className="w-5 h-5" />
              {isAsking ? 'Thinking...' : 'Ask Helper'}
            </button>
          </div>

          {/* Big Readable Reply Card */}
          <div className="rounded-3xl bg-white border-2 border-teal-400 p-6 space-y-4">
            <p className="text-sm font-extrabold uppercase tracking-wider text-teal-800">
              KinCare Helper Answer:
            </p>
            <p className="text-2xl leading-relaxed font-bold text-slate-900">{voiceReply}</p>
            <button
              type="button"
              onClick={() => speakText(voiceReply, 'en-IN')}
              className="min-h-[54px] px-5 py-3 rounded-2xl bg-amber-100 hover:bg-amber-200 border-2 border-amber-400 text-amber-950 text-lg font-extrabold inline-flex items-center gap-2 cursor-pointer"
            >
              <Volume2 className="w-6 h-6" />
              🔊 Listen Again
            </button>
          </div>
        </section>
      )}

      {/* SCREEN 4: MY CHOICES & SOS */}
      {activeScreen === 'choices' && (
        <div className="space-y-6">
          {/* Emergency Help & Medical ID */}
          <section className="rounded-3xl bg-rose-50 border-3 border-rose-400 p-6 sm:p-8 space-y-4 shadow-sm">
            <h3 className="text-2xl sm:text-3xl font-extrabold text-rose-950">
              Need Immediate Help?
            </h3>
            <p className="text-lg text-rose-900">
              Tap the red button below if you feel dizzy, unwell, or need your family right away.
            </p>

            {sosSentBanner && (
              <div className="rounded-2xl bg-white border-2 border-rose-600 p-4 text-lg font-extrabold text-rose-900">
                🚨 Emergency Alert Sent! Your family has been notified by email immediately.
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                type="button"
                onClick={handleSendSOS}
                className="min-h-[76px] rounded-2xl bg-rose-600 hover:bg-rose-700 text-white text-2xl font-extrabold px-6 py-4 flex items-center justify-center gap-3 shadow-md cursor-pointer"
              >
                <PhoneCall className="w-7 h-7" />
                🚨 Send SOS Alert to Family
              </button>
              <button
                type="button"
                onClick={onOpenEmergencyCard}
                className="min-h-[76px] rounded-2xl bg-white hover:bg-slate-50 border-2 border-slate-400 text-slate-900 text-xl font-extrabold px-6 py-4 flex items-center justify-center gap-3 cursor-pointer"
              >
                <CreditCard className="w-7 h-7 text-teal-700" />
                🪪 Open My Medical ID Card
              </button>
            </div>
          </section>

          {/* Family Requests Needing Elderly Approval */}
          <section className="rounded-3xl bg-white border-2 border-slate-300 p-6 sm:p-8 space-y-4 shadow-sm">
            <h3 className="text-2xl font-extrabold text-slate-900">
              Family Requests — Your Decision
            </h3>
            {pendingApprovals.length > 0 ? (
              <div className="space-y-4">
                {pendingApprovals.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl bg-amber-50 border-2 border-amber-300 p-5 space-y-4"
                  >
                    <div>
                      <p className="text-xl font-extrabold text-slate-900">{item.title}</p>
                      <p className="text-lg text-slate-700 mt-1">{item.reason || item.description}</p>
                      <p className="text-sm font-bold text-amber-900 mt-1">
                        Requested by: {item.proposedBy || item.requestedBy}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() =>
                          onResolveAutonomy && onResolveAutonomy(item.id, 'approved_by_elder')
                        }
                        className="min-h-[56px] px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-lg font-extrabold flex items-center gap-2 cursor-pointer"
                      >
                        <Check className="w-6 h-6" />✓ Yes, I Allow This
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          onResolveAutonomy && onResolveAutonomy(item.id, 'declined_by_elder')
                        }
                        className="min-h-[56px] px-6 py-3 rounded-xl bg-white border-2 border-slate-400 text-slate-900 text-lg font-extrabold flex items-center gap-2 cursor-pointer"
                      >
                        <X className="w-6 h-6" />✕ No, Keep As Before
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-lg text-slate-700">
                No pending requests from family right now. You are completely in control.
              </p>
            )}
          </section>

          {/* Simple Privacy & Independence Settings */}
          <section className="rounded-3xl bg-[#FFFDF7] border-2 border-slate-300 p-6 sm:p-8 space-y-4 shadow-sm">
            <h3 className="text-2xl font-extrabold text-slate-900">My Privacy & Control</h3>
            <div className="space-y-3">
              {[
                {
                  key: 'requireElderApprovalForScheduleDeletion',
                  label: 'Ask my permission before removing or changing my medicines',
                },
                {
                  key: 'allowFamilyMissedDoseEscalation',
                  label: 'Email my family or caregiver if I miss a medicine by 30 minutes',
                },
                {
                  key: 'voiceAnnouncementsEnabled',
                  label: 'Allow spoken voice reminders in easy language',
                },
                {
                  key: 'shareMoodWithFamily',
                  label: 'Share my daily feeling check-in with my trusted family',
                },
              ].map((opt) => {
                const enabled = Boolean(prefs[opt.key]);
                return (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() =>
                      onUpdateAutonomyPrefs &&
                      onUpdateAutonomyPrefs({ ...prefs, [opt.key]: !enabled })
                    }
                    className="w-full min-h-[64px] rounded-2xl bg-white border-2 border-slate-300 p-4 flex items-center justify-between gap-4 text-left cursor-pointer hover:bg-slate-50"
                  >
                    <span className="text-lg font-bold text-slate-900">{opt.label}</span>
                    <span
                      className={`px-4 py-2 rounded-xl text-base font-extrabold shrink-0 ${
                        enabled ? 'bg-teal-700 text-white' : 'bg-slate-200 text-slate-800'
                      }`}
                    >
                      {enabled ? 'ON ✓' : 'OFF'}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
