import React, { useState } from 'react';
import api from '../../services/api';
import { enqueueOfflineOp } from '../../services/offlineSync';
import { useLanguage } from '../../context/LanguageContext';
import { Calendar, Clock, Recycle, CheckCircle2, AlertCircle, X, MapPin } from 'lucide-react';

const WastePickupModal = ({ isOpen, onClose, onPickupScheduled }) => {
  const { t, language } = useLanguage();
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    wasteTypes: ['Cattle Dung'],
    estimatedQuantityKg: 15,
    preferredDate: new Date(Date.now() + 86400000).toISOString().split('T')[0], // tomorrow
    preferredTimeSlot: 'Morning (06:00 - 09:00)',
    pickupLandmark: '',
    additionalInstructions: ''
  });

  if (!isOpen) return null;

  const toggleWasteType = (type) => {
    if (formData.wasteTypes.includes(type)) {
      if (formData.wasteTypes.length === 1) return; // Keep at least one
      setFormData({
        ...formData,
        wasteTypes: formData.wasteTypes.filter((t) => t !== type)
      });
    } else {
      setFormData({
        ...formData,
        wasteTypes: [...formData.wasteTypes, type]
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.estimatedQuantityKg <= 0) {
      setError('Quantity must be greater than zero.');
      return;
    }

    try {
      setSubmitting(true);
      setError('');

      if (!navigator.onLine) {
        // Enqueue offline in IndexedDB
        await enqueueOfflineOp('WasteCollectionRecord', 'CREATE', formData);
        setSuccess(true);
        setTimeout(() => {
          setSuccess(false);
          onClose();
          if (onPickupScheduled) onPickupScheduled(formData);
        }, 1800);
        return;
      }

      const res = await api.post('/waste-collection', {
        wasteTypes: formData.wasteTypes,
        estimatedQuantityKg: Number(formData.estimatedQuantityKg),
        preferredDate: formData.preferredDate,
        preferredTimeSlot: formData.preferredTimeSlot,
        pickupLocation: {
          landmark: formData.pickupLandmark
        },
        additionalInstructions: formData.additionalInstructions
      });

      if (res.data.success) {
        setSuccess(true);
        setTimeout(() => {
          setSuccess(false);
          onClose();
          if (onPickupScheduled) onPickupScheduled(res.data.data);
        }, 1800);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to schedule pickup request.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-emerald-100 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center">
              <Recycle className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-wide">
                {language === 'ta' ? 'கழிவு சேகரிப்பு கோரிக்கை' : 'Schedule Waste Collection Pickup'}
              </h3>
              <p className="text-[11px] text-emerald-100">
                {language === 'ta' ? 'உங்கள் வீட்டின் மூலப்பொருளை சேகரிக்க தேதி தேர்வு செய்யுங்கள்' : 'Doorstep organic feedstock pickup request'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {success ? (
          <div className="p-8 text-center space-y-3">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h4 className="text-base font-bold text-slate-900">
              {language === 'ta' ? 'கோரிக்கை பதிவு செய்யப்பட்டது!' : 'Pickup Request Submitted!'}
            </h4>
            <p className="text-xs text-slate-500">
              {language === 'ta'
                ? 'கிராம ஒருங்கிணைப்பாளர் மற்றும் சேகரிப்பாளர் உங்கள் கோரிக்கையை அட்டவணையில் சேர்த்துள்ளனர்.'
                : 'Your Village Coordinator has scheduled collection for the requested slot.'}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {error && (
              <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-xl border border-rose-200 font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Waste type checkboxes */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">
                {language === 'ta' ? 'கழிவு வகைகள் (பல தேர்வு செய்யலாம்)' : 'Select Waste Feedstock Types'}
              </label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {[
                  { id: 'Cattle Dung', label: 'Cattle Dung (சாணம்)' },
                  { id: 'Kitchen Organic Waste', label: 'Kitchen Scraps (சமையலறை கழிவு)' },
                  { id: 'Agricultural Crop Residue', label: 'Agri Residue (வேளாண் கழிவு)' },
                  { id: 'Poultry / Farm Litter', label: 'Poultry Litter (பண்ணை கழிவு)' }
                ].map((type) => (
                  <button
                    type="button"
                    key={type.id}
                    onClick={() => toggleWasteType(type.id)}
                    className={`p-2.5 rounded-xl border text-left font-medium transition-all ${
                      formData.wasteTypes.includes(type.id)
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-900 font-bold shadow-sm'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Quantity and Date */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {language === 'ta' ? 'அளவு (கிலோ)' : 'Estimated Quantity (kg)'}
                </label>
                <input
                  type="number"
                  min="1"
                  max="1000"
                  value={formData.estimatedQuantityKg}
                  onChange={(e) => setFormData({ ...formData, estimatedQuantityKg: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 font-bold text-slate-800"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {language === 'ta' ? 'விருப்பமான தேதி' : 'Preferred Date'}
                </label>
                <input
                  type="date"
                  value={formData.preferredDate}
                  onChange={(e) => setFormData({ ...formData, preferredDate: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 font-medium text-slate-800"
                  required
                />
              </div>
            </div>

            {/* Time Slot */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {language === 'ta' ? 'விருப்பமான நேரம்' : 'Preferred Collection Time Slot'}
              </label>
              <select
                value={formData.preferredTimeSlot}
                onChange={(e) => setFormData({ ...formData, preferredTimeSlot: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 font-medium"
              >
                <option value="Morning (06:00 - 09:00)">Morning (06:00 - 09:00 AM)</option>
                <option value="Mid-day (10:00 - 13:00)">Mid-day (10:00 AM - 01:00 PM)</option>
                <option value="Evening (16:00 - 19:00)">Evening (04:00 - 07:00 PM)</option>
              </select>
            </div>

            {/* Landmark & Instructions */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {language === 'ta' ? 'இடத்தின் அடையாளம் / குறிப்பு' : 'House Landmark & Instructions'}
              </label>
              <input
                type="text"
                placeholder={language === 'ta' ? 'எ.கா. பெரிய வேப்பமரம் அருகில், மாட்டுக்கொட்டகை' : 'e.g. Near Cattle shed / Behind primary school'}
                value={formData.pickupLandmark}
                onChange={(e) => setFormData({ ...formData, pickupLandmark: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 font-medium"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/30 flex items-center gap-2"
              >
                <Recycle className="w-4 h-4" />
                <span>{submitting ? 'Submitting...' : language === 'ta' ? 'கோரிக்கையை பதிவு செய்' : 'Submit Pickup Request'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default WastePickupModal;
