import React, { useState, useEffect } from 'react';
import api from '../services/api';
import StatusBadge from '../components/common/StatusBadge';
import {
  Calculator,
  Flame,
  Info,
  IndianRupee,
  Droplets,
  Layers,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ArrowRight,
  TrendingUp,
  RotateCcw,
  ShieldCheck,
  Leaf,
  Printer,
  Thermometer
} from 'lucide-react';

const FeasibilityCalculator = () => {
  // Form State
  const [inputs, setInputs] = useState({
    cattleCount: 4,
    avgDungPerCattleKg: 12,
    agriWasteKgPerDay: 8,
    kitchenWasteKgPerDay: 3,
    participatingHouseholds: 1,
    availableWaterLitersPerDay: 80,
    installationBudgetINR: 55000,
    climateZone: 'Moderate Plains (25-32°C)'
  });

  const [cattleBreakdown, setCattleBreakdown] = useState({
    Cow: 2,
    Buffalo: 1,
    Bullock: 1,
    Calf: 0
  });

  const [useDetailedCattle, setUseDetailedCattle] = useState(true);
  const [loading, setLoading] = useState(false);
  const [calculationResult, setCalculationResult] = useState(null);
  const [calcError, setCalcError] = useState('');
  const [assumptions, setAssumptions] = useState(null);
  const [showAssumptionsModal, setShowAssumptionsModal] = useState(false);

  // Fetch initial assumptions and pre-fill for logged-in user
  useEffect(() => {
    const fetchDefaults = async () => {
      try {
        const [assumptionsRes, defaultRes] = await Promise.all([
          api.get('/calculator/assumptions'),
          api.get('/calculator/household-defaults')
        ]);

        if (assumptionsRes.data.success) {
          setAssumptions(assumptionsRes.data.data);
        }

        if (defaultRes.data.success && defaultRes.data.data) {
          const d = defaultRes.data.data;
          setInputs((prev) => ({
            ...prev,
            cattleCount: d.cattleCount || prev.cattleCount,
            avgDungPerCattleKg: d.avgDungPerCattleKg || prev.avgDungPerCattleKg,
            availableWaterLitersPerDay: d.availableWaterLitersPerDay || prev.availableWaterLitersPerDay
          }));
          if (d.cattleBreakdown && Object.keys(d.cattleBreakdown).length > 0) {
            setCattleBreakdown((prev) => ({ ...prev, ...d.cattleBreakdown }));
          }
        }
      } catch (err) {
        console.warn('Defaults loaded with static fallback:', err.message);
      }
    };

    fetchDefaults();
  }, []);

  // Run calculation whenever inputs change
  const handleCalculate = async () => {
    setLoading(true);
    setCalcError('');
    try {
      const payload = {
        ...inputs,
        cattleBreakdown: useDetailedCattle ? cattleBreakdown : {}
      };

      const res = await api.post('/calculator/evaluate', payload);
      if (res.data.success) {
        setCalculationResult(res.data.data);
      }
    } catch (err) {
      setCalcError(err.response?.data?.message || 'Invalid input values detected. Please check numeric limits.');
      console.error('Calculation error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      handleCalculate();
    }, 180);
    return () => clearTimeout(timer);
  }, [inputs, cattleBreakdown, useDetailedCattle]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setInputs((prev) => ({
      ...prev,
      [name]: name === 'climateZone' ? value : parseFloat(value) || 0
    }));
  };

  const handleCattleBreakdownChange = (type, val) => {
    const num = parseInt(val) || 0;
    const updated = { ...cattleBreakdown, [type]: num };
    setCattleBreakdown(updated);
    const sum = Object.values(updated).reduce((a, b) => a + b, 0);
    setInputs((prev) => ({ ...prev, cattleCount: sum }));
  };

  const results = calculationResult?.results;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold mb-2 border border-emerald-200">
            <Calculator className="w-3.5 h-3.5" />
            Techno-Economic Sizing Engine
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Biogas Feasibility & Sizing Calculator</h2>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
            Quantitatively evaluates bovine dung yields, agricultural crop residues, water adequacy, capital expenditure, applicable government subsidies, and payback periods.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto print:hidden">
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <Printer className="w-4 h-4 text-slate-600" />
            <span>Print Report</span>
          </button>
          <button
            onClick={() => setShowAssumptionsModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <Info className="w-4 h-4 text-emerald-600" />
            <span>Engineering Assumptions</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Form Left, Results Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Inputs Form (5 Cols) */}
        <div className="lg:col-span-5 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900">1. Parametric Resource Inputs</h3>
            <button
              onClick={() => {
                setInputs({
                  cattleCount: 4,
                  avgDungPerCattleKg: 12,
                  agriWasteKgPerDay: 8,
                  kitchenWasteKgPerDay: 3,
                  participatingHouseholds: 1,
                  availableWaterLitersPerDay: 80,
                  installationBudgetINR: 55000,
                  climateZone: 'Moderate Plains (25-32°C)'
                });
                setCattleBreakdown({ Cow: 2, Buffalo: 1, Bullock: 1, Calf: 0 });
              }}
              className="text-[11px] text-slate-400 hover:text-emerald-600 flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" /> Reset
            </button>
          </div>

          {/* Bovine / Cattle Details */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-800">Bovine Livestock Census</label>
              <button
                type="button"
                onClick={() => setUseDetailedCattle(!useDetailedCattle)}
                className="text-[11px] text-emerald-600 font-semibold hover:underline"
              >
                {useDetailedCattle ? 'Switch to Simple Count' : 'Detailed Cattle Breakdown'}
              </button>
            </div>

            {useDetailedCattle ? (
              <div className="grid grid-cols-2 gap-2.5 p-3.5 bg-slate-50 rounded-2xl border border-slate-200/60 text-xs">
                <div>
                  <span className="text-slate-600 text-[11px] block mb-1">Cows (11 kg dung/day)</span>
                  <input
                    type="number"
                    min="0"
                    value={cattleBreakdown.Cow}
                    onChange={(e) => handleCattleBreakdownChange('Cow', e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 font-semibold focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <span className="text-slate-600 text-[11px] block mb-1">Buffaloes (16 kg dung/day)</span>
                  <input
                    type="number"
                    min="0"
                    value={cattleBreakdown.Buffalo}
                    onChange={(e) => handleCattleBreakdownChange('Buffalo', e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 font-semibold focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <span className="text-slate-600 text-[11px] block mb-1">Bullocks (13 kg dung/day)</span>
                  <input
                    type="number"
                    min="0"
                    value={cattleBreakdown.Bullock}
                    onChange={(e) => handleCattleBreakdownChange('Bullock', e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 font-semibold focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <span className="text-slate-600 text-[11px] block mb-1">Calves (5 kg dung/day)</span>
                  <input
                    type="number"
                    min="0"
                    value={cattleBreakdown.Calf}
                    onChange={(e) => handleCattleBreakdownChange('Calf', e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 font-semibold focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-slate-600 block mb-1">Total Cattle Count</label>
                  <input
                    type="number"
                    min="0"
                    name="cattleCount"
                    value={inputs.cattleCount}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-semibold focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-600 block mb-1">Avg Dung/Cattle (kg)</label>
                  <input
                    type="number"
                    min="1"
                    name="avgDungPerCattleKg"
                    value={inputs.avgDungPerCattleKg}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-semibold focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Organic Waste Inputs */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-slate-800 block">Co-Digestion Organic Waste (kg/day)</label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-[11px] text-slate-600 block mb-1">Agricultural Waste</span>
                <input
                  type="number"
                  min="0"
                  name="agriWasteKgPerDay"
                  value={inputs.agriWasteKgPerDay}
                  onChange={handleInputChange}
                  placeholder="e.g. 10 kg"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-semibold focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <span className="text-[11px] text-slate-600 block mb-1">Kitchen / Food Scrap</span>
                <input
                  type="number"
                  min="0"
                  name="kitchenWasteKgPerDay"
                  value={inputs.kitchenWasteKgPerDay}
                  onChange={handleInputChange}
                  placeholder="e.g. 3 kg"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-semibold focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Community & Water Inputs */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-800 block mb-1">Participating Families</label>
              <input
                type="number"
                min="1"
                name="participatingHouseholds"
                value={inputs.participatingHouseholds}
                onChange={handleInputChange}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-semibold focus:outline-none focus:border-emerald-500"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">&gt; 3 triggers community sizing</span>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-800 block mb-1">Daily Water Access (L)</label>
              <input
                type="number"
                min="0"
                name="availableWaterLitersPerDay"
                value={inputs.availableWaterLitersPerDay}
                onChange={handleInputChange}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-semibold focus:outline-none focus:border-emerald-500"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">1:1 dilution needed for slurry</span>
            </div>
          </div>

          {/* Capital Budget */}
          <div>
            <label className="text-[11px] font-bold text-slate-800 block mb-1">Installation Budget (INR)</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">₹</span>
              <input
                type="number"
                min="0"
                step="5000"
                name="installationBudgetINR"
                value={inputs.installationBudgetINR}
                onChange={handleInputChange}
                className="w-full pl-8 pr-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Ambient Climate / Seasonal Kinetics */}
          <div>
            <label className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5 mb-1">
              <Thermometer className="w-3.5 h-3.5 text-amber-500" />
              <span>Ambient Climate / Seasonal Zone</span>
            </label>
            <select
              name="climateZone"
              value={inputs.climateZone}
              onChange={handleInputChange}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:border-emerald-500"
            >
              <option value="Tropical Warm (30-36°C)">Tropical Warm (30–36°C) — Peak Yield (108%)</option>
              <option value="Moderate Plains (25-32°C)">Moderate Plains (25–32°C) — Standard (100%)</option>
              <option value="Cool / Winter Plains (18-24°C)">Cool / Winter Plains (18–24°C) — Reduced (84%)</option>
              <option value="Cold / Hilly Region (<18°C)">Cold / Hilly Region (&lt;18°C) — Suppressed (68%)</option>
            </select>
            <span className="text-[10px] text-slate-400 mt-1 block">
              Adjusts anaerobic digestion rate &amp; retention time ({results?.hydraulicRetentionDays || 45} days HRT)
            </span>
          </div>
        </div>

        {/* Right Output Dashboard (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Main Feasibility Recommendation Banner */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                  Overall Feasibility Verdict
                </span>
                <div className="flex items-center gap-3">
                  <h3 className="text-2xl font-black text-slate-900">
                    {results?.feasibilityResult || 'Calculating...'}
                  </h3>
                  <StatusBadge status={results?.feasibilityResult} type="feasibility" />
                </div>
              </div>

              {/* Feasibility Score Gauge */}
              <div className="flex items-center gap-3 bg-slate-50 px-4 py-2 rounded-2xl border border-slate-200/60 self-start sm:self-auto">
                <div className="text-right">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold block">Viability Score</span>
                  <span className="text-lg font-bold text-emerald-700">{results?.feasibilityScore || 0} / 100</span>
                </div>
                <div className="w-10 h-10 rounded-full border-4 border-emerald-500/20 border-t-emerald-600 flex items-center justify-center font-bold text-xs text-emerald-800">
                  {results?.feasibilityScore}%
                </div>
              </div>
            </div>

            {/* Recommended Plant Spec Box */}
            <div className="my-5 p-4 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/30">
                  <Flame className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">
                    Recommended Digester Capacity
                  </span>
                  <div className="text-xl font-black text-slate-900">
                    {results?.recommendedPlantCapacityM3 || 2} m³ / Day
                  </div>
                  <span className="text-xs text-emerald-700 font-medium">
                    {results?.recommendedModel || 'Deenabandhu Fixed Dome'}
                  </span>
                </div>
              </div>

              <div className="sm:text-right border-t sm:border-t-0 pt-3 sm:pt-0 border-emerald-200">
                <span className="text-[10px] text-emerald-800 font-medium block">Daily Biogas Yield</span>
                <span className="text-lg font-bold text-emerald-950">
                  ~{results?.estimatedBiogasM3PerDay || 0} m³ gas/day
                </span>
                <span className="text-[11px] text-slate-600 block">
                  Replaces ~{results?.monthlyLpgEquivalentCylinders || 0} LPG Cylinders/mo
                </span>
              </div>
            </div>

            {/* Key Engineering Sizing Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
                <span className="text-[10px] text-slate-500 font-semibold block uppercase">Total Dung</span>
                <span className="text-base font-bold text-slate-800">{results?.totalDailyDungKg || 0} kg/d</span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
                <span className="text-[10px] text-slate-500 font-semibold block uppercase">Organic Scrap</span>
                <span className="text-base font-bold text-slate-800">{results?.totalDailyOrganicWasteKg || 0} kg/d</span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
                <span className="text-[10px] text-slate-500 font-semibold block uppercase">Water Required</span>
                <span className="text-base font-bold text-slate-800">{results?.requiredWaterLitersPerDay || 0} L/d</span>
                <span className={`text-[10px] font-semibold block ${results?.waterAdequacyPercent >= 80 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {results?.waterAdequacyPercent}% Adequate
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
                <span className="text-[10px] text-slate-500 font-semibold block uppercase">Payback Timeline</span>
                <span className="text-base font-bold text-emerald-700">
                  {results?.estimatedPaybackYears !== null && results?.estimatedPaybackYears !== undefined
                    ? `${results.estimatedPaybackYears} Yrs`
                    : 'N/A'}
                </span>
              </div>
            </div>

            {calcError && (
              <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{calcError}</span>
              </div>
            )}

            {/* Min / Expected / Max Estimation Uncertainty Band */}
            {results?.biogasRangeM3PerDay && (
              <div className="mt-5 p-4 rounded-2xl bg-sky-50/60 border border-sky-200/80 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                  <span className="font-bold text-slate-900">
                    Operational Estimation Ranges (±15% Field Variance)
                  </span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white border border-sky-200 text-sky-800">
                    Effluent: {results.dailyLiquidSlurryLiters || 0} L/d slurry • {results.dailyDryBioManureKg || 0} kg dry manure (7.5% TS)
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div className="p-2.5 rounded-xl bg-white border border-slate-200/70">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Daily Biogas Yield</span>
                    <div className="text-sm font-black text-emerald-700 mt-0.5">
                      {results.biogasRangeM3PerDay.expected} m³/d
                    </div>
                    <span className="text-[10px] text-slate-500">
                      Min {results.biogasRangeM3PerDay.min} — Max {results.biogasRangeM3PerDay.max} m³/d
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white border border-slate-200/70">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Monthly Net Benefit</span>
                    <div className="text-sm font-black text-emerald-700 mt-0.5">
                      ₹{(results.monthlySavingsRangeINR?.expected || 0).toLocaleString()}
                    </div>
                    <span className="text-[10px] text-slate-500">
                      Min ₹{(results.monthlySavingsRangeINR?.min || 0).toLocaleString()} — Max ₹{(results.monthlySavingsRangeINR?.max || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white border border-slate-200/70">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Payback Window</span>
                    <div className="text-sm font-black text-slate-900 mt-0.5">
                      {results.paybackRangeYears?.expected !== null && results.paybackRangeYears?.expected !== undefined
                        ? `${results.paybackRangeYears.expected} yrs`
                        : 'Non-Viable'}
                    </div>
                    <span className="text-[10px] text-slate-500">
                      {results.paybackRangeYears?.min !== null && results.paybackRangeYears?.min !== undefined
                        ? `Fast ${results.paybackRangeYears.min} — Slow ${results.paybackRangeYears.max} yrs`
                        : 'Insufficient positive savings'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Financial Cost & Savings Table */}
            <div className="mt-5 border border-slate-200 rounded-2xl overflow-hidden text-xs">
              <div className="px-4 py-2.5 bg-slate-50 font-bold text-slate-800 border-b border-slate-200 flex justify-between">
                <span>Cost, Subsidy & Economic Benefit Breakdown</span>
                <span className="text-emerald-700 font-semibold">INR (₹)</span>
              </div>
              <div className="divide-y divide-slate-100 p-1">
                <div className="flex justify-between px-3 py-2 text-slate-600">
                  <span>Gross Installation Cost (Turnkey Fixed Dome)</span>
                  <span className="font-semibold text-slate-800">
                    ₹{(results?.estimatedInstallationCostINR || 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between px-3 py-2 text-emerald-700 bg-emerald-50/50 font-medium">
                  <span className="flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Applicable Central Subsidy (National Bioenergy Programme)
                  </span>
                  <span className="font-bold">- ₹{(results?.applicableSubsidyINR || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between px-3 py-2 font-bold text-slate-900 bg-slate-50/50">
                  <span>Net Capital Outlay (After Subsidy)</span>
                  <span>₹{(results?.netInvestmentCostINR || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between px-3 py-2 text-slate-600">
                  <span>Monthly LPG Cylinder Savings Equivalent</span>
                  <span className="font-semibold text-emerald-700">
                    ₹{(results?.monthlyLpgSavingsINR || 0).toLocaleString()} / month
                  </span>
                </div>
                <div className="flex justify-between px-3 py-2 text-slate-600">
                  <span>Monthly Bio-Slurry Organic Fertilizer Value</span>
                  <span className="font-semibold text-emerald-700">
                    ₹{(results?.monthlySlurrySavingsINR || 0).toLocaleString()} / month
                  </span>
                </div>
                <div className="flex justify-between px-3 py-2 font-bold text-emerald-800 bg-emerald-100/40">
                  <span>Total Cumulative Annual Benefit</span>
                  <span className="text-sm">₹{(results?.totalAnnualSavingsINR || 0).toLocaleString()} / year</span>
                </div>
              </div>
            </div>

            {/* Recommendations & Technical Advice List */}
            <div className="mt-5 p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block mb-2">
                Technical Insights & Recommendations
              </span>
              <ul className="space-y-1.5 text-xs text-slate-600">
                {results?.recommendations?.map((rec, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <span>{rec}</span>
                  </li>
                ))}
                {results?.reasons?.map((reason, i) => (
                  <li key={`r-${i}`} className="flex items-start gap-2 text-amber-700">
                    <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                    <span>{reason}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Assumptions Modal */}
      {showAssumptionsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-2xl w-full p-6 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2 text-emerald-700">
                <Info className="w-5 h-5" />
                <h3 className="font-bold text-slate-900 text-base">Engineering Assumptions & Methodology</h3>
              </div>
              <button
                onClick={() => setShowAssumptionsModal(false)}
                className="text-xs font-semibold text-slate-500 hover:text-slate-800 px-2 py-1 bg-slate-100 rounded-lg"
              >
                Close
              </button>
            </div>

            <div className="space-y-4 text-xs text-slate-600">
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-900">
                <strong>Standard Reference:</strong> Calculations use empirical biogas yield coefficients established by the <em>Ministry of New & Renewable Energy (MNRE)</em> and the Indian Agricultural Research Institute (IARI) under continuous mesophilic digestion (25°C - 35°C).
              </div>

              <div>
                <h4 className="font-bold text-slate-900 mb-1.5">Biogas Production Yield Constants:</h4>
                <ul className="list-disc pl-5 space-y-1">
                  <li><strong>Fresh Bovine Dung:</strong> ~0.037 m³ biogas per kg (80% moisture)</li>
                  <li><strong>Kitchen / Food Waste:</strong> ~0.065 m³ biogas per kg (rich in digestible carbohydrates)</li>
                  <li><strong>Agricultural Residues:</strong> ~0.050 m³ biogas per kg (requires shredded co-digestion)</li>
                </ul>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 mb-1.5">Fuel & Energy Equivalences:</h4>
                <ul className="list-disc pl-5 space-y-1">
                  <li>1.0 m³ Biogas ≈ 0.43 kg Liquefied Petroleum Gas (LPG)</li>
                  <li>1 standard 14.2 kg domestic LPG cylinder ≈ 33 m³ biogas output</li>
                  <li>Reference LPG Cylinder Price: ₹1,050</li>
                </ul>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 mb-1.5">Bio-Slurry Fertilizer Valuation:</h4>
                <p>
                  Digested effluent (bio-slurry) contains 1.5-2.0% Nitrogen, 1.0% Phosphorus, and 1.0% Potassium. Organic fertilizer replacement value is conservative at ₹5.50/kg dry equivalent.
                </p>
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900">
                <strong>Engineering Disclaimer:</strong> Sizing values represent expected operational benchmarks. Actual gas yield can fluctuate seasonally depending on ambient temperature, retention time (typically 45-55 days), and slurry dilution consistency.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FeasibilityCalculator;
