import React from 'react';
import { Sparkles, Plus, Edit3, Trash2, Volume2, Download } from 'lucide-react';
import { speakText, exportAdherenceReportCSV } from '../../utils/api.js';

/**
 * Tab 2: Medication Schedule & Adherence Management with time-slot filters,
 * inventory restocking, and Gemini drug-interaction report viewer.
 */
export default function MedicationsTab({
  elderProfile,
  medications,
  filteredMedications,
  vitalsLog,
  appointments,
  slotFilter,
  setSlotFilter,
  interactionLoading,
  interactionReport,
  onRunInteractionCheck,
  onOpenNewMedModal,
  onEditMed,
  onDeleteMedication,
  onRestockMedication,
  onUpdateMedicationStatus,
}) {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900">
              Medication Schedule &amp; Adherence Management
            </h2>
            <p className="text-xs text-slate-500">
              Add, edit, or adjust doses, track pill inventory, and run Gemini AI interaction checks
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
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
              className="px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-4 h-4 text-teal-700" />
              Export CSV Report
            </button>
            <button
              type="button"
              onClick={onRunInteractionCheck}
              disabled={interactionLoading}
              className="px-4 py-2.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-indigo-700" />
              {interactionLoading ? 'Analyzing...' : 'Run AI Interaction Check'}
            </button>
            <button
              type="button"
              onClick={onOpenNewMedModal}
              className="px-4 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Add New Medication
            </button>
          </div>
        </div>

        {/* Time-Slot Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 my-4">
          {['All', 'Morning', 'Afternoon', 'Evening', 'Night'].map((slot) => (
            <button
              key={slot}
              type="button"
              aria-pressed={slotFilter === slot}
              onClick={() => setSlotFilter(slot)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold cursor-pointer ${
                slotFilter === slot
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {slot}
            </button>
          ))}
        </div>

        {/* AI Interaction Report Banner */}
        {interactionReport && (
          <div className="mb-6 p-5 rounded-2xl bg-indigo-950 text-white space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-300" />
                <h3 className="font-extrabold text-base">
                  Medication Safety &amp; Food Interaction Guardian ({interactionReport.engine})
                </h3>
              </div>
              <span className="px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 text-xs font-bold">
                Safety Score: {interactionReport.overallSafetyScore}/100 • {interactionReport.safetyStatus}
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {interactionReport.interactions?.map((it, idx) => (
                <div key={idx} className="p-3.5 rounded-xl bg-white/10 border border-white/15 text-xs space-y-1">
                  <span className="font-extrabold text-amber-300 uppercase">{it.severity} Watch</span>
                  <p className="font-bold text-white">{it.pair}</p>
                  <p className="text-indigo-100">{it.explanation}</p>
                  <p className="text-teal-300 font-semibold pt-1">💡 {it.recommendation}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Full Medication Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredMedications.map((med) => (
            <div
              key={med.id}
              className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between gap-4"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-3 py-1 rounded-lg bg-teal-800 text-white text-xs font-bold">
                    {med.scheduledTime} • {med.timeSlot}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        speakText(`${med.name} ${med.dosage}. ${med.mealInstruction}. Purpose: ${med.purpose}`)
                      }
                      className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-teal-50 cursor-pointer"
                      title="Read medication aloud"
                      aria-label={`Read ${med.name} aloud`}
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onEditMed(med)}
                      className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 cursor-pointer"
                      title="Edit schedule"
                      aria-label={`Edit ${med.name}`}
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteMedication(med.id)}
                      className="p-1.5 rounded-lg bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 cursor-pointer"
                      title="Delete medication"
                      aria-label={`Delete ${med.name}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <h3 className="text-lg font-extrabold text-slate-900">
                  {med.name} <span className="text-teal-700">({med.dosage})</span>
                </h3>
                <p className="text-xs text-slate-600">
                  <strong>Instruction:</strong> {med.mealInstruction} • <strong>Pill:</strong> {med.pillColor}{' '}
                  {med.pillShape}
                </p>
                <p className="text-xs text-slate-600">
                  <strong>Medical Purpose:</strong> {med.purpose} • <strong>Prescribed By:</strong>{' '}
                  {med.prescribedBy}
                </p>
                {med.notes && <p className="text-xs text-slate-500 italic">Note: {med.notes}</p>}
              </div>

              <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-600">
                    Stock: <strong>{med.stockRemaining} pills</strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => onRestockMedication(med)}
                    className="px-2.5 py-1 rounded-lg bg-teal-50 hover:bg-teal-100 border border-teal-300 text-teal-900 text-[11px] font-bold cursor-pointer"
                  >
                    + Refill 30
                  </button>
                </div>
                <div className="flex items-center gap-1.5">
                  {['taken', 'upcoming', 'missed'].map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => onUpdateMedicationStatus(med.id, st)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase cursor-pointer ${
                        med.status === st
                          ? st === 'taken'
                            ? 'bg-emerald-700 text-white'
                            : st === 'missed'
                            ? 'bg-rose-700 text-white'
                            : 'bg-amber-600 text-white'
                          : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
