import React, { useState, useEffect } from 'react';
import { X, Pill, Calendar, Activity, QrCode, Printer, PhoneCall, ShieldAlert } from 'lucide-react';

export function MedicationModal({ isOpen, onClose, onSave, initialData = null }) {
  const [form, setForm] = useState({
    name: '',
    dosage: '',
    frequency: 'Once Daily (Morning)',
    scheduledTime: '08:30',
    timeSlot: 'Morning',
    mealInstruction: 'After breakfast',
    purpose: '',
    prescribedBy: 'Dr. Vikram Mehta',
    pillColor: 'White',
    pillShape: 'Oval Tablet',
    stockRemaining: 30,
    refillThreshold: 7,
    notes: '',
  });

  useEffect(() => {
    if (initialData) {
      setForm({
        name: initialData.name || '',
        dosage: initialData.dosage || '',
        frequency: initialData.frequency || 'Once Daily',
        scheduledTime: initialData.scheduledTime || '08:30',
        timeSlot: initialData.timeSlot || 'Morning',
        mealInstruction: initialData.mealInstruction || 'After meal',
        purpose: initialData.purpose || '',
        prescribedBy: initialData.prescribedBy || 'Dr. Vikram Mehta',
        pillColor: initialData.pillColor || 'White',
        pillShape: initialData.pillShape || 'Oval Tablet',
        stockRemaining: initialData.stockRemaining ?? 30,
        refillThreshold: initialData.refillThreshold ?? 7,
        notes: initialData.notes || '',
      });
    } else {
      setForm({
        name: '',
        dosage: '',
        frequency: 'Once Daily (Morning)',
        scheduledTime: '08:30',
        timeSlot: 'Morning',
        mealInstruction: 'After breakfast',
        purpose: '',
        prescribedBy: 'Dr. Vikram Mehta',
        pillColor: 'White',
        pillShape: 'Oval Tablet',
        stockRemaining: 30,
        refillThreshold: 7,
        notes: '',
      });
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...form,
      stockRemaining: Number(form.stockRemaining),
      refillThreshold: Number(form.refillThreshold),
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden my-8">
        <div className="bg-teal-800 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Pill className="w-5 h-5 text-teal-200" />
            <h3 className="font-bold text-lg">
              {initialData ? 'Edit Medication Schedule' : 'Add New Medication to Schedule'}
            </h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-white/10" aria-label="Close modal">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Medication Name *</label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Amlodipine"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Dosage *</label>
              <input
                type="text"
                required
                value={form.dosage}
                onChange={(e) => setForm({ ...form, dosage: e.target.value })}
                placeholder="e.g. 5 mg"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Scheduled Time (24h) *</label>
              <input
                type="time"
                required
                value={form.scheduledTime}
                onChange={(e) => setForm({ ...form, scheduledTime: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Time Slot</label>
              <select
                value={form.timeSlot}
                onChange={(e) => setForm({ ...form, timeSlot: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm bg-white"
              >
                <option value="Morning">Morning</option>
                <option value="Afternoon">Afternoon</option>
                <option value="Evening">Evening</option>
                <option value="Night">Night</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Meal Instruction</label>
              <input
                type="text"
                value={form.mealInstruction}
                onChange={(e) => setForm({ ...form, mealInstruction: e.target.value })}
                placeholder="e.g. After breakfast with warm water"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Plain-Language Purpose</label>
              <input
                type="text"
                value={form.purpose}
                onChange={(e) => setForm({ ...form, purpose: e.target.value })}
                placeholder="e.g. Blood Pressure Control"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Visual Pill Color</label>
              <select
                value={form.pillColor}
                onChange={(e) => setForm({ ...form, pillColor: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm bg-white"
              >
                <option value="White">White</option>
                <option value="Blue">Blue</option>
                <option value="Yellow">Yellow</option>
                <option value="Pink">Pink</option>
                <option value="Green">Green</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Visual Pill Shape</label>
              <select
                value={form.pillShape}
                onChange={(e) => setForm({ ...form, pillShape: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm bg-white"
              >
                <option value="Oval Tablet">Oval Tablet</option>
                <option value="Round Tablet">Round Tablet</option>
                <option value="Softgel Capsule">Softgel Capsule</option>
                <option value="Octagonal Tablet">Octagonal Tablet</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Pills Remaining in Stock</label>
              <input
                type="number"
                min={0}
                value={form.stockRemaining}
                onChange={(e) => setForm({ ...form, stockRemaining: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Prescribing Doctor</label>
              <input
                type="text"
                value={form.prescribedBy}
                onChange={(e) => setForm({ ...form, prescribedBy: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Special Safety Note</label>
            <input
              type="text"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="e.g. Swallow whole; avoid grapefruit juice"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-semibold text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-sm cursor-pointer"
            >
              {initialData ? 'Save Schedule Changes' : 'Add to Shared Schedule'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function AppointmentModal({ isOpen, onClose, onSave, initialData = null }) {
  const getEmptyForm = () => ({
    doctorName: '',
    specialty: 'Cardiology',
    hospital: 'Apollo Hospital, Bengaluru',
    date: new Date(Date.now() + 86400000 * 4).toISOString().split('T')[0],
    time: '10:30',
    mode: 'In-Person Consultation',
    accompaniedBy: 'Priya Sharma (Daughter)',
    preparationNotes: '',
    elderQuestions: '',
  });

  const [form, setForm] = useState(getEmptyForm);

  useEffect(() => {
    if (initialData) {
      setForm({
        doctorName: initialData.doctorName || '',
        specialty: initialData.specialty || 'Cardiology',
        hospital: initialData.hospital || 'Apollo Hospital, Bengaluru',
        date: initialData.date || new Date(Date.now() + 86400000 * 4).toISOString().split('T')[0],
        time: initialData.time || '10:30',
        mode: initialData.mode || 'In-Person Consultation',
        accompaniedBy: initialData.accompaniedBy || 'Priya Sharma (Daughter)',
        preparationNotes: initialData.preparationNotes || '',
        elderQuestions: initialData.elderQuestions || '',
      });
    } else {
      setForm(getEmptyForm());
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(form);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden my-8">
        <div className="bg-indigo-800 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Calendar className="w-5 h-5 text-indigo-200" />
            <h3 className="font-bold text-lg">
              {initialData ? 'Edit Medical Appointment' : 'Schedule Medical Appointment'}
            </h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-white/10" aria-label="Close modal">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Doctor Name *</label>
              <input
                type="text"
                required
                value={form.doctorName}
                onChange={(e) => setForm({ ...form, doctorName: e.target.value })}
                placeholder="e.g. Dr. Vikram Mehta"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Specialty *</label>
              <input
                type="text"
                required
                value={form.specialty}
                onChange={(e) => setForm({ ...form, specialty: e.target.value })}
                placeholder="e.g. Cardiology & Hypertension"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Date *</label>
              <input
                type="date"
                required
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Time *</label>
              <input
                type="time"
                required
                value={form.time}
                onChange={(e) => setForm({ ...form, time: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Hospital / Clinic</label>
              <input
                type="text"
                value={form.hospital}
                onChange={(e) => setForm({ ...form, hospital: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Accompanied By</label>
              <input
                type="text"
                value={form.accompaniedBy}
                onChange={(e) => setForm({ ...form, accompaniedBy: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Pre-Visit Preparation Notes</label>
            <input
              type="text"
              value={form.preparationNotes}
              onChange={(e) => setForm({ ...form, preparationNotes: e.target.value })}
              placeholder="e.g. Bring fasting blood test report & home BP log"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Ramesh Ji's Questions for the Doctor (Elder-Centric Input)
            </label>
            <input
              type="text"
              value={form.elderQuestions}
              onChange={(e) => setForm({ ...form, elderQuestions: e.target.value })}
              placeholder="What would Ramesh Ji like to ask during this visit?"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-semibold text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-indigo-700 hover:bg-indigo-800 text-white font-bold text-sm cursor-pointer"
            >
              {initialData ? 'Save Appointment Changes' : 'Save Appointment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function EmergencyIdModal({ isOpen, onClose, elderProfile, medications = [], careCircleMembers = [] }) {
  if (!isOpen || !elderProfile) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border-2 border-rose-500 overflow-hidden my-8">
        <div className="bg-rose-700 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <ShieldAlert className="w-6 h-6 text-rose-200" />
            <div>
              <h3 className="font-bold text-lg">Emergency Medical ID & Care Card</h3>
              <p className="text-xs text-rose-100">Instant First-Responder & Hospital Handoff Summary</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-white/10" aria-label="Close modal">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="flex items-start justify-between bg-rose-50 p-4 rounded-2xl border border-rose-200">
            <div>
              <span className="text-xs font-extrabold uppercase tracking-wider text-rose-700">
                Senior Patient Profile
              </span>
              <h4 className="text-xl font-extrabold text-slate-900">{elderProfile.name}</h4>
              <p className="text-sm text-slate-700">
                Age: <strong>{elderProfile.age} yrs</strong> • Blood Group:{' '}
                <strong className="text-rose-700">{elderProfile.bloodGroup}</strong> • Weight: {elderProfile.weightKg} kg
              </p>
              <p className="text-xs text-slate-600 mt-1">{elderProfile.location}</p>
            </div>
            <div className="bg-white p-2.5 rounded-xl border border-rose-200 text-center">
              <QrCode className="w-12 h-12 text-slate-800 mx-auto" />
              <span className="text-[10px] font-bold text-slate-500 block mt-1">KINCARE-ID</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200">
              <p className="text-xs font-bold uppercase text-amber-800 mb-1">⚠️ Known Allergies</p>
              <p className="font-bold text-slate-900">{elderProfile.allergies.join(', ')}</p>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <p className="text-xs font-bold uppercase text-slate-600 mb-1">🩺 Chronic Conditions</p>
              <p className="font-semibold text-slate-800">{elderProfile.conditions.join(', ')}</p>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <p className="text-xs font-bold uppercase text-slate-600 mb-2">💊 Active Daily Medications</p>
            <ul className="space-y-1 text-xs text-slate-800">
              {medications.map((m) => (
                <li key={m.id} className="flex justify-between">
                  <span>
                    <strong>{m.name}</strong> ({m.dosage})
                  </span>
                  <span className="text-slate-500">
                    {m.scheduledTime} • {m.purpose}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="p-3.5 rounded-xl bg-teal-50 border border-teal-200">
            <p className="text-xs font-bold uppercase text-teal-800 mb-2">📞 Emergency Care Circle Contacts</p>
            <div className="space-y-1.5 text-xs">
              {careCircleMembers.map((m) => (
                <div key={m.id} className="flex items-center justify-between">
                  <span className="font-bold text-slate-900">
                    {m.name} ({m.relationship})
                  </span>
                  <span className="font-mono text-teal-800 font-semibold">{m.phone}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-between items-center pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => window.print()}
              className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-2 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              Print Wallet ID Card
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
