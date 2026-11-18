import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import Modal from '../components/common/Modal';
import {
  Home,
  Plus,
  Search,
  Filter,
  Beef,
  Droplets,
  Flame,
  Phone,
  CheckCircle2,
  Users
} from 'lucide-react';

const HouseholdManagement = () => {
  const { user, isAdmin, isCoordinator } = useAuth();
  const { addToast } = useNotification();

  const [households, setHouseholds] = useState([]);
  const [villages, setVillages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedVillage, setSelectedVillage] = useState('all');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    headOfFamily: '',
    householdCode: '',
    villageId: '',
    familyMembers: 4,
    contactPhone: '',
    lpgConsumptionMonthlyCylinders: 1,
    firewoodConsumptionKgPerMonth: 60,
    waterAvailabilityLitersPerDay: 100,
    waterSource: 'Borewell',
    cattle: [
      { cattleType: 'Cow', count: 2, avgDungPerAnimalKg: 11 },
      { cattleType: 'Buffalo', count: 1, avgDungPerAnimalKg: 16 }
    ]
  });

  const fetchHouseholds = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (selectedVillage && selectedVillage !== 'all') params.append('villageId', selectedVillage);

      const res = await api.get(`/households?${params.toString()}`);
      if (res.data.success) {
        setHouseholds(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching households:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchVillages = async () => {
      try {
        const res = await api.get('/villages');
        if (res.data.success) {
          setVillages(res.data.data);
          if (res.data.data.length > 0) {
            setFormData((prev) => ({ ...prev, villageId: res.data.data[0]._id }));
          }
        }
      } catch (err) {
        console.warn('Villages fetch deferred:', err.message);
      }
    };
    fetchVillages();
  }, []);

  useEffect(() => {
    fetchHouseholds();
  }, [search, selectedVillage]);

  const handleCreateHousehold = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/households', formData);
      if (res.data.success) {
        addToast('New household and cattle registry created successfully!', 'success');
        setShowModal(false);
        fetchHouseholds();
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Error creating household', 'error');
    }
  };

  const handleCattleChange = (index, field, value) => {
    const updated = [...formData.cattle];
    updated[index][field] = field === 'cattleType' ? value : parseFloat(value) || 0;
    setFormData({ ...formData, cattle: updated });
  };

  const addCattleRow = () => {
    setFormData({
      ...formData,
      cattle: [...formData.cattle, { cattleType: 'Cow', count: 1, avgDungPerAnimalKg: 11 }]
    });
  };

  const removeCattleRow = (index) => {
    setFormData({
      ...formData,
      cattle: formData.cattle.filter((_, i) => i !== index)
    });
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold mb-2 border border-emerald-200">
            <Home className="w-3.5 h-3.5" />
            Rural Demographics & Livestock Census
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Household Directory & Cattle Registry</h2>
          <p className="text-xs text-slate-500 mt-1 max-w-xl">
            Register rural families, track individual bovine populations, daily dung potential, and biogas plant ownership.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Register Household</span>
        </button>
      </div>

      {/* Filter and Search */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by family head, household code, or phone..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500 text-xs"
          />
        </div>

        <select
          value={selectedVillage}
          onChange={(e) => setSelectedVillage(e.target.value)}
          className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-slate-50 focus:outline-none"
        >
          <option value="all">All Villages</option>
          {villages.map((v) => (
            <option key={v._id} value={v._id}>
              {v.name}
            </option>
          ))}
        </select>
      </div>

      {/* Household Grid Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {loading ? (
          <div className="col-span-3 p-12 text-center text-slate-400 text-xs">
            Loading household registry...
          </div>
        ) : households.length === 0 ? (
          <div className="col-span-3 p-12 text-center text-slate-400 text-xs">
            No households registered matching search.
          </div>
        ) : (
          households.map((h) => (
            <div
              key={h._id}
              className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                    {h.householdCode}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      h.hasBiogasPlant
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {h.hasBiogasPlant ? 'Biogas Plant Owner' : 'Potential Candidate'}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-slate-900 leading-snug">{h.headOfFamily}</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Village: <strong>{h.village ? h.village.name : 'Unknown'}</strong>
                </p>

                {/* Cattle & Dung Summary Box */}
                <div className="my-3 p-3 rounded-2xl bg-slate-50 border border-slate-200/70 text-xs flex justify-between items-center">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-semibold block">Livestock</span>
                    <span className="text-sm font-bold text-slate-900">
                      {h.cattleSummary?.totalCattle || 0} Head
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-500 uppercase font-semibold block">Dung Yield</span>
                    <span className="text-sm font-bold text-emerald-700">
                      {h.cattleSummary?.dailyDungKg || 0} kg/day
                    </span>
                  </div>
                </div>

                <div className="text-[11px] text-slate-600 space-y-1">
                  <p className="flex items-center justify-between">
                    <span>Family Members:</span>
                    <strong>{h.familyMembers} persons</strong>
                  </p>
                  <p className="flex items-center justify-between">
                    <span>Water Source:</span>
                    <strong>{h.waterSource} ({h.waterAvailabilityLitersPerDay} L/d)</strong>
                  </p>
                  <p className="flex items-center justify-between">
                    <span>Current Fuel:</span>
                    <strong>{h.lpgConsumptionMonthlyCylinders} LPG cyl/mo</strong>
                  </p>
                </div>
              </div>

              {h.contactPhone && (
                <div className="pt-3 border-t border-slate-100 mt-3 text-[11px] text-slate-500 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>{h.contactPhone}</span>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Add Household Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Register New Household & Cattle"
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleCreateHousehold} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Head of Family Name</label>
              <input
                type="text"
                value={formData.headOfFamily}
                onChange={(e) => setFormData({ ...formData, headOfFamily: e.target.value })}
                placeholder="e.g. Ram Charan Patel"
                className="w-full px-3 py-2 rounded-xl border border-slate-200"
                required
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Household Code (Optional)</label>
              <input
                type="text"
                value={formData.householdCode}
                onChange={(e) => setFormData({ ...formData, householdCode: e.target.value })}
                placeholder="Auto-generated if empty"
                className="w-full px-3 py-2 rounded-xl border border-slate-200"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Gram Panchayat / Village</label>
              <select
                value={formData.villageId}
                onChange={(e) => setFormData({ ...formData, villageId: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200"
                required
              >
                {villages.map((v) => (
                  <option key={v._id} value={v._id}>
                    {v.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Family Members</label>
              <input
                type="number"
                min="1"
                value={formData.familyMembers}
                onChange={(e) => setFormData({ ...formData, familyMembers: parseInt(e.target.value) || 1 })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Contact Phone</label>
              <input
                type="text"
                value={formData.contactPhone}
                onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                placeholder="+91..."
                className="w-full px-3 py-2 rounded-xl border border-slate-200"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Water Access Source</label>
              <select
                value={formData.waterSource}
                onChange={(e) => setFormData({ ...formData, waterSource: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200"
              >
                <option value="Borewell">Borewell</option>
                <option value="Community Well">Community Well</option>
                <option value="Piped Tap Water">Piped Tap Water</option>
                <option value="Canal / Pond">Canal / Pond</option>
                <option value="Rainwater Storage">Rainwater Storage</option>
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Water Available (Liters/day)</label>
              <input
                type="number"
                min="0"
                value={formData.waterAvailabilityLitersPerDay}
                onChange={(e) =>
                  setFormData({ ...formData, waterAvailabilityLitersPerDay: parseFloat(e.target.value) || 0 })
                }
                className="w-full px-3 py-2 rounded-xl border border-slate-200"
              />
            </div>
          </div>

          {/* Cattle Census Section */}
          <div className="pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-slate-900 text-xs">Bovine Livestock Census</span>
              <button
                type="button"
                onClick={addCattleRow}
                className="text-[11px] text-emerald-600 font-bold hover:underline flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add Cattle Row
              </button>
            </div>

            <div className="space-y-2">
              {formData.cattle.map((c, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-5">
                    <select
                      value={c.cattleType}
                      onChange={(e) => handleCattleChange(idx, 'cattleType', e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200"
                    >
                      <option value="Cow">Cow</option>
                      <option value="Buffalo">Buffalo</option>
                      <option value="Bullock">Bullock</option>
                      <option value="Calf">Calf</option>
                    </select>
                  </div>
                  <div className="col-span-3">
                    <input
                      type="number"
                      min="1"
                      value={c.count}
                      onChange={(e) => handleCattleChange(idx, 'count', e.target.value)}
                      placeholder="Count"
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 font-bold"
                    />
                  </div>
                  <div className="col-span-3">
                    <input
                      type="number"
                      min="1"
                      value={c.avgDungPerAnimalKg}
                      onChange={(e) => handleCattleChange(idx, 'avgDungPerAnimalKg', e.target.value)}
                      placeholder="kg dung/d"
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200"
                    />
                  </div>
                  <div className="col-span-1 text-center">
                    {formData.cattle.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeCattleRow(idx)}
                        className="text-rose-500 hover:text-rose-700 font-bold"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 flex justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
            >
              Save Household Record
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default HouseholdManagement;
