import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import Modal from '../components/common/Modal';
import {
  Landmark,
  Plus,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  FileText,
  Search,
  Building,
  Edit2,
  Trash2,
  AlertCircle
} from 'lucide-react';

const GovernmentSchemes = () => {
  const { isAdmin } = useAuth();
  const { addToast } = useNotification();

  const [schemes, setSchemes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Scheme Details Modal
  const [activeScheme, setActiveScheme] = useState(null);

  // Admin Add / Edit Modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formState, setFormState] = useState({
    schemeName: '',
    shortCode: '',
    implementingAgency: '',
    category: 'Central Government',
    targetBeneficiaries: 'Individual Rural Households, Farmers, Gram Panchayats',
    subsidyPercentage: 40,
    maxSubsidyAmount: 14350,
    subsidyStructure: 'Direct Benefit Transfer (DBT) post inspection',
    eligiblePlantSizesM3: '1, 2, 3, 4, 6',
    eligibilityCriteria: 'Must possess at least 2 cattle\nMust have 25 sq.m open space\nHomestead land ownership\nAdequate daily water supply',
    requiredDocuments: 'Aadhaar Card\nLand Record (Khasra-Khatauni)\nBank Passbook copy\nCattle & site photograph',
    officialPortalUrl: 'https://mnre.gov.in',
    notes: 'Verified from central ministry gazette notifications.'
  });

  const fetchSchemes = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (selectedCategory && selectedCategory !== 'all') params.append('category', selectedCategory);

      const res = await api.get(`/schemes?${params.toString()}`);
      if (res.data.success) {
        setSchemes(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load schemes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchemes();
  }, [search, selectedCategory]);

  const handleOpenAdd = () => {
    setEditingId(null);
    setFormState({
      schemeName: '',
      shortCode: `SCH-${Date.now().toString().slice(-4)}`,
      implementingAgency: '',
      category: 'Central Government',
      targetBeneficiaries: 'Individual Rural Households, Farmers',
      subsidyPercentage: 40,
      maxSubsidyAmount: 14350,
      subsidyStructure: 'DBT subsidy',
      eligiblePlantSizesM3: '1, 2, 3, 4',
      eligibilityCriteria: 'Minimum 2 cattle\nAdequate water access',
      requiredDocuments: 'Aadhaar Card\nBank Passbook Copy\nLand Proof',
      officialPortalUrl: 'https://mnre.gov.in',
      notes: ''
    });
    setShowEditModal(true);
  };

  const handleOpenEdit = (s) => {
    setEditingId(s._id);
    setFormState({
      schemeName: s.schemeName,
      shortCode: s.shortCode,
      implementingAgency: s.implementingAgency,
      category: s.category,
      targetBeneficiaries: s.targetBeneficiaries?.join(', ') || '',
      subsidyPercentage: s.subsidyDetails?.subsidyPercentage || 40,
      maxSubsidyAmount: s.subsidyDetails?.maxSubsidyAmount || 14350,
      subsidyStructure: s.subsidyDetails?.subsidyStructure || '',
      eligiblePlantSizesM3: s.eligiblePlantSizesM3?.join(', ') || '',
      eligibilityCriteria: s.eligibilityCriteria?.join('\n') || '',
      requiredDocuments: s.requiredDocuments?.join('\n') || '',
      officialPortalUrl: s.officialPortalUrl,
      notes: s.notes || ''
    });
    setShowEditModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this government scheme?')) return;
    try {
      const res = await api.delete(`/schemes/${id}`);
      if (res.data.success) {
        addToast('Scheme deleted successfully', 'success');
        fetchSchemes();
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Error deleting scheme', 'error');
    }
  };

  const handleSaveScheme = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        schemeName: formState.schemeName,
        shortCode: formState.shortCode,
        implementingAgency: formState.implementingAgency,
        category: formState.category,
        targetBeneficiaries: formState.targetBeneficiaries.split(',').map((s) => s.trim()).filter(Boolean),
        subsidyDetails: {
          subsidyPercentage: Number(formState.subsidyPercentage),
          maxSubsidyAmount: Number(formState.maxSubsidyAmount),
          subsidyStructure: formState.subsidyStructure
        },
        eligiblePlantSizesM3: formState.eligiblePlantSizesM3.split(',').map((s) => parseFloat(s)).filter((n) => !isNaN(n)),
        eligibilityCriteria: formState.eligibilityCriteria.split('\n').map((s) => s.trim()).filter(Boolean),
        requiredDocuments: formState.requiredDocuments.split('\n').map((s) => s.trim()).filter(Boolean),
        officialPortalUrl: formState.officialPortalUrl,
        notes: formState.notes,
        verifiedSource: true
      };

      if (editingId) {
        await api.put(`/schemes/${editingId}`, payload);
        addToast('Scheme updated successfully!', 'success');
      } else {
        await api.post('/schemes', payload);
        addToast('New government scheme added successfully!', 'success');
      }
      setShowEditModal(false);
      fetchSchemes();
    } catch (err) {
      addToast(err.response?.data?.message || 'Error saving scheme', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold mb-2 border border-emerald-200">
            <Landmark className="w-3.5 h-3.5" />
            Central & State Financial Assistance Directory
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Government Schemes & Subsidy Policies</h2>
          <p className="text-xs text-slate-500 mt-1 max-w-xl">
            Verified subsidies, grant structures, eligibility norms, and direct application links under National Bioenergy Mission and GOBARdhan.
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Scheme</span>
          </button>
        )}
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by scheme name or ministry agency..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500 text-xs"
          />
        </div>

        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-slate-50 focus:outline-none"
        >
          <option value="all">All Funding Levels</option>
          <option value="Central Government">Central Government Schemes</option>
          <option value="State Government">State Bioenergy Subsidies</option>
          <option value="Gram Panchayat Initiative">Gram Panchayat Initiatives</option>
        </select>
      </div>

      {/* Schemes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {loading ? (
          <div className="col-span-2 p-12 text-center text-slate-400 text-xs">
            Loading government policy records...
          </div>
        ) : schemes.length === 0 ? (
          <div className="col-span-2 p-12 text-center text-slate-400 text-xs">
            No matching government schemes found.
          </div>
        ) : (
          schemes.map((s) => (
            <div
              key={s._id}
              className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
                    {s.category}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {s.verifiedSource && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                        <ShieldCheck className="w-3 h-3 text-emerald-600" />
                        Verified Data
                      </span>
                    )}
                    {isAdmin && (
                      <div className="flex items-center gap-1 pl-1">
                        <button
                          onClick={() => handleOpenEdit(s)}
                          className="p-1 rounded text-slate-400 hover:text-emerald-600"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(s._id)}
                          className="p-1 rounded text-slate-400 hover:text-rose-600"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <h3 className="text-base font-bold text-slate-900 leading-snug">{s.schemeName}</h3>
                <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-slate-400" />
                  <span>{s.implementingAgency}</span>
                </p>

                {/* Subsidy Highlight Banner */}
                <div className="my-4 p-3.5 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200/80 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-emerald-800 tracking-wider block">
                      Financial Subsidy Cap
                    </span>
                    <span className="text-xl font-black text-emerald-950">
                      Up to ₹{(s.subsidyDetails?.maxSubsidyAmount || 0).toLocaleString()}
                    </span>
                  </div>
                  <span className="text-xs font-bold text-emerald-700 bg-white px-2.5 py-1 rounded-xl shadow-xs border border-emerald-200">
                    {s.subsidyDetails?.subsidyPercentage}% Capital Subsidy
                  </span>
                </div>

                {/* Eligible Plant Sizes */}
                <div className="mb-3 text-xs text-slate-600">
                  <strong className="text-slate-800">Eligible Plant Sizes: </strong>
                  {s.eligiblePlantSizesM3?.map((size) => `${size} m³`).join(', ')}
                </div>

                {/* Key criteria snapshot */}
                <div className="space-y-1.5 text-xs text-slate-600 mb-4">
                  <span className="font-bold text-slate-800 block text-[11px] uppercase tracking-wider">
                    Core Eligibility:
                  </span>
                  {s.eligibilityCriteria?.slice(0, 2).map((crit, i) => (
                    <div key={i} className="flex items-start gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0 mt-0.5" />
                      <span className="text-[11px] line-clamp-1">{crit}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <button
                  onClick={() => setActiveScheme(s)}
                  className="text-xs font-bold text-emerald-700 hover:text-emerald-800 hover:underline"
                >
                  View Full Criteria & Checklist
                </button>

                <a
                  href={s.officialPortalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <span>Official Portal</span>
                  <ExternalLink className="w-3 h-3 text-slate-400" />
                </a>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Scheme Details Modal */}
      {activeScheme && (
        <Modal
          isOpen={!!activeScheme}
          onClose={() => setActiveScheme(null)}
          title={activeScheme.schemeName}
          maxWidth="max-w-2xl"
        >
          <div className="space-y-4 text-xs text-slate-700">
            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-950 flex justify-between items-center">
              <div>
                <span className="text-[10px] uppercase font-bold text-emerald-800 block">Sponsoring Body</span>
                <span className="font-semibold text-xs">{activeScheme.implementingAgency}</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-emerald-800 block">Subsidy Rate</span>
                <span className="font-black text-sm text-emerald-900">
                  {activeScheme.subsidyDetails?.subsidyPercentage}% (Max ₹
                  {(activeScheme.subsidyDetails?.maxSubsidyAmount || 0).toLocaleString()})
                </span>
              </div>
            </div>

            <div>
              <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-1.5">
                Target Beneficiaries
              </h4>
              <p className="text-slate-600">{activeScheme.targetBeneficiaries?.join(', ')}</p>
            </div>

            <div>
              <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-1.5">
                Full Eligibility Criteria
              </h4>
              <ul className="space-y-1.5 pl-1">
                {activeScheme.eligibilityCriteria?.map((crit, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <span>{crit}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-1.5">
                Required Application Documents
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {activeScheme.requiredDocuments?.map((doc, i) => (
                  <div key={i} className="p-2 rounded-lg bg-slate-50 border border-slate-200 flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5 text-slate-500" />
                    <span>{doc}</span>
                  </div>
                ))}
              </div>
            </div>

            {activeScheme.notes && (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-600 text-[11px]">
                <strong>Official Note:</strong> {activeScheme.notes}
              </div>
            )}

            <div className="pt-3 border-t border-slate-100 flex justify-between items-center">
              <span className="text-[11px] text-slate-400">
                Verified from official ministry guidelines. Applications must be routed via designated nodal portal.
              </span>
              <a
                href={activeScheme.officialPortalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1.5 shadow-md shadow-emerald-600/20"
              >
                <span>Open Portal</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </Modal>
      )}

      {/* Admin Add / Edit Modal */}
      {showEditModal && (
        <Modal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          title={editingId ? 'Edit Government Scheme' : 'Add Government Scheme'}
        >
          <form onSubmit={handleSaveScheme} className="space-y-3.5 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Scheme Title</label>
                <input
                  type="text"
                  value={formState.schemeName}
                  onChange={(e) => setFormState({ ...formState, schemeName: e.target.value })}
                  placeholder="e.g. National Bioenergy Programme"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Short Code</label>
                <input
                  type="text"
                  value={formState.shortCode}
                  onChange={(e) => setFormState({ ...formState, shortCode: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Implementing Ministry / Agency</label>
                <input
                  type="text"
                  value={formState.implementingAgency}
                  onChange={(e) => setFormState({ ...formState, implementingAgency: e.target.value })}
                  placeholder="e.g. Ministry of New and Renewable Energy"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Category</label>
                <select
                  value={formState.category}
                  onChange={(e) => setFormState({ ...formState, category: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200"
                >
                  <option value="Central Government">Central Government</option>
                  <option value="State Government">State Government</option>
                  <option value="Gram Panchayat Initiative">Gram Panchayat Initiative</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Subsidy Percentage (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={formState.subsidyPercentage}
                  onChange={(e) => setFormState({ ...formState, subsidyPercentage: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Max Subsidy Amount (INR)</label>
                <input
                  type="number"
                  min="0"
                  value={formState.maxSubsidyAmount}
                  onChange={(e) => setFormState({ ...formState, maxSubsidyAmount: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold"
                  required
                />
              </div>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Eligible Plant Sizes (comma separated)</label>
              <input
                type="text"
                value={formState.eligiblePlantSizesM3}
                onChange={(e) => setFormState({ ...formState, eligiblePlantSizesM3: e.target.value })}
                placeholder="1, 2, 3, 4, 6"
                className="w-full px-3 py-2 rounded-xl border border-slate-200"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Eligibility Criteria (one per line)</label>
              <textarea
                rows="3"
                value={formState.eligibilityCriteria}
                onChange={(e) => setFormState({ ...formState, eligibilityCriteria: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Required Documents (one per line)</label>
              <textarea
                rows="2"
                value={formState.requiredDocuments}
                onChange={(e) => setFormState({ ...formState, requiredDocuments: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Official Reference Portal URL</label>
              <input
                type="url"
                value={formState.officialPortalUrl}
                onChange={(e) => setFormState({ ...formState, officialPortalUrl: e.target.value })}
                placeholder="https://..."
                className="w-full px-3 py-2 rounded-xl border border-slate-200"
                required
              />
            </div>

            <div className="pt-2 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
              >
                Save Scheme
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default GovernmentSchemes;
