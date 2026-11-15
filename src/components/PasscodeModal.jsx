import React, { useState } from 'react';
import {
  ShieldCheck,
  Lock,
  UserCheck,
  HeartHandshake,
  Stethoscope,
  KeyRound,
  UserPlus,
  X,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

export default function PasscodeModal({
  isOpen,
  onClose,
  members = [],
  currentMember,
  onVerifyPasscode,
  onAddMember,
}) {
  const [selectedMemberId, setSelectedMemberId] = useState(currentMember?.id || members[0]?.id || '');
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);

  const [newMember, setNewMember] = useState({
    name: '',
    role: 'family',
    relationship: 'Son / Family Member',
    email: '',
    phone: '',
    passcode: '',
  });

  if (!isOpen) return null;

  const handleDigitClick = (digit) => {
    if (passcode.length < 6) {
      setPasscode((prev) => prev + digit);
      setError('');
    }
  };

  const handleSubmit = async (e, overrideCode, overrideMemberId) => {
    if (e) e.preventDefault();
    const codeToUse = overrideCode ?? passcode;
    const memberIdToUse = overrideMemberId ?? selectedMemberId;
    if (!codeToUse || codeToUse.length < 4) {
      setError('Please enter a 4 to 6 digit Care Circle passcode.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await onVerifyPasscode(codeToUse, memberIdToUse);
      setPasscode('');
      onClose();
    } catch (err) {
      setError(err.message || 'Invalid passcode');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMember = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await onAddMember(newMember);
      setShowAddMember(false);
      setNewMember({
        name: '',
        role: 'family',
        relationship: 'Son / Family Member',
        email: '',
        phone: '',
        passcode: '',
      });
    } catch (err) {
      setError(err.message || 'Could not add Care Circle member');
    } finally {
      setLoading(false);
    }
  };

  const getRoleIcon = (role) => {
    if (role === 'elder') return <UserCheck className="w-5 h-5 text-teal-600" />;
    if (role === 'caretaker') return <Stethoscope className="w-5 h-5 text-amber-600" />;
    return <HeartHandshake className="w-5 h-5 text-indigo-600" />;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="passcode-modal-title"
    >
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden my-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-teal-800 via-teal-700 to-emerald-700 text-white p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/15 rounded-2xl">
              <ShieldCheck className="w-7 h-7 text-teal-100" />
            </div>
            <div>
              <h2 id="passcode-modal-title" className="text-xl font-bold">
                Care Circle Secure Passcode Access
              </h2>
              <p className="text-teal-100 text-sm">
                Shared ecosystem for Elderly Person (Ramesh Sharma), Family Member &amp; Caregiver
              </p>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition"
              aria-label="Close passcode modal"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <div className="p-6 space-y-6">
          {/* Quick 1-Click Role Switcher for Judges & Family */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                1. Select Care Circle Member (Or 1-Click Instant Demo Unlock)
              </label>
              <button
                type="button"
                onClick={() => setShowAddMember(!showAddMember)}
                className="text-xs font-semibold text-teal-700 hover:text-teal-800 flex items-center gap-1"
              >
                <UserPlus className="w-3.5 h-3.5" />
                {showAddMember ? 'Back to Passcode Unlock' : '+ Invite Family / Caretaker'}
              </button>
            </div>

            {!showAddMember ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {members.map((m) => {
                    const isSelected = selectedMemberId === m.id;
                    return (
                      <div
                        key={m.id}
                        onClick={() => {
                          setSelectedMemberId(m.id);
                          setError('');
                        }}
                        className={`cursor-pointer rounded-2xl p-3.5 border-2 transition flex flex-col justify-between ${
                          isSelected
                            ? 'border-teal-600 bg-teal-50/70 shadow-sm'
                            : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="p-1.5 rounded-lg bg-white shadow-xs">
                              {getRoleIcon(m.role)}
                            </span>
                            <span className="text-[11px] font-bold uppercase px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                              {m.role === 'elder'
                                ? 'Elderly Person'
                                : m.role === 'family'
                                ? 'Family Member'
                                : 'Caregiver'}
                            </span>
                          </div>
                          <p className="font-bold text-slate-900 text-sm">{m.name}</p>
                          <p className="text-xs text-slate-500 truncate">{m.relationship}</p>
                        </div>

                        {m.passcodePlainHint && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedMemberId(m.id);
                              setPasscode(m.passcodePlainHint);
                              handleSubmit(null, m.passcodePlainHint, m.id);
                            }}
                            className="mt-3 w-full py-1.5 px-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold flex items-center justify-center gap-1 transition"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                            Unlock ({m.passcodePlainHint})
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Manual PIN Keypad & Input */}
                <form onSubmit={(e) => handleSubmit(e)} className="mt-6 pt-5 border-t border-slate-200">
                  <div className="flex flex-col sm:flex-row items-center gap-4">
                    <div className="flex-1 w-full">
                      <label
                        htmlFor="passcode-input"
                        className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5"
                      >
                        2. Enter 6-Digit Security Passcode
                      </label>
                      <div className="relative">
                        <Lock className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          id="passcode-input"
                          type="password"
                          inputMode="numeric"
                          maxLength={8}
                          value={passcode}
                          onChange={(e) => {
                            setPasscode(e.target.value);
                            setError('');
                          }}
                          placeholder="Enter PIN (e.g. 123456)"
                          className="w-full pl-11 pr-4 py-3 rounded-xl border-2 border-slate-300 focus:border-teal-600 text-lg font-mono tracking-widest"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full sm:w-auto mt-2 sm:mt-6 px-6 py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm flex items-center justify-center gap-2 transition cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4 text-teal-400" />
                      {loading ? 'Verifying...' : 'Verify Passcode'}
                    </button>
                  </div>

                  {/* Touch Numeric Keypad for Elderly Accessibility */}
                  <div className="grid grid-cols-6 sm:grid-cols-11 gap-1.5 mt-3">
                    {['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'].map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => handleDigitClick(d)}
                        className="py-2 rounded-lg bg-slate-100 hover:bg-teal-100 text-slate-800 font-bold text-sm transition"
                      >
                        {d}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setPasscode('')}
                      className="py-2 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold text-xs transition"
                    >
                      Clear
                    </button>
                  </div>

                  {error && (
                    <div className="mt-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}
                </form>
              </>
            ) : (
              /* Add New Authorized Care Circle Member Form */
              <form onSubmit={handleCreateMember} className="space-y-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <h3 className="font-bold text-slate-800 text-sm">
                  Authorize a New Family Member or Caregiver with Passcode Access
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Full Name *</label>
                    <input
                      type="text"
                      required
                      value={newMember.name}
                      onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
                      placeholder="e.g. Rohan Sharma"
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Role *</label>
                    <select
                      value={newMember.role}
                      onChange={(e) => setNewMember({ ...newMember, role: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white"
                    >
                      <option value="family">Family Member</option>
                      <option value="caretaker">Caregiver / Nurse</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Relationship *</label>
                    <input
                      type="text"
                      required
                      value={newMember.relationship}
                      onChange={(e) => setNewMember({ ...newMember, relationship: e.target.value })}
                      placeholder="e.g. Son / Evening Nurse"
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Email for Proactive Alerts *</label>
                    <input
                      type="email"
                      required
                      value={newMember.email}
                      onChange={(e) => setNewMember({ ...newMember, email: e.target.value })}
                      placeholder="rohan@example.com"
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">6-Digit Personal Passcode *</label>
                    <input
                      type="text"
                      required
                      minLength={4}
                      maxLength={8}
                      value={newMember.passcode}
                      onChange={(e) => setNewMember({ ...newMember, passcode: e.target.value })}
                      placeholder="e.g. 778899"
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white font-mono"
                    />
                  </div>
                </div>
                {error && <p className="text-xs text-rose-600 font-medium">{error}</p>}
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddMember(false)}
                    className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 rounded-lg bg-teal-700 text-white text-xs font-bold hover:bg-teal-800"
                  >
                    {loading ? 'Adding...' : 'Create Passcode & Add to Circle'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
