import React from 'react';
import {
  HeartPulse,
  ShieldCheck,
  Pill,
  Calendar,
  Mail,
  Sparkles,
  Activity,
  Users,
  Volume2,
  RefreshCw,
  KeyRound,
  QrCode,
  LogOut,
} from 'lucide-react';

/**
 * Top accessibility toolbar, Care Circle role switcher, and Command Center tab navigation.
 */
export default function HeaderBar({
  elderProfile,
  fontScale,
  setFontScale,
  highContrast,
  setHighContrast,
  onOpenEmergencyModal,
  demoMode,
  onResetDemo,
  activeMember,
  viewMode,
  onQuickRoleSwitch,
  onOpenPasscodeModal,
  onSignOut,
  activeTab,
  setActiveTab,
  medicationsCount,
  appointmentsCount,
  emailLogsCount,
}) {
  const navTabs = [
    { id: 'overview', label: 'Ecosystem Overview', icon: Activity },
    {
      id: 'medications',
      label: `Medications & Adherence (${medicationsCount})`,
      icon: Pill,
    },
    {
      id: 'appointments',
      label: `Appointments & Routines (${appointmentsCount})`,
      icon: Calendar,
    },
    {
      id: 'emails',
      label: `Proactive Email Alerts (${emailLogsCount})`,
      icon: Mail,
    },
    {
      id: 'ai-studio',
      label: 'Gemini AI Prescription & Safety Hub',
      icon: Sparkles,
    },
  ];

  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:rounded-xl focus:bg-teal-700 focus:text-white focus:font-extrabold"
      >
        Skip to main content
      </a>

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
              Patient at Centre:{' '}
              <strong>
                {elderProfile.name} ({elderProfile.age} yrs)
              </strong>
            </span>
          </div>

          {/* Accessibility Controls (WCAG AAA) */}
          <div className="flex flex-wrap items-center gap-2">
            <div
              className="flex items-center bg-slate-800 rounded-lg p-0.5 border border-slate-700"
              role="group"
              aria-label="Text Size"
            >
              {[
                { id: 'normal', label: 'A' },
                { id: 'large', label: 'A+' },
                { id: 'xlarge', label: 'A++' },
              ].map((sz) => (
                <button
                  key={sz.id}
                  type="button"
                  aria-pressed={fontScale === sz.id}
                  onClick={() => setFontScale(sz.id)}
                  className={`px-2 py-0.5 rounded text-[11px] font-bold cursor-pointer ${
                    fontScale === sz.id ? 'bg-teal-600 text-white' : 'text-slate-300'
                  }`}
                >
                  {sz.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              aria-pressed={highContrast}
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
              onClick={onOpenEmergencyModal}
              className="px-2.5 py-1 rounded-lg bg-rose-700 hover:bg-rose-600 text-white font-bold text-[11px] flex items-center gap-1 cursor-pointer"
            >
              <QrCode className="w-3.5 h-3.5" />
              Emergency ID
            </button>

            {demoMode && (
              <button
                type="button"
                onClick={onResetDemo}
                className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] flex items-center gap-1 cursor-pointer"
                title="Reset demo state"
              >
                <RefreshCw className="w-3 h-3" />
                Reset Demo
              </button>
            )}
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
                  Gemini 3.5 + Resend + Cloud Run
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Smart Elderly Care, Medication Adherence &amp; Collaborative Family Platform
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div
              className="inline-flex rounded-2xl bg-slate-100 p-1 border border-slate-200"
              role="group"
              aria-label="Three Main User Roles Switcher"
            >
              <button
                type="button"
                aria-pressed={activeMember?.role === 'elder' && viewMode === 'comfort'}
                onClick={() => onQuickRoleSwitch('elder')}
                className={`px-3 py-2 rounded-xl text-xs font-extrabold transition flex items-center gap-1.5 cursor-pointer ${
                  activeMember?.role === 'elder' && viewMode === 'comfort'
                    ? 'bg-teal-700 text-white shadow-xs'
                    : 'text-slate-700 hover:text-slate-900'
                }`}
              >
                <Volume2 className="w-3.5 h-3.5" />
                Elderly View
              </button>
              <button
                type="button"
                aria-pressed={activeMember?.role === 'family' && viewMode === 'command'}
                onClick={() => onQuickRoleSwitch('family')}
                className={`px-3 py-2 rounded-xl text-xs font-extrabold transition flex items-center gap-1.5 cursor-pointer ${
                  activeMember?.role === 'family' && viewMode === 'command'
                    ? 'bg-indigo-700 text-white shadow-xs'
                    : 'text-slate-700 hover:text-slate-900'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                Family Portal
              </button>
              <button
                type="button"
                aria-pressed={activeMember?.role === 'caretaker' && viewMode === 'command'}
                onClick={() => onQuickRoleSwitch('caretaker')}
                className={`px-3 py-2 rounded-xl text-xs font-extrabold transition flex items-center gap-1.5 cursor-pointer ${
                  activeMember?.role === 'caretaker' && viewMode === 'command'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-slate-700 hover:text-slate-900'
                }`}
              >
                <Activity className="w-3.5 h-3.5" />
                Caregiver View
              </button>
            </div>

            {viewMode === 'command' && (
              <button
                type="button"
                onClick={onOpenPasscodeModal}
                className="px-3 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-300 text-slate-900 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                title="Manage Care Circle Members & Passcodes"
              >
                <KeyRound className="w-3.5 h-3.5 text-amber-700" />
                <span>{activeMember?.name?.split(' ')[0] || 'Vault'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={onSignOut}
              className="px-3.5 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-800 text-xs font-extrabold flex items-center gap-1.5 transition cursor-pointer"
              title="Sign Out or Create / Switch Account"
            >
              <LogOut className="w-3.5 h-3.5 text-slate-600" />
              Switch Account / Login
            </button>
          </div>
        </div>

        {/* Navigation Tabs (Command Mode) */}
        {viewMode === 'command' && (
          <nav
            className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center gap-1 overflow-x-auto border-t border-slate-100 bg-slate-50/60"
            aria-label="Primary Platform Sections"
          >
            {navTabs.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  aria-current={active ? 'page' : undefined}
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
    </>
  );
}
