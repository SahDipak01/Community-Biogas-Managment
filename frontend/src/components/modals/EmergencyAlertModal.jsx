import React, { useState } from 'react';
import api from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';
import { AlertOctagon, PhoneCall, ShieldAlert, CheckCircle2, X } from 'lucide-react';

const EmergencyAlertModal = ({ isOpen, onClose, onEmergencyReported }) => {
  const { t, language } = useLanguage();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successData, setSuccessData] = useState(null);

  const [formData, setFormData] = useState({
    incidentType: 'Suspected Gas Leakage',
    severity: 'Critical Emergency',
    locationDescription: '',
    details: ''
  });

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.details.trim()) {
      setError('Please provide emergency details or observations.');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      const res = await api.post('/emergencies', formData);
      if (res.data.success) {
        setSuccessData(res.data);
        if (onEmergencyReported) onEmergencyReported(res.data.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to transmit emergency broadcast.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border-2 border-rose-500 overflow-hidden">
        {/* Urgent Header */}
        <div className="bg-gradient-to-r from-rose-600 to-red-700 p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center animate-pulse">
              <AlertOctagon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-base font-bold tracking-wide">
                {language === 'ta' ? 'அவசர பாதுகாப்பு எச்சரிக்கை' : 'EMERGENCY SAFETY REPORT'}
              </h3>
              <p className="text-xs text-rose-100">
                {language === 'ta' ? 'எரிவாயு கசிவு மற்றும் தீவிர பாதுகாப்பு அச்சுறுத்தல்' : 'Immediate Gas Leakage & Critical Hazard Protocol'}
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

        {/* Immediate Safety Guidelines Banner */}
        <div className="bg-amber-50 border-b border-amber-200 p-4 text-xs space-y-1.5 text-amber-900">
          <div className="font-bold flex items-center gap-1.5 text-amber-800">
            <ShieldAlert className="w-4 h-4 text-amber-600" />
            <span>{t('emergencyTitle')}</span>
          </div>
          <ul className="list-disc list-inside space-y-0.5 text-[11px] text-amber-800">
            <li>{t('emergencyStep1')}</li>
            <li>{t('emergencyStep2')}</li>
            <li>{t('emergencyStep3')}</li>
            <li>{t('emergencyStep4')}</li>
          </ul>
        </div>

        {successData ? (
          <div className="p-6 text-center space-y-4">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h4 className="text-base font-bold text-slate-900">
              {language === 'ta' ? 'அவசர எச்சரிக்கை அனுப்பப்பட்டது!' : 'EMERGENCY BROADCAST SENT!'}
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              {successData.message}
            </p>
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-xs text-rose-800 font-semibold flex items-center justify-center gap-2">
              <PhoneCall className="w-4 h-4 animate-bounce" />
              <span>Village Coordinator & Technical Responders Dispatched</span>
            </div>
            <button
              onClick={() => {
                setSuccessData(null);
                onClose();
              }}
              className="w-full py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800"
            >
              Close Window
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {error && (
              <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-xl border border-rose-200 font-medium">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {language === 'ta' ? 'அவசர வகை' : 'Emergency Incident Category'}
              </label>
              <select
                value={formData.incidentType}
                onChange={(e) => setFormData({ ...formData, incidentType: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500 font-medium"
              >
                <option value="Suspected Gas Leakage">Suspected Gas Leakage (எரிவாயு கசிவு)</option>
                <option value="Explosion Hazard / Spark Risk">Explosion Hazard / Spark Risk (தீப்பொறி அபாயம்)</option>
                <option value="Pipeline Rupture">Pipeline Rupture (குழாய் உடைப்பு)</option>
                <option value="Digester Dome Structural Damage">Digester Dome Structural Damage (கட்டமைப்பு சேதம்)</option>
                <option value="Hydrogen Sulfide / Toxic Odor Spike">Hydrogen Sulfide / Toxic Odor Spike (நச்சு வாயு வாசனை)</option>
                <option value="Other Safety Threat">Other Critical Safety Threat (பிற பாதுகாப்பு அச்சுறுத்தல்)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {language === 'ta' ? 'இடம் / அடையாளம்' : 'Location / Landmark'}
              </label>
              <input
                type="text"
                placeholder={language === 'ta' ? 'எ.கா. கிழக்கு தெரு ஆலைக்கு அருகில்' : 'e.g. Near Main Digester / East Street pipeline'}
                value={formData.locationDescription}
                onChange={(e) => setFormData({ ...formData, locationDescription: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500 font-medium"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {language === 'ta' ? 'அவசர விபரம் / நிலை' : 'Emergency Details & Immediate Observations'}
              </label>
              <textarea
                rows={3}
                placeholder={language === 'ta' ? 'வாசனையின் அளவு, சத்தம் அல்லது சேதத்தின் விபரம்...' : 'Describe what you hear, smell, or see. State if gas is actively hissing or bubbling.'}
                value={formData.details}
                onChange={(e) => setFormData({ ...formData, details: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500 font-medium"
                required
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
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-lg shadow-rose-600/30 flex items-center gap-2"
              >
                <AlertOctagon className="w-4 h-4" />
                <span>{submitting ? 'Transmitting Broadcast...' : language === 'ta' ? 'அவசர எச்சரிக்கை அனுப்பு' : 'TRANSMIT EMERGENCY BROADCAST'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default EmergencyAlertModal;
