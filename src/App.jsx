import React, { useState, useEffect, useCallback, Suspense, lazy } from 'react';
import {
  HeartPulse,
  CheckCircle2,
  AlertTriangle,
  Mail,
} from 'lucide-react';

import {
  apiFetch,
  getStoredToken,
  setStoredToken,
  getCustomGeminiKey,
  speakText,
} from './utils/api.js';
import HeaderBar from './components/HeaderBar.jsx';

const PasscodeModal = lazy(() => import('./components/PasscodeModal.jsx'));
const SeniorComfortView = lazy(() => import('./components/SeniorComfortView.jsx'));
const AuthOnboardingScreen = lazy(() => import('./components/AuthOnboardingScreen.jsx'));
const OverviewTab = lazy(() => import('./components/tabs/OverviewTab.jsx'));
const MedicationsTab = lazy(() => import('./components/tabs/MedicationsTab.jsx'));
const AppointmentsTab = lazy(() => import('./components/tabs/AppointmentsTab.jsx'));
const EmailsTab = lazy(() => import('./components/tabs/EmailsTab.jsx'));
const AiStudioTab = lazy(() => import('./components/tabs/AiStudioTab.jsx'));
const MedicationModal = lazy(() =>
  import('./components/Modals.jsx').then((m) => ({ default: m.MedicationModal }))
);
const AppointmentModal = lazy(() =>
  import('./components/Modals.jsx').then((m) => ({ default: m.AppointmentModal }))
);
const EmergencyIdModal = lazy(() =>
  import('./components/Modals.jsx').then((m) => ({ default: m.EmergencyIdModal }))
);
const ElderProfileModal = lazy(() =>
  import('./components/Modals.jsx').then((m) => ({ default: m.ElderProfileModal }))
);

function ToastBanner({ toastBanner }) {
  if (!toastBanner) return null;
  const toneClass =
    toastBanner.type === 'error'
      ? 'bg-rose-800 text-white border-rose-600'
      : toastBanner.type === 'warning'
        ? 'bg-amber-900 text-white border-amber-600'
        : 'bg-slate-900 text-white border-teal-500';

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed bottom-5 right-5 z-50 max-w-md px-5 py-3.5 rounded-2xl shadow-2xl border flex items-center gap-3 text-sm font-bold transition-all ${toneClass}`}
    >
      <CheckCircle2 className="w-5 h-5 text-teal-400 shrink-0" />
      <span>{toastBanner.title}</span>
    </div>
  );
}

/**
 * Root application coordinator for KinCare AI.
 * Manages session hydration, role-based views, and shared API mutations.
 */
export default function App() {
  const [dashboard, setDashboard] = useState(null);
  const [publicCircle, setPublicCircle] = useState({
    elderName: 'Ramesh Sharma',
    demoMode: false,
    members: [],
  });
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeMember, setActiveMember] = useState(null);
  const [viewMode, setViewMode] = useState('command');
  const [activeTab, setActiveTab] = useState('overview');

  // Accessibility states
  const [fontScale, setFontScale] = useState('normal');
  const [highContrast, setHighContrast] = useState(false);

  // Modals
  const [passcodeModalOpen, setPasscodeModalOpen] = useState(false);
  const [medModalOpen, setMedModalOpen] = useState(false);
  const [editingMed, setEditingMed] = useState(null);
  const [apptModalOpen, setApptModalOpen] = useState(false);
  const [editingAppt, setEditingAppt] = useState(null);
  const [emergencyModalOpen, setEmergencyModalOpen] = useState(false);
  const [elderProfileModalOpen, setElderProfileModalOpen] = useState(false);

  // Medication filters & Routine inputs
  const [slotFilter, setSlotFilter] = useState('All');
  const [newRoutineTitle, setNewRoutineTitle] = useState('');
  const [newRoutineTime, setNewRoutineTime] = useState('10:00');

  // Collaborative Vitals & Elder Autonomy Proposal state
  const [proposalTitle, setProposalTitle] = useState('');
  const [proposalReason, setProposalReason] = useState('');
  const [cmdVitals, setCmdVitals] = useState({
    systolic: 126,
    diastolic: 80,
    heartRate: 72,
    bloodSugarMgDl: 110,
    mood: 'Comfortable',
  });

  // Proactive Email & Live Auto-Watcher state
  const [selectedEmailLog, setSelectedEmailLog] = useState(null);
  const [emailCustomNote, setEmailCustomNote] = useState('');
  const [emailSending, setEmailSending] = useState(false);
  const [autoWatcherActive, setAutoWatcherActive] = useState(true);
  const [lastWatcherCheck, setLastWatcherCheck] = useState('Active just now');
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
  const [aiCompanionQuery, setAiCompanionQuery] = useState(
    'What is Ramesh Ji’s next tablet today and what dietary precaution applies?'
  );
  const [aiCompanionLang, setAiCompanionLang] = useState('English');
  const [aiCompanionReply, setAiCompanionReply] = useState(null);
  const [aiCompanionLoading, setAiCompanionLoading] = useState(false);

  const showToast = useCallback((title, type = 'success') => {
    setToastBanner({ title, type });
    setTimeout(() => setToastBanner(null), 4500);
  }, []);

  const syncSelectedEmail = useCallback((emailLogs = []) => {
    setSelectedEmailLog((prev) => {
      if (!emailLogs.length) return null;
      if (prev) {
        return emailLogs.find((l) => l.id === prev.id) || emailLogs[0];
      }
      return emailLogs[0];
    });
  }, []);

  const fetchDashboardData = useCallback(async () => {
    try {
      const data = await apiFetch('/api/dashboard');
      setDashboard(data);
      if (data.authenticatedMember && getStoredToken()) {
        setActiveMember(data.authenticatedMember);
        setIsAuthenticated((prev) => {
          if (!prev) {
            setViewMode(data.authenticatedMember.role === 'elder' ? 'comfort' : 'command');
          }
          return true;
        });
      } else {
        if (getStoredToken()) {
          setStoredToken('');
        }
        setIsAuthenticated(false);
        setActiveMember(null);
        try {
          const pub = await apiFetch('/api/public-members');
          setPublicCircle({
            elderName: pub.elderName || 'Ramesh Sharma',
            demoMode: Boolean(pub.demoMode ?? data.demoMode),
            members: pub.members || [],
          });
        } catch {
          // Keep existing public circle fallback if unreachable
        }
      }
      syncSelectedEmail(data.emailLogs);
    } catch (err) {
      showToast(err.message || 'Failed to load dashboard data', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast, syncSelectedEmail]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  useEffect(() => {
    const html = document.documentElement;
    html.classList.remove('font-scale-normal', 'font-scale-large', 'font-scale-xlarge');
    html.classList.add(`font-scale-${fontScale}`);
  }, [fontScale]);

  useEffect(() => {
    if (!autoWatcherActive || !isAuthenticated) return undefined;
    const timer = setInterval(() => {
      setLastWatcherCheck(new Date().toLocaleTimeString());
    }, 30000);
    return () => clearInterval(timer);
  }, [autoWatcherActive, isAuthenticated]);

  // Passcode Authentication & Account Signup Handlers
  const applyAuthSession = async (res) => {
    setStoredToken(res.token);
    setActiveMember(res.member);
    setViewMode(res.member.role === 'elder' ? 'comfort' : 'command');

    if (res.dashboard && res.dashboard.elderProfile) {
      setDashboard(res.dashboard);
      setPublicCircle((prev) => ({
        ...prev,
        demoMode: Boolean(res.dashboard.demoMode),
      }));
      syncSelectedEmail(res.dashboard.emailLogs);
      setIsAuthenticated(true);
      setLoading(false);
    } else {
      await fetchDashboardData();
      setIsAuthenticated(true);
    }
  };

  const handleVerifyPasscode = async (passcode, memberId, email = '') => {
    const res = await apiFetch('/api/auth/verify-passcode', {
      method: 'POST',
      body: JSON.stringify({ passcode, memberId, email }),
    });
    await applyAuthSession(res);
    showToast(`Signed in as ${res.member.name} (${res.member.roleLabel})`);
  };

  const handleDemoLogin = async (memberId, role) => {
    const res = await apiFetch('/api/auth/demo-login', {
      method: 'POST',
      body: JSON.stringify({ memberId, role }),
    });
    await applyAuthSession(res);
    showToast(`Signed in (Demo) as ${res.member.name} (${res.member.roleLabel})`);
  };

  const handleSignup = async (signupForm) => {
    const res = await apiFetch('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify(signupForm),
    });
    await applyAuthSession(res);
    showToast(`Account created! Welcome to KinCare AI, ${res.member.name}`);
  };

  const handleSignOut = async () => {
    setStoredToken('');
    setIsAuthenticated(false);
    setActiveMember(null);
    showToast('Signed out — choose your role or sign in anytime');
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

  const handleToggleMemberNotify = async (memberId, field, nextVal) => {
    try {
      await apiFetch(`/api/care-circle/members/${memberId}`, {
        method: 'PATCH',
        body: JSON.stringify({ [field]: nextVal }),
      });
      showToast('Updated Care Circle notification preference');
      await fetchDashboardData();
    } catch (err) {
      showToast(err.message || 'Failed to update notification preference', 'error');
    }
  };

  const handleDeleteCareMember = async (memberId) => {
    try {
      await apiFetch(`/api/care-circle/members/${memberId}`, { method: 'DELETE' });
      showToast('Removed member from Care Circle');
      await fetchDashboardData();
    } catch (err) {
      showToast(err.message || 'Failed to remove Care Circle member', 'error');
    }
  };

  const handleSaveElderProfile = async (profilePayload) => {
    try {
      await apiFetch('/api/elder-profile', {
        method: 'PUT',
        body: JSON.stringify(profilePayload),
      });
      setElderProfileModalOpen(false);
      showToast(`Saved patient profile for ${profilePayload.name}`);
      await fetchDashboardData();
    } catch (err) {
      showToast(err.message || 'Failed to save patient profile', 'error');
    }
  };

  const handleRestockMedication = async (med) => {
    try {
      const nextStock = (Number(med.stockRemaining) || 0) + 30;
      await apiFetch(`/api/medications/${med.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          stockRemaining: nextStock,
          actorName: activeMember?.name || 'Care Circle',
          actorRole: activeMember?.role || 'family',
        }),
      });
      showToast(`Refilled ${med.name}: ${nextStock} pills in stock`);
      await fetchDashboardData();
    } catch (err) {
      showToast(err.message || 'Failed to refill medication', 'error');
    }
  };

  const handleSnoozeMedication = async (med) => {
    try {
      await apiFetch(`/api/medications/${med.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          status: 'upcoming',
          snoozedUntil: '15 mins',
          actorName: dashboard?.elderProfile?.name || 'Senior',
          actorRole: 'elder',
        }),
      });
      showToast(`Snoozed ${med.name} reminder for 15 minutes`);
      await fetchDashboardData();
    } catch (err) {
      showToast(err.message || 'Failed to snooze medication reminder', 'error');
    }
  };

  const handleToggleAppointmentStatus = async (appt) => {
    try {
      const isCompleted = String(appt.status || '').toLowerCase() === 'completed';
      const nextStatus = isCompleted ? 'Scheduled' : 'Completed';
      await apiFetch(`/api/appointments/${appt.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          status: nextStatus,
          actorName: activeMember?.name || 'Care Circle',
        }),
      });
      showToast(`Marked appointment with ${appt.doctorName} as ${nextStatus}`);
      await fetchDashboardData();
    } catch (err) {
      showToast(err.message || 'Failed to update appointment status', 'error');
    }
  };

  const handleSaveAppointmentQuestion = async (appt, elderQuestions) => {
    try {
      await apiFetch(`/api/appointments/${appt.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          elderQuestions,
          actorName: dashboard?.elderProfile?.name || 'Senior',
        }),
      });
      showToast(`Saved question for ${appt.doctorName}`);
      await fetchDashboardData();
    } catch (err) {
      showToast(err.message || 'Failed to save doctor question', 'error');
    }
  };

  const handleSaveMedication = async (medPayload) => {
    try {
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
    } catch (err) {
      showToast(err.message || 'Failed to save medication', 'error');
    }
  };

  const handleUpdateMedicationStatus = async (medId, status) => {
    try {
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
          'Marked as Missed — Proactive Email Alert automatically sent to Care Circle!',
          'warning'
        );
      } else {
        showToast(`Medication status updated to ${status.toUpperCase()}`);
      }
      await fetchDashboardData();
    } catch (err) {
      showToast(err.message || 'Failed to update medication status', 'error');
    }
  };

  const handleDeleteMedication = async (medId) => {
    try {
      await apiFetch(
        `/api/medications/${medId}?actorName=${encodeURIComponent(activeMember?.name || 'Care Circle')}`,
        { method: 'DELETE' }
      );
      showToast('Medication removed from schedule');
      await fetchDashboardData();
    } catch (err) {
      showToast(err.message || 'Failed to remove medication', 'error');
    }
  };

  const handleToggleRoutine = async (routineId, completed) => {
    try {
      await apiFetch(`/api/routines/${routineId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          completed,
          actorName: activeMember?.name || dashboard?.elderProfile?.name,
        }),
      });
      await fetchDashboardData();
    } catch (err) {
      showToast(err.message || 'Failed to update routine', 'error');
    }
  };

  const handleAddRoutine = async (e) => {
    e.preventDefault();
    if (!newRoutineTitle.trim()) return;
    try {
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
    } catch (err) {
      showToast(err.message || 'Failed to add routine', 'error');
    }
  };

  const handleDeleteRoutine = async (routineId) => {
    try {
      await apiFetch(`/api/routines/${routineId}`, { method: 'DELETE' });
      showToast('Removed daily healthcare routine');
      await fetchDashboardData();
    } catch (err) {
      showToast(err.message || 'Failed to remove routine', 'error');
    }
  };

  const handleSaveAppointment = async (apptPayload) => {
    try {
      if (editingAppt) {
        await apiFetch(`/api/appointments/${editingAppt.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            ...apptPayload,
            actorName: activeMember?.name,
          }),
        });
        showToast(`Updated appointment with ${apptPayload.doctorName}`);
      } else {
        await apiFetch('/api/appointments', {
          method: 'POST',
          body: JSON.stringify({
            ...apptPayload,
            actorName: activeMember?.name,
          }),
        });
        showToast(`Scheduled appointment with ${apptPayload.doctorName}`);
      }
      setApptModalOpen(false);
      setEditingAppt(null);
      await fetchDashboardData();
    } catch (err) {
      showToast(err.message || 'Failed to save appointment', 'error');
    }
  };

  const handleDeleteAppointment = async (apptId) => {
    try {
      await apiFetch(`/api/appointments/${apptId}`, { method: 'DELETE' });
      showToast('Appointment cancelled');
      await fetchDashboardData();
    } catch (err) {
      showToast(err.message || 'Failed to cancel appointment', 'error');
    }
  };

  const handleCreateProposal = async (e) => {
    e.preventDefault();
    if (!proposalTitle.trim()) return;
    try {
      await apiFetch('/api/autonomy', {
        method: 'POST',
        body: JSON.stringify({
          proposedBy: activeMember
            ? `${activeMember.name} (${activeMember.role === 'caretaker' ? 'Caregiver' : activeMember.role})`
            : 'Family Member',
          title: proposalTitle.trim(),
          reason:
            proposalReason.trim() || 'Proposed in Care Circle portal for elderly confirmation.',
        }),
      });
      setProposalTitle('');
      setProposalReason('');
      showToast('Sent schedule proposal to Elderly Person for 1-tap approval');
      await fetchDashboardData();
    } catch (err) {
      showToast(err.message || 'Failed to send autonomy proposal', 'error');
    }
  };

  const handleLogVitals = async (vitalPayload) => {
    try {
      await apiFetch('/api/vitals', {
        method: 'POST',
        body: JSON.stringify(vitalPayload),
      });
      showToast('Logged new Blood Pressure, Sugar & Mood reading');
      await fetchDashboardData();
    } catch (err) {
      showToast(err.message || 'Failed to log vitals', 'error');
    }
  };

  const handleSubmitCommandVitals = async (e) => {
    e.preventDefault();
    await handleLogVitals({
      ...cmdVitals,
      systolic: Number(cmdVitals.systolic),
      diastolic: Number(cmdVitals.diastolic),
      heartRate: Number(cmdVitals.heartRate),
      bloodSugarMgDl: Number(cmdVitals.bloodSugarMgDl),
      loggedBy: activeMember?.name || 'Caregiver',
    });
  };

  const handleResolveAutonomy = async (decisionId, status, elderResponseNote) => {
    try {
      await apiFetch(`/api/autonomy/${decisionId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status, elderResponseNote }),
      });
      showToast(`Autonomy decision recorded: ${status.replace(/_/g, ' ')}`);
      await fetchDashboardData();
    } catch (err) {
      showToast(err.message || 'Failed to record autonomy decision', 'error');
    }
  };

  const handleUpdateAutonomyPrefs = async (prefs) => {
    try {
      await apiFetch('/api/elder-profile/autonomy', {
        method: 'PUT',
        body: JSON.stringify(prefs),
      });
      showToast('Updated Elder Autonomy & Sharing Preferences');
      await fetchDashboardData();
    } catch (err) {
      showToast(err.message || 'Failed to update preferences', 'error');
    }
  };

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
    } catch (err) {
      showToast(err.message || 'Failed to dispatch proactive email', 'error');
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
    } catch (err) {
      showToast(err.message || 'Failed to run auto-scan reminders', 'error');
    } finally {
      setEmailSending(false);
    }
  };

  const handleSimulate9AmMissed = async () => {
    setEmailSending(true);
    try {
      const res = await apiFetch('/api/reminders/simulate-9am-missed', {
        method: 'POST',
        body: JSON.stringify({ force: true }),
      });
      if (res.emailLog) {
        setSelectedEmailLog(res.emailLog);
        const idInfo = res.emailLog.resendId ? ` (Resend ID: ${res.emailLog.resendId})` : '';
        showToast(
          `9:00 AM Missed Dose Detected — Email sent to ${res.emailLog.recipients?.join(', ')}${idInfo}!`,
          'warning'
        );
      }
      await fetchDashboardData();
    } catch (err) {
      showToast(err.message || 'Failed to simulate 9:00 AM missed dose', 'error');
    } finally {
      setEmailSending(false);
    }
  };

  const handleQuickRoleSwitch = async (targetRole) => {
    if (activeMember?.role === targetRole) {
      setViewMode(targetRole === 'elder' ? 'comfort' : 'command');
      return;
    }
    const members = dashboard?.careCircleMembers || [];
    const member = members.find((m) => m.role === targetRole);
    if (!dashboard?.demoMode) {
      setPasscodeModalOpen(true);
      return;
    }
    try {
      await handleDemoLogin(member?.id, targetRole);
    } catch {
      setPasscodeModalOpen(true);
    }
  };

  const handleTriggerSOS = async () => {
    try {
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
    } catch (err) {
      showToast(err.message || 'Failed to send SOS alert', 'error');
    }
  };

  const handleRunInteractionCheck = async () => {
    setInteractionLoading(true);
    try {
      const res = await apiFetch('/api/ai/interactions', { method: 'POST', body: JSON.stringify({}) });
      setInteractionReport(res);
      showToast('Completed Gemini AI Drug-Drug & Food Interaction Analysis');
    } catch (err) {
      showToast(err.message || 'Failed to analyze medication interactions', 'error');
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
    } catch (err) {
      showToast(err.message || 'Failed to scan prescription', 'error');
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
    } catch (err) {
      showToast(err.message || 'Failed to generate doctor visit brief', 'error');
    } finally {
      setDoctorBriefLoading(false);
    }
  };

  const handleAskCompanion = async (message, language = 'English') => {
    try {
      return await apiFetch('/api/ai/companion', {
        method: 'POST',
        body: JSON.stringify({ message, language }),
      });
    } catch (err) {
      showToast(err.message || 'AI Care Companion is unavailable right now', 'error');
      return { reply: 'Sorry, I could not reach the Care Companion right now. Please try again shortly.' };
    }
  };

  const handleAskAiHubCompanion = async (e) => {
    if (e) e.preventDefault();
    if (!aiCompanionQuery.trim()) return;
    setAiCompanionLoading(true);
    try {
      const res = await handleAskCompanion(aiCompanionQuery.trim(), aiCompanionLang);
      setAiCompanionReply(res);
      showToast('AI Care Companion response generated');
    } finally {
      setAiCompanionLoading(false);
    }
  };

  const handleResetDemo = async () => {
    try {
      await apiFetch('/api/reset-demo', { method: 'POST' });
      showToast('Demo data reset to clean initial state');
      await fetchDashboardData();
    } catch (err) {
      showToast(err.message || 'Failed to reset demo data', 'error');
    }
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

  if (!isAuthenticated || !elderProfile) {
    return (
      <div className={highContrast ? 'high-contrast-mode' : ''}>
        <ToastBanner toastBanner={toastBanner} />
        <Suspense
          fallback={
            <div className="min-h-screen flex items-center justify-center bg-[#FAF8F5] text-slate-700 font-bold">
              Loading KinCare Sign-In...
            </div>
          }
        >
          <AuthOnboardingScreen
            elderName={publicCircle.elderName || 'Ramesh Sharma'}
            members={publicCircle.members}
            demoMode={Boolean(dashboard?.demoMode ?? publicCircle.demoMode)}
            onVerifyPasscode={handleVerifyPasscode}
            onDemoLogin={handleDemoLogin}
            onSignup={handleSignup}
            fontScale={fontScale}
            setFontScale={setFontScale}
          />
        </Suspense>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex flex-col bg-slate-50 text-slate-900 ${highContrast ? 'high-contrast-mode' : ''}`}>
      <ToastBanner toastBanner={toastBanner} />

      <HeaderBar
        elderProfile={elderProfile}
        fontScale={fontScale}
        setFontScale={setFontScale}
        highContrast={highContrast}
        setHighContrast={setHighContrast}
        onOpenEmergencyModal={() => setEmergencyModalOpen(true)}
        demoMode={Boolean(dashboard?.demoMode)}
        onResetDemo={handleResetDemo}
        activeMember={activeMember}
        viewMode={viewMode}
        onQuickRoleSwitch={handleQuickRoleSwitch}
        onOpenPasscodeModal={() => setPasscodeModalOpen(true)}
        onSignOut={handleSignOut}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        medicationsCount={medications.length}
        appointmentsCount={appointments.length}
        emailLogsCount={emailLogs.length}
      />

      <main id="main-content" className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        {viewMode === 'comfort' ? (
          <Suspense
            fallback={
              <div className="p-8 text-center text-slate-700 font-bold">
                Loading Senior Comfort View...
              </div>
            }
          >
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
              onSnoozeMedication={handleSnoozeMedication}
              onSaveAppointmentQuestion={handleSaveAppointmentQuestion}
            />
          </Suspense>
        ) : (
          <div className="space-y-6">
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
                      <span className="text-xs text-rose-700 font-semibold">Auto-Escalation Active</span>
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
                      handleSimulate9AmMissed();
                      setActiveTab('emails');
                    }}
                    className="px-4 py-2.5 rounded-xl bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Mail className="w-4 h-4" />
                    {emailSending ? 'Sending...' : 'Simulate 9:00 AM Missed Dose & Email 9553943884pavan@gmail.com'}
                  </button>
                </div>
              </div>
            )}

            <Suspense
              fallback={
                <div className="p-8 text-center text-slate-600 font-semibold">
                  Loading Care Portal Section...
                </div>
              }
            >
              {activeTab === 'overview' && (
                <OverviewTab
                  elderProfile={elderProfile}
                  summaryMetrics={summaryMetrics}
                  appointments={appointments}
                  vitalsLog={vitalsLog}
                  emailLogs={emailLogs}
                  medications={medications}
                  adherenceHistory={adherenceHistory}
                  careCircleMembers={careCircleMembers}
                  autonomyDecisions={autonomyDecisions}
                  emailSending={emailSending}
                  cmdVitals={cmdVitals}
                  setCmdVitals={setCmdVitals}
                  proposalTitle={proposalTitle}
                  setProposalTitle={setProposalTitle}
                  proposalReason={proposalReason}
                  setProposalReason={setProposalReason}
                  activityFeed={activityFeed}
                  onOpenElderProfileModal={() => setElderProfileModalOpen(true)}
                  onQuickRoleSwitch={handleQuickRoleSwitch}
                  onSimulate9AmMissed={handleSimulate9AmMissed}
                  setActiveTab={setActiveTab}
                  onOpenNewMedModal={() => {
                    setEditingMed(null);
                    setMedModalOpen(true);
                  }}
                  onEditMed={(med) => {
                    setEditingMed(med);
                    setMedModalOpen(true);
                  }}
                  onUpdateMedicationStatus={handleUpdateMedicationStatus}
                  onRestockMedication={handleRestockMedication}
                  onOpenPasscodeModal={() => setPasscodeModalOpen(true)}
                  onDeleteCareMember={handleDeleteCareMember}
                  onToggleMemberNotify={handleToggleMemberNotify}
                  onSubmitCommandVitals={handleSubmitCommandVitals}
                  onCreateProposal={handleCreateProposal}
                />
              )}

              {activeTab === 'medications' && (
                <MedicationsTab
                  elderProfile={elderProfile}
                  medications={medications}
                  filteredMedications={filteredMedications}
                  vitalsLog={vitalsLog}
                  appointments={appointments}
                  slotFilter={slotFilter}
                  setSlotFilter={setSlotFilter}
                  interactionLoading={interactionLoading}
                  interactionReport={interactionReport}
                  onRunInteractionCheck={handleRunInteractionCheck}
                  onOpenNewMedModal={() => {
                    setEditingMed(null);
                    setMedModalOpen(true);
                  }}
                  onEditMed={(med) => {
                    setEditingMed(med);
                    setMedModalOpen(true);
                  }}
                  onDeleteMedication={handleDeleteMedication}
                  onRestockMedication={handleRestockMedication}
                  onUpdateMedicationStatus={handleUpdateMedicationStatus}
                />
              )}

              {activeTab === 'appointments' && (
                <AppointmentsTab
                  elderProfile={elderProfile}
                  appointments={appointments}
                  routines={routines}
                  doctorBrief={doctorBrief}
                  doctorBriefLoading={doctorBriefLoading}
                  newRoutineTime={newRoutineTime}
                  setNewRoutineTime={setNewRoutineTime}
                  newRoutineTitle={newRoutineTitle}
                  setNewRoutineTitle={setNewRoutineTitle}
                  onGenerateDoctorBrief={handleGenerateDoctorBrief}
                  onOpenNewApptModal={() => {
                    setEditingAppt(null);
                    setApptModalOpen(true);
                  }}
                  onEditAppt={(appt) => {
                    setEditingAppt(appt);
                    setApptModalOpen(true);
                  }}
                  onToggleAppointmentStatus={handleToggleAppointmentStatus}
                  onDispatchEmail={handleDispatchEmail}
                  setActiveTab={setActiveTab}
                  onDeleteAppointment={handleDeleteAppointment}
                  onAddRoutine={handleAddRoutine}
                  onToggleRoutine={handleToggleRoutine}
                  onDeleteRoutine={handleDeleteRoutine}
                />
              )}

              {activeTab === 'emails' && (
                <EmailsTab
                  elderProfile={elderProfile}
                  autoWatcherActive={autoWatcherActive}
                  setAutoWatcherActive={setAutoWatcherActive}
                  lastWatcherCheck={lastWatcherCheck}
                  setLastWatcherCheck={setLastWatcherCheck}
                  emailSending={emailSending}
                  emailCustomNote={emailCustomNote}
                  setEmailCustomNote={setEmailCustomNote}
                  emailLogs={emailLogs}
                  selectedEmailLog={selectedEmailLog}
                  setSelectedEmailLog={setSelectedEmailLog}
                  onSimulate9AmMissed={handleSimulate9AmMissed}
                  onRunAutoScanReminders={handleRunAutoScanReminders}
                  onDispatchEmail={handleDispatchEmail}
                />
              )}

              {activeTab === 'ai-studio' && (
                <AiStudioTab
                  elderProfile={elderProfile}
                  medications={medications}
                  rxText={rxText}
                  setRxText={setRxText}
                  rxImageBase64={rxImageBase64}
                  rxScanning={rxScanning}
                  rxScanResult={rxScanResult}
                  interactionLoading={interactionLoading}
                  interactionReport={interactionReport}
                  geminiKeyInput={geminiKeyInput}
                  setGeminiKeyInput={setGeminiKeyInput}
                  aiCompanionLang={aiCompanionLang}
                  setAiCompanionLang={setAiCompanionLang}
                  aiCompanionQuery={aiCompanionQuery}
                  setAiCompanionQuery={setAiCompanionQuery}
                  aiCompanionLoading={aiCompanionLoading}
                  aiCompanionReply={aiCompanionReply}
                  onScanPrescription={handleScanPrescription}
                  onImageUpload={handleImageUpload}
                  onSaveMedication={handleSaveMedication}
                  onRunInteractionCheck={handleRunInteractionCheck}
                  onAskAiHubCompanion={handleAskAiHubCompanion}
                  showToast={showToast}
                />
              )}
            </Suspense>
          </div>
        )}
      </main>

      <footer className="bg-white border-t border-slate-200 py-4 px-6 text-xs text-slate-500 mt-12">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>
            <strong>KinCare AI</strong> — Built for <strong>PromptWars x Catalyst (Build with AI)</strong> •
            Elderly Individuals at the Centre of Care
          </p>
          <p className="text-slate-400">
            Passcode Protected • WCAG Senior Accessible • Google Gemini SDK &amp; Cloud Run Ready
          </p>
        </div>
      </footer>

      <Suspense fallback={null}>
        {passcodeModalOpen && (
          <PasscodeModal
            isOpen={passcodeModalOpen}
            onClose={() => setPasscodeModalOpen(false)}
            members={careCircleMembers}
            currentMember={activeMember}
            demoMode={Boolean(dashboard?.demoMode)}
            onVerifyPasscode={handleVerifyPasscode}
            onDemoLogin={handleDemoLogin}
            onAddMember={handleAddCareMember}
          />
        )}

        {medModalOpen && (
          <MedicationModal
            isOpen={medModalOpen}
            onClose={() => {
              setMedModalOpen(false);
              setEditingMed(null);
            }}
            onSave={handleSaveMedication}
            initialData={editingMed}
          />
        )}

        {apptModalOpen && (
          <AppointmentModal
            isOpen={apptModalOpen}
            onClose={() => {
              setApptModalOpen(false);
              setEditingAppt(null);
            }}
            onSave={handleSaveAppointment}
            initialData={editingAppt}
          />
        )}

        {emergencyModalOpen && (
          <EmergencyIdModal
            isOpen={emergencyModalOpen}
            onClose={() => setEmergencyModalOpen(false)}
            elderProfile={elderProfile}
            medications={medications}
            careCircleMembers={careCircleMembers}
          />
        )}

        {elderProfileModalOpen && (
          <ElderProfileModal
            isOpen={elderProfileModalOpen}
            onClose={() => setElderProfileModalOpen(false)}
            onSave={handleSaveElderProfile}
            elderProfile={elderProfile}
          />
        )}
      </Suspense>
    </div>
  );
}
