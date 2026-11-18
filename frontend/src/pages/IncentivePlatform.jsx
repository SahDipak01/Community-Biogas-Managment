import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import Modal from '../components/common/Modal';
import {
  Award,
  Plus,
  Download,
  Printer,
  TrendingUp,
  IndianRupee,
  Droplets,
  Calendar,
  Trophy,
  CheckCircle2,
  Layers
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
  Legend
} from 'recharts';

const IncentivePlatform = () => {
  const { user } = useAuth();
  const { addToast } = useNotification();

  const [villages, setVillages] = useState([]);
  const [households, setHouseholds] = useState([]);
  const [selectedVillage, setSelectedVillage] = useState('all');
  const [period, setPeriod] = useState('monthly'); // daily | weekly | monthly
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [showLogModal, setShowLogModal] = useState(false);
  const [logForm, setLogForm] = useState({
    householdId: '',
    contributionDate: new Date().toISOString().split('T')[0],
    dungKg: 35,
    agriWasteKg: 6,
    kitchenWasteKg: 2.5,
    notes: ''
  });

  useEffect(() => {
    const loadMeta = async () => {
      try {
        const [vRes, hRes] = await Promise.all([api.get('/villages'), api.get('/households')]);
        if (vRes.data.success) setVillages(vRes.data.data);
        if (hRes.data.success) {
          setHouseholds(hRes.data.data);
          if (hRes.data.data.length > 0) {
            setLogForm((prev) => ({ ...prev, householdId: hRes.data.data[0]._id }));
          }
        }
      } catch (err) {
        console.warn('Metadata fetch warning:', err.message);
      }
    };
    loadMeta();
  }, []);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ villageId: selectedVillage, period });
      const res = await api.get(`/incentives/dashboard?${params.toString()}`);
      if (res.data.success) {
        setData(res.data.data);
      }
    } catch (err) {
      console.error('Error loading incentive dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, [selectedVillage, period]);

  const handleLogContribution = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/incentives/log', logForm);
      if (res.data.success) {
        addToast(
          `Contribution logged! Earned ${res.data.data.incentivePointsEarned} pts (₹${res.data.data.incentiveValueINR})`,
          'success'
        );
        setShowLogModal(false);
        fetchDashboard();
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Error logging contribution', 'error');
    }
  };

  const handleExportCsv = async () => {
    try {
      const res = await api.get(`/incentives/report-csv?villageId=${selectedVillage}`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `community_contribution_report_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      addToast('Contribution report CSV downloaded!', 'success');
    } catch (err) {
      addToast('Failed to download CSV report', 'error');
    }
  };

  const getTierBadge = (tier, color) => {
    const styles = {
      emerald: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      amber: 'bg-amber-100 text-amber-800 border-amber-300',
      sky: 'bg-sky-100 text-sky-800 border-sky-300',
      slate: 'bg-slate-100 text-slate-700 border-slate-300'
    };
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${styles[color] || styles.slate}`}>
        <Trophy className="w-3 h-3" />
        {tier}
      </span>
    );
  };

  const summary = data?.summary;
  const rankings = data?.rankings || [];
  const dailyTrend = data?.dailyTrend || [];
  const weeklySummary = data?.weeklySummary || [];
  const recentLogs = data?.recentLogs || [];
  const rules = data?.incentiveRules;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4 print:shadow-none">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold mb-2 border border-emerald-200">
            <Award className="w-3.5 h-3.5" />
            Household Waste Ledger & Reward Engine
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
            Community Contribution & Incentive Platform
          </h2>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            Tracks daily, weekly, and monthly household biomass deliveries, calculates tiered monetary and bio-slurry incentives, and ranks community contributors.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 print:hidden">
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
            onClick={handleExportCsv}
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
            onClick={() => setShowLogModal(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20"
          >
            <Plus className="w-4 h-4" />
            <span>Log Daily Waste</span>
          </button>
        </div>
      </div>

      {/* Daily / Weekly / Monthly Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Daily Contribution (Latest)
          </span>
          <div className="text-2xl font-black text-slate-900 mt-1">
            {(summary?.dailyTotalKg || 0).toLocaleString()}{' '}
            <span className="text-xs font-normal text-slate-500">kg/day</span>
          </div>
          <span className="text-[11px] text-emerald-600 mt-1 block">
            Across {summary?.activeContributorsCount || 0} active households
          </span>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Weekly Contribution (7d)
          </span>
          <div className="text-2xl font-black text-sky-700 mt-1">
            {(summary?.weeklyTotalKg || 0).toLocaleString()}{' '}
            <span className="text-xs font-normal text-slate-500">kg</span>
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">Verified 7-day rolling intake</span>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Monthly Contribution (30d)
          </span>
          <div className="text-2xl font-black text-emerald-700 mt-1">
            {(summary?.monthlyTotalKg || 0).toLocaleString()}{' '}
            <span className="text-xs font-normal text-slate-500">kg</span>
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            {(summary?.totalSlurryCreditsLiters || 0).toLocaleString()} L slurry dividends
          </span>
        </div>

        <div className="p-5 rounded-3xl bg-gradient-to-tr from-emerald-800 to-teal-700 text-white shadow-md">
          <span className="text-[11px] font-medium text-emerald-100 uppercase tracking-wider block">
            Total Monthly Incentives
          </span>
          <div className="text-2xl font-black mt-1">
            ₹{(summary?.totalIncentiveDisbursedINR || 0).toLocaleString()}
          </div>
          <span className="text-[11px] text-emerald-200 mt-1 block">
            Includes tier multipliers & consistency bonus
          </span>
        </div>
      </div>

      {/* Incentive Formula Banner */}
      {rules && (
        <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 text-xs text-emerald-950">
          <div className="flex items-center gap-2 font-bold">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Transparent Community Incentive Formula:</span>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-[11px]">
            <span>Base Rate: <strong>₹{rules.inrPerKgBase}/kg</strong></span>
            <span>Slurry Return: <strong>{rules.slurryLitersPerKg} L/kg</strong></span>
            <span>Monthly Consistency Bonus (≥20 days): <strong>+₹{rules.monthlyConsistencyBonusINR}</strong></span>
            <span>Platinum Tier (≥1,200 kg/mo): <strong>1.25x Bonus</strong></span>
          </div>
        </div>
      )}

      {/* Charts Row: Daily Trend & Weekly Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900">14-Day Household Waste Contribution Trend</h3>
          <p className="text-xs text-slate-500 mb-4">Daily pooled dung, agricultural residue, and kitchen waste (kg)</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="contribGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#059669" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#059669" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} unit="kg" />
                <Tooltip contentStyle={{ borderRadius: '0.75rem', fontSize: '12px' }} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Area type="monotone" dataKey="dungKg" name="Bovine Dung (kg)" stroke="#059669" fill="url(#contribGrad)" strokeWidth={2} />
                <Area type="monotone" dataKey="agriWasteKg" name="Agri Waste (kg)" stroke="#f59e0b" fill="transparent" strokeWidth={2} />
                <Area type="monotone" dataKey="kitchenWasteKg" name="Kitchen Waste (kg)" stroke="#3b82f6" fill="transparent" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900">Weekly Rollup Comparison</h3>
          <p className="text-xs text-slate-500 mb-4">4-week community feedstock & incentive payout</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklySummary} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="weekLabel" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: '0.75rem', fontSize: '12px' }} />
                <Bar dataKey="totalKg" name="Total Waste (kg)" fill="#059669" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Household Contribution Rankings Leaderboard */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900">Household Contribution Rankings & Incentives</h3>
            <p className="text-xs text-slate-500">
              Ranked household performance across daily, weekly, and 30-day cycles with incentive payout breakdown
            </p>
          </div>

          <div className="inline-flex rounded-xl bg-slate-100 p-1 text-xs font-semibold print:hidden">
            {['daily', 'weekly', 'monthly'].map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-lg capitalize transition-all ${
                  period === p ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                <th className="p-3.5 pl-6">Rank</th>
                <th className="p-3.5">Household</th>
                <th className="p-3.5">Reward Tier</th>
                <th className="p-3.5 text-right">Weekly (7d)</th>
                <th className="p-3.5 text-right">Monthly (30d)</th>
                <th className="p-3.5 text-center">Active Days</th>
                <th className="p-3.5 text-right">Slurry Credit</th>
                <th className="p-3.5 pr-6 text-right">Total Incentive (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="8" className="p-8 text-center text-slate-400">
                    Calculating household rankings...
                  </td>
                </tr>
              ) : rankings.length === 0 ? (
                <tr>
                  <td colSpan="8" className="p-8 text-center text-slate-400">
                    No contribution logs recorded yet.
                  </td>
                </tr>
              ) : (
                rankings.map((r) => (
                  <tr key={r.householdId} className="hover:bg-slate-50/60 transition-colors">
                    <td className="p-3.5 pl-6">
                      <span
                        className={`inline-flex items-center justify-center w-6 h-6 rounded-full font-black text-[11px] ${
                          r.rank === 1
                            ? 'bg-amber-100 text-amber-800 border border-amber-300'
                            : r.rank === 2
                            ? 'bg-slate-200 text-slate-800'
                            : r.rank === 3
                            ? 'bg-orange-100 text-orange-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        #{r.rank}
                      </span>
                    </td>
                    <td className="p-3.5">
                      <div className="font-bold text-slate-900">{r.headOfFamily}</div>
                      <span className="text-[10px] text-slate-400">
                        {r.householdCode} • {r.villageName}
                      </span>
                    </td>
                    <td className="p-3.5">{getTierBadge(r.tier, r.tierColor)}</td>
                    <td className="p-3.5 text-right font-semibold text-sky-700">{r.weeklyKg} kg</td>
                    <td className="p-3.5 text-right font-bold text-slate-900">{r.monthlyKg} kg</td>
                    <td className="p-3.5 text-center">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold text-[11px]">
                        {r.activeDaysMonthly} / 30d
                      </span>
                    </td>
                    <td className="p-3.5 text-right font-medium text-emerald-700">
                      {r.slurryCreditsLiters.toLocaleString()} L
                    </td>
                    <td className="p-3.5 pr-6 text-right">
                      <div className="font-black text-emerald-800 text-sm">
                        ₹{r.finalMonthlyIncentiveINR.toLocaleString()}
                      </div>
                      {r.consistencyBonusINR > 0 && (
                        <span className="text-[10px] text-emerald-600 block">
                          incl. +₹{r.consistencyBonusINR} bonus
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Daily Contribution Ledger */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-900">Recent Daily Waste Contribution Ledger</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold text-[11px]">
                <th className="p-3 pl-6">Date</th>
                <th className="p-3">Household</th>
                <th className="p-3 text-right">Dung (kg)</th>
                <th className="p-3 text-right">Agri (kg)</th>
                <th className="p-3 text-right">Kitchen (kg)</th>
                <th className="p-3 text-right">Total (kg)</th>
                <th className="p-3 text-right">Points</th>
                <th className="p-3 pr-6 text-right">Base Value (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentLogs.slice(0, 10).map((l) => (
                <tr key={l._id} className="hover:bg-slate-50/50">
                  <td className="p-3 pl-6 font-medium text-slate-700">
                    {new Date(l.contributionDate).toLocaleDateString()}
                  </td>
                  <td className="p-3 font-semibold text-slate-900">
                    {l.household?.headOfFamily || 'Household'}{' '}
                    <span className="text-[10px] text-slate-400">({l.household?.householdCode})</span>
                  </td>
                  <td className="p-3 text-right text-emerald-700">{l.dungKg}</td>
                  <td className="p-3 text-right text-amber-700">{l.agriWasteKg}</td>
                  <td className="p-3 text-right text-sky-700">{l.kitchenWasteKg}</td>
                  <td className="p-3 text-right font-bold text-slate-900">{l.totalKg} kg</td>
                  <td className="p-3 text-right font-semibold text-emerald-700">+{l.incentivePointsEarned}</td>
                  <td className="p-3 pr-6 text-right font-bold text-slate-900">₹{l.incentiveValueINR}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Log Daily Contribution Modal */}
      <Modal
        isOpen={showLogModal}
        onClose={() => setShowLogModal(false)}
        title="Log Daily Household Waste Contribution"
      >
        <form onSubmit={handleLogContribution} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Contributor Household</label>
              <select
                value={logForm.householdId}
                onChange={(e) => setLogForm({ ...logForm, householdId: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200"
                required
              >
                {households.map((h) => (
                  <option key={h._id} value={h._id}>
                    {h.householdCode} - {h.headOfFamily}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Contribution Date</label>
              <input
                type="date"
                value={logForm.contributionDate}
                onChange={(e) => setLogForm({ ...logForm, contributionDate: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Bovine Dung (kg)</label>
              <input
                type="number"
                min="0"
                step="0.5"
                value={logForm.dungKg}
                onChange={(e) => setLogForm({ ...logForm, dungKg: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Agri Waste (kg)</label>
              <input
                type="number"
                min="0"
                step="0.5"
                value={logForm.agriWasteKg}
                onChange={(e) => setLogForm({ ...logForm, agriWasteKg: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Kitchen Waste (kg)</label>
              <input
                type="number"
                min="0"
                step="0.5"
                value={logForm.kitchenWasteKg}
                onChange={(e) => setLogForm({ ...logForm, kitchenWasteKg: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold"
              />
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-emerald-950 font-semibold">
            <span>
              Total: <strong>{(logForm.dungKg + logForm.agriWasteKg + logForm.kitchenWasteKg).toFixed(1)} kg</strong>
            </span>
            <span>
              Est. Base Reward:{' '}
              <strong>₹{((logForm.dungKg + logForm.agriWasteKg + logForm.kitchenWasteKg) * 2).toFixed(0)}</strong> +{' '}
              <strong>{Math.round((logForm.dungKg + logForm.agriWasteKg + logForm.kitchenWasteKg) * 0.85)} L</strong> slurry
            </span>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Collection Notes</label>
            <input
              type="text"
              value={logForm.notes}
              onChange={(e) => setLogForm({ ...logForm, notes: e.target.value })}
              placeholder="Optional verification remarks..."
              className="w-full px-3 py-2 rounded-xl border border-slate-200"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setShowLogModal(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
            >
              Record & Credit Incentives
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default IncentivePlatform;
