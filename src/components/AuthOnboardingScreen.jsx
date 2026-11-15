import React, { useState } from 'react';
import {
  HeartPulse,
  ShieldCheck,
  UserCheck,
  HeartHandshake,
  Stethoscope,
  KeyRound,
  UserPlus,
  Eye,
  EyeOff,
  ArrowRight,
  Lock,
  CheckCircle2,
  AlertCircle,
  Volume2,
} from 'lucide-react';
import { speakText } from '../utils/api.js';

export default function AuthOnboardingScreen({
  elderName = 'Ramesh Sharma',
  members = [],
  demoMode = false,
  onVerifyPasscode,
  onDemoLogin,
  onSignup,
  fontScale,
  setFontScale,
}) {
  const [authTab, setAuthTab] = useState('login'); // 'login' | 'signup'
  const [emailInput, setEmailInput] = useState('');
  const [passcodeInput, setPasscodeInput] = useState('');
  const [showPasscode, setShowPasscode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [signupForm, setSignupForm] = useState({
    mode: 'join_circle',
    role: 'family',
    name: '',
    email: '',
    phone: '',
    relationship: 'Daughter / Son',
    passcode: '',
    elderName: '',
    elderAge: '72',
    elderConditions: '',
  });

  const handleOneTapRole = async (member, fallbackRole) => {
    if (!demoMode || !onDemoLogin) return;
    setError('');
    setLoading(true);
    try {
      await onDemoLogin(member?.id, fallbackRole);
    } catch (err) {
      setError(err.message || 'Unable to sign in');
    } finally {
      setLoading(false);
    }
  };

  const handleManualLogin = async (e) => {
    e.preventDefault();
    if (!passcodeInput || passcodeInput.trim().length < 4) {
      setError('Please enter your 4 to 8 digit passcode.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await onVerifyPasscode(passcodeInput.trim(), undefined, emailInput.trim());
    } catch (err) {
      setError(err.message || 'Invalid email or passcode. Please check and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignupSubmit = async (e) => {
    e.preventDefault();
    if (!signupForm.name.trim() || !signupForm.email.trim() || signupForm.passcode.trim().length < 4) {
      setError('Please enter your Name, Email Address, and a 4 to 6 digit Passcode.');
      return;
    }
    if (signupForm.mode === 'new_profile' && !signupForm.elderName.trim()) {
      setError("Please enter the Elderly Person's name to create a new care profile.");
      return;
    }
    setError('');
    setLoading(true);
    try {
      await onSignup(signupForm);
    } catch (err) {
      setError(err.message || 'Could not create account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDigitClick = (d) => {
    if (passcodeInput.length < 8) {
      setPasscodeInput((prev) => prev + d);
      setError('');
    }
  };

  const elderMember = members.find((m) => m.role === 'elder');
  const familyMember = members.find((m) => m.role === 'family');
  const caregiverMember = members.find((m) => m.role === 'caretaker');

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-slate-900 flex flex-col">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:rounded-xl focus:bg-teal-700 focus:text-white focus:font-extrabold"
      >
        Skip to main content
      </a>
      {/* Calm Accessible Top Header */}
      <header className="bg-white border-b border-slate-200 px-4 sm:px-8 py-4">
        <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-teal-700 text-white flex items-center justify-center shadow-sm">
              <HeartPulse className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
                KinCare <span className="text-teal-700">AI</span>
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 font-medium">
                Simple, Safe Medication &amp; Healthcare Platform for Seniors &amp; Families
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() =>
                speakText(
                  'Welcome to KinCare AI. Choose your role to enter right away, or sign up to create a new care account.'
                )
              }
              className="px-4 py-2.5 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-950 font-bold text-xs sm:text-sm flex items-center gap-2 cursor-pointer"
            >
              <Volume2 className="w-4 h-4" />
              Hear Instructions
            </button>

            <div
              className="flex items-center bg-slate-100 rounded-xl p-1 border border-slate-200"
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
                  className={`px-2.5 py-1 rounded-lg text-xs font-extrabold cursor-pointer ${
                    fontScale === sz.id ? 'bg-teal-700 text-white' : 'text-slate-700'
                  }`}
                >
                  {sz.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      <main id="main-content" className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Login / Sign Up Switcher Pill */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              {authTab === 'login' ? 'Welcome! Choose Who Is Using KinCare' : 'Create Your KinCare Account'}
            </h2>
            <p className="text-sm sm:text-base text-slate-600 mt-1">
              {authTab === 'login'
                ? 'Select your role below for 1-tap access, or sign in with your email and passcode.'
                : 'Sign up as an Elderly Person, Family Member, or Caregiver in 30 seconds.'}
            </p>
          </div>

          <div className="inline-flex rounded-2xl bg-white p-1.5 border-2 border-slate-200 shadow-xs shrink-0">
            <button
              type="button"
              onClick={() => {
                setAuthTab('login');
                setError('');
              }}
              className={`px-5 py-2.5 rounded-xl text-sm font-extrabold flex items-center gap-2 transition cursor-pointer ${
                authTab === 'login' ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <KeyRound className="w-4 h-4" />
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthTab('signup');
                setError('');
              }}
              className={`px-5 py-2.5 rounded-xl text-sm font-extrabold flex items-center gap-2 transition cursor-pointer ${
                authTab === 'signup' ? 'bg-teal-700 text-white' : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <UserPlus className="w-4 h-4" />
              Create Account (Sign Up)
            </button>
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="p-4 rounded-2xl bg-rose-50 border-2 border-rose-300 text-rose-900 text-sm font-bold flex items-center gap-3"
          >
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {authTab === 'login' ? (
          <div className="space-y-8">
            {/* Step 1: Giant, Clear 3-Persona Fork Cards (Explicit Demo Mode Only) */}
            {demoMode && (
              <section aria-label="One-Tap Demo Role Selection">
                <p className="text-xs font-extrabold uppercase tracking-wider text-teal-700 mb-3">
                  Demo Mode Enabled — Instant 1-Tap Access by Role (Care Circle for {elderName})
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {/* Card 1: Elderly Person */}
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => handleOneTapRole(elderMember, 'elder')}
                    className="text-left rounded-3xl bg-white hover:bg-teal-50/70 border-2 border-teal-600 p-6 shadow-sm hover:shadow-md transition flex flex-col justify-between gap-5 cursor-pointer group min-h-[210px]"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="p-3 rounded-2xl bg-teal-100 text-teal-800">
                          <UserCheck className="w-7 h-7" />
                        </span>
                        <span className="text-xs font-extrabold uppercase px-3 py-1 rounded-full bg-teal-700 text-white">
                          Simple Senior UI
                        </span>
                      </div>
                      <h3 className="text-xl font-extrabold text-slate-900">
                        I am the Elderly Person
                      </h3>
                      <p className="text-sm text-slate-700 leading-relaxed">
                        <strong>{elderMember?.name || elderName}</strong> — Giant buttons to see today&apos;s medicines, tap &quot;I Took It&quot;, or listen aloud.
                      </p>
                    </div>
                    <div className="flex items-center justify-between pt-3 border-t border-teal-100 text-teal-800 font-extrabold text-sm">
                      <span>Enter Senior Demo Mode</span>
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </button>

                  {/* Card 2: Family Member */}
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => handleOneTapRole(familyMember, 'family')}
                    className="text-left rounded-3xl bg-white hover:bg-indigo-50/70 border-2 border-indigo-400 p-6 shadow-sm hover:shadow-md transition flex flex-col justify-between gap-5 cursor-pointer group min-h-[210px]"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="p-3 rounded-2xl bg-indigo-100 text-indigo-800">
                          <HeartHandshake className="w-7 h-7" />
                        </span>
                        <span className="text-xs font-extrabold uppercase px-3 py-1 rounded-full bg-indigo-700 text-white">
                          Family Portal
                        </span>
                      </div>
                      <h3 className="text-xl font-extrabold text-slate-900">
                        I am a Family Member
                      </h3>
                      <p className="text-sm text-slate-700 leading-relaxed">
                        <strong>{familyMember?.name || 'Priya Sharma'}</strong> — Track daily adherence, manage doctor appointments &amp; receive missed-dose emails.
                      </p>
                    </div>
                    <div className="flex items-center justify-between pt-3 border-t border-indigo-100 text-indigo-800 font-extrabold text-sm">
                      <span>Enter Family Demo View</span>
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </button>

                  {/* Card 3: Caregiver */}
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => handleOneTapRole(caregiverMember, 'caretaker')}
                    className="text-left rounded-3xl bg-white hover:bg-amber-50/70 border-2 border-amber-400 p-6 shadow-sm hover:shadow-md transition flex flex-col justify-between gap-5 cursor-pointer group min-h-[210px]"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="p-3 rounded-2xl bg-amber-100 text-amber-800">
                          <Stethoscope className="w-7 h-7" />
                        </span>
                        <span className="text-xs font-extrabold uppercase px-3 py-1 rounded-full bg-amber-600 text-white">
                          Caregiver Portal
                        </span>
                      </div>
                      <h3 className="text-xl font-extrabold text-slate-900">
                        I am a Caregiver
                      </h3>
                      <p className="text-sm text-slate-700 leading-relaxed">
                        <strong>{caregiverMember?.name || 'Nurse Anita Rao'}</strong> — Update schedules, scan prescriptions &amp; monitor clinical safety.
                      </p>
                    </div>
                    <div className="flex items-center justify-between pt-3 border-t border-amber-100 text-amber-800 font-extrabold text-sm">
                      <span>Enter Caregiver Demo View</span>
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </button>
                </div>
              </section>
            )}

            {/* Step 2: Manual Email + Passcode Login with Large Touch Keypad */}
            <section className="rounded-3xl bg-white border-2 border-slate-200 p-6 sm:p-8 shadow-xs">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                <form onSubmit={handleManualLogin} className="lg:col-span-7 space-y-4">
                  <div>
                    <p className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                      {demoMode ? 'Option 2 — ' : ''}Sign In with Your Account Email &amp; Passcode
                    </p>
                    <h3 className="text-xl font-extrabold text-slate-900 mt-1">
                      Enter your Care Circle passcode
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="login-email" className="block text-xs font-bold text-slate-700 mb-1.5">
                        Email Address (Optional for PIN)
                      </label>
                      <input
                        id="login-email"
                        type="email"
                        value={emailInput}
                        onChange={(e) => setEmailInput(e.target.value)}
                        placeholder="you@example.com"
                        className="w-full px-4 py-3.5 rounded-2xl border-2 border-slate-300 focus:border-teal-600 text-sm font-medium"
                      />
                    </div>
                    <div>
                      <label htmlFor="login-passcode" className="block text-xs font-bold text-slate-700 mb-1.5">
                        4 to 8 Digit Passcode *
                      </label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          id="login-passcode"
                          type={showPasscode ? 'text' : 'password'}
                          inputMode="numeric"
                          maxLength={8}
                          value={passcodeInput}
                          onChange={(e) => {
                            setPasscodeInput(e.target.value);
                            setError('');
                          }}
                          placeholder="Enter passcode"
                          className="w-full pl-10 pr-12 py-3.5 rounded-2xl border-2 border-slate-300 focus:border-teal-600 text-base font-mono tracking-widest"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPasscode(!showPasscode)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-500 hover:text-slate-900 cursor-pointer"
                          aria-label={showPasscode ? 'Hide passcode' : 'Show passcode'}
                        >
                          {showPasscode ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-7 py-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-sm flex items-center gap-2 cursor-pointer"
                    >
                      <CheckCircle2 className="w-5 h-5 text-teal-400" />
                      {loading ? 'Signing In...' : 'Sign In to Care Circle'}
                    </button>
                    <span className="text-xs text-slate-500 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-teal-700" />
                      Encrypted &amp; Passcode Protected
                    </span>
                  </div>
                </form>

                {/* Senior-Friendly Large Touch Keypad */}
                <div className="lg:col-span-5 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <p className="text-xs font-bold text-slate-600 mb-2.5 text-center">
                    Touch Keypad (Easy Tap for Seniors)
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => handleDigitClick(d)}
                        className="py-3 rounded-xl bg-white hover:bg-teal-50 border border-slate-300 text-slate-900 font-extrabold text-lg shadow-2xs cursor-pointer"
                      >
                        {d}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setPasscodeInput('')}
                      className="py-3 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-800 font-bold text-xs cursor-pointer"
                    >
                      Clear
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDigitClick('0')}
                      className="py-3 rounded-xl bg-white hover:bg-teal-50 border border-slate-300 text-slate-900 font-extrabold text-lg shadow-2xs cursor-pointer"
                    >
                      0
                    </button>
                    <button
                      type="button"
                      onClick={() => setPasscodeInput((p) => p.slice(0, -1))}
                      className="py-3 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs cursor-pointer"
                    >
                      ⌫ Back
                    </button>
                  </div>
                </div>
              </div>
            </section>
          </div>
        ) : (
          /* CREATE NEW ACCOUNT (SIGN UP) FLOW */
          <form
            onSubmit={handleSignupSubmit}
            className="rounded-3xl bg-white border-2 border-slate-200 p-6 sm:p-8 shadow-sm space-y-6"
          >
            {/* Step 1: Select Role */}
            <div>
              <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-3">
                Step 1 — Who are you creating an account for?
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  {
                    id: 'elder',
                    title: 'Elderly Person',
                    desc: 'I am managing my own medicines',
                    icon: UserCheck,
                  },
                  {
                    id: 'family',
                    title: 'Family Member',
                    desc: 'Son, daughter, or relative',
                    icon: HeartHandshake,
                  },
                  {
                    id: 'caregiver',
                    title: 'Caregiver / Nurse',
                    desc: 'Home nurse or attendant',
                    icon: Stethoscope,
                  },
                ].map((r) => {
                  const Icon = r.icon;
                  const active = signupForm.role === r.id;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setSignupForm({ ...signupForm, role: r.id })}
                      className={`p-4 rounded-2xl border-2 text-left transition flex items-start gap-3 cursor-pointer ${
                        active
                          ? 'border-teal-700 bg-teal-50'
                          : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                      }`}
                    >
                      <span className={`p-2.5 rounded-xl ${active ? 'bg-teal-700 text-white' : 'bg-white text-slate-700'}`}>
                        <Icon className="w-5 h-5" />
                      </span>
                      <div>
                        <p className="font-extrabold text-slate-900 text-sm">{r.title}</p>
                        <p className="text-xs text-slate-600 mt-0.5">{r.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 2: Account Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Your Full Name *</label>
                <input
                  type="text"
                  required
                  value={signupForm.name}
                  onChange={(e) => setSignupForm({ ...signupForm, name: e.target.value })}
                  placeholder="e.g. Pavan Kumar"
                  className="w-full px-4 py-3 rounded-2xl border-2 border-slate-300 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Email Address (for Medication &amp; Missed Dose Alerts) *
                </label>
                <input
                  type="email"
                  required
                  value={signupForm.email}
                  onChange={(e) => setSignupForm({ ...signupForm, email: e.target.value })}
                  placeholder="you@gmail.com"
                  className="w-full px-4 py-3 rounded-2xl border-2 border-slate-300 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Phone Number</label>
                <input
                  type="tel"
                  value={signupForm.phone}
                  onChange={(e) => setSignupForm({ ...signupForm, phone: e.target.value })}
                  placeholder="+91 98450 12345"
                  className="w-full px-4 py-3 rounded-2xl border-2 border-slate-300 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Create a 4 to 6 Digit Login Passcode *
                </label>
                <div className="relative">
                  <input
                    type={showPasscode ? 'text' : 'password'}
                    required
                    minLength={4}
                    maxLength={8}
                    inputMode="numeric"
                    value={signupForm.passcode}
                    onChange={(e) => setSignupForm({ ...signupForm, passcode: e.target.value })}
                    placeholder="e.g. 246810"
                    className="w-full px-4 py-3 pr-12 rounded-2xl border-2 border-slate-300 text-sm font-mono tracking-widest"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasscode(!showPasscode)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-500 cursor-pointer"
                    aria-label="Toggle passcode visibility"
                  >
                    {showPasscode ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Step 3: Care Circle Setup */}
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
              <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-500">
                Step 3 — Choose Care Profile Setup
              </label>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setSignupForm({ ...signupForm, mode: 'join_circle' })}
                  className={`px-4 py-2.5 rounded-xl text-xs font-extrabold border-2 cursor-pointer ${
                    signupForm.mode === 'join_circle'
                      ? 'bg-teal-700 text-white border-teal-700'
                      : 'bg-white text-slate-700 border-slate-300'
                  }`}
                >
                  Join {elderName}&apos;s Care Circle (Recommended for Demo)
                </button>
                <button
                  type="button"
                  onClick={() => setSignupForm({ ...signupForm, mode: 'new_profile' })}
                  className={`px-4 py-2.5 rounded-xl text-xs font-extrabold border-2 cursor-pointer ${
                    signupForm.mode === 'new_profile'
                      ? 'bg-indigo-700 text-white border-indigo-700'
                      : 'bg-white text-slate-700 border-slate-300'
                  }`}
                >
                  Create a Brand-New Elderly Profile
                </button>
              </div>

              {signupForm.mode === 'new_profile' && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Elderly Person&apos;s Name *</label>
                    <input
                      type="text"
                      value={signupForm.elderName}
                      onChange={(e) => setSignupForm({ ...signupForm, elderName: e.target.value })}
                      placeholder="e.g. Lakshmi Devi"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Age</label>
                    <input
                      type="number"
                      value={signupForm.elderAge}
                      onChange={(e) => setSignupForm({ ...signupForm, elderAge: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Health Conditions</label>
                    <input
                      type="text"
                      value={signupForm.elderConditions}
                      onChange={(e) => setSignupForm({ ...signupForm, elderConditions: e.target.value })}
                      placeholder="e.g. Diabetes, Blood Pressure"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm bg-white"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
              <p className="text-xs text-slate-600 flex items-center gap-2 font-medium">
                <ShieldCheck className="w-5 h-5 text-teal-700 shrink-0" />
                Your health data is private, passcode-protected, and encrypted.
              </p>

              <button
                type="submit"
                disabled={loading}
                className="px-8 py-4 rounded-2xl bg-teal-700 hover:bg-teal-800 text-white font-extrabold text-base flex items-center gap-2 shadow-md cursor-pointer"
              >
                <UserPlus className="w-5 h-5" />
                {loading ? 'Creating Account...' : 'Create Account & Enter'}
              </button>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}
