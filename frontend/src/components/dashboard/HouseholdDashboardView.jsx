import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import StatCard from '../common/StatCard';
import api from '../../services/api';
import { useNotification } from '../../context/NotificationContext';
import {
  Home,
  Beef,
  Flame,
  Droplets,
  Recycle,
  IndianRupee,
  Award,
  CheckCircle2,
  Clock,
  PlusCircle,
  Calculator,
  ArrowRight,
  TrendingUp,
  Landmark,
  X,
  Save,
  MapPin,
  Sparkles
} from 'lucide-react';

const HouseholdDashboardView = ({ data, onRefresh }) => {
  const { householdData } = data || {};
  const { addToast } = useNotification();

  const [modalOpen, setModalOpen] = useState(false);
  const [dungKg, setDungKg] = useState(20);
  const [kitchenWasteKg, setKitchenWasteKg] = useState(2);
  const [submitting, setSubmitting] = useState(false);

  const household = householdData?.household;
  const cattleSummary = householdData?.cattleSummary || { totalHead: 0, dailyDungKg: 0, breakdown: [] };
  const entitlements = householdData?.entitlements || {
    dailySlurryLiters: 0,
    monthlySlurryLiters: 0,
    monthlySlurryValueINR: 0,
    monthlyLpgEquivalentCylinders: 0,
    monthlyLpgSavingsINR: 0,
    totalSavingsINR: 0,
    incentivePoints: 0
  };
  const recentContributions = householdData?.recentContributions || [];
  const communityPlant = householdData?.communityPlant;
  const eligibleSchemes = householdData?.eligibleSchemes || [];

  const handleSelfLog = async (e) => {
    e.preventDefault();
    if (!household?._id) {
      addToast('No household profile linked', 'error');
      return;
    }

    try {
      setSubmitting(true);
      const res = await api.post('/feedstock', {
        villageId: household.village?._id,
        householdId: household._id,
        dungKg: Number(dungKg),
        agriWasteKg: 0,
        kitchenWasteKg: Number(kitchenWasteKg),
        status: 'Recorded',
        season: 'Summer'
      });

      if (res.data.success) {
        addToast('Today’s contribution successfully recorded!', 'success');
        setModalOpen(false);
        if (onRefresh) onRefresh();
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to submit contribution', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Household Greeting Banner */}
      <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-emerald-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-emerald-950/20 flex flex-col md:flex-row md:items-center justify-between gap-6 border border-emerald-700/30">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-200 text-xs font-semibold mb-3">
            <Home className="w-4 h-4 text-emerald-400" />
            <span>Family Bioenergy Hub • {household?.householdCode || 'HH-001'}</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Namaste, {household?.headOfFamily || 'Household Member'}!
          </h2>
          <p className="text-emerald-100/80 text-xs sm:text-sm mt-1.5 max-w-xl leading-relaxed">
            Welcome to your family clean energy portal in {household?.village?.name || 'your Gram Panchayat'}. Track your cattle dung yield, monthly fuel savings, and organic bio-slurry fertilizer entitlements.
          </p>
        </div>

        {/* Quick Action Button */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <button
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-white hover:bg-emerald-50 text-emerald-900 text-xs font-extrabold shadow-lg transition-transform active:scale-95"
          >
            <PlusCircle className="w-4 h-4 text-emerald-600" />
            <span>Self-Log Today's Waste</span>
          </button>
        </div>
      </div>

      {/* Household Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="My Livestock Herd"
          value={cattleSummary.totalHead}
          unit="Head"
          subtitle={`${cattleSummary.dailyDungKg} kg estimated daily dung`}
          icon={Beef}
          color="amber"
        />

        <StatCard
          title="Monthly Fuel Savings"
          value={`₹${entitlements.monthlyLpgSavingsINR.toLocaleString()}`}
          unit="/ mo"
          subtitle={`~${entitlements.monthlyLpgEquivalentCylinders} LPG Cylinders Replaced`}
          icon={IndianRupee}
          color="emerald"
          trend={{ positive: true, text: 'Clean Energy' }}
        />

        <StatCard
          title="Organic Slurry Return"
          value={entitlements.dailySlurryLiters}
          unit="L/day"
          subtitle={`₹${entitlements.monthlySlurryValueINR.toLocaleString()} fertilizer value/mo`}
          icon={Droplets}
          color="indigo"
        />

        <StatCard
          title="Incentive Credit Score"
          value={entitlements.incentivePoints}
          unit="Pts"
          subtitle="Earned from verified clean pooling"
          icon={Award}
          color="purple"
        />
      </div>

      {/* Livestock Breakdown & Slurry Entitlement */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Livestock Cards */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">My Registered Cattle & Dung Potential</h3>
              <p className="text-xs text-slate-500">Animals registered to your household and daily organic feedstock yield</p>
            </div>
            <Link
              to="/my-household"
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
            >
              <span>Manage Cattle</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {cattleSummary.breakdown.length === 0 ? (
              <div className="col-span-4 p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl">
                No cattle registered yet. <Link to="/my-household" className="text-emerald-600 font-semibold underline">Add your cattle here</Link> to calculate your biogas potential.
              </div>
            ) : (
              cattleSummary.breakdown.map((item, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/60 flex flex-col items-center text-center"
                >
                  <div className="w-10 h-10 rounded-xl bg-amber-100/70 text-amber-700 flex items-center justify-center mb-2 font-bold text-sm">
                    {item.count}
                  </div>
                  <span className="text-xs font-bold text-slate-800">{item.type}</span>
                  <span className="text-[11px] font-semibold text-emerald-600 mt-0.5">
                    ~{item.dailyDungKg} kg/d dung
                  </span>
                  <span className="text-[10px] text-slate-400 mt-1">{item.housingType || 'Shed'}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Bio-Slurry Fertilizer Value Card */}
        <div className="bg-gradient-to-br from-indigo-900 to-slate-900 rounded-3xl p-6 text-white shadow-sm flex flex-col justify-between">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-500/20 text-indigo-200 text-xs font-semibold mb-3">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>Organic Bio-Slurry Entitlement</span>
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Liquid Fertilizer Rights</h3>
            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              Anaerobic digestion preserves 100% of the nitrogen, phosphorus, and potassium (NPK). Your daily contribution entitles you to:
            </p>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/10">
                <span className="text-slate-300">Daily Slurry Volume:</span>
                <span className="font-bold text-white">{entitlements.dailySlurryLiters} L / day</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/10">
                <span className="text-slate-300">Monthly Allocation:</span>
                <span className="font-bold text-white">~{entitlements.monthlySlurryLiters} L / month</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-400/30">
                <span className="text-emerald-200">Manure Cost Savings:</span>
                <span className="font-extrabold text-emerald-300">₹{entitlements.monthlySlurryValueINR} / mo</span>
              </div>
            </div>
          </div>

          <Link
            to="/digestate"
            className="mt-6 w-full py-2.5 rounded-xl bg-white text-indigo-950 font-bold text-xs flex items-center justify-center gap-1 hover:bg-slate-100 transition-colors"
          >
            <span>Fertilizer Distribution Planner</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Recent Contribution History Table */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">My Recent Waste Contributions</h3>
            <p className="text-xs text-slate-500">Batches handed over to the community digester</p>
          </div>
          <Link
            to="/feedstock"
            className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
          >
            <span>View Full Contribution History</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] border-b border-slate-100">
              <tr>
                <th className="py-3 px-4 rounded-l-xl">Collection Date</th>
                <th className="py-3 px-4 text-center">Bovine Dung</th>
                <th className="py-3 px-4 text-center">Kitchen Scrap</th>
                <th className="py-3 px-4 text-center">Total Handed Over</th>
                <th className="py-3 px-4 text-center">Collector</th>
                <th className="py-3 px-4 text-right rounded-r-xl">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentContributions.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-6 text-center text-slate-400">
                    No contributions recorded yet. Use the "Self-Log Today's Waste" button above to log your first batch!
                  </td>
                </tr>
              ) : (
                recentContributions.map((rec) => (
                  <tr key={rec._id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-medium text-slate-800">
                      {new Date(rec.collectionDate).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4 text-center font-semibold text-emerald-700">
                      {rec.dungKg} kg
                    </td>
                    <td className="py-3.5 px-4 text-center text-slate-600">
                      {rec.kitchenWasteKg || 0} kg
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-slate-900">
                      {rec.totalKg} kg
                    </td>
                    <td className="py-3.5 px-4 text-center text-slate-500">
                      {rec.collectorName || 'Village SHG'}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        {rec.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Eligible Government Subsidies */}
      <div className="bg-slate-100/70 rounded-3xl p-6 border border-slate-200">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Government Schemes Recommended For Your Family
            </h3>
            <p className="text-xs text-slate-600">Central and state subsidies applicable based on your cattle count</p>
          </div>
          <Link
            to="/schemes"
            className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
          >
            <span>All Schemes</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {eligibleSchemes.map((scheme) => (
            <div
              key={scheme._id}
              className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex flex-col justify-between"
            >
              <div>
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-emerald-50 text-emerald-700">
                  {scheme.category}
                </span>
                <h4 className="font-bold text-sm text-slate-900 mt-2">{scheme.schemeName}</h4>
                <p className="text-xs text-slate-500 mt-1 line-clamp-2">{scheme.description}</p>
                <div className="mt-3 text-xs font-semibold text-emerald-700">
                  Subsidy: ₹{scheme.subsidyAmountINR?.toLocaleString() || '16,500'}
                </div>
              </div>

              <Link
                to="/calculator"
                className="mt-4 w-full py-2 rounded-xl border border-emerald-200 text-xs font-bold text-emerald-700 text-center hover:bg-emerald-50 transition-colors"
              >
                Apply Subsidy in Calculator
              </Link>
            </div>
          ))}
        </div>
      </div>

      {/* Self-Log Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <PlusCircle className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-base text-slate-900">Self-Log Today's Waste</h3>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSelfLog} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Bovine Dung Available Today (kg)
                </label>
                <input
                  type="number"
                  min="1"
                  step="0.5"
                  value={dungKg}
                  onChange={(e) => setDungKg(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Based on your {cattleSummary.totalHead} cattle (typical: ~{cattleSummary.dailyDungKg} kg)
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Domestic Kitchen Scrap (kg)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={kitchenWasteKg}
                  onChange={(e) => setKitchenWasteKg(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 flex items-center justify-between text-xs">
                <span className="text-emerald-800 font-medium">Total Daily Feedstock:</span>
                <span className="font-extrabold text-emerald-900">
                  {Number(dungKg) + Number(kitchenWasteKg)} kg
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>{submitting ? 'Submitting...' : 'Confirm Handover'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default HouseholdDashboardView;
