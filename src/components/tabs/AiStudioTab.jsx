import React from 'react';
import { Sparkles, Upload, Volume2 } from 'lucide-react';
import { setCustomGeminiKey, speakText } from '../../utils/api.js';

/**
 * Tab 5: Google Gemini AI Studio featuring Prescription Vision/NLP Scanner,
 * Drug-Drug & Food Interaction Guardian, Custom API Key settings, and Multilingual Companion.
 */
export default function AiStudioTab({
  elderProfile,
  medications,
  rxText,
  setRxText,
  rxImageBase64,
  rxScanning,
  rxScanResult,
  interactionLoading,
  interactionReport,
  geminiKeyInput,
  setGeminiKeyInput,
  aiCompanionLang,
  setAiCompanionLang,
  aiCompanionQuery,
  setAiCompanionQuery,
  aiCompanionLoading,
  aiCompanionReply,
  onScanPrescription,
  onImageUpload,
  onSaveMedication,
  onRunInteractionCheck,
  onAskAiHubCompanion,
  showToast,
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* AI Prescription & Pill Bottle Label Scanner */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className="text-xs font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-800">
              Google Gemini 3.5 Flash Lite (@google/genai)
            </span>
            <h2 className="text-xl font-extrabold text-slate-900 mt-1">
              AI Prescription &amp; Label Scanner
            </h2>
            <p className="text-xs text-slate-500">
              Upload a photo of a prescription/pill bottle or paste clinical shorthand to auto-populate the senior schedule
            </p>
          </div>
        </div>

        <form onSubmit={onScanPrescription} className="space-y-3">
          <div>
            <label htmlFor="rx-notes-input" className="block text-xs font-bold text-slate-700 mb-1">
              Doctor&apos;s Prescription Note or Shorthand
            </label>
            <textarea
              id="rx-notes-input"
              rows={3}
              value={rxText}
              onChange={(e) => setRxText(e.target.value)}
              placeholder="e.g. Tab Pantoprazole 40mg 1-0-0 Before Breakfast for gastric protection"
              className="w-full p-3 rounded-xl border border-slate-300 text-xs"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <label className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center gap-1.5 cursor-pointer">
              <Upload className="w-4 h-4 text-teal-700" />
              <span>{rxImageBase64 ? 'Image Attached ✓' : 'Attach Prescription Photo'}</span>
              <input type="file" accept="image/*" onChange={onImageUpload} className="hidden" />
            </label>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() =>
                  setRxText('Tab Pantoprazole 40mg Once Daily 07:00 AM before breakfast')
                }
                className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Sample Rx 2
              </button>
              <button
                type="submit"
                disabled={rxScanning}
                className="px-5 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-extrabold flex items-center gap-1.5 cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                {rxScanning ? 'Scanning with Gemini...' : 'Extract Schedule with AI'}
              </button>
            </div>
          </div>
        </form>

        {rxScanResult && (
          <div className="p-4 rounded-2xl bg-teal-50 border border-teal-200 space-y-3">
            <p className="text-xs font-bold text-teal-900">✨ {rxScanResult.plainLanguageSummary}</p>
            {rxScanResult.extractedMedications?.map((med, i) => (
              <div
                key={i}
                className="p-3.5 rounded-xl bg-white border border-teal-200 flex items-center justify-between gap-3"
              >
                <div className="text-xs">
                  <p className="font-extrabold text-slate-900 text-sm">
                    {med.name} ({med.dosage}) — {med.scheduledTime}
                  </p>
                  <p className="text-slate-600">
                    {med.mealInstruction} • {med.pillColor} {med.pillShape} • {med.purpose}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onSaveMedication(med)}
                  className="px-3.5 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold shrink-0 cursor-pointer"
                >
                  + Add to Schedule
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Drug Interaction Guardian & Custom Gemini API Key */}
      <div className="space-y-6">
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-extrabold text-slate-900">
                AI Drug-Drug &amp; Food Interaction Guardian
              </h3>
              <p className="text-xs text-slate-500">
                Cross-checks {elderProfile.preferredName}&apos;s {medications.length} active prescriptions against chronic conditions &amp; allergies
              </p>
            </div>
            <button
              type="button"
              onClick={onRunInteractionCheck}
              disabled={interactionLoading}
              className="px-4 py-2 rounded-xl bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-bold cursor-pointer"
            >
              {interactionLoading ? 'Checking...' : 'Analyze Now'}
            </button>
          </div>

          {interactionReport ? (
            <div className="space-y-2.5">
              {interactionReport.interactions?.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-slate-900">{item.pair}</span>
                    <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-bold">
                      {item.severity}
                    </span>
                  </div>
                  <p className="text-slate-600">{item.explanation}</p>
                  <p className="text-teal-800 font-semibold">Recommendation: {item.recommendation}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500 bg-slate-50 p-4 rounded-2xl border border-slate-200">
              Click &quot;Analyze Now&quot; to run a full geriatric clinical interaction check across Metformin, Telmisartan, Atorvastatin, and Calcium + Vitamin D3.
            </p>
          )}
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-3">
          <h3 className="text-sm font-extrabold text-slate-900">
            Google Gemini API Configuration (`@google/genai`)
          </h3>
          <p className="text-xs text-slate-500">
            The server uses `GEMINI_API_KEY` from `.env` + a built-in geriatric clinical fallback so demos never fail. You can also paste a Gemini API key here for live browser requests:
          </p>
          <div className="flex gap-2">
            <input
              type="password"
              aria-label="Custom Gemini API Key"
              value={geminiKeyInput}
              onChange={(e) => setGeminiKeyInput(e.target.value)}
              placeholder="AIzaSy... (Optional — works out-of-the-box without key)"
              className="flex-1 px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-mono"
            />
            <button
              type="button"
              onClick={() => {
                setCustomGeminiKey(geminiKeyInput);
                showToast('Saved Gemini API key preference');
              }}
              className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold cursor-pointer"
            >
              Save Key
            </button>
          </div>
        </div>
      </div>

      {/* Full-Width Multilingual AI Care Companion & Voice Reminder Broadcaster */}
      <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-xs font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
              Voice Reminders &amp; Caregiver Q&amp;A
            </span>
            <h3 className="text-lg font-extrabold text-slate-900 mt-1">
              Multilingual AI Care Companion &amp; Voice Reminder Broadcaster
            </h3>
            <p className="text-xs text-slate-500">
              Ask contextual medication questions for {elderProfile.preferredName} or broadcast clear voice reminders aloud
            </p>
          </div>
          <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200" role="group" aria-label="Companion Language">
            {['English', 'Hindi', 'Telugu'].map((lang) => (
              <button
                key={lang}
                type="button"
                aria-pressed={aiCompanionLang === lang}
                onClick={() => setAiCompanionLang(lang)}
                className={`px-3 py-1 rounded-lg text-xs font-extrabold cursor-pointer ${
                  aiCompanionLang === lang ? 'bg-indigo-700 text-white' : 'text-slate-700 hover:bg-white'
                }`}
              >
                {lang}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={onAskAiHubCompanion} className="flex flex-col sm:flex-row gap-2.5">
          <input
            type="text"
            aria-label="Ask Gemini Care Companion"
            value={aiCompanionQuery}
            onChange={(e) => setAiCompanionQuery(e.target.value)}
            placeholder="Ask about next medicine, food precautions, dizziness, or doctor visit..."
            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold"
          />
          <button
            type="submit"
            disabled={aiCompanionLoading || !aiCompanionQuery.trim()}
            className="px-5 py-2.5 rounded-xl bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4" />
            {aiCompanionLoading ? 'Generating...' : 'Ask Gemini Companion'}
          </button>
        </form>

        {aiCompanionReply && (
          <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-200 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="space-y-1">
              <p className="text-[11px] font-extrabold uppercase text-indigo-800">
                {aiCompanionReply.engine || 'KinCare AI Companion'} ({aiCompanionLang})
              </p>
              <p className="text-sm text-slate-900 font-semibold leading-relaxed">
                {aiCompanionReply.reply}
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                speakText(
                  aiCompanionReply.reply,
                  aiCompanionLang === 'Hindi'
                    ? 'hi-IN'
                    : aiCompanionLang === 'Telugu'
                      ? 'te-IN'
                      : 'en-IN'
                )
              }
              className="px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-extrabold flex items-center gap-1.5 shrink-0 cursor-pointer"
            >
              <Volume2 className="w-4 h-4" />
              Broadcast Voice Reminder
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
