import React from 'react';
import {
  Mic,
  Volume2,
  CheckCircle2,
  PhoneCall,
  HeartPulse,
  Sparkles,
  Check,
  X,
  CreditCard,
  ChevronDown,
  ChevronUp,
  Send,
} from 'lucide-react';
import { speakText } from '../../utils/api.js';

export function formatReadableTime(timeStr = '09:00') {
  const [hStr, mStr = '00'] = String(timeStr).split(':');
  const h = Number.parseInt(hStr, 10);
  if (Number.isNaN(h)) return timeStr;
  const suffix = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${mStr.padStart(2, '0')} ${suffix}`;
}

/**
 * Senior Screen 2: 1-Tap Mood Check-in, Optional Vitals, Daily Habits & Next Doctor Visit.
 */
export function SeniorDayDoctorScreen({
  selectedMood,
  moodSavedText,
  showVitalsForm,
  setShowVitalsForm,
  bpInput,
  setBpInput,
  savingVitals,
  routines,
  nextAppointment,
  doctorQuestionInput,
  setDoctorQuestionInput,
  doctorQuestionSaved,
  setDoctorQuestionSaved,
  onMoodCheckIn,
  onSaveOptionalVitals,
  onToggleRoutine,
  onSaveAppointmentQuestion,
}) {
  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-[#FFFDF7] border-2 border-indigo-200 p-6 sm:p-8 shadow-sm">
        <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900">How Are You Feeling Today?</h3>
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
                aria-pressed={active}
                onClick={() => onMoodCheckIn(item.label)}
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

        <div className="mt-5 pt-4 border-t border-slate-200">
          <button
            type="button"
            aria-expanded={showVitalsForm}
            onClick={() => setShowVitalsForm((prev) => !prev)}
            className="min-h-[48px] text-base font-extrabold text-indigo-800 hover:text-indigo-950 flex items-center gap-2 cursor-pointer"
          >
            <HeartPulse className="w-5 h-5" />
            Record Blood Pressure or Sugar Numbers (Optional)
            {showVitalsForm ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>

          {showVitalsForm && (
            <form onSubmit={onSaveOptionalVitals} className="grid grid-cols-1 sm:grid-cols-4 gap-3 mt-4">
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

      <section className="rounded-3xl bg-sky-50 border-2 border-sky-300 p-6 sm:p-8 shadow-sm space-y-5">
        <h3 className="text-2xl font-extrabold text-slate-900">Next Doctor Visit</h3>
        {nextAppointment ? (
          <>
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
                {nextAppointment.elderQuestions && (
                  <p className="text-base font-bold text-teal-900 mt-2 bg-white px-4 py-2 rounded-xl border border-sky-200">
                    Saved question for doctor: &quot;{nextAppointment.elderQuestions}&quot;
                  </p>
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

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!doctorQuestionInput.trim() || !onSaveAppointmentQuestion) return;
                await onSaveAppointmentQuestion(nextAppointment, doctorQuestionInput.trim());
                setDoctorQuestionSaved(true);
                setTimeout(() => setDoctorQuestionSaved(false), 4000);
              }}
              className="pt-4 border-t border-sky-200 space-y-3"
            >
              <label htmlFor="senior-doctor-question" className="block text-lg font-extrabold text-slate-900">
                Add or Update Your Question for {nextAppointment.doctorName}:
              </label>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  id="senior-doctor-question"
                  type="text"
                  value={doctorQuestionInput}
                  onChange={(e) => setDoctorQuestionInput(e.target.value)}
                  placeholder={
                    nextAppointment.elderQuestions || 'e.g. Can we lower my morning blood pressure tablet?'
                  }
                  className="flex-1 min-h-[54px] rounded-2xl border-2 border-sky-300 bg-white px-4 py-3 text-lg font-semibold"
                />
                <button
                  type="submit"
                  className="min-h-[54px] px-6 py-3 rounded-2xl bg-teal-700 hover:bg-teal-800 text-white text-lg font-extrabold shrink-0 cursor-pointer"
                >
                  Save My Question
                </button>
              </div>
              {doctorQuestionSaved && (
                <p className="text-base font-bold text-emerald-800">
                  ✓ Saved! Your family and doctor brief will include this question.
                </p>
              )}
            </form>
          </>
        ) : (
          <p className="text-lg text-slate-700">No upcoming doctor appointments scheduled.</p>
        )}
      </section>
    </div>
  );
}

/**
 * Senior Screen 3: Multilingual Speech Input, Quick Question Cards & Spoken AI Reply.
 */
export function SeniorVoiceHelperScreen({
  voiceLanguage,
  setVoiceLanguage,
  voiceQuestion,
  setVoiceQuestion,
  voiceReply,
  isListening,
  isAsking,
  onStartSpeechInput,
  onAskQuestion,
}) {
  const speechLang = voiceLanguage === 'Hindi' ? 'hi-IN' : voiceLanguage === 'Telugu' ? 'te-IN' : 'en-IN';

  return (
    <section className="rounded-3xl bg-[#FFFDF7] border-2 border-sky-300 p-6 sm:p-8 space-y-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900">KinCare Voice Helper</h3>
          <p className="text-lg text-slate-700 mt-1">
            Ask any question in simple words and listen to the answer.
          </p>
        </div>
        <div
          className="inline-flex rounded-2xl bg-slate-100 p-1.5 border border-slate-300"
          role="group"
          aria-label="Voice Language"
        >
          {['English', 'Hindi', 'Telugu'].map((lang) => (
            <button
              key={lang}
              type="button"
              aria-pressed={voiceLanguage === lang}
              onClick={() => setVoiceLanguage(lang)}
              className={`px-4 py-2 rounded-xl text-base font-extrabold cursor-pointer ${
                voiceLanguage === lang ? 'bg-sky-700 text-white shadow-xs' : 'text-slate-800 hover:bg-white'
              }`}
            >
              {lang}
            </button>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={onStartSpeechInput}
        className={`w-full min-h-[84px] rounded-3xl text-2xl font-extrabold flex items-center justify-center gap-3 shadow-md transition cursor-pointer ${
          isListening ? 'bg-rose-600 text-white animate-pulse' : 'bg-sky-700 hover:bg-sky-800 text-white'
        }`}
      >
        <Mic className="w-8 h-8" />
        {isListening ? 'Listening... Please Speak Now' : '🎙️ Tap & Speak Your Question'}
      </button>

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
              onClick={() => onAskQuestion(q)}
              className="min-h-[72px] rounded-2xl bg-sky-50 hover:bg-sky-100 border-2 border-sky-300 p-4 text-left text-lg font-extrabold text-sky-950 flex items-center gap-2 cursor-pointer"
            >
              <Sparkles className="w-5 h-5 text-sky-700 shrink-0" />
              <span>{q}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          aria-label="Type your health question"
          value={voiceQuestion}
          onChange={(e) => setVoiceQuestion(e.target.value)}
          placeholder="Or type your question here..."
          className="flex-1 min-h-[56px] rounded-2xl border-2 border-slate-300 px-5 py-3 text-lg font-semibold bg-white"
        />
        <button
          type="button"
          disabled={isAsking || !voiceQuestion.trim()}
          onClick={() => onAskQuestion(voiceQuestion)}
          className="min-h-[56px] px-7 py-3 rounded-2xl bg-teal-700 hover:bg-teal-800 text-white text-lg font-extrabold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
        >
          <Send className="w-5 h-5" />
          {isAsking ? 'Thinking...' : 'Ask Helper'}
        </button>
      </div>

      <div className="rounded-3xl bg-white border-2 border-teal-400 p-6 space-y-4">
        <p className="text-sm font-extrabold uppercase tracking-wider text-teal-800">KinCare Helper Answer:</p>
        <p className="text-2xl leading-relaxed font-bold text-slate-900">{voiceReply}</p>
        <button
          type="button"
          onClick={() => speakText(voiceReply, speechLang)}
          className="min-h-[54px] px-5 py-3 rounded-2xl bg-amber-100 hover:bg-amber-200 border-2 border-amber-400 text-amber-950 text-lg font-extrabold inline-flex items-center gap-2 cursor-pointer"
        >
          <Volume2 className="w-6 h-6" />
          🔊 Listen Again
        </button>
      </div>
    </section>
  );
}

/**
 * Senior Screen 4: One-Tap Emergency SOS, Medical ID Wallet Card,
 * Pending Family Approvals, and Privacy/Independence Controls.
 */
export function SeniorChoicesSosScreen({
  sosSentBanner,
  onSendSOS,
  onOpenEmergencyCard,
  pendingApprovals,
  onResolveAutonomy,
  prefs,
  onUpdateAutonomyPrefs,
}) {
  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-rose-50 border-3 border-rose-400 p-6 sm:p-8 space-y-4 shadow-sm">
        <h3 className="text-2xl sm:text-3xl font-extrabold text-rose-950">Need Immediate Help?</h3>
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
            onClick={onSendSOS}
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

      <section className="rounded-3xl bg-white border-2 border-slate-300 p-6 sm:p-8 space-y-4 shadow-sm">
        <h3 className="text-2xl font-extrabold text-slate-900">Family Requests — Your Decision</h3>
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
                    onClick={() => onResolveAutonomy && onResolveAutonomy(item.id, 'approved_by_elder')}
                    className="min-h-[56px] px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-lg font-extrabold flex items-center gap-2 cursor-pointer"
                  >
                    <Check className="w-6 h-6" />✓ Yes, I Allow This
                  </button>
                  <button
                    type="button"
                    onClick={() => onResolveAutonomy && onResolveAutonomy(item.id, 'declined_by_elder')}
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

      <section className="rounded-3xl bg-[#FFFDF7] border-2 border-slate-300 p-6 sm:p-8 space-y-4 shadow-sm">
        <h3 className="text-2xl font-extrabold text-slate-900">My Privacy &amp; Control</h3>
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
                aria-pressed={enabled}
                onClick={() =>
                  onUpdateAutonomyPrefs && onUpdateAutonomyPrefs({ ...prefs, [opt.key]: !enabled })
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
  );
}
