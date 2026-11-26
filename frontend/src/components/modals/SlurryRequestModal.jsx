import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';
import { Sprout, CheckCircle2, AlertCircle, X, ShieldCheck } from 'lucide-react';

const SlurryRequestModal = ({ isOpen, onClose, onSlurryRequested }) => {
  const { t, language } = useLanguage();
  const [batches, setBatches] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState('');
  const [requestedLiters, setRequestedLiters] = useState(150);
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      api.get('/digestate/batches')
        .then((res) => {
          if (res.data.success && res.data.data) {
            setBatches(res.data.data);
            if (res.data.data.length > 0) {
              setSelectedBatch(res.data.data[0]._id);
            }
          }
        })
        .catch(console.error);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedBatch) {
      setError('Please select an active digestate batch.');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      const res = await api.post(`/digestate/batches/${selectedBatch}/request`, {
        requestedLiters: Number(requestedLiters),
        deliveryNotes
      });

      if (res.data.success) {
        setSuccess(true);
        setTimeout(() => {
          setSuccess(false);
          onClose();
          if (onSlurryRequested) onSlurryRequested(res.data.data);
        }, 1800);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to request digestate allocation.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-green-700 p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center">
              <Sprout className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-wide">
                {language === 'ta' ? 'இயற்கை உரம் / பயோ-ஸ்லரி முன்பதிவு' : 'Request Bio-Slurry Organic Fertilizer'}
              </h3>
              <p className="text-[11px] text-emerald-100">
                {language === 'ta' ? 'ஆய்வு செய்யப்பட்ட தரமான இயற்கை உரம்' : 'High-NPK nutrient-rich organic digestate for agriculture'}
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
              {language === 'ta' ? 'உரம் ஒதுக்கீடு உறுதி செய்யப்பட்டது!' : 'Bio-Slurry Allocation Reserved!'}
            </h4>
            <p className="text-xs text-slate-500">
              {language === 'ta'
                ? 'உங்கள் நிலத்திற்கு தேவையான உரம் ஒதுக்கீடு செய்யப்பட்டு பதிவு செய்யப்பட்டது.'
                : 'Your batch allocation has been deducted from digester inventory.'}
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
                {language === 'ta' ? 'கிடைக்கும் தொகுப்பு (Batch)' : 'Available Digester Batch'}
              </label>
              {batches.length === 0 ? (
                <div className="p-3 bg-slate-100 text-slate-600 text-xs rounded-xl">
                  Standard Community Digester Batch (Available: 1,400 L)
                </div>
              ) : (
                <select
                  value={selectedBatch}
                  onChange={(e) => setSelectedBatch(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 font-medium"
                >
                  {batches.map((b) => (
                    <option key={b._id} value={b._id}>
                      {b.batchNumber} - {b.form} ({b.availableVolumeLiters} L available, pH {b.qualityTesting?.phValue})
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {language === 'ta' ? 'தேவையான அளவு (லிட்டர்)' : 'Requested Volume (Liters)'}
              </label>
              <input
                type="number"
                min="10"
                max="5000"
                step="10"
                value={requestedLiters}
                onChange={(e) => setRequestedLiters(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 font-bold text-slate-800"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {language === 'ta' ? 'நிலம் / பயிர் விபரம்' : 'Farm Plot & Primary Crop Details'}
              </label>
              <input
                type="text"
                placeholder={language === 'ta' ? 'எ.கா. நெல் வயல், 2 ஏக்கர்' : 'e.g. 2 Acre Paddy / Sugarcane Field'}
                value={deliveryNotes}
                onChange={(e) => setDeliveryNotes(e.target.value)}
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
                <Sprout className="w-4 h-4" />
                <span>{submitting ? 'Reserving...' : language === 'ta' ? 'முன்பதிவு செய்' : 'Reserve Slurry Allocation'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default SlurryRequestModal;
