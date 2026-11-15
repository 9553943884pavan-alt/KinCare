import React from 'react';
import { AlertTriangle, RefreshCw, Send } from 'lucide-react';

/**
 * Tab 4: Proactive Email Reminder Engine & Live Outbox Inspector.
 * Renders email HTML inside a sandboxed iframe to eliminate XSS surface from dangerouslySetInnerHTML.
 */
export default function EmailsTab({
  elderProfile,
  autoWatcherActive,
  setAutoWatcherActive,
  lastWatcherCheck,
  setLastWatcherCheck,
  emailSending,
  emailCustomNote,
  setEmailCustomNote,
  emailLogs,
  selectedEmailLog,
  setSelectedEmailLog,
  onSimulate9AmMissed,
  onRunAutoScanReminders,
  onDispatchEmail,
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Left 5 Columns: Trigger Proactive Reminders & Auto-Scanner */}
      <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-5">
        <div>
          <span className="text-xs font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-800">
            Core Problem Statement Requirement
          </span>
          <h2 className="text-xl font-extrabold text-slate-900 mt-1">Proactive Email Reminder Engine</h2>
          <p className="text-xs text-slate-600 mt-1">
            Automatically sends proactive email alerts for missed medications, upcoming doses, and doctor appointments to {elderProfile.preferredName}, family members, and caretakers.
          </p>
        </div>

        {/* Live 9:00 AM Auto-Escalation Watcher */}
        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                autoWatcherActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
              }`}
            />
            <div>
              <p className="font-extrabold text-slate-900">
                Live 9:00 AM Auto-Escalation Watcher:{' '}
                <span className={autoWatcherActive ? 'text-emerald-700' : 'text-slate-500'}>
                  {autoWatcherActive ? 'ACTIVE' : 'PAUSED'}
                </span>
              </p>
              <p className="text-[11px] text-slate-500">
                Last check: {lastWatcherCheck} • Alert target: 9553943884pavan@gmail.com
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setAutoWatcherActive((prev) => !prev)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-[11px] font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
            >
              {autoWatcherActive ? 'Pause' : 'Resume'}
            </button>
            <button
              type="button"
              disabled={emailSending}
              onClick={() => {
                setLastWatcherCheck(new Date().toLocaleTimeString());
                onRunAutoScanReminders();
              }}
              className="px-2.5 py-1.5 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-[11px] font-bold cursor-pointer"
            >
              Run Check Now
            </button>
          </div>
        </div>

        <div>
          <label htmlFor="email-custom-note" className="block text-xs font-bold text-slate-700 mb-1">
            Optional Personal Note to Include in Email
          </label>
          <input
            id="email-custom-note"
            type="text"
            value={emailCustomNote}
            onChange={(e) => setEmailCustomNote(e.target.value)}
            placeholder="e.g. Please call Papa after he takes his 9 AM tablet"
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs"
          />
        </div>

        <div className="grid grid-cols-1 gap-2.5">
          <button
            type="button"
            disabled={emailSending}
            onClick={onSimulate9AmMissed}
            className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-rose-700 to-rose-600 hover:from-rose-800 hover:to-rose-700 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-sm cursor-pointer"
          >
            <AlertTriangle className="w-4 h-4" />
            {emailSending
              ? 'Dispatching Resend + AI Alert...'
              : 'Simulate 9:00 AM Missed Dose & Email 9553943884pavan@gmail.com'}
          </button>

          <button
            type="button"
            disabled={emailSending}
            onClick={onRunAutoScanReminders}
            className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-teal-700 to-emerald-700 hover:from-teal-800 hover:to-emerald-800 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-sm cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${emailSending ? 'animate-spin' : ''}`} />
            Run Proactive Auto-Scanner (Missed + Upcoming + Appts)
          </button>

          <button
            type="button"
            disabled={emailSending}
            onClick={() => onDispatchEmail('MISSED_MEDICATION')}
            className="w-full py-2.5 px-4 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-900 border border-rose-200 font-bold text-xs flex items-center justify-between cursor-pointer"
          >
            <span>⚠️ Send Missed Medication Alert Email</span>
            <Send className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            disabled={emailSending}
            onClick={() => onDispatchEmail('UPCOMING_DOSE')}
            className="w-full py-2.5 px-4 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 font-bold text-xs flex items-center justify-between cursor-pointer"
          >
            <span>⏰ Send Upcoming Dose Reminder Email</span>
            <Send className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            disabled={emailSending}
            onClick={() => onDispatchEmail('APPOINTMENT_REMINDER')}
            className="w-full py-2.5 px-4 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 font-bold text-xs flex items-center justify-between cursor-pointer"
          >
            <span>📅 Send Doctor Appointment Reminder Email</span>
            <Send className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            disabled={emailSending}
            onClick={() => onDispatchEmail('DAILY_CARE_DIGEST')}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center justify-between cursor-pointer"
          >
            <span>💚 Send Daily Care Circle Summary Digest</span>
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Sent Email Log List */}
        <div className="pt-4 border-t border-slate-200 space-y-2">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
            Recent Dispatched Emails ({emailLogs.length})
          </h3>
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {emailLogs.map((log) => (
              <button
                key={log.id}
                type="button"
                onClick={() => setSelectedEmailLog(log)}
                className={`w-full text-left p-3 rounded-xl border text-xs cursor-pointer transition ${
                  selectedEmailLog?.id === log.id
                    ? 'border-teal-600 bg-teal-50/70'
                    : 'border-slate-200 bg-slate-50 hover:bg-white'
                }`}
              >
                <div className="flex items-center justify-between font-bold text-slate-800">
                  <span className="truncate">{log.subject}</span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1">
                  <span>To: {log.recipients?.join(', ') || '9553943884pavan@gmail.com'}</span>
                  <span className="text-emerald-700 font-semibold">
                    {log.resendId ? `Resend ID: ${log.resendId.slice(0, 12)}...` : log.status}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Right 7 Columns: Sandboxed Live HTML Email Inspector */}
      <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between space-y-4">
        {selectedEmailLog ? (
          <>
            <div className="border-b border-slate-200 pb-4 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-extrabold uppercase px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800">
                  ✓ {selectedEmailLog.status} • {selectedEmailLog.transportMode}
                </span>
                {selectedEmailLog.resendId && (
                  <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-full bg-teal-50 text-teal-800 border border-teal-200">
                    Resend Delivery ID: {selectedEmailLog.resendId}
                  </span>
                )}
                {selectedEmailLog.previewUrl && (
                  <a
                    href={selectedEmailLog.previewUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-bold text-teal-700 underline"
                  >
                    Open Ethereal SMTP Web Inbox ↗
                  </a>
                )}
              </div>
              <h3 className="text-base font-extrabold text-slate-900">{selectedEmailLog.subject}</h3>
              <p className="text-xs text-slate-500">
                <strong>Recipients:</strong> {selectedEmailLog.recipients?.join(', ')} •{' '}
                <strong>Sent:</strong> {new Date(selectedEmailLog.sentAt).toLocaleTimeString()}
              </p>
            </div>

            <div className="flex-1 bg-slate-50 p-3 rounded-2xl border border-slate-200 overflow-hidden">
              <iframe
                sandbox=""
                srcDoc={selectedEmailLog.htmlBody}
                title={`Email preview: ${selectedEmailLog.subject}`}
                className="w-full min-h-[420px] rounded-xl bg-white border-0"
              />
            </div>
          </>
        ) : (
          <div className="text-center py-12 text-slate-500 text-sm">
            Select an email from the list to inspect its rendered HTML content.
          </div>
        )}
      </div>
    </div>
  );
}
