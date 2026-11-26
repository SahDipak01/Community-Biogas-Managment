import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';
import { Landmark, CheckCircle2, AlertCircle, X, ShieldCheck } from 'lucide-react';

const SubsidyApplyModal = ({ isOpen, onClose, onApplied }) => {
  const { t, language } = useLanguage();
  const [schemes, setSchemes] = useState([]);
  const [selectedScheme, setSelectedScheme] = useState('');
  const [plantCapacity, setPlantCapacity] = useState(2);
  const [cattleCount, setCattleCount] = useState(4);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      api.get('/schemes')
        .then((res) => {
          if (res.data.success && res.data.data) {
            setSchemes(res.data.data);
            if (res.data.data.length > 0) {
              setSelectedScheme(res.data.data[0]._id);
            }
          }
        })
        .catch(console.error);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedScheme) {
      setError('Please select a government scheme.');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      const res = await api.post('/subsidies', {
        schemeId: selectedScheme,
        plantCapacityRequestedM3: Number(plantCapacity),
        householdCattleCount: Number(cattleCount)
      });

      if (res.data.success) {
        setSuccess(true);
        setTimeout(() => {
          setSuccess(false);
          onClose();
          if (onApplied) onApplied(res.data.data);
        }, 1800);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit subsidy application.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-700 to-teal-800 p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center">
              <Landmark className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-wide">
                {language === 'ta' ? 'அரசு மானிய உதவி விண்ணப்பம்' : 'Apply for Government Biogas Subsidy'}
              </h3>
              <p className="text-[11px] text-emerald-100">
                {language === 'ta' ? 'MNRE & GOBARdhan திட்டங்களின் நேரடி உதவி' : 'Direct Central Financial Assistance (MNRE / GOBARdhan)'}
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
              {language === 'ta' ? 'மானியம் விண்ணப்பம் சமர்ப்பிக்கப்பட்டது!' : 'Application Submitted for Verification!'}
            </h4>
            <p className="text-xs text-slate-500">
              {language === 'ta'
                ? 'கிராம ஒருங்கிணைப்பாளர் உங்கள் ஆவணங்களை சரிபார்த்து மானிய குழுவிற்கு பரிந்துரைப்பார்.'
                : 'Your Village Coordinator will verify cattle and land eligibility before sanctioning.'}
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
                {language === 'ta' ? 'அரசு திட்டம் தேர்வு செய்க' : 'Select Official Subsidy Scheme'}
              </label>
              <select
                value={selectedScheme}
                onChange={(e) => setSelectedScheme(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 font-medium"
              >
                {schemes.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.schemeName} ({s.schemeCode}) - Up to ₹{s.maxSubsidyAmountInr?.toLocaleString()}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {language === 'ta' ? 'தேவையான ஆலை திறன் (m³)' : 'Plant Capacity Requested (m³)'}
                </label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={plantCapacity}
                  onChange={(e) => setPlantCapacity(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 font-bold text-slate-800"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {language === 'ta' ? 'கால்நடைகளின் எண்ணிக்கை' : 'Verified Cattle Count'}
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={cattleCount}
                  onChange={(e) => setCattleCount(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 font-bold text-slate-800"
                  required
                />
              </div>
            </div>

            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 text-xs text-emerald-900 space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-emerald-800">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Document Verification Checklist</span>
              </div>
              <p className="text-[11px] text-emerald-700">
                Aadhaar card, Land Record (Khata/Patta), and Gram Panchayat Cattle Certificate required for field verification.
              </p>
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
                <Landmark className="w-4 h-4" />
                <span>{submitting ? 'Submitting...' : language === 'ta' ? 'விண்ணப்பிக்கவும்' : 'Submit Subsidy Application'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default SubsidyApplyModal;
