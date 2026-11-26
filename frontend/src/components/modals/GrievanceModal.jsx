import React, { useState } from 'react';
import api from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';
import { MessageSquare, CheckCircle2, AlertCircle, X } from 'lucide-react';

const GrievanceModal = ({ isOpen, onClose, onGrievanceSubmitted }) => {
  const { t, language } = useLanguage();
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    category: 'Gas Supply & Distribution',
    priority: 'Medium',
    subject: '',
    description: ''
  });

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.subject.trim() || !formData.description.trim()) {
      setError('Please provide subject and description.');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      const res = await api.post('/complaints', formData);
      if (res.data.success) {
        setSuccess(true);
        setTimeout(() => {
          setSuccess(false);
          onClose();
          if (onGrievanceSubmitted) onGrievanceSubmitted(res.data.data);
        }, 1800);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit grievance.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-sky-600 to-indigo-700 p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-wide">
                {language === 'ta' ? 'குறைதீர்ப்பு மற்றும் கருத்துப் பதிவு' : 'Lodge Grievance & Community Suggestion'}
              </h3>
              <p className="text-[11px] text-sky-100">
                {language === 'ta' ? 'சேவை பிரச்சனைகள் அல்லது பரிந்துரைகளை தெரிவிக்கவும்' : 'Direct village coordinator and administrative escalation'}
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
              {language === 'ta' ? 'குறை வெற்றிகரமாக பதிவு செய்யப்பட்டது!' : 'Grievance Ticket Registered!'}
            </h4>
            <p className="text-xs text-slate-500">
              {language === 'ta'
                ? 'உங்கள் புகார் கிராம நிர்வாக குழுவிற்கு அனுப்பப்பட்டுள்ளது.'
                : 'Your ticket has been logged and assigned for coordinator review.'}
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
                {language === 'ta' ? 'புகார் வகை' : 'Grievance Category'}
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500 font-medium"
              >
                <option value="Gas Supply & Distribution">Gas Supply & Distribution (எரிவாயு விநியோகம்)</option>
                <option value="Waste Collection Service">Waste Collection Service (கழிவு சேகரிப்பு சேவை)</option>
                <option value="Fertilizer & Slurry Allocation">Fertilizer & Slurry Allocation (இயற்கை உரம் ஒதுக்கீடு)</option>
                <option value="Billing & Financial Records">Billing & Financial Records (நிதி பதிவுகள்)</option>
                <option value="Coordinator / Worker Conduct">Coordinator / Worker Conduct (பணியாளர் நடத்தை)</option>
                <option value="Subsidy & Scheme Application">Subsidy & Scheme Application (மானியம் விண்ணப்பம்)</option>
                <option value="General Suggestion / Feedback">General Suggestion / Feedback (பொதுவான கருத்து)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {language === 'ta' ? 'தலைப்பு' : 'Subject Summary'}
              </label>
              <input
                type="text"
                placeholder={language === 'ta' ? 'எ.கா. கழிவு சேகரிக்க வரவில்லை' : 'e.g. Irregular waste pickup timing on street 3'}
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500 font-medium"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {language === 'ta' ? 'முழு விபரம்' : 'Detailed Explanation'}
              </label>
              <textarea
                rows={3}
                placeholder={language === 'ta' ? 'உங்கள் பிரச்சனையை விரிவாக எழுதவும்...' : 'Provide complete details to help the village coordinator resolve this promptly.'}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500 font-medium"
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
                className="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold shadow-md shadow-sky-600/30 flex items-center gap-2"
              >
                <MessageSquare className="w-4 h-4" />
                <span>{submitting ? 'Submitting...' : language === 'ta' ? 'புகாரை அனுப்பு' : 'Submit Grievance'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default GrievanceModal;
