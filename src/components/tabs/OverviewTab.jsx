import React from 'react';
import {
  HeartPulse,
  ShieldCheck,
  Pill,
  Calendar,
  Mail,
  Plus,
  Edit3,
  Trash2,
  Download,
} from 'lucide-react';
import { exportAdherenceReportCSV } from '../../utils/api.js';

/**
 * Tab 1: Ecosystem Overview featuring KPIs, Medication Timeline, Adherence Chart,
 * Care Circle Management, Vitals Logger, Elder Consent Proposals, and Activity Feed.
 */
export default function OverviewTab({
  elderProfile,
  summaryMetrics,
  appointments,
  vitalsLog,
  emailLogs,
  medications,
  adherenceHistory,
  careCircleMembers,
  autonomyDecisions,
  emailSending,
  cmdVitals,
  setCmdVitals,
  proposalTitle,
  setProposalTitle,
  proposalReason,
  setProposalReason,
  activityFeed,
  onOpenElderProfileModal,
  onQuickRoleSwitch,
  onSimulate9AmMissed,
  setActiveTab,
  onOpenNewMedModal,
  onEditMed,
  onUpdateMedicationStatus,
  onRestockMedication,
  onOpenPasscodeModal,
  onDeleteCareMember,
  onToggleMemberNotify,
  onSubmitCommandVitals,
  onCreateProposal,
}) {
  return (
    <div className="space-y-6">
      {/* 3-Step Workflow Guide Banner */}
      <section className="rounded-3xl bg-gradient-to-r from-teal-800 via-teal-700 to-indigo-800 text-white p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4">
          <div>
            <span className="text-[11px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full bg-white/15 text-teal-100">
              How KinCare AI Works — 3 Simple Steps
            </span>
            <h2 className="text-lg sm:text-xl font-extrabold mt-2">
              Easy Workflow for Families, Caregivers &amp; Seniors
            </h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onOpenElderProfileModal}
              className="px-3.5 py-2 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-white text-xs font-extrabold cursor-pointer"
            >
              Edit Patient Profile
            </button>
            <button
              type="button"
              onClick={() =>
                exportAdherenceReportCSV({
                  elderProfile,
                  medications,
                  vitalsLog,
                  appointments,
                })
              }
              className="px-3.5 py-2 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-white text-xs font-extrabold flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              CSV Care Report
            </button>
            <button
              type="button"
              onClick={() => onQuickRoleSwitch('elder')}
              className="px-3.5 py-2 rounded-xl bg-white text-teal-900 hover:bg-teal-50 text-xs font-extrabold cursor-pointer"
            >
              Try Simple Senior View →
            </button>
            <button
              type="button"
              disabled={emailSending}
              onClick={() => {
                onSimulate9AmMissed();
                setActiveTab('emails');
              }}
              className="px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-extrabold cursor-pointer"
            >
              Test 9:00 AM Missed Alert Email →
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="rounded-2xl bg-white/10 border border-white/15 p-3.5">
            <p className="text-xs font-extrabold text-amber-300 uppercase">Step 1 • Setup Care</p>
            <p className="text-sm font-bold mt-0.5">Family or Caregiver adds pills &amp; visits</p>
            <p className="text-xs text-teal-100 mt-1">
              Scan a prescription or manage schedules cleanly in tabs above.
            </p>
          </div>
          <div className="rounded-2xl bg-white/10 border border-white/15 p-3.5">
            <p className="text-xs font-extrabold text-amber-300 uppercase">Step 2 • Senior 1-Tap</p>
            <p className="text-sm font-bold mt-0.5">Elderly person confirms in comfort mode</p>
            <p className="text-xs text-teal-100 mt-1">
              One big &quot;I Took This Medicine&quot; button, Voice Helper, &amp; 1-tap mood check.
            </p>
          </div>
          <div className="rounded-2xl bg-white/10 border border-white/15 p-3.5">
            <p className="text-xs font-extrabold text-amber-300 uppercase">Step 3 • Auto Email</p>
            <p className="text-sm font-bold mt-0.5">Missed 9:00 AM doses trigger instant email</p>
            <p className="text-xs text-teal-100 mt-1">
              Unconfirmed doses automatically alert trusted contacts via Resend.
            </p>
          </div>
        </div>
      </section>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase">
            <span>Today&apos;s Adherence</span>
            <Pill className="w-4 h-4 text-teal-600" />
          </div>
          <p className="text-3xl font-extrabold text-slate-900 mt-2">
            {summaryMetrics.takenMeds} / {summaryMetrics.totalMeds}
          </p>
          <p className="text-xs font-semibold text-teal-700 mt-1">
            {summaryMetrics.missedMeds > 0
              ? `${summaryMetrics.missedMeds} dose overdue • ${summaryMetrics.upcomingMeds} upcoming`
              : 'All past doses taken on time'}
          </p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase">
            <span>Next Doctor Visit</span>
            <Calendar className="w-4 h-4 text-indigo-600" />
          </div>
          <p className="text-lg font-extrabold text-slate-900 mt-2 truncate">
            {appointments[0]?.doctorName || 'None Scheduled'}
          </p>
          <p className="text-xs font-semibold text-indigo-700 mt-1">
            {appointments[0]
              ? `${appointments[0].date} at ${appointments[0].time} (${appointments[0].specialty})`
              : 'Add an appointment'}
          </p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase">
            <span>Latest Vitals &amp; Mood</span>
            <HeartPulse className="w-4 h-4 text-rose-600" />
          </div>
          <p className="text-2xl font-extrabold text-slate-900 mt-2">
            {vitalsLog[0] ? `${vitalsLog[0].systolic}/${vitalsLog[0].diastolic}` : '128/82'}{' '}
            <span className="text-xs font-normal text-slate-500">mmHg</span>
          </p>
          <p className="text-xs font-semibold text-emerald-700 mt-1">
            Sugar: {vitalsLog[0]?.bloodSugarMgDl || 112} mg/dL • {vitalsLog[0]?.mood}
          </p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase">
            <span>Proactive Email Alerts</span>
            <Mail className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-3xl font-extrabold text-slate-900 mt-2">{emailLogs.length}</p>
          <button
            type="button"
            onClick={() => setActiveTab('emails')}
            className="text-xs font-bold text-teal-700 hover:underline mt-1 inline-block cursor-pointer"
          >
            View Live Email Outbox →
          </button>
        </div>
      </div>

      {/* Middle Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Shared Medication Schedule */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-extrabold text-slate-900">
                Today&apos;s Medication Schedule &amp; Adherence Tracker
              </h2>
              <p className="text-xs text-slate-500">
                Real-time shared status across Elder, Family &amp; Caretaker devices
              </p>
            </div>
            <button
              type="button"
              onClick={onOpenNewMedModal}
              className="px-3.5 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Add Medication
            </button>
          </div>

          <div className="space-y-3">
            {medications.map((med) => (
              <div
                key={med.id}
                className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition ${
                  med.status === 'taken'
                    ? 'bg-emerald-50/50 border-emerald-200'
                    : med.status === 'missed'
                    ? 'bg-rose-50/70 border-rose-300'
                    : 'bg-slate-50/70 border-slate-200'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-md bg-slate-900 text-white text-xs font-mono font-bold">
                      {med.scheduledTime}
                    </span>
                    <h3 className="font-extrabold text-slate-900 text-base">
                      {med.name} <span className="text-teal-700">({med.dosage})</span>
                    </h3>
                    <span
                      className={`text-[11px] font-extrabold uppercase px-2.5 py-0.5 rounded-full ${
                        med.status === 'taken'
                          ? 'bg-emerald-100 text-emerald-800'
                          : med.status === 'missed'
                          ? 'bg-rose-200 text-rose-900'
                          : 'bg-amber-100 text-amber-900'
                      }`}
                    >
                      {med.status}
                    </span>
                    {med.stockRemaining <= med.refillThreshold && (
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700">
                        Low Stock: {med.stockRemaining} left
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600">
                    <strong>{med.mealInstruction}</strong> • Visual: {med.pillColor} {med.pillShape} • Purpose:{' '}
                    {med.purpose}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {med.status !== 'taken' && (
                    <button
                      type="button"
                      onClick={() => onUpdateMedicationStatus(med.id, 'taken')}
                      className="px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold cursor-pointer"
                    >
                      Mark Taken
                    </button>
                  )}
                  {med.status !== 'missed' && (
                    <button
                      type="button"
                      onClick={() => onUpdateMedicationStatus(med.id, 'missed')}
                      className="px-3 py-1.5 rounded-xl bg-rose-100 hover:bg-rose-200 text-rose-800 text-xs font-bold cursor-pointer"
                    >
                      Missed
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => onRestockMedication(med)}
                    className="px-2.5 py-1.5 rounded-xl border border-teal-300 bg-teal-50 hover:bg-teal-100 text-teal-900 text-[11px] font-bold cursor-pointer"
                    title="Refill +30 pills into stock"
                  >
                    + Refill 30
                  </button>
                  <button
                    type="button"
                    onClick={() => onEditMed(med)}
                    className="p-2 rounded-xl border border-slate-200 hover:bg-white text-slate-600 cursor-pointer"
                    title="Edit Medication"
                    aria-label={`Edit ${med.name}`}
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Weekly Adherence + Care Circle */}
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs">
            <h3 className="text-base font-extrabold text-slate-900 mb-1">Weekly Adherence Trend</h3>
            <p className="text-xs text-slate-500 mb-4">
              Consistent morning adherence; 09:00 AM BP dose needs gentle follow-up
            </p>
            <div className="grid grid-cols-6 gap-2 items-end h-32 pt-4 px-2 bg-slate-50 rounded-2xl border border-slate-100">
              {adherenceHistory.map((item) => (
                <div key={item.day} className="flex flex-col items-center gap-1.5 h-full justify-end">
                  <span className="text-[10px] font-bold text-slate-600">{item.adherencePct}%</span>
                  <div
                    className={`w-full rounded-t-lg transition-all ${
                      item.adherencePct === 100 ? 'bg-teal-600' : 'bg-amber-500'
                    }`}
                    style={{ height: `${Math.max(20, item.adherencePct * 0.7)}%` }}
                  />
                  <span className="text-[11px] font-bold text-slate-700 pb-1">{item.day}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-slate-900">Authorized Care Circle</h3>
              <button
                type="button"
                onClick={onOpenPasscodeModal}
                className="text-xs font-bold text-teal-700 hover:underline cursor-pointer"
              >
                + Manage Passcodes
              </button>
            </div>
            <div className="space-y-2.5">
              {careCircleMembers.map((m) => (
                <div
                  key={m.id}
                  className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="font-bold text-slate-900">
                        {m.name}{' '}
                        <span className="text-[10px] uppercase px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 ml-1">
                          {m.role}
                        </span>
                      </p>
                      <p className="text-slate-500">{m.email}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-[11px] font-bold text-slate-600 bg-white px-2 py-1 rounded-lg border border-slate-200">
                        {m.passcodePlainHint ? `PIN: ${m.passcodePlainHint}` : 'Passcode Protected'}
                      </span>
                      {m.role !== 'elder' && (
                        <button
                          type="button"
                          onClick={() => onDeleteCareMember(m.id)}
                          className="p-1.5 rounded-lg border border-rose-200 bg-white text-rose-600 hover:bg-rose-50 cursor-pointer"
                          title="Remove Care Circle member"
                          aria-label={`Remove ${m.name}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-200/70">
                    <span className="text-[10px] font-bold uppercase text-slate-500 mr-1">
                      Email Alerts:
                    </span>
                    {[
                      { key: 'notifyOnMissedMed', label: 'Missed Med' },
                      { key: 'notifyOnUpcomingDose', label: 'Upcoming' },
                      { key: 'notifyOnAppointment', label: 'Visits' },
                    ].map((pref) => {
                      const enabled = Boolean(m[pref.key]);
                      return (
                        <button
                          key={pref.key}
                          type="button"
                          onClick={() => onToggleMemberNotify(m.id, pref.key, !enabled)}
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold border cursor-pointer ${
                            enabled
                              ? 'bg-emerald-100 border-emerald-300 text-emerald-900'
                              : 'bg-white border-slate-300 text-slate-500'
                          }`}
                        >
                          {enabled ? '✓ ' : ''}
                          {pref.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Vitals Logger & Elder Autonomy Proposals */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                Clinical Vitals &amp; Check-In Logger
              </h3>
              <p className="text-xs text-slate-500">
                Record BP, Heart Rate, Sugar &amp; Mood (syncs to Doctor Brief &amp; Daily Digest)
              </p>
            </div>
            <HeartPulse className="w-5 h-5 text-rose-600" />
          </div>

          <form onSubmit={onSubmitCommandVitals} className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            <label className="block text-[11px] font-bold text-slate-700">
              BP Systolic
              <input
                type="number"
                value={cmdVitals.systolic}
                onChange={(e) => setCmdVitals({ ...cmdVitals, systolic: e.target.value })}
                className="mt-1 w-full px-2.5 py-2 rounded-xl border border-slate-300 text-xs font-bold"
              />
            </label>
            <label className="block text-[11px] font-bold text-slate-700">
              BP Diastolic
              <input
                type="number"
                value={cmdVitals.diastolic}
                onChange={(e) => setCmdVitals({ ...cmdVitals, diastolic: e.target.value })}
                className="mt-1 w-full px-2.5 py-2 rounded-xl border border-slate-300 text-xs font-bold"
              />
            </label>
            <label className="block text-[11px] font-bold text-slate-700">
              Pulse (bpm)
              <input
                type="number"
                value={cmdVitals.heartRate}
                onChange={(e) => setCmdVitals({ ...cmdVitals, heartRate: e.target.value })}
                className="mt-1 w-full px-2.5 py-2 rounded-xl border border-slate-300 text-xs font-bold"
              />
            </label>
            <label className="block text-[11px] font-bold text-slate-700">
              Glucose mg/dL
              <input
                type="number"
                value={cmdVitals.bloodSugarMgDl}
                onChange={(e) => setCmdVitals({ ...cmdVitals, bloodSugarMgDl: e.target.value })}
                className="mt-1 w-full px-2.5 py-2 rounded-xl border border-slate-300 text-xs font-bold"
              />
            </label>
            <div className="flex items-end col-span-2 sm:col-span-1">
              <button
                type="submit"
                className="w-full py-2.5 px-3 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-extrabold cursor-pointer"
              >
                Log Vitals
              </button>
            </div>
          </form>

          <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
            {vitalsLog.slice(0, 4).map((v) => (
              <div
                key={v.id}
                className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs"
              >
                <span className="font-bold text-slate-800">
                  BP {v.systolic}/{v.diastolic} • HR {v.heartRate || 72} bpm • Glucose{' '}
                  {v.bloodSugarMgDl} mg/dL
                </span>
                <span className="text-slate-500">
                  {v.mood} ({v.recordedAt})
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                Elder Consent &amp; Autonomy Proposals
              </h3>
              <p className="text-xs text-slate-500">
                Propose care changes for {elderProfile.preferredName}&apos;s 1-tap Yes/No approval in Senior View
              </p>
            </div>
            <ShieldCheck className="w-5 h-5 text-indigo-700" />
          </div>

          <form onSubmit={onCreateProposal} className="space-y-2.5">
            <input
              type="text"
              value={proposalTitle}
              onChange={(e) => setProposalTitle(e.target.value)}
              placeholder="Proposal title (e.g. Shift Evening Walk to 5:30 PM)"
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-semibold"
            />
            <div className="flex gap-2">
              <input
                type="text"
                value={proposalReason}
                onChange={(e) => setProposalReason(e.target.value)}
                placeholder="Plain-language reason for elder..."
                className="flex-1 px-3.5 py-2 rounded-xl border border-slate-300 text-xs"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-extrabold shrink-0 cursor-pointer"
              >
                Send Request
              </button>
            </div>
          </form>

          <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
            {autonomyDecisions.slice(0, 4).map((dec) => (
              <div
                key={dec.id}
                className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-2 text-xs"
              >
                <div className="min-w-0">
                  <p className="font-bold text-slate-800 truncate">{dec.title}</p>
                  <p className="text-slate-500 truncate">By {dec.proposedBy}</p>
                </div>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase shrink-0 ${
                    dec.status === 'approved_by_elder'
                      ? 'bg-emerald-100 text-emerald-800'
                      : dec.status === 'declined_by_elder'
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-amber-100 text-amber-900'
                  }`}
                >
                  {dec.status.replace(/_/g, ' ')}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Live Collaborative Care Activity Feed */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs">
        <h3 className="text-base font-extrabold text-slate-900 mb-3">
          Real-Time Care Circle Audit &amp; Activity Log
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {activityFeed.slice(0, 6).map((act) => (
            <div
              key={act.id}
              className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1"
            >
              <div className="flex items-center justify-between text-slate-500 font-semibold">
                <span>{act.actor}</span>
                <span>{act.timestamp}</span>
              </div>
              <p className="text-slate-800 font-medium">{act.action}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
