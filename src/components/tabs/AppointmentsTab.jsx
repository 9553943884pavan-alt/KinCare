import React from 'react';
import { FileText, Plus, Check, Download, Mail, Edit3, Trash2 } from 'lucide-react';
import { downloadAppointmentICS } from '../../utils/api.js';

/**
 * Tab 3: Upcoming Doctor Appointments, Pre-Visit Clinical Briefs, and Daily Healthcare Routines.
 */
export default function AppointmentsTab({
  elderProfile,
  appointments,
  routines,
  doctorBrief,
  doctorBriefLoading,
  newRoutineTime,
  setNewRoutineTime,
  newRoutineTitle,
  setNewRoutineTitle,
  onGenerateDoctorBrief,
  onOpenNewApptModal,
  onEditAppt,
  onToggleAppointmentStatus,
  onDispatchEmail,
  setActiveTab,
  onDeleteAppointment,
  onAddRoutine,
  onToggleRoutine,
  onDeleteRoutine,
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Upcoming Doctor Appointments */}
      <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900">
              Upcoming Doctor Appointments &amp; Pre-Visit Preparation
            </h2>
            <p className="text-xs text-slate-500">
              Keep family members informed, export calendar invites, and generate AI clinical summaries
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onGenerateDoctorBrief}
              disabled={doctorBriefLoading}
              className="px-3.5 py-2 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-900 border border-teal-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <FileText className="w-4 h-4 text-teal-700" />
              {doctorBriefLoading ? 'Generating...' : 'AI Doctor Visit Brief'}
            </button>
            <button
              type="button"
              onClick={onOpenNewApptModal}
              className="px-3.5 py-2 rounded-xl bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              New Appointment
            </button>
          </div>
        </div>

        {doctorBrief && (
          <div className="p-5 rounded-2xl bg-teal-950 text-white space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wider text-teal-300">
                AI Clinical Handoff Summary for {doctorBrief.targetAppointment}
              </span>
              <button
                type="button"
                onClick={() => window.print()}
                className="text-xs font-bold text-amber-300 underline cursor-pointer"
              >
                Print for Doctor
              </button>
            </div>
            <p className="text-sm font-bold">
              Adherence: {doctorBrief.overallAdherenceRate} • {doctorBrief.vitalsSummary}
            </p>
            <ul className="list-disc list-inside text-xs text-teal-100 space-y-1">
              {doctorBrief.keyObservations.map((obs, i) => (
                <li key={i}>{obs}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="space-y-3.5">
          {appointments.map((appt) => (
            <div
              key={appt.id}
              className="p-5 rounded-2xl border border-slate-200 bg-slate-50/60 space-y-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <span className="text-xs font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                    {appt.date} at {appt.time} • {appt.mode}
                  </span>
                  <h3 className="text-lg font-extrabold text-slate-900 mt-1">
                    {appt.doctorName} — <span className="text-indigo-700">{appt.specialty}</span>
                  </h3>
                  <p className="text-xs text-slate-600">
                    📍 {appt.hospital} • Accompanied by: <strong>{appt.accompaniedBy}</strong>
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onToggleAppointmentStatus(appt)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer ${
                      String(appt.status || '').toLowerCase() === 'completed'
                        ? 'bg-emerald-700 text-white'
                        : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300'
                    }`}
                  >
                    <Check className="w-3.5 h-3.5" />
                    {String(appt.status || '').toLowerCase() === 'completed' ? 'Completed' : 'Mark Done'}
                  </button>
                  <button
                    type="button"
                    onClick={() => downloadAppointmentICS(appt, elderProfile.name)}
                    className="px-3 py-1.5 rounded-xl bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    .ICS Calendar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onDispatchEmail('APPOINTMENT_REMINDER', appt.id);
                      setActiveTab('emails');
                    }}
                    className="px-3 py-1.5 rounded-xl bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    Email Reminder
                  </button>
                  <button
                    type="button"
                    onClick={() => onEditAppt(appt)}
                    className="p-1.5 rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 cursor-pointer"
                    title="Edit appointment"
                    aria-label={`Edit appointment with ${appt.doctorName}`}
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteAppointment(appt.id)}
                    className="p-1.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 cursor-pointer"
                    title="Cancel appointment"
                    aria-label={`Cancel appointment with ${appt.doctorName}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {appt.preparationNotes && (
                <p className="text-xs bg-white p-3 rounded-xl border border-slate-200 text-slate-700">
                  <strong>Checklist:</strong> {appt.preparationNotes}
                </p>
              )}
              {appt.elderQuestions && (
                <p className="text-xs bg-teal-50 p-3 rounded-xl border border-teal-200 text-teal-900">
                  <strong>{elderProfile.preferredName}&apos;s Question for Doctor:</strong> &quot;{appt.elderQuestions}&quot;
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Daily Healthcare Routines */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
        <h2 className="text-lg font-extrabold text-slate-900">Daily Healthcare Routines</h2>
        <p className="text-xs text-slate-500">
          Hydration, mobility exercises, vitals checks &amp; preventive foot care
        </p>

        <form onSubmit={onAddRoutine} className="flex gap-2">
          <input
            type="time"
            aria-label="Routine time"
            value={newRoutineTime}
            onChange={(e) => setNewRoutineTime(e.target.value)}
            className="px-2.5 py-2 rounded-xl border border-slate-300 text-xs font-bold"
          />
          <input
            type="text"
            aria-label="Routine title"
            value={newRoutineTitle}
            onChange={(e) => setNewRoutineTitle(e.target.value)}
            placeholder="Add routine (e.g. Evening Walk)"
            className="flex-1 px-3 py-2 rounded-xl border border-slate-300 text-xs"
          />
          <button
            type="submit"
            className="px-3 py-2 rounded-xl bg-teal-700 text-white text-xs font-bold cursor-pointer"
          >
            Add
          </button>
        </form>

        <div className="space-y-2.5">
          {routines.map((r) => (
            <div
              key={r.id}
              onClick={() => onToggleRoutine(r.id, !r.completed)}
              className={`p-3.5 rounded-2xl border flex items-start gap-3 cursor-pointer transition ${
                r.completed ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <input
                type="checkbox"
                checked={r.completed}
                onChange={() => {}}
                aria-label={`Mark routine ${r.title} complete`}
                className="mt-1 w-4 h-4 accent-emerald-700"
              />
              <div className="flex-1 text-xs">
                <p className={`font-bold ${r.completed ? 'line-through text-emerald-800' : 'text-slate-900'}`}>
                  {r.time} — {r.title}
                </p>
                <p className="text-slate-500 mt-0.5">{r.notes}</p>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteRoutine(r.id);
                }}
                className="p-1 rounded-lg border border-rose-200 bg-white text-rose-600 hover:bg-rose-50 shrink-0 cursor-pointer"
                title="Delete routine"
                aria-label={`Delete routine ${r.title}`}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
