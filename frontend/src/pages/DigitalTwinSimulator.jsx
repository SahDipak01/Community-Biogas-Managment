import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import Modal from '../components/common/Modal';
import {
  Cpu,
  Sliders,
  Save,
  Download,
  Printer,
  RotateCcw,
  Trash2,
  Flame,
  TrendingUp,
  IndianRupee,
  Leaf,
  GitCompare,
  CheckSquare,
  Square
} from 'lucide-react';
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine
} from 'recharts';

const DigitalTwinSimulator = () => {
  const { user } = useAuth();
  const { addToast } = useNotification();

  const [villages, setVillages] = useState([]);
  const [villageId, setVillageId] = useState('');
  const [baselineParams, setBaselineParams] = useState(null);

  const [params, setParams] = useState({
    householdParticipationPercent: 100,
    participatingHouseholds: 6,
    wasteAvailabilityMultiplier: 1.0,
    dailyDungKg: 253,
    dailyAgriWasteKg: 45,
    dailyKitchenWasteKg: 21,
    plantCapacityM3: 25,
    installationCostINR: 480000,
    subsidyPercent: 36,
    transportCostPerKmINR: 18,
    avgDailyTransportKm: 6.5
  });

  const [simResult, setSimResult] = useState(null);
  const [savedScenarios, setSavedScenarios] = useState([]);
  const [selectedCompareIds, setSelectedCompareIds] = useState([]);

  // Save Scenario Modal
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [scenarioName, setScenarioName] = useState('');
  const [scenarioNotes, setScenarioNotes] = useState('');

  useEffect(() => {
    const init = async () => {
      try {
        const vRes = await api.get('/villages');
        if (vRes.data.success && vRes.data.data.length > 0) {
          setVillages(vRes.data.data);
          const initVillage = user?.village?._id || vRes.data.data[0]._id;
          setVillageId(initVillage);
        }
      } catch (err) {
        console.error('Failed to load villages:', err);
      }
    };
    init();
  }, [user]);

  const loadBaselineAndScenarios = async (vId) => {
    try {
      const [baseRes, scenRes] = await Promise.all([
        api.get(`/simulator/baseline${vId ? `?villageId=${vId}` : ''}`),
        api.get('/simulator/scenarios')
      ]);

      if (baseRes.data.success && baseRes.data.data.baseline) {
        const b = baseRes.data.data.baseline;
        setBaselineParams(b.parameters);
        setParams(b.parameters);
        setSimResult(b);
      }

      if (scenRes.data.success) {
        setSavedScenarios(scenRes.data.data);
        setSelectedCompareIds(scenRes.data.data.slice(0, 3).map((s) => s._id));
      }
    } catch (err) {
      console.error('Failed to load simulator baseline:', err);
    }
  };

  useEffect(() => {
    if (villageId) {
      loadBaselineAndScenarios(villageId);
    }
  }, [villageId]);

  // Run What-If simulation whenever sliders change
  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        const res = await api.post('/simulator/run', params);
        if (res.data.success) {
          setSimResult(res.data.data);
        }
      } catch (err) {
        console.error('Simulation run error:', err);
      }
    }, 120);
    return () => clearTimeout(timer);
  }, [params]);

  const handleSaveScenario = async (e) => {
    e.preventDefault();
    if (!scenarioName.trim()) return;
    try {
      const res = await api.post('/simulator/scenarios', {
        scenarioName: scenarioName.trim(),
        villageId,
        parameters: params,
        notes: scenarioNotes
      });
      if (res.data.success) {
        addToast(`Scenario "${scenarioName}" saved for comparison!`, 'success');
        setShowSaveModal(false);
        setScenarioName('');
        setScenarioNotes('');
        const scenRes = await api.get('/simulator/scenarios');
        if (scenRes.data.success) {
          setSavedScenarios(scenRes.data.data);
          setSelectedCompareIds((prev) => [res.data.data._id, ...prev.slice(0, 3)]);
        }
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Error saving scenario', 'error');
    }
  };

  const handleDeleteScenario = async (id) => {
    try {
      await api.delete(`/simulator/scenarios/${id}`);
      addToast('Scenario deleted', 'info');
      setSavedScenarios((prev) => prev.filter((s) => s._id !== id));
      setSelectedCompareIds((prev) => prev.filter((x) => x !== id));
    } catch (err) {
      addToast('Failed to delete scenario', 'error');
    }
  };

  const handleLoadScenario = (s) => {
    setParams({ ...s.parameters });
    addToast(`Loaded "${s.scenarioName}" into Digital Twin`, 'info');
  };

  const toggleCompareId = (id) => {
    setSelectedCompareIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id].slice(0, 4)
    );
  };

  const handleDownloadCsv = async () => {
    try {
      const res = await api.get('/simulator/export-csv', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `digital_twin_scenarios_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      addToast('Scenario comparison CSV report downloaded!', 'success');
    } catch (err) {
      addToast('Failed to export scenarios CSV', 'error');
    }
  };

  const outputs = simResult?.outputs;
  const cashflow = simResult?.cashflowProjection || [];

  // Build comparison chart dataset (Active Live Twin + Selected Saved Scenarios)
  const comparedScenarios = savedScenarios.filter((s) => selectedCompareIds.includes(s._id));
  const comparisonChartData = [
    ...(outputs
      ? [
          {
            name: 'Live Twin',
            dailyBiogasM3: outputs.estimatedDailyBiogasM3,
            annualNetSavingsK: Math.round(outputs.annualNetSavingsINR / 1000),
            annualTransportK: Math.round(outputs.annualTransportCostINR / 1000),
            utilizationPct: outputs.capacityUtilizationPercent
          }
        ]
      : []),
    ...comparedScenarios.map((s) => ({
      name: s.scenarioName.length > 18 ? `${s.scenarioName.slice(0, 18)}…` : s.scenarioName,
      dailyBiogasM3: s.outputs.estimatedDailyBiogasM3,
      annualNetSavingsK: Math.round(s.outputs.annualNetSavingsINR / 1000),
      annualTransportK: Math.round(s.outputs.annualTransportCostINR / 1000),
      utilizationPct: s.outputs.capacityUtilizationPercent
    }))
  ];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4 print:shadow-none">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold mb-2 border border-emerald-200">
            <Cpu className="w-3.5 h-3.5" />
            Interactive System Modeling & Scenario Engine
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Digital Twin & What-If Simulator</h2>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            Simulate changes in household participation, seasonal biomass availability, digester capacity, installation CAPEX, and transport costs to evaluate financial resilience and compare scenarios side-by-side.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 print:hidden">
          <select
            value={villageId}
            onChange={(e) => setVillageId(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-slate-50"
          >
            {villages.map((v) => (
              <option key={v._id} value={v._id}>
                {v.name} ({v.district})
              </option>
            ))}
          </select>

          <button
            onClick={handleDownloadCsv}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Printer className="w-4 h-4 text-slate-600" />
            <span>Print Report</span>
          </button>

          <button
            onClick={() => setShowSaveModal(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20"
          >
            <Save className="w-4 h-4" />
            <span>Save Scenario</span>
          </button>
        </div>
      </div>

      {/* Main Split: Parameter Sliders (Left) & Live Digital Twin Telemetry (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Controls (5 Cols) */}
        <div className="lg:col-span-5 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <Sliders className="w-4 h-4 text-emerald-600" />
              <span>What-If Control Levers</span>
            </div>
            {baselineParams && (
              <button
                onClick={() => setParams(baselineParams)}
                className="text-[11px] font-semibold text-slate-500 hover:text-emerald-600 flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" /> Reset to DB Baseline
              </button>
            )}
          </div>

          <div className="space-y-4 text-xs">
            {/* Household Participation */}
            <div>
              <div className="flex justify-between mb-1">
                <span className="font-bold text-slate-700">Household Participation Rate</span>
                <span className="font-bold text-emerald-700">
                  {params.householdParticipationPercent}% ({simResult?.parameters?.participatingHouseholds || params.participatingHouseholds} HH)
                </span>
              </div>
              <input
                type="range"
                min="25"
                max="200"
                step="5"
                value={params.householdParticipationPercent}
                onChange={(e) => setParams({ ...params, householdParticipationPercent: Number(e.target.value) })}
                className="w-full accent-emerald-600"
              />
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>25% (Drop-off)</span>
                <span>100% (Current)</span>
                <span>200% (Expansion)</span>
              </div>
            </div>

            {/* Waste Availability Multiplier */}
            <div>
              <div className="flex justify-between mb-1">
                <span className="font-bold text-slate-700">Seasonal Waste Availability Factor</span>
                <span className="font-bold text-sky-700">{Math.round(params.wasteAvailabilityMultiplier * 100)}% ({params.wasteAvailabilityMultiplier}x)</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="2.0"
                step="0.05"
                value={params.wasteAvailabilityMultiplier}
                onChange={(e) => setParams({ ...params, wasteAvailabilityMultiplier: Number(e.target.value) })}
                className="w-full accent-emerald-600"
              />
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>0.5x (Drought/Winter)</span>
                <span>1.0x (Normal)</span>
                <span>2.0x (Peak Harvest)</span>
              </div>
            </div>

            {/* Plant Capacity */}
            <div>
              <div className="flex justify-between mb-1">
                <span className="font-bold text-slate-700">Digester Plant Capacity</span>
                <span className="font-bold text-emerald-700">{params.plantCapacityM3} m³/day</span>
              </div>
              <input
                type="range"
                min="2"
                max="85"
                step="1"
                value={params.plantCapacityM3}
                onChange={(e) => setParams({ ...params, plantCapacityM3: Number(e.target.value) })}
                className="w-full accent-emerald-600"
              />
            </div>

            {/* Installation Cost & Subsidy */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Installation CAPEX (₹)</label>
                <input
                  type="number"
                  step="10000"
                  min="20000"
                  value={params.installationCostINR}
                  onChange={(e) => setParams({ ...params, installationCostINR: Number(e.target.value) || 0 })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Govt Subsidy (%)</label>
                <input
                  type="number"
                  min="0"
                  max="80"
                  value={params.subsidyPercent}
                  onChange={(e) => setParams({ ...params, subsidyPercent: Number(e.target.value) || 0 })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold"
                />
              </div>
            </div>

            {/* Transportation Expenses */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Transport Rate (₹/km)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={params.transportCostPerKmINR}
                  onChange={(e) => setParams({ ...params, transportCostPerKmINR: Number(e.target.value) || 0 })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Daily Haul Distance (km)</label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  value={params.avgDailyTransportKm}
                  onChange={(e) => setParams({ ...params, avgDailyTransportKm: Number(e.target.value) || 0 })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Live Twin Output & 10-Year Cashflow (7 Cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* Live Telemetry Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
              <span className="text-[10px] font-bold uppercase text-slate-400 block">Biogas Yield</span>
              <div className="text-xl font-black text-emerald-700 mt-0.5">
                {outputs?.estimatedDailyBiogasM3 || 0} <span className="text-xs font-normal">m³/d</span>
              </div>
              <span className="text-[10px] text-slate-500">
                {outputs?.capacityUtilizationPercent || 0}% plant cap used
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
              <span className="text-[10px] font-bold uppercase text-slate-400 block">Resource Utilization</span>
              <div className="text-xl font-black text-sky-700 mt-0.5">
                {outputs?.resourceUtilizationPercent || 0}%
              </div>
              <span className="text-[10px] text-slate-500">
                {outputs?.usedFeedstockKg || 0} / {outputs?.totalDailyFeedstockKg || 0} kg/d
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
              <span className="text-[10px] font-bold uppercase text-slate-400 block">Annual Net Savings</span>
              <div className={`text-xl font-black mt-0.5 ${(outputs?.annualNetSavingsINR || 0) >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                ₹{((outputs?.annualNetSavingsINR || 0) / 1000).toFixed(1)}k
              </div>
              <span className="text-[10px] text-slate-500">
                Transport: ₹{((outputs?.annualTransportCostINR || 0) / 1000).toFixed(1)}k/yr
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-gradient-to-tr from-emerald-800 to-teal-700 text-white shadow-md">
              <span className="text-[10px] font-semibold uppercase text-emerald-100 block">Payback / ROI</span>
              <div className="text-xl font-black mt-0.5">
                {outputs?.paybackYears !== null && outputs?.paybackYears !== undefined && outputs?.paybackYears < 50
                  ? `${outputs.paybackYears} Yrs`
                  : 'Non-Viable'}
              </div>
              <span className="text-[10px] text-emerald-200">
                ROI: {outputs?.roiPercent || 0}% • {outputs?.annualCo2OffsetTons || 0}t CO₂
              </span>
            </div>
          </div>

          {/* Tri-Scenario Stress Test: Worst-Case / Normal-Case / Best-Case */}
          {simResult?.triScenarioComparison && (
            <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Automated Best / Normal / Worst-Case Sensitivity</h3>
                  <p className="text-[11px] text-slate-500">
                    Live stress envelope varying feedstock availability, participation, subsidy &amp; logistics rate
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                {[
                  { key: 'worstCase', tone: 'border-rose-200 bg-rose-50/40', badge: 'bg-rose-100 text-rose-800', title: 'Worst-Case' },
                  { key: 'normalCase', tone: 'border-emerald-200 bg-emerald-50/40', badge: 'bg-emerald-100 text-emerald-800', title: 'Normal-Case' },
                  { key: 'bestCase', tone: 'border-sky-200 bg-sky-50/40', badge: 'bg-sky-100 text-sky-800', title: 'Best-Case' }
                ].map(({ key, tone, badge, title }) => {
                  const sc = simResult.triScenarioComparison[key];
                  if (!sc) return null;
                  return (
                    <div key={key} className={`p-3.5 rounded-2xl border ${tone} space-y-1.5`}>
                      <div className="flex items-center justify-between gap-1">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${badge}`}>{title}</span>
                        <span className="text-[10px] font-semibold text-slate-500">{sc.viabilityStatus}</span>
                      </div>
                      <div className="text-sm font-black text-slate-900">{sc.estimatedDailyBiogasM3} m³/day</div>
                      <div className="text-[11px] text-slate-700 flex justify-between">
                        <span>Net Savings/yr:</span>
                        <strong className={sc.annualNetSavingsINR >= 0 ? 'text-emerald-700' : 'text-rose-700'}>
                          ₹{sc.annualNetSavingsINR.toLocaleString()}
                        </strong>
                      </div>
                      <div className="text-[11px] text-slate-600 flex justify-between">
                        <span>Transport/yr:</span>
                        <span>₹{sc.annualTransportCostINR.toLocaleString()}</span>
                      </div>
                      <div className="text-[11px] text-slate-600 flex justify-between">
                        <span>Payback:</span>
                        <strong>{sc.paybackYears !== null ? `${sc.paybackYears} yrs` : 'Non-Viable'}</strong>
                      </div>
                      <p className="text-[10px] text-slate-400 leading-tight pt-1 border-t border-slate-200/60">
                        {sc.assumptions}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 10-Year Cumulative Break-Even Cashflow Chart */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">10-Year Cumulative Cashflow & Break-Even Trajectory</h3>
                <p className="text-xs text-slate-500">
                  Net CAPEX: ₹{(outputs?.netInstallationCostINR || 0).toLocaleString()} after ₹{(outputs?.subsidyAmountINR || 0).toLocaleString()} subsidy
                </p>
              </div>
            </div>

            <div className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={cashflow} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="cashGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#059669" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#059669" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis
                    tick={{ fontSize: 10, fill: '#64748b' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `₹${Math.round(v / 1000)}k`}
                  />
                  <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="4 4" />
                  <Tooltip
                    formatter={(val) => [`₹${Number(val).toLocaleString()}`, '']}
                    contentStyle={{ borderRadius: '0.75rem', fontSize: '12px' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="cumulativeNetINR"
                    name="Cumulative Net Position"
                    stroke="#059669"
                    strokeWidth={2.5}
                    fill="url(#cashGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Multi-Scenario Comparison Charts & Table */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <GitCompare className="w-4 h-4 text-emerald-600" />
              <span>Multi-Scenario Side-by-Side Comparison</span>
            </h3>
            <p className="text-xs text-slate-500">
              Select saved scenarios below to visually benchmark Live Twin against baseline & expansion models
            </p>
          </div>
        </div>

        {/* Comparison BarChart */}
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={comparisonChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#475569' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: '0.75rem', fontSize: '12px' }} />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
              <Bar dataKey="annualNetSavingsK" name="Annual Net Savings (₹ Thousands)" fill="#059669" radius={[5, 5, 0, 0]} />
              <Bar dataKey="annualTransportK" name="Annual Transport Cost (₹ Thousands)" fill="#f59e0b" radius={[5, 5, 0, 0]} />
              <Bar dataKey="dailyBiogasM3" name="Daily Biogas Output (m³)" fill="#3b82f6" radius={[5, 5, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Saved Scenarios Comparison Table */}
        <div className="overflow-x-auto border border-slate-200 rounded-2xl">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                <th className="p-3 pl-4">Compare</th>
                <th className="p-3">Scenario Name</th>
                <th className="p-3 text-right">Participation</th>
                <th className="p-3 text-right">Plant Cap.</th>
                <th className="p-3 text-right">Daily Biogas</th>
                <th className="p-3 text-right">Cap. Util.</th>
                <th className="p-3 text-right">Net CAPEX</th>
                <th className="p-3 text-right">Transport/yr</th>
                <th className="p-3 text-right">Net Savings/yr</th>
                <th className="p-3 text-right">Payback</th>
                <th className="p-3 pr-4 text-right print:hidden">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {savedScenarios.map((s) => {
                const checked = selectedCompareIds.includes(s._id);
                return (
                  <tr key={s._id} className={`hover:bg-slate-50/70 ${checked ? 'bg-emerald-50/30' : ''}`}>
                    <td className="p-3 pl-4">
                      <button
                        type="button"
                        onClick={() => toggleCompareId(s._id)}
                        className="text-emerald-600 hover:text-emerald-800"
                      >
                        {checked ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4 text-slate-400" />}
                      </button>
                    </td>
                    <td className="p-3">
                      <div className="font-bold text-slate-900">{s.scenarioName}</div>
                      {s.notes && <span className="text-[10px] text-slate-400 line-clamp-1">{s.notes}</span>}
                    </td>
                    <td className="p-3 text-right text-slate-700">{s.parameters.householdParticipationPercent}%</td>
                    <td className="p-3 text-right font-semibold text-slate-800">{s.parameters.plantCapacityM3} m³</td>
                    <td className="p-3 text-right font-bold text-emerald-700">{s.outputs.estimatedDailyBiogasM3} m³</td>
                    <td className="p-3 text-right text-slate-700">{s.outputs.capacityUtilizationPercent}%</td>
                    <td className="p-3 text-right text-slate-700">₹{s.outputs.netInstallationCostINR.toLocaleString()}</td>
                    <td className="p-3 text-right text-amber-700">₹{s.outputs.annualTransportCostINR.toLocaleString()}</td>
                    <td className="p-3 text-right font-bold text-emerald-700">
                      ₹{s.outputs.annualNetSavingsINR.toLocaleString()}
                    </td>
                    <td className="p-3 text-right font-bold text-slate-900">
                      {s.outputs.paybackYears !== null && s.outputs.paybackYears !== undefined
                        ? `${s.outputs.paybackYears} yrs`
                        : 'Non-Viable'}
                    </td>
                    <td className="p-3 pr-4 text-right print:hidden">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => handleLoadScenario(s)}
                          className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-emerald-100 text-slate-700 hover:text-emerald-800 font-semibold text-[11px]"
                        >
                          Load
                        </button>
                        <button
                          onClick={() => handleDeleteScenario(s._id)}
                          className="p-1 rounded text-slate-400 hover:text-rose-600"
                          title="Delete scenario"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Save Scenario Modal */}
      <Modal
        isOpen={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        title="Save Digital Twin Scenario"
      >
        <form onSubmit={handleSaveScenario} className="space-y-4 text-xs">
          <div>
            <label className="font-bold text-slate-700 block mb-1">Scenario Name</label>
            <input
              type="text"
              value={scenarioName}
              onChange={(e) => setScenarioName(e.target.value)}
              placeholder="e.g. High Subsidy 45 m³ Community Expansion"
              className="w-full px-3 py-2 rounded-xl border border-slate-200"
              required
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Assumptions / Notes</label>
            <textarea
              rows="2"
              value={scenarioNotes}
              onChange={(e) => setScenarioNotes(e.target.value)}
              placeholder="Describe the what-if assumptions being modeled..."
              className="w-full px-3 py-2 rounded-xl border border-slate-200"
            />
          </div>

          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950 grid grid-cols-2 gap-2">
            <span>Biogas: <strong>{outputs?.estimatedDailyBiogasM3} m³/day</strong></span>
            <span>Annual Savings: <strong>₹{(outputs?.annualNetSavingsINR || 0).toLocaleString()}</strong></span>
            <span>
              Payback:{' '}
              <strong>
                {outputs?.paybackYears !== null && outputs?.paybackYears !== undefined
                  ? `${outputs.paybackYears} yrs`
                  : 'Non-Viable'}
              </strong>
            </span>
            <span>CO₂ Offset: <strong>{outputs?.annualCo2OffsetTons} t/yr</strong></span>
          </div>

          <div className="pt-2 flex justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setShowSaveModal(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
            >
              Save Scenario to DB
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default DigitalTwinSimulator;
