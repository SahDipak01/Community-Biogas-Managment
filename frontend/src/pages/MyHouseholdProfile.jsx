import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import {
  Home,
  Beef,
  Droplets,
  Flame,
  Save,
  Calculator,
  CheckCircle2,
  MapPin,
  Users
} from 'lucide-react';

const DUNG_RATES = {
  Cow: 11,
  Buffalo: 16,
  Bullock: 13,
  Calf: 5
};

const MyHouseholdProfile = () => {
  const { user } = useAuth();
  const { addToast } = useNotification();

  const [villages, setVillages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    headOfFamily: user?.name || '',
    villageId: user?.village?._id || '',
    familyMembers: 4,
    contactPhone: user?.phone || '',
    lpgConsumptionMonthlyCylinders: 1.0,
    firewoodConsumptionKgPerMonth: 50,
    waterAvailabilityLitersPerDay: 100,
    waterSource: 'Borewell',
    willingToPoolWaste: true
  });

  const [cattleBreakdown, setCattleBreakdown] = useState({
    Cow: 2,
    Buffalo: 1,
    Bullock: 0,
    Calf: 0
  });

  const [householdCode, setHouseholdCode] = useState('');

  useEffect(() => {
    const loadProfile = async () => {
      try {
        setLoading(true);
        const [vRes, pRes] = await Promise.all([api.get('/villages'), api.get('/households/my-profile')]);

        if (vRes.data.success) {
          setVillages(vRes.data.data);
        }

        if (pRes.data.success) {
          const { household, cattleBreakdown: savedCattle } = pRes.data.data;
          if (household) {
            setHouseholdCode(household.householdCode);
            setForm({
              headOfFamily: household.headOfFamily || user?.name || '',
              villageId: household.village?._id || user?.village?._id || vRes.data.data?.[0]?._id || '',
              familyMembers: household.familyMembers || 4,
              contactPhone: household.contactPhone || user?.phone || '',
              lpgConsumptionMonthlyCylinders: household.lpgConsumptionMonthlyCylinders ?? 1.0,
              firewoodConsumptionKgPerMonth: household.firewoodConsumptionKgPerMonth ?? 50,
              waterAvailabilityLitersPerDay: household.waterAvailabilityLitersPerDay ?? 100,
              waterSource: household.waterSource || 'Borewell',
              willingToPoolWaste: household.willingToPoolWaste ?? true
            });
          } else if (vRes.data.data?.length > 0) {
            setForm((prev) => ({
              ...prev,
              villageId: prev.villageId || vRes.data.data[0]._id
            }));
          }

          if (savedCattle) {
            setCattleBreakdown({
              Cow: savedCattle.Cow || 0,
              Buffalo: savedCattle.Buffalo || 0,
              Bullock: savedCattle.Bullock || 0,
              Calf: savedCattle.Calf || 0
            });
          }
        }
      } catch (err) {
        console.error('Error loading household profile:', err);
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, [user]);

  const totalCattle = Object.values(cattleBreakdown).reduce((a, b) => a + (Number(b) || 0), 0);
  const dailyDungKg = Object.entries(cattleBreakdown).reduce(
    (sum, [type, count]) => sum + (Number(count) || 0) * (DUNG_RATES[type] || 10),
    0
  );
  const estBiogasM3 = Number((dailyDungKg * 0.038).toFixed(2));

  const updateCattle = (type, deltaOrVal, isDelta = false) => {
    setCattleBreakdown((prev) => {
      const nextVal = isDelta ? Math.max(0, (prev[type] || 0) + deltaOrVal) : Math.max(0, parseInt(deltaOrVal) || 0);
      return { ...prev, [type]: nextVal };
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const res = await api.put('/households/my-profile', {
        ...form,
        cattleBreakdown
      });
      if (res.data.success) {
        if (res.data.data.household?.householdCode) {
          setHouseholdCode(res.data.data.household.householdCode);
        }
        addToast('Household & cattle profile saved! Your calculator and community data are updated.', 'success');
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to save household profile', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-4 border-emerald-500/20 border-t-emerald-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold mb-2 border border-emerald-200">
            <Home className="w-3.5 h-3.5" />
            Self-Service Household & Livestock Registry {householdCode ? `• ${householdCode}` : ''}
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900">My Household & Cattle Profile</h2>
          <p className="text-xs text-slate-500 mt-1 max-w-xl">
            Keep your family fuel baseline, water supply, and cattle count up to date. Saving automatically syncs with your Feasibility Calculator, GIS Map, and Community Resource Pool.
          </p>
        </div>

        <Link
          to="/calculator"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 hover:bg-emerald-100 text-xs font-bold self-start sm:self-auto transition-colors"
        >
          <Calculator className="w-4 h-4 text-emerald-600" />
          <span>Evaluate My Feasibility</span>
        </Link>
      </div>

      {/* Live Calculated Dung & Gas Preview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Total Livestock
          </span>
          <div className="text-2xl font-black text-slate-900 mt-1">
            {totalCattle} <span className="text-xs font-normal text-slate-500">Head</span>
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">Cows, Buffaloes, Bullocks & Calves</span>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Estimated Daily Dung
          </span>
          <div className="text-2xl font-black text-emerald-700 mt-1">
            {dailyDungKg} <span className="text-xs font-normal text-slate-500">kg / day</span>
          </div>
          <span className="text-[11px] text-emerald-600 mt-1 block">
            {dailyDungKg >= 45
              ? 'Sufficient for standalone 2 m³+ plant'
              : dailyDungKg >= 20
              ? 'Sufficient for 1 m³ plant or community pool'
              : 'Ideal candidate for Community Resource Pool'}
          </span>
        </div>

        <div className="p-5 rounded-3xl bg-gradient-to-tr from-emerald-800 to-teal-700 text-white shadow-md">
          <span className="text-[11px] font-medium text-emerald-100 uppercase tracking-wider block">
            Biogas Yield Potential
          </span>
          <div className="text-2xl font-black mt-1">
            ~{estBiogasM3} <span className="text-xs font-normal text-emerald-100">m³ / day</span>
          </div>
          <span className="text-[11px] text-emerald-200 mt-1 block">
            Saves ~{((estBiogasM3 * 0.43 * 30) / 14.2).toFixed(1)} LPG cylinders / month
          </span>
        </div>
      </div>

      {/* Main Profile Form */}
      <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Household & Fuel Details */}
        <div className="lg:col-span-7 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4 text-xs">
          <h3 className="text-sm font-bold text-slate-900 pb-3 border-b border-slate-100">
            1. Household & Energy Details
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Head of Family</label>
              <input
                type="text"
                value={form.headOfFamily}
                onChange={(e) => setForm({ ...form, headOfFamily: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500"
                required
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Assigned Village</label>
              <select
                value={form.villageId}
                onChange={(e) => setForm({ ...form, villageId: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-emerald-500"
                required
              >
                {villages.map((v) => (
                  <option key={v._id} value={v._id}>
                    {v.name} ({v.district}, {v.state})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3.5">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Family Members</label>
              <input
                type="number"
                min="1"
                value={form.familyMembers}
                onChange={(e) => setForm({ ...form, familyMembers: parseInt(e.target.value) || 1 })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 font-semibold"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Contact Phone</label>
              <input
                type="tel"
                value={form.contactPhone}
                onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
                placeholder="+91 98..."
                className="w-full px-3 py-2 rounded-xl border border-slate-200"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3.5">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Water Source</label>
              <select
                value={form.waterSource}
                onChange={(e) => setForm({ ...form, waterSource: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
              >
                <option value="Borewell">Borewell</option>
                <option value="Community Well">Community Well</option>
                <option value="Piped Tap Water">Piped Tap Water</option>
                <option value="Canal / Pond">Canal / Pond</option>
                <option value="Rainwater Storage">Rainwater Storage</option>
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Daily Water Available (Liters)</label>
              <input
                type="number"
                min="0"
                value={form.waterAvailabilityLitersPerDay}
                onChange={(e) => setForm({ ...form, waterAvailabilityLitersPerDay: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 font-semibold"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3.5">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Monthly LPG Usage (Cylinders)</label>
              <input
                type="number"
                step="0.5"
                min="0"
                value={form.lpgConsumptionMonthlyCylinders}
                onChange={(e) =>
                  setForm({ ...form, lpgConsumptionMonthlyCylinders: parseFloat(e.target.value) || 0 })
                }
                className="w-full px-3 py-2 rounded-xl border border-slate-200 font-semibold"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Monthly Firewood Used (kg)</label>
              <input
                type="number"
                min="0"
                value={form.firewoodConsumptionKgPerMonth}
                onChange={(e) => setForm({ ...form, firewoodConsumptionKgPerMonth: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 font-semibold"
              />
            </div>
          </div>

          <label className="flex items-center gap-2.5 p-3 rounded-xl bg-emerald-50/70 border border-emerald-200 cursor-pointer">
            <input
              type="checkbox"
              checked={form.willingToPoolWaste}
              onChange={(e) => setForm({ ...form, willingToPoolWaste: e.target.checked })}
              className="rounded text-emerald-600 focus:ring-emerald-500"
            />
            <span className="font-semibold text-emerald-950">
              I am willing to contribute organic waste to a Community Biogas Plant & earn incentives
            </span>
          </label>
        </div>

        {/* Right: Cattle Census Cards */}
        <div className="lg:col-span-5 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900 pb-3 border-b border-slate-100">
              2. My Cattle & Daily Dung Availability
            </h3>

            <div className="space-y-3">
              {Object.entries(DUNG_RATES).map(([species, rate]) => (
                <div
                  key={species}
                  className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between"
                >
                  <div>
                    <div className="text-xs font-bold text-slate-900">{species}</div>
                    <div className="text-[11px] text-slate-500">
                      ~{rate} kg dung/day • Total:{' '}
                      <strong className="text-emerald-700">{(cattleBreakdown[species] || 0) * rate} kg</strong>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => updateCattle(species, -1, true)}
                      className="w-8 h-8 rounded-xl bg-white border border-slate-200 font-bold text-slate-700 hover:bg-slate-100"
                    >
                      −
                    </button>
                    <input
                      type="number"
                      min="0"
                      value={cattleBreakdown[species]}
                      onChange={(e) => updateCattle(species, e.target.value, false)}
                      className="w-14 text-center py-1.5 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-900"
                    />
                    <button
                      type="button"
                      onClick={() => updateCattle(species, 1, true)}
                      className="w-8 h-8 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving Profile...' : 'Save Household & Cattle Profile'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};

export default MyHouseholdProfile;
