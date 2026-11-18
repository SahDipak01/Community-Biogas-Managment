import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import Modal from '../components/common/Modal';
import {
  Building2,
  Plus,
  MapPin,
  Users,
  Beef,
  Flame,
  Globe,
  Layers
} from 'lucide-react';

const VillageManagement = () => {
  const { isAdmin } = useAuth();
  const { addToast } = useNotification();

  const [villages, setVillages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    district: '',
    state: '',
    pincode: '',
    latitude: 25.3176,
    longitude: 82.9739,
    population: 1500,
    estimatedCattle: 400,
    climateZone: 'Subtropical Humid',
    description: ''
  });

  const fetchVillages = async () => {
    try {
      setLoading(true);
      const res = await api.get('/villages');
      if (res.data.success) {
        setVillages(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching villages:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVillages();
  }, []);

  const handleCreateVillage = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        name: formData.name,
        district: formData.district,
        state: formData.state,
        pincode: formData.pincode,
        location: {
          latitude: parseFloat(formData.latitude),
          longitude: parseFloat(formData.longitude)
        },
        population: parseInt(formData.population) || 0,
        estimatedCattle: parseInt(formData.estimatedCattle) || 0,
        climateZone: formData.climateZone,
        description: formData.description
      };

      const res = await api.post('/villages', payload);
      if (res.data.success) {
        addToast('New Gram Panchayat / Village registered successfully!', 'success');
        setShowModal(false);
        fetchVillages();
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Error creating village', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold mb-2 border border-emerald-200">
            <Building2 className="w-3.5 h-3.5" />
            Gram Panchayat Administration
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Registered Villages Directory</h2>
          <p className="text-xs text-slate-500 mt-1 max-w-xl">
            Maintain village boundary coordinates, climate zones, demographic censuses, and appointed village coordinators.
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Village</span>
          </button>
        )}
      </div>

      {/* Villages Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {loading ? (
          <div className="col-span-3 p-12 text-center text-slate-400 text-xs">
            Loading villages...
          </div>
        ) : (
          villages.map((v) => (
            <div
              key={v._id}
              className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200">
                    {v.climateZone}
                  </span>
                  <span className="text-[11px] text-slate-400">PIN: {v.pincode || 'N/A'}</span>
                </div>

                <h3 className="text-base font-bold text-slate-900 leading-snug">{v.name}</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {v.district}, {v.state}
                </p>

                {v.description && (
                  <p className="text-xs text-slate-600 mt-2.5 line-clamp-2 leading-relaxed">
                    {v.description}
                  </p>
                )}

                <div className="grid grid-cols-2 gap-2 my-4 p-3 bg-slate-50 rounded-2xl border border-slate-100 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Households</span>
                    <strong className="text-slate-800 text-sm">{v.householdCount || v.totalHouseholds}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Live Plants</span>
                    <strong className="text-emerald-700 text-sm">{v.plantCount || 0} Units</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Cattle Census</span>
                    <strong className="text-slate-800 text-sm">{v.actualCattle || v.estimatedCattle}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Daily Dung</span>
                    <strong className="text-emerald-700 text-sm">{v.dailyDungKg || 0} kg/d</strong>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                  {v.location?.latitude?.toFixed(4)}, {v.location?.longitude?.toFixed(4)}
                </span>
                <span className="font-semibold text-slate-700">
                  Coord: {v.coordinator?.name || 'Unassigned'}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Village Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Register New Gram Panchayat / Village"
      >
        <form onSubmit={handleCreateVillage} className="space-y-4 text-xs">
          <div>
            <label className="font-bold text-slate-700 block mb-1">Village Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Rampur Gram Panchayat"
              className="w-full px-3 py-2 rounded-xl border border-slate-200"
              required
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">District</label>
              <input
                type="text"
                value={formData.district}
                onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                placeholder="District"
                className="w-full px-3 py-2 rounded-xl border border-slate-200"
                required
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">State</label>
              <input
                type="text"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                placeholder="State"
                className="w-full px-3 py-2 rounded-xl border border-slate-200"
                required
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Pincode</label>
              <input
                type="text"
                value={formData.pincode}
                onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                placeholder="Pincode"
                className="w-full px-3 py-2 rounded-xl border border-slate-200"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Center Latitude</label>
              <input
                type="number"
                step="0.0001"
                value={formData.latitude}
                onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200"
                required
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Center Longitude</label>
              <input
                type="number"
                step="0.0001"
                value={formData.longitude}
                onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Population</label>
              <input
                type="number"
                value={formData.population}
                onChange={(e) => setFormData({ ...formData, population: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Estimated Cattle</label>
              <input
                type="number"
                value={formData.estimatedCattle}
                onChange={(e) => setFormData({ ...formData, estimatedCattle: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200"
              />
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Climate Zone</label>
            <select
              value={formData.climateZone}
              onChange={(e) => setFormData({ ...formData, climateZone: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200"
            >
              <option value="Subtropical Humid">Subtropical Humid (Northern plains)</option>
              <option value="Tropical Wet">Tropical Wet (Southern / Coastal)</option>
              <option value="Arid / Semi-Arid">Arid / Semi-Arid (Western plateau)</option>
              <option value="Temperate / Hilly">Temperate / Hilly (Himalayan)</option>
            </select>
          </div>

          <div className="pt-2 flex justify-end gap-2.5">
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
              Save Village
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default VillageManagement;
