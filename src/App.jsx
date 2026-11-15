import React, { useState, useEffect, useCallback } from 'react';
import {
  HeartPulse,
  ShieldCheck,
  Pill,
  Calendar,
  Mail,
  Sparkles,
  Activity,
  Users,
  Plus,
  Edit3,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Volume2,
  Download,
  RefreshCw,
  Send,
  FileText,
  Eye,
  KeyRound,
  PhoneCall,
  Upload,
  Check,
  QrCode,
} from 'lucide-react';

import {
  apiFetch,
  setStoredToken,
  getCustomGeminiKey,
  setCustomGeminiKey,
  speakText,
  downloadAppointmentICS,
} from './utils/api.js';
import PasscodeModal from './components/PasscodeModal.jsx';
import SeniorComfortView from './components/SeniorComfortView.jsx';
import { MedicationModal, AppointmentModal, EmergencyIdModal } from './components/Modals.jsx';

export default function App() {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeMember, setActiveMember] = useState(null);
  const [viewMode, setViewMode] = useState('command'); // 'comfort' (Senior Mode) | 'command' (Full Care Ecosystem)
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'medications' | 'appointments' | 'emails' | 'ai-studio'

  // Accessibility states
  const [fontScale, setFontScale] = useState('normal'); // 'normal' | 'large' | 'xlarge'
  const [highContrast, setHighContrast] = useState(false);

  // Modals
  const [passcodeModalOpen, setPasscodeModalOpen] = useState(false);
  const [medModalOpen, setMedModalOpen] = useState(false);
  const [editingMed, setEditingMed] = useState(null);
  const [apptModalOpen, setApptModalOpen] = useState(false);
  const [emergencyModalOpen, setEmergencyModalOpen] = useState(false);

  // Medication filters & Routine inputs
  const [slotFilter, setSlotFilter] = useState('All');
  const [newRoutineTitle, setNewRoutineTitle] = useState('');
  const [newRoutineTime, setNewRoutineTime] = useState('10:00');

  // Proactive Email state
  const [selectedEmailLog, setSelectedEmailLog] = useState(null);
  const [emailCustomNote, setEmailCustomNote] = useState('');
  const [emailSending, setEmailSending] = useState(false);
  const [toastBanner, setToastBanner] = useState(null);

  // Gemini AI Studio state
  const [interactionReport, setInteractionReport] = useState(null);
  const [interactionLoading, setInteractionLoading] = useState(false);
  const [rxText, setRxText] = useState(
    'Tab Amlodipine 5mg Once Daily Morning after breakfast for Blood Pressure'
  );
  const [rxImageBase64, setRxImageBase64] = useState('');
  const [rxScanResult, setRxScanResult] = useState(null);
  const [rxScanning, setRxScanning] = useState(false);
  const [doctorBrief, setDoctorBrief] = useState(null);
  const [doctorBriefLoading, setDoctorBriefLoading] = useState(false);
  const [geminiKeyInput, setGeminiKeyInput] = useState(getCustomGeminiKey());

  const showToast = (title, type = 'success') => {
    setToastBanner({ title, type });
    setTimeout(() => setToastBanner(null), 4500);
  };

  const fetchDashboardData = useCallback(async () => {
    try {
      const data = await apiFetch('/api/dashboard');
      setDashboard(data);
      if (!activeMember && data.careCircleMembers?.length > 0) {
        setActiveMember(data.careCircleMembers[0]);
      }
      if (!selectedEmailLog && data.emailLogs?.length > 0) {
        setSelectedEmailLog(data.emailLogs[0]);
      }
    } catch (err) {
      showToast(err.message || 'Failed to load dashboard data', 'error');
    } finally {
      setLoading(false);
    }
  }, [activeMember, selectedEmailLog]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  useEffect(() => {
    const html = document.documentElement;
    html.classList.remove('font-scale-normal', 'font-scale-large', 'font-scale-xlarge');
    html.classList.add(`font-scale-${fontScale}`);
  }, [fontScale]);

  // Passcode Authentication Handler
  const handleVerifyPasscode = async (passcode, memberId) => {
    const res = await apiFetch('/api/auth/verify-passcode', {
      method: 'POST',
      body: JSON.stringify({ passcode, memberId }),
    });
    setStoredToken(res.token);
    setActiveMember(res.member);
    if (res.member.role === 'elder') {
      setViewMode('comfort');
    } else {
      setViewMode('command');
    }
    showToast(`Unlocked Care Profile as ${res.member.name} (${res.member.roleLabel})`);
    await fetchDashboardData();
  };

  const handleAddCareMember = async (memberData) => {
    await apiFetch('/api/care-circle/members', {
      method: 'POST',
      body: JSON.stringify(memberData),
    });
    showToast(`Added ${memberData.name} to the Care Circle with passcode access!`);
    await fetchDashboardData();
  };

  // Medication CRUD & Adherence
  const handleSaveMedication = async (medPayload) => {
    if (editingMed) {
      await apiFetch(`/api/medications/${editingMed.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          ...medPayload,
          actorName: activeMember?.name,
          actorRole: activeMember?.role,
        }),
      });
      showToast(`Updated schedule for ${medPayload.name}`);
    } else {
      await apiFetch('/api/medications', {
        method: 'POST',
        body: JSON.stringify({
          ...medPayload,
          actorName: activeMember?.name,
          actorRole: activeMember?.role,
        }),
      });
      showToast(`Added ${medPayload.name} (${medPayload.dosage}) to daily schedule`);
    }
    setMedModalOpen(false);
    setEditingMed(null);
    await fetchDashboardData();
  };

  const handleUpdateMedicationStatus = async (medId, status) => {
    const res = await apiFetch(`/api/medications/${medId}`, {
      method: 'PUT',
      body: JSON.stringify({
        status,
        actorName: activeMember?.name || dashboard?.elderProfile?.name,
        actorRole: activeMember?.role || 'elder',
      }),
    });
    if (res.autoEmailDispatched) {
      setSelectedEmailLog(res.autoEmailDispatched);
      showToast(
        `Marked as Missed — Proactive Email Alert automatically sent to Care Circle!`,
        'warning'
      );
    } else {
      showToast(`Medication status updated to ${status.toUpperCase()}`);
    }
    await fetchDashboardData();
  };

  const handleDeleteMedication = async (medId) => {
    await apiFetch(`/api/medications/${medId}?actorName=${encodeURIComponent(activeMember?.name || 'Care Circle')}`, {
      method: 'DELETE',
    });
    showToast('Medication removed from schedule');
    await fetchDashboardData();
  };

  // Routine Handlers
  const handleToggleRoutine = async (routineId, completed) => {
    await apiFetch(`/api/routines/${routineId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        completed,
        actorName: activeMember?.name || dashboard?.elderProfile?.name,
      }),
    });
    await fetchDashboardData();
  };

  const handleAddRoutine = async (e) => {
    e.preventDefault();
    if (!newRoutineTitle.trim()) return;
    await apiFetch('/api/routines', {
      method: 'POST',
      body: JSON.stringify({
        title: newRoutineTitle,
        time: newRoutineTime,
        category: 'Daily Care',
        actorName: activeMember?.name,
      }),
    });
    setNewRoutineTitle('');
    showToast('Added new daily healthcare routine');
    await fetchDashboardData();
  };

  // Appointment Handlers
  const handleSaveAppointment = async (apptPayload) => {
    await apiFetch('/api/appointments', {
      method: 'POST',
      body: JSON.stringify({
        ...apptPayload,
        actorName: activeMember?.name,
      }),
    });
    setApptModalOpen(false);
    showToast(`Scheduled appointment with ${apptPayload.doctorName}`);
    await fetchDashboardData();
  };

  const handleDeleteAppointment = async (apptId) => {
    await apiFetch(`/api/appointments/${apptId}`, { method: 'DELETE' });
    showToast('Appointment cancelled');
    await fetchDashboardData();
  };

  // Autonomy & Vitals Handlers
  const handleResolveAutonomy = async (decisionId, status, elderResponseNote) => {
    await apiFetch(`/api/autonomy/${decisionId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status, elderResponseNote }),
    });
    showToast(`Autonomy decision recorded: ${status.replace(/_/g, ' ')}`);
    await fetchDashboardData();
  };

  const handleUpdateAutonomyPrefs = async (prefs) => {
    await apiFetch('/api/elder-profile/autonomy', {
      method: 'PUT',
      body: JSON.stringify(prefs),
    });
    showToast('Updated Elder Autonomy & Sharing Preferences');
    await fetchDashboardData();
  };

  const handleLogVitals = async (vitalPayload) => {
    await apiFetch('/api/vitals', {
      method: 'POST',
      body: JSON.stringify(vitalPayload),
    });
    showToast('Logged new Blood Pressure, Sugar & Mood reading');
    await fetchDashboardData();
  };

  // Proactive Email Dispatch Handlers
  const handleDispatchEmail = async (type, itemId = null) => {
    setEmailSending(true);
    try {
      const res = await apiFetch('/api/reminders/send', {
        method: 'POST',
        body: JSON.stringify({
          type,
          itemId,
          customNote: emailCustomNote,
          triggeredBy: activeMember?.name || 'Care Circle Coordinator',
        }),
      });
      setSelectedEmailLog(res.emailLog);
      setEmailCustomNote('');
      showToast(`Proactive Email Sent: ${res.emailLog.subject}`);
      await fetchDashboardData();
    } finally {
      setEmailSending(false);
    }
  };

  const handleRunAutoScanReminders = async () => {
    setEmailSending(true);
    try {
      const res = await apiFetch('/api/reminders/auto-scan', { method: 'POST' });
      if (res.dispatched?.[0]) {
        setSelectedEmailLog(res.dispatched[0]);
      }
      showToast(`Proactive Auto-Scan dispatched ${res.dispatchedCount} email reminders!`);
      await fetchDashboardData();
    } finally {
      setEmailSending(false);
    }
  };

  const handleTriggerSOS = async () => {
    const res = await apiFetch('/api/sos', {
      method: 'POST',
      body: JSON.stringify({
        reason: `${dashboard?.elderProfile?.preferredName} requested immediate Care Circle check-in.`,
      }),
    });
    setSelectedEmailLog(res.emailLog);
    speakText('Emergency S O S alert has been sent to Priya and Nurse Anita.');
    showToast('🚨 Emergency SOS Alert Dispatched to All Care Circle Members!', 'error');
    await fetchDashboardData();
  };

  // Gemini AI Handlers
  const handleRunInteractionCheck = async () => {
    setInteractionLoading(true);
    try {
      const res = await apiFetch('/api/ai/interactions', { method: 'POST', body: JSON.stringify({}) });
      setInteractionReport(res);
      showToast('Completed Gemini AI Drug-Drug & Food Interaction Analysis');
    } finally {
      setInteractionLoading(false);
    }
  };

  const handleScanPrescription = async (e) => {
    if (e) e.preventDefault();
    setRxScanning(true);
    try {
      const res = await apiFetch('/api/ai/scan-prescription', {
        method: 'POST',
        body: JSON.stringify({
          text: rxText,
          imageBase64: rxImageBase64,
        }),
      });
      setRxScanResult(res);
      showToast('Prescription analyzed by Gemini AI!');
    } finally {
      setRxScanning(false);
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setRxImageBase64(String(reader.result));
      showToast(`Loaded prescription image: ${file.name}`);
    };
    reader.readAsDataURL(file);
  };

  const handleGenerateDoctorBrief = async () => {
    setDoctorBriefLoading(true);
    try {
      const res = await apiFetch('/api/ai/doctor-brief', { method: 'POST', body: JSON.stringify({}) });
      setDoctorBrief(res);
      showToast('Generated Clinical Doctor Visit Brief');
    } finally {
      setDoctorBriefLoading(false);
    }
  };

  const handleAskCompanion = async (message, language = 'English') => {
    return apiFetch('/api/ai/companion', {
      method: 'POST',
      body: JSON.stringify({ message, language }),
    });
  };

  const handleResetDemo = async () => {
    await apiFetch('/api/reset-demo', { method: 'POST' });
    showToast('Demo data reset to clean initial state');
    await fetchDashboardData();
  };

  if (loading || !dashboard) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-teal-700 text-white flex items-center justify-center mx-auto animate-pulse">
            <HeartPulse className="w-7 h-7" />
          </div>
          <p className="font-bold text-slate-800">Loading KinCare AI Shared Care Ecosystem...</p>
        </div>
      </div>
    );
  }

  const {
    elderProfile,
    careCircleMembers = [],
    medications = [],
    routines = [],
    appointments = [],
    adherenceHistory = [],
    vitalsLog = [],
    autonomyDecisions = [],
    emailLogs = [],
    activityFeed = [],
    summaryMetrics = {},
  } = dashboard;

  const missedMedications = medications.filter((m) => m.status === 'missed');
  const filteredMedications =
    slotFilter === 'All' ? medications : medications.filter((m) => m.timeSlot === slotFilter);

  return (
    <div className={`min-h-screen flex flex-col bg-slate-50 text-slate-900 ${highContrast ? 'high-contrast-mode' : ''}`}>
      {/* Toast Notification */}
      {toastBanner && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed bottom-5 right-5 z-50 max-w-md px-5 py-3.5 rounded-2xl shadow-2xl border flex items-center gap-3 text-sm font-bold transition-all ${
            toastBanner.type === 'error'
              ? 'bg-rose-800 text-white border-rose-600'
              : toastBanner.type === 'warning'
              ? 'bg-amber-900 text-white border-amber-600'
              : 'bg-slate-900 text-white border-teal-500'
          }`}
        >
          <CheckCircle2 className="w-5 h-5 text-teal-400 shrink-0" />
          <span>{toastBanner.title}</span>
        </div>
      )}

      {/* Top Accessibility & Security Bar */}
      <div className="bg-slate-900 text-slate-200 text-xs py-2 px-4 border-b border-slate-800">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 font-bold text-teal-400">
              <ShieldCheck className="w-4 h-4" />
              Passcode Protected Ecosystem
            </span>
            <span className="hidden sm:inline text-slate-500">|</span>
            <span className="hidden sm:inline text-slate-300">
              Patient at Centre: <strong>{elderProfile.name} ({elderProfile.age} yrs)</strong>
            </span>
          </div>

          {/* Accessibility Controls (WCAG AAA) */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center bg-slate-800 rounded-lg p-0.5 border border-slate-700" role="group" aria-label="Text Size">
              <button
                type="button"
                onClick={() => setFontScale('normal')}
                className={`px-2 py-0.5 rounded text-[11px] font-bold cursor-pointer ${
                  fontScale === 'normal' ? 'bg-teal-600 text-white' : 'text-slate-300'
                }`}
              >
                A
              </button>
              <button
                type="button"
                onClick={() => setFontScale('large')}
                className={`px-2 py-0.5 rounded text-[11px] font-bold cursor-pointer ${
                  fontScale === 'large' ? 'bg-teal-600 text-white' : 'text-slate-300'
                }`}
              >
                A+
              </button>
              <button
                type="button"
                onClick={() => setFontScale('xlarge')}
                className={`px-2 py-0.5 rounded text-[11px] font-bold cursor-pointer ${
                  fontScale === 'xlarge' ? 'bg-teal-600 text-white' : 'text-slate-300'
                }`}
              >
                A++
              </button>
            </div>

            <button
              type="button"
              onClick={() => setHighContrast(!highContrast)}
              className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold cursor-pointer ${
                highContrast
                  ? 'bg-amber-400 text-slate-950 border-amber-300'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
              }`}
            >
              High Contrast
            </button>

            <button
              type="button"
              onClick={() => setEmergencyModalOpen(true)}
              className="px-2.5 py-1 rounded-lg bg-rose-700 hover:bg-rose-600 text-white font-bold text-[11px] flex items-center gap-1 cursor-pointer"
            >
              <QrCode className="w-3.5 h-3.5" />
              Emergency ID
            </button>

            <button
              type="button"
              onClick={handleResetDemo}
              className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] flex items-center gap-1 cursor-pointer"
              title="Reset demo state"
            >
              <RefreshCw className="w-3 h-3" />
              Reset Demo
            </button>
          </div>
        </div>
      </div>

      {/* Main Header & Mode Switcher */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-teal-700 to-emerald-600 text-white flex items-center justify-center shadow-md">
              <HeartPulse className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-extrabold tracking-tight text-slate-900">
                  KinCare <span className="text-teal-700">AI</span>
                </h1>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200">
                  Gemini 2.5 + Cloud Run
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Smart Elderly Care, Medication Adherence & Collaborative Family Platform
              </p>
            </div>
          </div>

          {/* Dual Experience Switcher + Active Passcode Profile */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div
              className="inline-flex rounded-2xl bg-slate-100 p-1 border border-slate-200"
              role="group"
              aria-label="Interface Mode Switcher"
            >
              <button
                type="button"
                onClick={() => setViewMode('comfort')}
                className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition flex items-center gap-1.5 cursor-pointer ${
                  viewMode === 'comfort'
                    ? 'bg-teal-700 text-white shadow-xs'
                    : 'text-slate-700 hover:text-slate-900'
                }`}
              >
                <Volume2 className="w-4 h-4" />
                Senior Comfort Mode (Elder)
              </button>
              <button
                type="button"
                onClick={() => setViewMode('command')}
                className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition flex items-center gap-1.5 cursor-pointer ${
                  viewMode === 'command'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-700 hover:text-slate-900'
                }`}
              >
                <Users className="w-4 h-4" />
                Family & Caretaker Portal
              </button>
            </div>

            <button
              type="button"
              onClick={() => setPasscodeModalOpen(true)}
              className="px-3.5 py-2 rounded-2xl bg-amber-50 hover:bg-amber-100 border border-amber-300 text-slate-900 text-xs font-bold flex items-center gap-2 transition cursor-pointer"
            >
              <KeyRound className="w-4 h-4 text-amber-700" />
              <div className="text-left">
                <span className="block text-[10px] uppercase tracking-wider text-amber-800 font-extrabold">
                  Active Passcode Role
                </span>
                <span className="font-bold">
                  {activeMember?.name || 'Ramesh Sharma'} ({activeMember?.role || 'elder'})
                </span>
              </div>
            </button>
          </div>
        </div>

        {/* Navigation Tabs (when in Family & Caretaker Command Mode) */}
        {viewMode === 'command' && (
          <nav
            className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center gap-1 overflow-x-auto border-t border-slate-100 bg-slate-50/60"
            aria-label="Primary Platform Sections"
          >
            {[
              { id: 'overview', label: 'Ecosystem Overview', icon: Activity },
              {
                id: 'medications',
                label: `Medications & Adherence (${medications.length})`,
                icon: Pill,
              },
              {
                id: 'appointments',
                label: `Appointments & Routines (${appointments.length})`,
                icon: Calendar,
              },
              {
                id: 'emails',
                label: `Proactive Email Alerts (${emailLogs.length})`,
                icon: Mail,
              },
              {
                id: 'ai-studio',
                label: 'Gemini AI Prescription & Safety Hub',
                icon: Sparkles,
              },
            ].map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-3 px-4 text-xs sm:text-sm font-bold border-b-2 whitespace-nowrap flex items-center gap-2 transition cursor-pointer ${
                    active
                      ? 'border-teal-700 text-teal-800 bg-white'
                      : 'border-transparent text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        )}
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        {viewMode === 'comfort' ? (
          <SeniorComfortView
            elderProfile={elderProfile}
            medications={medications}
            routines={routines}
            appointments={appointments}
            autonomyDecisions={autonomyDecisions}
            onUpdateMedicationStatus={handleUpdateMedicationStatus}
            onToggleRoutine={handleToggleRoutine}
            onResolveAutonomy={handleResolveAutonomy}
            onUpdateAutonomyPrefs={handleUpdateAutonomyPrefs}
            onAskCompanion={handleAskCompanion}
            onTriggerSOS={handleTriggerSOS}
            onOpenEmergencyCard={() => setEmergencyModalOpen(true)}
            onLogVitals={handleLogVitals}
          />
        ) : (
          <div className="space-y-6">
            {/* Proactive Missed Medication Alert Banner (Always visible if a dose is missed!) */}
            {missedMedications.length > 0 && (
              <div className="rounded-2xl bg-rose-50 border-2 border-rose-300 p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
                <div className="flex items-start gap-3.5">
                  <div className="p-2.5 rounded-xl bg-rose-600 text-white shrink-0 mt-0.5">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-200 text-rose-900">
                        Proactive Missed Dose Detection
                      </span>
                      <span className="text-xs text-rose-700 font-semibold">
                        Auto-Escalation Active
                      </span>
                    </div>
                    <h2 className="text-base sm:text-lg font-extrabold text-slate-900 mt-1">
                      {elderProfile.preferredName} has {missedMedications.length} missed medication dose:{' '}
                      <span className="text-rose-700">
                        {missedMedications[0].name} ({missedMedications[0].dosage}) at{' '}
                        {missedMedications[0].scheduledTime}
                      </span>
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-700">
                      Purpose: {missedMedications[0].purpose} • Pill: {missedMedications[0].pillColor}{' '}
                      {missedMedications[0].pillShape} ({missedMedications[0].mealInstruction})
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleUpdateMedicationStatus(missedMedications[0].id, 'taken')}
                    className="px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Mark Taken Now
                  </button>
                  <button
                    type="button"
                    disabled={emailSending}
                    onClick={() => {
                      handleDispatchEmail('MISSED_MEDICATION', missedMedications[0].id);
                      setActiveTab('emails');
                    }}
                    className="px-4 py-2.5 rounded-xl bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Mail className="w-4 h-4" />
                    Send Proactive Email Alert
                  </button>
                </div>
              </div>
            )}

            {/* TAB 1: OVERVIEW */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Summary KPI Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase">
                      <span>Today's Adherence</span>
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
                      <span>Latest Vitals & Mood</span>
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

                {/* Middle Grid: Today's Medication Timeline + 7-Day Adherence & Care Circle */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Left 2 Columns: Today's Shared Medication Schedule */}
                  <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h2 className="text-lg font-extrabold text-slate-900">
                          Today's Medication Schedule & Adherence Tracker
                        </h2>
                        <p className="text-xs text-slate-500">
                          Real-time shared status across Elder, Family & Caretaker devices
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingMed(null);
                          setMedModalOpen(true);
                        }}
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
                                onClick={() => handleUpdateMedicationStatus(med.id, 'taken')}
                                className="px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold cursor-pointer"
                              >
                                Mark Taken
                              </button>
                            )}
                            {med.status !== 'missed' && (
                              <button
                                type="button"
                                onClick={() => handleUpdateMedicationStatus(med.id, 'missed')}
                                className="px-3 py-1.5 rounded-xl bg-rose-100 hover:bg-rose-200 text-rose-800 text-xs font-bold cursor-pointer"
                              >
                                Missed
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                setEditingMed(med);
                                setMedModalOpen(true);
                              }}
                              className="p-2 rounded-xl border border-slate-200 hover:bg-white text-slate-600 cursor-pointer"
                              title="Edit Medication"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Right Column: 7-Day Adherence Chart + Shared Care Circle Passcode Roster */}
                  <div className="space-y-6">
                    {/* 7-Day Adherence Visual Chart */}
                    <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs">
                      <h3 className="text-base font-extrabold text-slate-900 mb-1">
                        Weekly Adherence Trend
                      </h3>
                      <p className="text-xs text-slate-500 mb-4">
                        Consistent morning adherence; 09:00 AM BP dose needs gentle follow-up
                      </p>
                      <div className="grid grid-cols-6 gap-2 items-end h-32 pt-4 px-2 bg-slate-50 rounded-2xl border border-slate-100">
                        {adherenceHistory.map((item) => (
                          <div key={item.day} className="flex flex-col items-center gap-1.5 h-full justify-end">
                            <span className="text-[10px] font-bold text-slate-600">
                              {item.adherencePct}%
                            </span>
                            <div
                              className={`w-full rounded-t-lg transition-all ${
                                item.adherencePct === 100 ? 'bg-teal-600' : 'bg-amber-500'
                              }`}
                              style={{ height: `${Math.max(20, item.adherencePct * 0.7)}%` }}
                            />
                            <span className="text-[11px] font-bold text-slate-700 pb-1">
                              {item.day}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Authorized Care Circle Members */}
                    <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-base font-extrabold text-slate-900">
                          Authorized Care Circle
                        </h3>
                        <button
                          type="button"
                          onClick={() => setPasscodeModalOpen(true)}
                          className="text-xs font-bold text-teal-700 hover:underline cursor-pointer"
                        >
                          + Manage Passcodes
                        </button>
                      </div>
                      <div className="space-y-2.5">
                        {careCircleMembers.map((m) => (
                          <div
                            key={m.id}
                            className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs"
                          >
                            <div>
                              <p className="font-bold text-slate-900">
                                {m.name}{' '}
                                <span className="text-[10px] uppercase px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 ml-1">
                                  {m.role}
                                </span>
                              </p>
                              <p className="text-slate-500">{m.email}</p>
                            </div>
                            <span className="font-mono text-[11px] font-bold text-slate-600 bg-white px-2 py-1 rounded-lg border border-slate-200">
                              PIN: {m.passcodePlainHint || '••••••'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Live Collaborative Care Activity Feed */}
                <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs">
                  <h3 className="text-base font-extrabold text-slate-900 mb-3">
                    Real-Time Care Circle Audit & Activity Log
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
            )}

            {/* TAB 2: MEDICATIONS & ADHERENCE MANAGER */}
            {activeTab === 'medications' && (
              <div className="space-y-6">
                <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200">
                    <div>
                      <h2 className="text-xl font-extrabold text-slate-900">
                        Medication Schedule & Adherence Management
                      </h2>
                      <p className="text-xs text-slate-500">
                        Add, edit, or adjust doses, track pill inventory, and run Gemini AI interaction checks
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2.5">
                      <button
                        type="button"
                        onClick={handleRunInteractionCheck}
                        disabled={interactionLoading}
                        className="px-4 py-2.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                      >
                        <Sparkles className="w-4 h-4 text-indigo-700" />
                        {interactionLoading ? 'Analyzing...' : 'Run AI Interaction Check'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingMed(null);
                          setMedModalOpen(true);
                        }}
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

                  {/* AI Interaction Report Banner if triggered */}
                  {interactionReport && (
                    <div className="mb-6 p-5 rounded-2xl bg-indigo-950 text-white space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-5 h-5 text-amber-300" />
                          <h3 className="font-extrabold text-base">
                            Medication Safety & Food Interaction Guardian ({interactionReport.engine})
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
                              >
                                <Volume2 className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingMed(med);
                                  setMedModalOpen(true);
                                }}
                                className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 cursor-pointer"
                                title="Edit schedule"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteMedication(med.id)}
                                className="p-1.5 rounded-lg bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 cursor-pointer"
                                title="Delete medication"
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
                          {med.notes && (
                            <p className="text-xs text-slate-500 italic">Note: {med.notes}</p>
                          )}
                        </div>

                        <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
                          <span className="text-xs font-bold text-slate-600">
                            Stock: <strong>{med.stockRemaining} pills</strong>
                          </span>
                          <div className="flex items-center gap-1.5">
                            {['taken', 'upcoming', 'missed'].map((st) => (
                              <button
                                key={st}
                                type="button"
                                onClick={() => handleUpdateMedicationStatus(med.id, st)}
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
            )}

            {/* TAB 3: MEDICAL APPOINTMENTS & HEALTHCARE ROUTINES */}
            {activeTab === 'appointments' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left 2 Columns: Upcoming Doctor Appointments */}
                <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-extrabold text-slate-900">
                        Upcoming Doctor Appointments & Pre-Visit Preparation
                      </h2>
                      <p className="text-xs text-slate-500">
                        Keep family members informed, export calendar invites, and generate AI clinical summaries
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleGenerateDoctorBrief}
                        disabled={doctorBriefLoading}
                        className="px-3.5 py-2 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-900 border border-teal-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                      >
                        <FileText className="w-4 h-4 text-teal-700" />
                        {doctorBriefLoading ? 'Generating...' : 'AI Doctor Visit Brief'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setApptModalOpen(true)}
                        className="px-3.5 py-2 rounded-xl bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                        New Appointment
                      </button>
                    </div>
                  </div>

                  {/* AI Pre-Appointment Clinical Brief */}
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

                          <div className="flex items-center gap-2">
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
                                handleDispatchEmail('APPOINTMENT_REMINDER', appt.id);
                                setActiveTab('emails');
                              }}
                              className="px-3 py-1.5 rounded-xl bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
                            >
                              <Mail className="w-3.5 h-3.5" />
                              Email Reminder
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteAppointment(appt.id)}
                              className="p-1.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 cursor-pointer"
                              title="Cancel appointment"
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
                            <strong>{elderProfile.preferredName}'s Question for Doctor:</strong> "{appt.elderQuestions}"
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right Column: Daily Healthcare Routines */}
                <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
                  <h2 className="text-lg font-extrabold text-slate-900">
                    Daily Healthcare Routines
                  </h2>
                  <p className="text-xs text-slate-500">
                    Hydration, mobility exercises, vitals checks & preventive foot care
                  </p>

                  <form onSubmit={handleAddRoutine} className="flex gap-2">
                    <input
                      type="time"
                      value={newRoutineTime}
                      onChange={(e) => setNewRoutineTime(e.target.value)}
                      className="px-2.5 py-2 rounded-xl border border-slate-300 text-xs font-bold"
                    />
                    <input
                      type="text"
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
                        onClick={() => handleToggleRoutine(r.id, !r.completed)}
                        className={`p-3.5 rounded-2xl border flex items-start gap-3 cursor-pointer transition ${
                          r.completed ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={r.completed}
                          onChange={() => {}}
                          className="mt-1 w-4 h-4 accent-emerald-700"
                        />
                        <div className="flex-1 text-xs">
                          <p className={`font-bold ${r.completed ? 'line-through text-emerald-800' : 'text-slate-900'}`}>
                            {r.time} — {r.title}
                          </p>
                          <p className="text-slate-500 mt-0.5">{r.notes}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: PROACTIVE EMAIL REMINDER ENGINE & LIVE OUTBOX INSPECTOR */}
            {activeTab === 'emails' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left 5 Columns: Trigger Proactive Reminders & Auto-Scanner */}
                <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-5">
                  <div>
                    <span className="text-xs font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-800">
                      Core Problem Statement Requirement
                    </span>
                    <h2 className="text-xl font-extrabold text-slate-900 mt-1">
                      Proactive Email Reminder Engine
                    </h2>
                    <p className="text-xs text-slate-600 mt-1">
                      Automatically sends proactive email alerts for missed medications, upcoming doses, and doctor appointments to {elderProfile.preferredName}, family members, and caretakers.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Optional Personal Note to Include in Email
                    </label>
                    <input
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
                      onClick={handleRunAutoScanReminders}
                      className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-teal-700 to-emerald-700 hover:from-teal-800 hover:to-emerald-800 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                    >
                      <RefreshCw className={`w-4 h-4 ${emailSending ? 'animate-spin' : ''}`} />
                      Run Proactive Auto-Scanner (Missed + Upcoming + Appts)
                    </button>

                    <button
                      type="button"
                      disabled={emailSending}
                      onClick={() => handleDispatchEmail('MISSED_MEDICATION')}
                      className="w-full py-2.5 px-4 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-900 border border-rose-200 font-bold text-xs flex items-center justify-between cursor-pointer"
                    >
                      <span>⚠️ Send Missed Medication Alert Email</span>
                      <Send className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      disabled={emailSending}
                      onClick={() => handleDispatchEmail('UPCOMING_DOSE')}
                      className="w-full py-2.5 px-4 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 font-bold text-xs flex items-center justify-between cursor-pointer"
                    >
                      <span>⏰ Send Upcoming Dose Reminder Email</span>
                      <Send className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      disabled={emailSending}
                      onClick={() => handleDispatchEmail('APPOINTMENT_REMINDER')}
                      className="w-full py-2.5 px-4 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 font-bold text-xs flex items-center justify-between cursor-pointer"
                    >
                      <span>📅 Send Doctor Appointment Reminder Email</span>
                      <Send className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      disabled={emailSending}
                      onClick={() => handleDispatchEmail('DAILY_CARE_DIGEST')}
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
                        <div
                          key={log.id}
                          onClick={() => setSelectedEmailLog(log)}
                          className={`p-3 rounded-xl border text-xs cursor-pointer transition ${
                            selectedEmailLog?.id === log.id
                              ? 'border-teal-600 bg-teal-50/70'
                              : 'border-slate-200 bg-slate-50 hover:bg-white'
                          }`}
                        >
                          <div className="flex items-center justify-between font-bold text-slate-800">
                            <span className="truncate">{log.subject}</span>
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1">
                            <span>To: {log.recipients?.length || 1} recipients</span>
                            <span className="text-emerald-700 font-semibold">{log.status}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right 7 Columns: Live Rendered HTML Email Inspector */}
                <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between space-y-4">
                  {selectedEmailLog ? (
                    <>
                      <div className="border-b border-slate-200 pb-4 space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-xs font-extrabold uppercase px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800">
                            ✓ {selectedEmailLog.status} • {selectedEmailLog.transportMode}
                          </span>
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
                        <h3 className="text-base font-extrabold text-slate-900">
                          {selectedEmailLog.subject}
                        </h3>
                        <p className="text-xs text-slate-500">
                          <strong>Recipients:</strong> {selectedEmailLog.recipients?.join(', ')} •{' '}
                          <strong>Sent:</strong> {new Date(selectedEmailLog.sentAt).toLocaleTimeString()}
                        </p>
                      </div>

                      <div className="flex-1 bg-slate-50 p-4 rounded-2xl border border-slate-200 overflow-x-auto">
                        <div
                          dangerouslySetInnerHTML={{ __html: selectedEmailLog.htmlBody }}
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
            )}

            {/* TAB 5: GOOGLE GEMINI AI STUDIO & PRESCRIPTION SCANNER */}
            {activeTab === 'ai-studio' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column: AI Prescription & Pill Bottle Label Scanner */}
                <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="text-xs font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-800">
                        Google Gemini 2.5 Flash (@google/genai)
                      </span>
                      <h2 className="text-xl font-extrabold text-slate-900 mt-1">
                        AI Prescription & Label Scanner
                      </h2>
                      <p className="text-xs text-slate-500">
                        Upload a photo of a prescription/pill bottle or paste clinical shorthand to auto-populate the senior schedule
                      </p>
                    </div>
                  </div>

                  <form onSubmit={handleScanPrescription} className="space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Doctor's Prescription Note or Shorthand
                      </label>
                      <textarea
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
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                        />
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
                      <p className="text-xs font-bold text-teal-900">
                        ✨ {rxScanResult.plainLanguageSummary}
                      </p>
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
                            onClick={() => handleSaveMedication(med)}
                            className="px-3.5 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold shrink-0 cursor-pointer"
                          >
                            + Add to Schedule
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Right Column: Drug Interaction Guardian & Optional Custom Gemini API Key */}
                <div className="space-y-6">
                  <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-extrabold text-slate-900">
                          AI Drug-Drug & Food Interaction Guardian
                        </h3>
                        <p className="text-xs text-slate-500">
                          Cross-checks {elderProfile.preferredName}'s {medications.length} active prescriptions against chronic conditions & allergies
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleRunInteractionCheck}
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
                        Click "Analyze Now" to run a full geriatric clinical interaction check across Metformin, Telmisartan, Atorvastatin, and Calcium + Vitamin D3.
                      </p>
                    )}
                  </div>

                  {/* Optional Live Gemini API Key Configuration */}
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
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 px-6 text-xs text-slate-500 mt-12">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>
            <strong>KinCare AI</strong> — Built for <strong>PromptWars x Catalyst (Build with AI)</strong> • Elderly Individuals at the Centre of Care
          </p>
          <p className="text-slate-400">
            Passcode Protected • WCAG Senior Accessible • Google Gemini SDK & Cloud Run Ready
          </p>
        </div>
      </footer>

      {/* Modals */}
      <PasscodeModal
        isOpen={passcodeModalOpen}
        onClose={() => setPasscodeModalOpen(false)}
        members={careCircleMembers}
        currentMember={activeMember}
        onVerifyPasscode={handleVerifyPasscode}
        onAddMember={handleAddCareMember}
      />

      <MedicationModal
        isOpen={medModalOpen}
        onClose={() => {
          setMedModalOpen(false);
          setEditingMed(null);
        }}
        onSave={handleSaveMedication}
        initialData={editingMed}
      />

      <AppointmentModal
        isOpen={apptModalOpen}
        onClose={() => setApptModalOpen(false)}
        onSave={handleSaveAppointment}
      />

      <EmergencyIdModal
        isOpen={emergencyModalOpen}
        onClose={() => setEmergencyModalOpen(false)}
        elderProfile={elderProfile}
        medications={medications}
        careCircleMembers={careCircleMembers}
      />
    </div>
  );
}
