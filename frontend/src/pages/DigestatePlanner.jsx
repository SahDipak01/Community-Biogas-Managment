import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import Modal from '../components/common/Modal';
import {
  Sprout,
  Plus,
  Droplets,
  Truck,
  CheckCircle2,
  Tractor,
  IndianRupee,
  Leaf,
  MapPin,
  ArrowRight
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';

const DigestatePlanner = () => {
  const { isAdmin, isCoordinator } = useAuth();
  const { addToast } = useNotification();

  const [villages, setVillages] = useState([]);
  const [selectedVillage, setSelectedVillage] = useState('all');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('matching'); // matching | farmers | distributions

  // Modals
  const [showFarmerModal, setShowFarmerModal] = useState(false);
  const [farmerForm, setFarmerForm] = useState({
    farmerName: '',
    villageId: '',
    contactPhone: '',
    landAreaAcres: 3.0,
    soilType: 'Alluvial',
    primaryCrop: 'Wheat',
    croppingSeason: 'Rabi',
    fertilizerRequiredKgPerMonth: 600,
    preferredApplicationType: 'Liquid Bio-Slurry',
    notes: ''
  });

  const [showDistModal, setShowDistModal] = useState(false);
  const [distForm, setDistForm] = useState({
    sourcePlantId: '',
    farmerLandId: '',
    distributionDate: new Date().toISOString().split('T')[0],
    digestateAllocatedLiters: 2000,
    applicationMethod: 'Liquid Bio-Slurry',
    nutrientVerificationSource: 'estimated',
    labReportReference: '',
    status: 'Scheduled',
    notes: ''
  });

  useEffect(() => {
    const loadVillages = async () => {
      try {
        const res = await api.get('/villages');
        if (res.data.success) {
          setVillages(res.data.data);
          if (res.data.data.length > 0) {
            setFarmerForm((prev) => ({ ...prev, villageId: res.data.data[0]._id }));
          }
        }
      } catch (err) {
        console.warn('Village fetch failed:', err.message);
      }
    };
    loadVillages();
  }, []);

  const fetchSummary = async () => {
    try {
      setLoading(true);
      const url =
        selectedVillage && selectedVillage !== 'all'
          ? `/digestate/summary?villageId=${selectedVillage}`
          : '/digestate/summary';
      const res = await api.get(url);
      if (res.data.success) {
        const d = res.data.data;
        setData(d);
        if (d.plantSupplies?.length > 0 && !distForm.sourcePlantId) {
          setDistForm((prev) => ({ ...prev, sourcePlantId: d.plantSupplies[0].plantId }));
        }
        if (d.farmers?.length > 0 && !distForm.farmerLandId) {
          setDistForm((prev) => ({ ...prev, farmerLandId: d.farmers[0]._id }));
        }
      }
    } catch (err) {
      console.error('Failed to load digestate planner:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, [selectedVillage]);

  const handleRegisterFarmer = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/digestate/farmers', farmerForm);
      if (res.data.success) {
        addToast('Farmer agricultural land & fertilizer demand registered!', 'success');
        setShowFarmerModal(false);
        setFarmerForm((prev) => ({ ...prev, farmerName: '', contactPhone: '', notes: '' }));
        fetchSummary();
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Error registering farmer land', 'error');
    }
  };

  const handleCreateDistribution = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/digestate/distributions', distForm);
      if (res.data.success) {
        addToast('Digestate allocation scheduled & chemical replacement calculated!', 'success');
        setShowDistModal(false);
        fetchSummary();
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Error creating distribution', 'error');
    }
  };

  const handleQuickAllocate = (matchItem) => {
    setDistForm({
      sourcePlantId: matchItem.matchedPlantId || data?.plantSupplies?.[0]?.plantId || '',
      farmerLandId: matchItem.farmerId,
      distributionDate: new Date().toISOString().split('T')[0],
      digestateAllocatedLiters: Math.max(500, Math.round(matchItem.recommendedAllocationLiters / 2)),
      applicationMethod: matchItem.preferredApplicationType || 'Liquid Bio-Slurry',
      nutrientVerificationSource: 'estimated',
      labReportReference: '',
      status: 'Scheduled',
      notes: `Auto-matched for ${matchItem.primaryCrop} (${matchItem.landAreaAcres} acres)`
    });
    setShowDistModal(true);
  };

  const handleUpdateStatus = async (distId, newStatus) => {
    try {
      const res = await api.put(`/digestate/distributions/${distId}`, { status: newStatus });
      if (res.data.success) {
        addToast(`Distribution updated to "${newStatus}"`, 'success');
        fetchSummary();
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Error updating status', 'error');
    }
  };

  const metrics = data?.metrics;
  const plantSupplies = data?.plantSupplies || [];
  const matchingPlan = data?.matchingPlan || [];
  const farmers = data?.farmers || [];
  const distributions = data?.distributions || [];
  const supplyDemandChart = data?.supplyDemandChart || [];
  const monthlyNpkSupplyKg = data?.monthlyNpkSupplyKg;
  const feedstockComposition = data?.feedstockComposition;

  const getStatusColor = (status) => {
    switch (status) {
      case 'Applied to Field':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'Delivered':
        return 'bg-sky-100 text-sky-800 border-sky-300';
      case 'Dispatched':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-300';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold mb-2 border border-emerald-200">
            <Sprout className="w-3.5 h-3.5" />
            Circular Bio-Slurry Agronomy & NPK Substitution
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Digestate-to-Fertilizer Planner</h2>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            Estimates daily and monthly bio-slurry digestate output from active plants, registers agricultural plots, matches nutrient supply to crop fertilizer demand, and tracks field application.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-auto">
          <select
            value={selectedVillage}
            onChange={(e) => setSelectedVillage(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-slate-50"
          >
            <option value="all">All Villages</option>
            {villages.map((v) => (
              <option key={v._id} value={v._id}>
                {v.name}
              </option>
            ))}
          </select>

          <button
            onClick={() => setShowFarmerModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-800 text-xs font-bold hover:bg-emerald-100 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Register Farmer Land</span>
          </button>

          {(isAdmin || isCoordinator) && (
            <button
              onClick={() => setShowDistModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20"
            >
              <Truck className="w-4 h-4" />
              <span>Allocate Digestate</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Daily Digestate Yield
          </span>
          <div className="text-2xl font-black text-slate-900 mt-1">
            {(metrics?.totalDailyDigestateLiters || 0).toLocaleString()}{' '}
            <span className="text-xs font-normal text-slate-500">L/day</span>
          </div>
          <span className="text-[11px] text-emerald-600 mt-1 block">
            {(metrics?.totalMonthlyDigestateLiters || 0).toLocaleString()} L / month
          </span>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Monthly Bio-Manure Supply
          </span>
          <div className="text-2xl font-black text-emerald-700 mt-1">
            {(metrics?.totalMonthlyDryFertilizerKg || 0).toLocaleString()}{' '}
            <span className="text-xs font-normal text-slate-500">kg eq</span>
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            Demand: {(metrics?.totalMonthlyFertilizerDemandKg || 0).toLocaleString()} kg ({metrics?.demandFulfillmentPercent || 0}% met)
          </span>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Registered Farmland
          </span>
          <div className="text-2xl font-black text-slate-900 mt-1">
            {metrics?.totalAgriculturalAcres || 0}{' '}
            <span className="text-xs font-normal text-slate-500">Acres</span>
          </div>
          <span className="text-[11px] text-sky-600 mt-1 block">
            Across {metrics?.registeredFarmersCount || 0} registered farmers
          </span>
        </div>

        <div className="p-5 rounded-3xl bg-gradient-to-tr from-emerald-800 to-teal-700 text-white shadow-md">
          <span className="text-[11px] font-medium text-emerald-100 uppercase tracking-wider block">
            Chemical NPK Replaced
          </span>
          <div className="text-2xl font-black mt-1">
            {(metrics?.totalChemicalReplacedKg || 0).toLocaleString()}{' '}
            <span className="text-xs font-normal text-emerald-100">kg</span>
          </div>
          <span className="text-[11px] text-emerald-200 mt-1 block">
            ₹{(metrics?.totalFarmerSavingsINR || 0).toLocaleString()} saved by farmers
          </span>
        </div>
      </div>

      {/* Explicit NPK Supply, Feedstock Mix & Safe Land Capacity Card */}
      {monthlyNpkSupplyKg && (
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm space-y-3 text-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Estimated Monthly Plant-Available NPK &amp; Safe Agronomic Land Balance
              </h3>
              <p className="text-[11px] text-slate-500">
                Weighted by recorded feedstock composition ({feedstockComposition?.shares?.dungPercent ?? 80}% bovine dung,{' '}
                {feedstockComposition?.shares?.agriPercent ?? 15}% agri residue,{' '}
                {feedstockComposition?.shares?.kitchenPercent ?? 5}% kitchen waste) after storage &amp; volatilization losses
              </p>
            </div>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-bold text-[10px] self-start sm:self-auto">
              Estimated (Literature Model — Not Lab-Verified)
            </span>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="p-3 rounded-2xl bg-emerald-50/60 border border-emerald-200/80">
              <span className="text-[10px] font-bold uppercase text-emerald-700 block">Nitrogen (N)</span>
              <div className="text-lg font-black text-emerald-900">{monthlyNpkSupplyKg.nitrogenKg} kg/mo</div>
              <span className="text-[10px] text-slate-500">
                {feedstockComposition?.npkPercent?.n ?? 1.65}% DM (after {monthlyNpkSupplyKg.storageLossAppliedPercent}% N loss)
              </span>
            </div>
            <div className="p-3 rounded-2xl bg-sky-50/60 border border-sky-200/80">
              <span className="text-[10px] font-bold uppercase text-sky-700 block">Phosphorus (P₂O₅)</span>
              <div className="text-lg font-black text-sky-900">{monthlyNpkSupplyKg.phosphorusKg} kg/mo</div>
              <span className="text-[10px] text-slate-500">{feedstockComposition?.npkPercent?.p ?? 0.9}% dry matter</span>
            </div>
            <div className="p-3 rounded-2xl bg-amber-50/60 border border-amber-200/80">
              <span className="text-[10px] font-bold uppercase text-amber-700 block">Potassium (K₂O)</span>
              <div className="text-lg font-black text-amber-900">{monthlyNpkSupplyKg.potassiumKg} kg/mo</div>
              <span className="text-[10px] text-slate-500">{feedstockComposition?.npkPercent?.k ?? 1.25}% dry matter</span>
            </div>
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
              <span className="text-[10px] font-bold uppercase text-slate-500 block">Safe Land Required</span>
              <div className="text-lg font-black text-slate-900">{metrics?.recommendedLandRequiredAcres || 0} Acres</div>
              <span className={`text-[10px] font-bold ${metrics?.landCapacityAdequate ? 'text-emerald-700' : 'text-amber-700'}`}>
                {metrics?.landCapacityAdequate ? 'Sufficient registered farmland' : 'Register more farmland (3,500 L/ac/mo max)'}
              </span>
            </div>
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
              <span className="text-[10px] font-bold uppercase text-slate-500 block">Lab-Verified Batches</span>
              <div className="text-lg font-black text-slate-900">
                {metrics?.labVerifiedCount || 0} / {distributions.length}
              </div>
              <span className="text-[10px] text-slate-500">Attach soil/slurry lab test ID</span>
            </div>
          </div>
        </div>
      )}

      {/* Supply vs Demand Chart + Plant Output Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900">Monthly Agricultural Demand vs. Matched Digestate Supply</h3>
          <p className="text-xs text-slate-500 mb-4">
            Dry organic manure equivalent (kg/month) matched per registered farm plot (NPK ~1.8% N, 1.1% P, 1.2% K)
          </p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={supplyDemandChart} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="farmer" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} unit="kg" />
                <Tooltip contentStyle={{ borderRadius: '0.75rem', fontSize: '12px' }} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Bar dataKey="demandKg" name="Fertilizer Required (kg/mo)" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                <Bar dataKey="matchedSupplyKg" name="Matched Digestate (kg/mo)" fill="#059669" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Source Plant Digestate Output</h3>
            <p className="text-xs text-slate-500 mb-4">Estimated daily slurry discharge per active plant</p>
            <div className="space-y-3">
              {plantSupplies.map((p) => (
                <div key={p.plantId} className="p-3 rounded-2xl bg-slate-50 border border-slate-100 text-xs">
                  <div className="flex items-center justify-between font-bold text-slate-900">
                    <span className="truncate">{p.plantName}</span>
                    <span className="text-emerald-700 whitespace-nowrap ml-2">{p.dailySlurryLiters} L/d</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1">
                    <span>{p.plantCode} ({p.capacityM3} m³)</span>
                    <span>~{p.monthlyDryEquivalentKg} kg dry eq/mo</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-4 p-3 rounded-xl bg-emerald-50 text-[11px] text-emerald-900 border border-emerald-200">
            <strong>Agronomy Factor (Unified 7.5% TS):</strong> 1,000 L net bio-slurry yields ~75 kg dry bio-manure (after storage losses), replacing ~30 kg synthetic NPK. Values are literature estimates unless lab-verified.
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="px-6 pt-5 border-b border-slate-200 flex flex-wrap gap-2 text-xs font-bold">
          <button
            onClick={() => setActiveTab('matching')}
            className={`px-4 py-2.5 rounded-t-xl border-b-2 transition-colors ${
              activeTab === 'matching'
                ? 'border-emerald-600 text-emerald-700 bg-emerald-50/40'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Demand-Supply Matching ({matchingPlan.length})
          </button>
          <button
            onClick={() => setActiveTab('distributions')}
            className={`px-4 py-2.5 rounded-t-xl border-b-2 transition-colors ${
              activeTab === 'distributions'
                ? 'border-emerald-600 text-emerald-700 bg-emerald-50/40'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Distribution & Utilization Tracker ({distributions.length})
          </button>
          <button
            onClick={() => setActiveTab('farmers')}
            className={`px-4 py-2.5 rounded-t-xl border-b-2 transition-colors ${
              activeTab === 'farmers'
                ? 'border-emerald-600 text-emerald-700 bg-emerald-50/40'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Registered Farmers & Farmland ({farmers.length})
          </button>
        </div>

        {/* TAB 1: Demand-Supply Matching */}
        {activeTab === 'matching' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                  <th className="p-3.5 pl-6">Farmer & Crop</th>
                  <th className="p-3.5 text-right">Area (Acres)</th>
                  <th className="p-3.5 text-right">Demand (kg/mo)</th>
                  <th className="p-3.5">Matched Source Plant</th>
                  <th className="p-3.5 text-right">Recommended Slurry</th>
                  <th className="p-3.5 text-center">Match %</th>
                  <th className="p-3.5 text-right">Est Savings</th>
                  <th className="p-3.5 pr-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {matchingPlan.map((m) => (
                  <tr key={m.farmerId} className="hover:bg-slate-50/60">
                    <td className="p-3.5 pl-6">
                      <div className="font-bold text-slate-900">{m.farmerName}</div>
                      <span className="text-[11px] text-emerald-700 font-medium">
                        {m.primaryCrop} • {m.soilType}
                      </span>
                    </td>
                    <td className="p-3.5 text-right font-semibold text-slate-800">{m.landAreaAcres} ac</td>
                    <td className="p-3.5 text-right font-bold text-slate-900">{m.fertilizerRequiredKgPerMonth} kg</td>
                    <td className="p-3.5">
                      <div className="font-semibold text-slate-800">{m.matchedPlantName}</div>
                      <span className="text-[10px] text-slate-400">~{m.distanceKm} km away</span>
                    </td>
                    <td className="p-3.5 text-right font-bold text-sky-700">
                      {m.recommendedAllocationLiters.toLocaleString()} L
                      <span className="block text-[10px] text-slate-400 font-normal">
                        ({m.recommendedSolidEquivalentKg} kg dry eq)
                      </span>
                    </td>
                    <td className="p-3.5 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          m.matchCoveragePercent >= 90
                            ? 'bg-emerald-100 text-emerald-800'
                            : m.matchCoveragePercent >= 50
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {m.matchCoveragePercent}%
                      </span>
                    </td>
                    <td className="p-3.5 text-right font-bold text-emerald-700">
                      ₹{m.estimatedMonthlySavingsINR.toLocaleString()}/mo
                    </td>
                    <td className="p-3.5 pr-6 text-right">
                      {(isAdmin || isCoordinator) && (
                        <button
                          onClick={() => handleQuickAllocate(m)}
                          className="px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-[11px] border border-emerald-200"
                        >
                          Dispatch
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 2: Distribution & Utilization Tracker */}
        {activeTab === 'distributions' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                  <th className="p-3.5 pl-6">Date</th>
                  <th className="p-3.5">Recipient Farmer</th>
                  <th className="p-3.5">Source Plant</th>
                  <th className="p-3.5 text-right">Digestate Volume</th>
                  <th className="p-3.5 text-right">NPK Replaced</th>
                  <th className="p-3.5 text-right">Savings (₹)</th>
                  <th className="p-3.5 pr-6">Utilization Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {distributions.map((d) => (
                  <tr key={d._id} className="hover:bg-slate-50/60">
                    <td className="p-3.5 pl-6 font-medium text-slate-700">
                      {new Date(d.distributionDate).toLocaleDateString()}
                    </td>
                    <td className="p-3.5">
                      <div className="font-bold text-slate-900">{d.farmerLand?.farmerName || 'Farmer'}</div>
                      <span className="text-[10px] text-slate-400">
                        {d.farmerLand?.primaryCrop} ({d.farmerLand?.landAreaAcres} ac)
                      </span>
                    </td>
                    <td className="p-3.5 font-medium text-slate-700">{d.sourcePlant?.plantName || 'Plant'}</td>
                    <td className="p-3.5 text-right font-bold text-sky-700">
                      {d.digestateAllocatedLiters.toLocaleString()} L
                    </td>
                    <td className="p-3.5 text-right font-semibold text-emerald-700">
                      <div>{d.chemicalFertilizerReplacedKg} kg</div>
                      {d.estimatedNpkKg && (
                        <span className="block text-[10px] text-slate-400 font-normal">
                          N:{d.estimatedNpkKg.nitrogenKg} P:{d.estimatedNpkKg.phosphorusKg} K:{d.estimatedNpkKg.potassiumKg} kg
                        </span>
                      )}
                      <span
                        className={`inline-block mt-0.5 px-1.5 py-0.2 rounded text-[9px] font-bold ${
                          d.nutrientVerificationSource === 'lab_verified'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {d.nutrientVerificationSource === 'lab_verified' ? 'Lab-Verified' : 'Estimated'}
                      </span>
                    </td>
                    <td className="p-3.5 text-right font-bold text-slate-900">
                      ₹{d.farmerSavingsINR.toLocaleString()}
                    </td>
                    <td className="p-3.5 pr-6">
                      {isAdmin || isCoordinator ? (
                        <select
                          value={d.status}
                          onChange={(e) => handleUpdateStatus(d._id, e.target.value)}
                          className={`px-2.5 py-1 rounded-full text-[11px] font-bold border cursor-pointer ${getStatusColor(
                            d.status
                          )}`}
                        >
                          <option value="Scheduled">Scheduled</option>
                          <option value="Dispatched">Dispatched</option>
                          <option value="Delivered">Delivered</option>
                          <option value="Applied to Field">Applied to Field</option>
                        </select>
                      ) : (
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${getStatusColor(d.status)}`}>
                          {d.status}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 3: Registered Farmers */}
        {activeTab === 'farmers' && (
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {farmers.map((f) => (
              <div key={f._id} className="p-4 rounded-2xl border border-slate-200 bg-slate-50/60 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-900 text-sm">{f.farmerName}</h4>
                  <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                    {f.landAreaAcres} Acres
                  </span>
                </div>
                <p className="text-slate-600">
                  Crop: <strong>{f.primaryCrop}</strong> ({f.croppingSeason})
                </p>
                <p className="text-slate-600">
                  Soil: <strong>{f.soilType}</strong> • Form: <strong>{f.preferredApplicationType}</strong>
                </p>
                <div className="pt-2 border-t border-slate-200 flex justify-between items-center">
                  <span className="text-slate-500">Fertilizer Req:</span>
                  <strong className="text-emerald-700">{f.fertilizerRequiredKgPerMonth} kg / month</strong>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal 1: Register Farmer & Agricultural Land */}
      <Modal
        isOpen={showFarmerModal}
        onClose={() => setShowFarmerModal(false)}
        title="Register Farmer & Agricultural Fertilizer Requirement"
      >
        <form onSubmit={handleRegisterFarmer} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Farmer Name</label>
              <input
                type="text"
                value={farmerForm.farmerName}
                onChange={(e) => setFarmerForm({ ...farmerForm, farmerName: e.target.value })}
                placeholder="e.g. Suresh Kumar Singh"
                className="w-full px-3 py-2 rounded-xl border border-slate-200"
                required
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Village</label>
              <select
                value={farmerForm.villageId}
                onChange={(e) => setFarmerForm({ ...farmerForm, villageId: e.target.value })}
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
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Land Area (Acres)</label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                value={farmerForm.landAreaAcres}
                onChange={(e) => setFarmerForm({ ...farmerForm, landAreaAcres: parseFloat(e.target.value) || 0.5 })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold"
                required
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Primary Crop</label>
              <input
                type="text"
                value={farmerForm.primaryCrop}
                onChange={(e) => setFarmerForm({ ...farmerForm, primaryCrop: e.target.value })}
                placeholder="Wheat, Paddy, Sugarcane..."
                className="w-full px-3 py-2 rounded-xl border border-slate-200"
                required
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Soil Type</label>
              <select
                value={farmerForm.soilType}
                onChange={(e) => setFarmerForm({ ...farmerForm, soilType: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200"
              >
                <option value="Alluvial">Alluvial</option>
                <option value="Black / Regur">Black / Regur</option>
                <option value="Red Loamy">Red Loamy</option>
                <option value="Sandy Loam">Sandy Loam</option>
                <option value="Clayey">Clayey</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Monthly Fertilizer Required (kg)</label>
              <input
                type="number"
                min="10"
                value={farmerForm.fertilizerRequiredKgPerMonth}
                onChange={(e) =>
                  setFarmerForm({ ...farmerForm, fertilizerRequiredKgPerMonth: parseFloat(e.target.value) || 100 })
                }
                className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold"
                required
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Preferred Digestate Form</label>
              <select
                value={farmerForm.preferredApplicationType}
                onChange={(e) => setFarmerForm({ ...farmerForm, preferredApplicationType: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200"
              >
                <option value="Liquid Bio-Slurry">Liquid Bio-Slurry</option>
                <option value="Sun-Dried Digestate Cake">Sun-Dried Digestate Cake</option>
                <option value="Compost Enriched Slurry">Compost Enriched Slurry</option>
              </select>
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setShowFarmerModal(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
            >
              Save Farmer & Match Demand
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal 2: Allocate Digestate Distribution */}
      <Modal
        isOpen={showDistModal}
        onClose={() => setShowDistModal(false)}
        title="Schedule / Record Digestate Allocation"
      >
        <form onSubmit={handleCreateDistribution} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Source Biogas Plant</label>
              <select
                value={distForm.sourcePlantId}
                onChange={(e) => setDistForm({ ...distForm, sourcePlantId: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200"
                required
              >
                {plantSupplies.map((p) => (
                  <option key={p.plantId} value={p.plantId}>
                    {p.plantName} ({p.dailySlurryLiters} L/day)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Recipient Farmer</label>
              <select
                value={distForm.farmerLandId}
                onChange={(e) => setDistForm({ ...distForm, farmerLandId: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200"
                required
              >
                {farmers.map((f) => (
                  <option key={f._id} value={f._id}>
                    {f.farmerName} ({f.primaryCrop})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Digestate Volume (L)</label>
              <input
                type="number"
                min="50"
                step="100"
                value={distForm.digestateAllocatedLiters}
                onChange={(e) =>
                  setDistForm({ ...distForm, digestateAllocatedLiters: parseFloat(e.target.value) || 0 })
                }
                className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold"
                required
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Distribution Date</label>
              <input
                type="date"
                value={distForm.distributionDate}
                onChange={(e) => setDistForm({ ...distForm, distributionDate: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200"
                required
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Initial Status</label>
              <select
                value={distForm.status}
                onChange={(e) => setDistForm({ ...distForm, status: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200"
              >
                <option value="Scheduled">Scheduled</option>
                <option value="Dispatched">Dispatched</option>
                <option value="Delivered">Delivered</option>
                <option value="Applied to Field">Applied to Field</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Application Method (Storage Loss)</label>
              <select
                value={distForm.applicationMethod}
                onChange={(e) => setDistForm({ ...distForm, applicationMethod: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200"
              >
                <option value="Liquid Bio-Slurry">Liquid Bio-Slurry (~10% N loss)</option>
                <option value="Compost Enriched Slurry">Compost Enriched Slurry (~20% N loss)</option>
                <option value="Sun-Dried Digestate Cake">Sun-Dried Digestate Cake (~28% N loss)</option>
              </select>
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Nutrient Data Basis</label>
              <select
                value={distForm.nutrientVerificationSource}
                onChange={(e) => setDistForm({ ...distForm, nutrientVerificationSource: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200"
              >
                <option value="estimated">Estimated (Literature Model)</option>
                <option value="lab_verified">Lab-Verified Slurry Test</option>
              </select>
            </div>
          </div>

          {distForm.nutrientVerificationSource === 'lab_verified' && (
            <div>
              <label className="font-bold text-slate-700 block mb-1">Lab Test Report Reference ID</label>
              <input
                type="text"
                value={distForm.labReportReference}
                onChange={(e) => setDistForm({ ...distForm, labReportReference: e.target.value })}
                placeholder="e.g. KVK-SOIL-2026-0412"
                className="w-full px-3 py-2 rounded-xl border border-slate-200"
              />
            </div>
          )}

          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950 flex justify-between font-semibold">
            <span>Dry Manure Eq (7.5% TS): <strong>{Math.round(distForm.digestateAllocatedLiters * 0.075)} kg</strong></span>
            <span>Est. Chemical NPK Replaced: <strong>{Math.round(distForm.digestateAllocatedLiters * 0.075 * 0.4)} kg</strong></span>
          </div>

          <div className="pt-2 flex justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setShowDistModal(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
            >
              Record Allocation
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default DigestatePlanner;
