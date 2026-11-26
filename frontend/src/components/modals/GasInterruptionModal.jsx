import React, { useState } from 'react';
import api from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';
import { BellRing, CheckCircle2, AlertCircle, X, Flame } from 'lucide-react';

const GasInterruptionModal = ({ isOpen, onClose, onInterruptionAnnounced }) => {
  const { t, language } = useLanguage();
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    interruptionType: 'Planned Maintenance',
    reason: '',
    affectedAreas: 'Main Village Grid, Cluster 1, Cluster 2',
    startTime: new Date().toISOString().slice(0, 16),
    estimatedRestoration: new Date(Date.now() + 4 * 3600000).toISOString().slice(0, 16) // 4 hours from now
  });

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.reason.trim()) {
      setError('Please provide the interruption reason.');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      const res = await api.post('/gas-interruptions', {
        ...formData,
        affectedAreas: formData.affectedAreas.split(',').map((a) => a.trim())
      });

      if (res.data.success) {
        setSuccess(true);
        setTimeout(() => {
          setSuccess(false);
          onClose();
          if (onInterruptionAnnounced) onInterruptionAnnounced(res.data.data);
        }, 1800);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to publish gas interruption notice.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-600 to-orange-700 p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center">
              <Flame className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-wide">
                {language === 'ta' ? 'எரிவாயு விநியோக தடை அறிவிப்பு' : 'Publish Gas Supply Interruption Notice'}
              </h3>
              <p className="text-[11px] text-amber-100">
                {language === 'ta' ? 'திட்டமிடப்பட்ட பராமரிப்பு அல்லது அவசர பழுது அறிவிப்பு' : 'Notify connected households of maintenance or temporary shutdown'}
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
              {language === 'ta' ? 'அறிவிப்பு வெளியிடப்பட்டது!' : 'Interruption Notice Published!'}
            </h4>
            <p className="text-xs text-slate-500">
              {language === 'ta'
                ? 'பாதிக்கப்பட்ட அனைத்து குடும்பங்களுக்கும் எச்சரிக்கை அனுப்பப்பட்டுள்ளது.'
                : 'Broadcast notification transmitted to all affected households.'}
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

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {language === 'ta' ? 'தடை வகை' : 'Interruption Type'}
              </label>
              <select
                value={formData.interruptionType}
                onChange={(e) => setFormData({ ...formData, interruptionType: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 font-medium"
              >
                <option value="Planned Maintenance">Planned Maintenance (திட்டமிடப்பட்ட பராமரிப்பு)</option>
                <option value="Emergency Repair">Emergency Repair (அவசர பழுதுபார்ப்பு)</option>
                <option value="Pipeline Pressure Drop">Pipeline Pressure Drop (குறைந்த அழுத்தம்)</option>
                <option value="Feedstock Depletion">Feedstock Depletion (மூலப்பொருள் தட்டுப்பாடு)</option>
                <option value="Severe Weather / System Freeze">Severe Weather / Freeze (வானிலை பாதிப்பு)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {language === 'ta' ? 'காரணம்' : 'Technical Reason & Explanation'}
              </label>
              <textarea
                rows={2}
                placeholder={language === 'ta' ? 'வால்வு மாற்றம், குழாய் சுத்தம் செய்தல்...' : 'e.g. Scheduled main pipeline descaling and pressure valve replacement'}
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 font-medium"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {language === 'ta' ? 'தொடங்கும் நேரம்' : 'Start Time'}
                </label>
                <input
                  type="datetime-local"
                  value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 font-medium"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {language === 'ta' ? 'மதிப்பிடப்பட்ட முடியும் நேரம்' : 'Est. Restoration Time'}
                </label>
                <input
                  type="datetime-local"
                  value={formData.estimatedRestoration}
                  onChange={(e) => setFormData({ ...formData, estimatedRestoration: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {language === 'ta' ? 'பாதிக்கப்பட்ட பகுதிகள் (கமாவால் பிரிக்கவும்)' : 'Affected Pipeline Zones / Areas'}
              </label>
              <input
                type="text"
                value={formData.affectedAreas}
                onChange={(e) => setFormData({ ...formData, affectedAreas: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 font-medium"
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
                className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-md shadow-amber-600/30 flex items-center gap-2"
              >
                <BellRing className="w-4 h-4" />
                <span>{submitting ? 'Publishing...' : language === 'ta' ? 'அறிவிப்பை வெளியிடு' : 'Publish Community Notice'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default GasInterruptionModal;
