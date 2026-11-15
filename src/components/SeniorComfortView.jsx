import React, { useState } from 'react';
import {
  Volume2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Heart,
  ShieldCheck,
  Sparkles,
  PhoneCall,
  Calendar,
  Activity,
  ThumbsUp,
  ThumbsDown,
  Mic,
  Send,
} from 'lucide-react';
import { speakText } from '../utils/api.js';

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
  const [companionQuestion, setCompanionQuestion] = useState('');
  const [companionReply, setCompanionReply] = useState('');
  const [companionLoading, setCompanionLoading] = useState(false);
  const [companionLang, setCompanionLang] = useState('English');
  const [vitalsForm, setVitalsForm] = useState({
    systolic: 126,
    diastolic: 80,
    bloodSugarMgDl: 110,
    mood: 'Feeling Good & Steady',
  });
  const [vitalsSavedMsg, setVitalsSavedMsg] = useState('');

  const pendingConsents = autonomyDecisions.filter((d) => d.status === 'pending_elder_approval');

  const getPillVisualStyle = (color, shape) => {
    const colorMap = {
      White: 'bg-white border-2 border-slate-300 text-slate-800',
      Blue: 'bg-sky-200 border-2 border-sky-500 text-sky-950',
      Yellow: 'bg-amber-200 border-2 border-amber-500 text-amber-950',
      Pink: 'bg-pink-200 border-2 border-pink-500 text-pink-950',
      Green: 'bg-emerald-200 border-2 border-emerald-500 text-emerald-950',
    };
    const isRound = (shape || '').toLowerCase().includes('round');
    return `${colorMap[color] || colorMap.White} ${isRound ? 'w-12 h-12 rounded-full' : 'w-16 h-9 rounded-full'}`;
  };

  const handleReadTodaySummary = () => {
    const taken = medications.filter((m) => m.status === 'taken').length;
    const missed = medications.filter((m) => m.status === 'missed');
    const upcoming = medications.filter((m) => m.status === 'upcoming');
    const text = `Namaste ${elderProfile.preferredName}. Today you have taken ${taken} of ${medications.length} medicines. ${
      missed.length > 0
        ? `Please note: your ${missed[0].scheduledTime} tablet ${missed[0].name}, ${missed[0].dosage}, the ${missed[0].pillColor} ${missed[0].pillShape} for ${missed[0].purpose}, has not been marked taken yet.`
        : 'All your morning medicines are complete!'
    } ${
      upcoming.length > 0
        ? `Your next medicine is ${upcoming[0].name} at ${upcoming[0].scheduledTime}, ${upcoming[0].mealInstruction}.`
        : ''
    }`;
    speakText(text);
  };

  const handleAskAI = async (presetQ) => {
    const q = presetQ || companionQuestion;
    if (!q.trim()) return;
    setCompanionLoading(true);
    try {
      const res = await onAskCompanion(q, companionLang);
      setCompanionReply(res.reply);
      speakText(res.reply, companionLang.includes('Hindi') ? 'hi-IN' : 'en-IN');
      if (!presetQ) setCompanionQuestion('');
    } finally {
      setCompanionLoading(false);
    }
  };

  const handleVoiceMicInput = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      handleAskAI('What is my next tablet today and why do I take it?');
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = companionLang.includes('Hindi') ? 'hi-IN' : 'en-IN';
    recognition.start();
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setCompanionQuestion(transcript);
      handleAskAI(transcript);
    };
  };

  const handleQuickVitalsSubmit = async (e) => {
    e.preventDefault();
    await onLogVitals({
      ...vitalsForm,
      loggedBy: elderProfile.name,
    });
    setVitalsSavedMsg('Your blood pressure, sugar, and mood have been shared with Priya & Nurse Anita!');
    speakText('Thank you Ramesh Ji. Your vitals and mood have been recorded.');
    setTimeout(() => setVitalsSavedMsg(''), 4000);
  };

  return (
    <div className="space-y-8" aria-label="Senior Comfort & Autonomy View">
      {/* Warm Senior Hero Banner with Voice Readout & Emergency SOS */}
      <section className="rounded-3xl bg-gradient-to-r from-teal-900 via-teal-800 to-emerald-800 text-white p-6 sm:p-8 shadow-xl border border-teal-700">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-teal-700/80 border border-teal-400/30 text-teal-100 text-xs font-bold uppercase tracking-wider">
              <Heart className="w-4 h-4 text-rose-300 fill-rose-300" />
              Senior Comfort & Autonomy Mode • You Are In Control
            </div>
            <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
              Namaste, {elderProfile.preferredName} 🙏
            </h2>
            <p className="text-teal-100 text-base sm:text-lg max-w-2xl">
              Here is your clear, step-by-step medication and wellness plan for today. Tap any speaker button to hear instructions aloud.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleReadTodaySummary}
              className="px-5 py-4 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-base flex items-center gap-2.5 shadow-lg transition cursor-pointer"
            >
              <Volume2 className="w-6 h-6" />
              Read My Day Aloud
            </button>

            <button
              type="button"
              onClick={onOpenEmergencyCard}
              className="px-4 py-4 rounded-2xl bg-white/15 hover:bg-white/25 text-white font-bold text-sm flex items-center gap-2 border border-white/25 transition cursor-pointer"
            >
              <ShieldCheck className="w-5 h-5 text-teal-200" />
              Medical ID Card
            </button>

            <button
              type="button"
              onClick={onTriggerSOS}
              className="px-5 py-4 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-base flex items-center gap-2 shadow-lg border-2 border-rose-300 transition cursor-pointer"
            >
              <PhoneCall className="w-5 h-5" />
              SOS Alert Family
            </button>
          </div>
        </div>
      </section>

      {/* Elder Autonomy & Consent Center (Keeping Elderly at the Centre of Decisions) */}
      <section className="rounded-3xl bg-amber-50 border-2 border-amber-300 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div className="flex items-start gap-3.5">
            <div className="p-3 rounded-2xl bg-amber-500 text-white shrink-0">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-xl font-extrabold text-slate-900">
                Your Care, Your Choice — Elder Decision & Autonomy Charter
              </h3>
              <p className="text-sm text-slate-700">
                Nothing in your routine changes without your comfort. Review proposals from your Care Circle or adjust what gets shared.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <label className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-amber-300 text-xs font-bold text-slate-800 cursor-pointer">
              <input
                type="checkbox"
                checked={elderProfile.autonomyPreferences?.allowFamilyMissedDoseEscalation ?? true}
                onChange={(e) =>
                  onUpdateAutonomyPrefs({
                    allowFamilyMissedDoseEscalation: e.target.checked,
                  })
                }
                className="w-4 h-4 accent-teal-700"
              />
              Notify Family if I Miss a Dose by 30m
            </label>
            <label className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-amber-300 text-xs font-bold text-slate-800 cursor-pointer">
              <input
                type="checkbox"
                checked={elderProfile.autonomyPreferences?.shareMoodWithFamily ?? true}
                onChange={(e) =>
                  onUpdateAutonomyPrefs({
                    shareMoodWithFamily: e.target.checked,
                  })
                }
                className="w-4 h-4 accent-teal-700"
              />
              Share My Daily Mood & Vitals
            </label>
          </div>
        </div>

        {pendingConsents.length > 0 ? (
          <div className="space-y-3">
            {pendingConsents.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-2xl p-5 border-2 border-amber-400 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div>
                  <span className="text-xs font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900">
                    Waiting for Your Approval • Proposed by {item.proposedBy}
                  </span>
                  <h4 className="text-lg font-extrabold text-slate-900 mt-1.5">{item.title}</h4>
                  <p className="text-sm text-slate-600 mt-0.5">{item.reason}</p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      onResolveAutonomy(item.id, 'approved_by_elder', 'Approved by Ramesh Ji');
                      speakText('You have approved this schedule change.');
                    }}
                    className="px-5 py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm flex items-center gap-2 cursor-pointer"
                  >
                    <ThumbsUp className="w-4 h-4" />
                    Approve Change
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onResolveAutonomy(item.id, 'declined_by_elder', 'Prefer keeping current time');
                      speakText('You have kept your original schedule.');
                    }}
                    className="px-4 py-3 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-sm flex items-center gap-2 cursor-pointer"
                  >
                    <ThumbsDown className="w-4 h-4" />
                    Keep Current Time
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm font-semibold text-emerald-800 bg-emerald-100/80 px-4 py-2.5 rounded-xl">
            ✓ All care schedule decisions are up to date and approved by you.
          </p>
        )}
      </section>

      {/* Large Visual Medication Cards for Elderly Users */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-2xl font-extrabold text-slate-900">
            💊 Today's Medicines (Visual Pill Guide & 1-Tap Check-In)
          </h3>
          <span className="text-sm font-bold text-teal-800 bg-teal-100 px-3.5 py-1.5 rounded-full">
            {medications.filter((m) => m.status === 'taken').length} of {medications.length} Taken Today
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {medications.map((med) => {
            const isTaken = med.status === 'taken';
            const isMissed = med.status === 'missed';

            return (
              <article
                key={med.id}
                className={`rounded-3xl p-6 border-2 transition shadow-sm flex flex-col justify-between ${
                  isTaken
                    ? 'bg-emerald-50/70 border-emerald-400'
                    : isMissed
                    ? 'bg-rose-50 border-rose-400 ring-2 ring-rose-200'
                    : 'bg-white border-slate-300 hover:border-teal-500'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <span
                      className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-extrabold ${
                        isTaken
                          ? 'bg-emerald-700 text-white'
                          : isMissed
                          ? 'bg-rose-700 text-white'
                          : 'bg-teal-800 text-white'
                      }`}
                    >
                      <Clock className="w-4 h-4" />
                      {med.scheduledTime} ({med.timeSlot})
                    </span>

                    <button
                      type="button"
                      onClick={() =>
                        speakText(
                          `${med.name}, ${med.dosage}. Take at ${med.scheduledTime}, ${med.mealInstruction}. Look for the ${med.pillColor} ${med.pillShape}. Purpose: ${med.purpose}.`
                        )
                      }
                      className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-teal-100 text-slate-800 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                      aria-label={`Read instructions aloud for ${med.name}`}
                    >
                      <Volume2 className="w-4 h-4 text-teal-700" />
                      Listen
                    </button>
                  </div>

                  {/* Pill Visual Representation + Name */}
                  <div className="flex items-center gap-4 mb-4">
                    <div
                      className={`shrink-0 flex items-center justify-center shadow-inner font-bold text-[10px] uppercase ${getPillVisualStyle(
                        med.pillColor,
                        med.pillShape
                      )}`}
                      title={`${med.pillColor} ${med.pillShape}`}
                    >
                      {med.pillColor}
                    </div>
                    <div>
                      <h4 className="text-xl font-extrabold text-slate-900">
                        {med.name} <span className="text-teal-700">({med.dosage})</span>
                      </h4>
                      <p className="text-sm font-bold text-slate-700 mt-0.5">
                        Visual Pill: {med.pillColor} {med.pillShape} • {med.mealInstruction}
                      </p>
                      <p className="text-xs font-medium text-slate-600 mt-1">
                        <strong>Why I take this:</strong> {med.purpose}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Big Touch Action Buttons */}
                <div className="pt-4 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-3">
                  {isTaken ? (
                    <div className="flex items-center justify-between w-full">
                      <span className="inline-flex items-center gap-2 text-emerald-800 font-extrabold text-base">
                        <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                        Taken Today ✓
                      </span>
                      <button
                        type="button"
                        onClick={() => onUpdateMedicationStatus(med.id, 'upcoming')}
                        className="text-xs font-semibold text-slate-500 underline hover:text-slate-800"
                      >
                        Undo
                      </button>
                    </div>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          onUpdateMedicationStatus(med.id, 'taken');
                          speakText(`Great job ${elderProfile.preferredName}! Marked ${med.name} as taken.`);
                        }}
                        className="flex-1 py-3.5 px-5 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-base flex items-center justify-center gap-2 shadow-sm transition cursor-pointer"
                      >
                        <CheckCircle2 className="w-5 h-5" />
                        I Have Taken This Pill
                      </button>

                      {!isMissed && (
                        <button
                          type="button"
                          onClick={() => onUpdateMedicationStatus(med.id, 'missed')}
                          className="py-3.5 px-4 rounded-2xl bg-rose-100 hover:bg-rose-200 text-rose-800 font-bold text-xs transition cursor-pointer"
                        >
                          Mark Missed
                        </button>
                      )}
                    </>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* Voice-First AI Care Companion + Daily Routines & Vitals */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Voice & Chat Care Companion */}
        <section className="rounded-3xl bg-white border-2 border-teal-200 p-6 shadow-sm flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-2xl bg-teal-100 text-teal-800">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-slate-900">
                    Ask KinCare AI Voice Companion
                  </h3>
                  <p className="text-xs text-slate-500">
                    Powered by Google Gemini • Speaks answers aloud
                  </p>
                </div>
              </div>

              <select
                value={companionLang}
                onChange={(e) => setCompanionLang(e.target.value)}
                aria-label="Select AI Companion Language"
                className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-bold bg-slate-50"
              >
                <option value="English">English</option>
                <option value="Hindi & English Bilingual">Hindi + English (Namaste)</option>
              </select>
            </div>

            {/* 1-Tap Senior Question Buttons */}
            <div className="flex flex-wrap gap-2 mb-4">
              {[
                'What pill do I take right now?',
                'Tell me about my next doctor visit',
                'I feel slightly dizzy — what should I do?',
              ].map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => handleAskAI(q)}
                  className="px-3.5 py-2 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-900 border border-teal-200 text-xs font-bold transition cursor-pointer"
                >
                  "{q}"
                </button>
              ))}
            </div>

            {companionReply && (
              <div className="p-4 rounded-2xl bg-teal-900 text-white space-y-2 mb-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-teal-200">
                    KinCare AI Response
                  </span>
                  <button
                    type="button"
                    onClick={() => speakText(companionReply)}
                    className="text-xs font-bold text-amber-300 flex items-center gap-1"
                  >
                    <Volume2 className="w-4 h-4" /> Replay Voice
                  </button>
                </div>
                <p className="text-sm sm:text-base leading-relaxed">{companionReply}</p>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleVoiceMicInput}
              className="p-3.5 rounded-2xl bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold shrink-0 cursor-pointer"
              title="Speak your question with microphone"
              aria-label="Speak question with microphone"
            >
              <Mic className="w-5 h-5" />
            </button>
            <input
              type="text"
              value={companionQuestion}
              onChange={(e) => setCompanionQuestion(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAskAI()}
              placeholder="Type or tap mic to ask anything..."
              className="flex-1 px-4 py-3.5 rounded-2xl border border-slate-300 text-sm"
            />
            <button
              type="button"
              disabled={companionLoading}
              onClick={() => handleAskAI()}
              className="px-5 py-3.5 rounded-2xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-sm flex items-center gap-1.5 cursor-pointer"
            >
              <Send className="w-4 h-4" />
              {companionLoading ? '...' : 'Ask'}
            </button>
          </div>
        </section>

        {/* Daily Wellness Routine + Quick Vitals Check-In */}
        <section className="rounded-3xl bg-white border-2 border-slate-200 p-6 shadow-sm space-y-5">
          <h3 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
            <Activity className="w-5 h-5 text-teal-700" />
            Daily Wellness Routines & How I Feel Today
          </h3>

          <div className="space-y-2.5">
            {routines.map((r) => (
              <div
                key={r.id}
                onClick={() => onToggleRoutine(r.id, !r.completed)}
                className={`p-3.5 rounded-2xl border flex items-center justify-between cursor-pointer transition ${
                  r.completed
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                    : 'bg-slate-50 border-slate-200 hover:border-teal-400'
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={r.completed}
                    onChange={() => {}}
                    className="w-5 h-5 accent-emerald-700"
                    aria-label={r.title}
                  />
                  <div>
                    <p className={`font-bold text-sm ${r.completed ? 'line-through text-emerald-800' : 'text-slate-900'}`}>
                      {r.time} — {r.title}
                    </p>
                    <p className="text-xs text-slate-500">{r.notes}</p>
                  </div>
                </div>
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-white border border-slate-200">
                  {r.completed ? 'Done ✓' : 'Tap to Complete'}
                </span>
              </div>
            ))}
          </div>

          {/* Quick Vitals & Mood Logger */}
          <form onSubmit={handleQuickVitalsSubmit} className="pt-4 border-t border-slate-200 space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Quick Morning Vitals & Comfort Log
            </p>
            <div className="grid grid-cols-3 gap-2.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-600">Systolic BP</label>
                <input
                  type="number"
                  value={vitalsForm.systolic}
                  onChange={(e) => setVitalsForm({ ...vitalsForm, systolic: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-bold"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600">Diastolic BP</label>
                <input
                  type="number"
                  value={vitalsForm.diastolic}
                  onChange={(e) => setVitalsForm({ ...vitalsForm, diastolic: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-bold"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600">Sugar (mg/dL)</label>
                <input
                  type="number"
                  value={vitalsForm.bloodSugarMgDl}
                  onChange={(e) => setVitalsForm({ ...vitalsForm, bloodSugarMgDl: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-bold"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={vitalsForm.mood}
                onChange={(e) => setVitalsForm({ ...vitalsForm, mood: e.target.value })}
                className="flex-1 px-3 py-2.5 rounded-xl border border-slate-300 text-xs font-bold bg-white"
              >
                <option value="Feeling Good & Steady">😊 Feeling Good & Steady</option>
                <option value="Energetic after Morning Walk">🚶 Energetic after Morning Walk</option>
                <option value="Slightly Tired Today">😴 Slightly Tired Today</option>
                <option value="Mild Knee Stiffness">🦵 Mild Knee Stiffness</option>
              </select>
              <button
                type="submit"
                className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold cursor-pointer"
              >
                Save Log
              </button>
            </div>
            {vitalsSavedMsg && <p className="text-xs font-bold text-emerald-700">{vitalsSavedMsg}</p>}
          </form>
        </section>
      </div>
    </div>
  );
}
