import React, { useState } from 'react';
import api from '../../services/api';
import { enqueueOfflineOp } from '../../services/offlineSync';
import { useLanguage } from '../../context/LanguageContext';
import { Wrench, CheckCircle2, AlertCircle, X, Camera } from 'lucide-react';

const PlantBreakdownModal = ({ isOpen, onClose, onBreakdownReported }) => {
  const { t, language } = useLanguage();
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    issueCategory: 'Low Gas Pressure',
    urgency: 'Medium',
    description: '',
    photoUrl: ''
  });

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.description.trim()) {
      setError('Please provide problem description.');
      return;
    }

    try {
      setSubmitting(true);
      setError('');

      if (!navigator.onLine) {
        await enqueueOfflineOp('PlantBreakdownReport', 'CREATE', formData);
        setSuccess(true);
        setTimeout(() => {
          setSuccess(false);
          onClose();
          if (onBreakdownReported) onBreakdownReported(formData);
        }, 1800);
        return;
      }

      const res = await api.post('/breakdowns', formData);
      if (res.data.success) {
        setSuccess(true);
        setTimeout(() => {
          setSuccess(false);
          onClose();
          if (onBreakdownReported) onBreakdownReported(res.data.data);
        }, 1800);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit breakdown report.');
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
              <Wrench className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-wide">
                {language === 'ta' ? 'ஆலை பழுதுபார்ப்பு புகாரளி' : 'Report Plant Breakdown / Technical Issue'}
              </h3>
              <p className="text-[11px] text-amber-100">
                {language === 'ta' ? 'குழாய், அழுத்தம், அல்லது உபகரண பழுதுகளை தெரிவிக்கவும்' : 'Technical defect, pressure drop, or equipment issue'}
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
              {language === 'ta' ? 'பழுது புகார் பதிவு செய்யப்பட்டது!' : 'Breakdown Report Logged!'}
            </h4>
            <p className="text-xs text-slate-500">
              {language === 'ta'
                ? 'தொழில்நுட்ப வல்லுநர் ஆய்வுக்கு ஒதுக்கப்பட்டுள்ளார்.'
                : 'A maintenance technician has been assigned for field inspection.'}
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
                {language === 'ta' ? 'பழுது வகை' : 'Defect Category'}
              </label>
              <select
                value={formData.issueCategory}
                onChange={(e) => setFormData({ ...formData, issueCategory: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 font-medium"
              >
                <option value="Low Gas Pressure">Low Gas Pressure (குறைந்த வாயு அழுத்தம்)</option>
                <option value="Gas Supply Interruption">Gas Supply Interruption (எரிவாயு விநியோக தடை)</option>
                <option value="Pipeline Blockage">Pipeline Blockage (குழாய் அடைப்பு)</option>
                <option value="Suspected Gas Leakage">Suspected Gas Leakage (எரிவாயு கசிவு சந்தேகம்)</option>
                <option value="Equipment Malfunction">Equipment Malfunction (வால்வு / மீட்டர் பழுது)</option>
                <option value="Unusual Odor / Smell">Unusual Odor / Smell (வழக்கத்திற்கு மாறான வாசனை)</option>
                <option value="Digester Slurry Overflow">Digester Slurry Overflow (கழிவு நீர் வழிதல்)</option>
                <option value="Dome / Structural Crack">Dome / Structural Crack (கட்டமைப்பு விரிசல்)</option>
                <option value="Other Technical Issue">Other Technical Issue (பிற பழுதுகள்)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {language === 'ta' ? 'முக்கியத்துவ நிலை' : 'Urgency Level'}
              </label>
              <div className="grid grid-cols-4 gap-2 text-xs">
                {['Low', 'Medium', 'High', 'Emergency / Critical'].map((lvl) => (
                  <button
                    type="button"
                    key={lvl}
                    onClick={() => setFormData({ ...formData, urgency: lvl })}
                    className={`py-2 rounded-xl border text-center font-bold text-[11px] transition-all ${
                      formData.urgency === lvl
                        ? lvl.includes('Emergency')
                          ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                          : 'bg-amber-600 text-white border-amber-600 shadow-sm'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {language === 'ta' ? 'பழுது விபரம்' : 'Problem Description'}
              </label>
              <textarea
                rows={3}
                placeholder={language === 'ta' ? 'பழுது எப்போது தொடங்கியது, எங்கு ஏற்பட்டுள்ளது போன்ற விபரங்கள்...' : 'Explain the issue, which connection is affected, and when it started.'}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 font-medium"
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
                className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-md shadow-amber-600/30 flex items-center gap-2"
              >
                <Wrench className="w-4 h-4" />
                <span>{submitting ? 'Submitting...' : language === 'ta' ? 'புகாரை அனுப்பு' : 'Submit Breakdown Report'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default PlantBreakdownModal;
