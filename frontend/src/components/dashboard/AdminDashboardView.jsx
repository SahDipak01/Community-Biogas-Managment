import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import StatCard from '../common/StatCard';
import ProductionChart from '../charts/ProductionChart';
import FeedstockChart from '../charts/FeedstockChart';
import FinancialLedgerModal from '../modals/FinancialLedgerModal';
import PlantBreakdownModal from '../modals/PlantBreakdownModal';
import EmergencyAlertModal from '../modals/EmergencyAlertModal';
import {
  ShieldCheck,
  Building2,
  Users,
  Flame,
  Factory,
  Recycle,
  IndianRupee,
  Leaf,
  AlertTriangle,
  ArrowRight,
  Calculator,
  PlusCircle,
  Activity,
  Layers,
  MapPin,
  TrendingUp,
  Route,
  Award,
  Sprout,
  Cpu,
  Landmark,
  FileText,
  Clock,
  CheckCircle2
} from 'lucide-react';

const AdminDashboardView = ({ data, selectedVillage, onSelectVillage, onRefresh }) => {
  const { metrics, charts, recentAlerts, villages, adminData } = data || {};
  const userCounts = adminData?.userCounts || { total: 0, admins: 0, coordinators: 0, households: 0 };

  const [showLedger, setShowLedger] = useState(false);
  const [showBreakdowns, setShowBreakdowns] = useState(false);
  const [showEmergency, setShowEmergency] = useState(false);

  return (
    <div className="space-y-6">
      {/* Admin Governance Banner */}
      <div className="bg-gradient-to-r from-emerald-900 via-emerald-800 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-emerald-950/20 flex flex-col md:flex-row md:items-center justify-between gap-6 border border-emerald-700/30">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-200 text-xs font-semibold mb-3">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>National & State Bioenergy Governance Portal</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            System Administrator Command Center
          </h2>
          <p className="text-emerald-100/80 text-xs sm:text-sm mt-1.5 max-w-2xl leading-relaxed">
            Centralized monitoring of state rural energy infrastructure, multi-village feedstock pooling, subsidy allocation policies, and user authorization security.
          </p>
        </div>

        {/* Global Filter & Quick Actions */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="bg-white/10 backdrop-blur-md border border-white/20 p-2.5 rounded-2xl flex items-center gap-2 shadow-inner">
            <MapPin className="w-4 h-4 text-emerald-300 flex-shrink-0" />
            <select
              value={selectedVillage}
              onChange={(e) => onSelectVillage(e.target.value)}
              className="bg-transparent text-white text-xs font-medium focus:outline-none cursor-pointer pr-4"
            >
              <option value="all" className="text-slate-800">
                All Gram Panchayats (National View)
              </option>
              {villages?.map((v) => (
                <option key={v._id} value={v._id} className="text-slate-800">
                  {v.name} ({v.district})
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => setShowLedger(true)}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-bold transition-colors"
          >
            <IndianRupee className="w-3.5 h-3.5 text-emerald-300" />
            <span>Audit Ledger</span>
          </button>

          <button
            onClick={() => setShowBreakdowns(true)}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-2xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-amber-200 text-xs font-bold transition-colors"
          >
            <Activity className="w-3.5 h-3.5 text-amber-300" />
            <span>Plant Defect Log</span>
          </button>

          <Link
            to="/villages"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-bold shadow-md transition-colors"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Add Village</span>
          </Link>
        </div>
      </div>

      {/* High-Level State Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Gram Panchayats"
          value={adminData?.villageComparison?.length || villages?.length || 0}
          unit="Villages"
          subtitle="Registered cluster zones"
          icon={Building2}
          color="emerald"
        />

        <StatCard
          title="Total Platform Users"
          value={userCounts.total}
          unit="Accounts"
          subtitle={`${userCounts.coordinators} Coordinators • ${userCounts.households} Households`}
          icon={Users}
          color="indigo"
        />

        <StatCard
          title="Daily Biogas Production"
          value={metrics?.totalEstimatedBiogasM3 || 0}
          unit="m³/day"
          subtitle={`${metrics?.activePlants || 0} of ${metrics?.totalPlants || 0} plants active`}
          icon={Flame}
          color="amber"
          trend={{ positive: true, text: '92% Capacity' }}
        />

        <StatCard
          title="Monthly Rural Savings"
          value={`₹${(metrics?.estimatedMonthlySavingsINR || 0).toLocaleString()}`}
          subtitle={`~${metrics?.monthlyLpgCylinders || 0} LPG cylinders replaced`}
          icon={IndianRupee}
          color="emerald"
        />
      </div>

      {/* User Governance & Security Role Strip */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Access Control & Role Breakdown</h4>
            <p className="text-xs text-slate-500">Live active credential distribution across security hierarchy</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs">
          <span className="px-3 py-1.5 rounded-xl bg-purple-50 border border-purple-100 text-purple-700 font-semibold flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-purple-500"></span>
            System Admins: <strong>{userCounts.admins}</strong>
          </span>
          <span className="px-3 py-1.5 rounded-xl bg-sky-50 border border-sky-100 text-sky-700 font-semibold flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-sky-500"></span>
            Village Coordinators: <strong>{userCounts.coordinators}</strong>
          </span>
          <span className="px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-700 font-semibold flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            Farming Households: <strong>{userCounts.households}</strong>
          </span>
          <Link
            to="/users"
            className="px-3 py-1.5 rounded-xl bg-slate-900 text-white font-semibold hover:bg-slate-800 transition-colors flex items-center gap-1"
          >
            <span>Manage Users</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Multi-Village Comparative Table */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">Gram Panchayat Infrastructure Comparison</h3>
            <p className="text-xs text-slate-500">Cross-village feedstock aggregation, cattle stock, and plant capacity</p>
          </div>
          <Link
            to="/villages"
            className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
          >
            <span>View All Villages Directory</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] border-b border-slate-100">
              <tr>
                <th className="py-3 px-4 rounded-l-xl">Gram Panchayat</th>
                <th className="py-3 px-4">District / State</th>
                <th className="py-3 px-4 text-center">Households</th>
                <th className="py-3 px-4 text-center">Cattle Stock</th>
                <th className="py-3 px-4 text-center">Daily Dung (kg/d)</th>
                <th className="py-3 px-4 text-center">Biogas Plants</th>
                <th className="py-3 px-4 text-right rounded-r-xl">Waste Logged (kg)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {adminData?.villageComparison?.map((v) => (
                <tr key={v.villageId} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3.5 px-4 font-bold text-slate-800 flex items-center gap-2">
                    <Building2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{v.name}</span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-600">
                    {v.district}, {v.state}
                  </td>
                  <td className="py-3.5 px-4 text-center font-medium text-slate-700">
                    {v.householdsCount}
                  </td>
                  <td className="py-3.5 px-4 text-center font-medium text-slate-700">
                    {v.cattleCount} Head
                  </td>
                  <td className="py-3.5 px-4 text-center font-semibold text-emerald-700">
                    {v.dailyDungEstKg.toLocaleString()}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold text-[11px]">
                      {v.activePlantsCount} / {v.totalPlantsCount} Active ({v.plantCapacityM3} m³)
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right font-bold text-slate-900">
                    {v.totalWasteRecordedKg.toLocaleString()} kg
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">7-Day Biogas Production vs Target</h3>
              <p className="text-xs text-slate-500">Continuous anaerobic yield across all monitored facilities (m³)</p>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg font-medium">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Steady Output</span>
            </div>
          </div>
          <ProductionChart data={charts?.past7DaysProduction} />
        </div>

        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">Feedstock Waste Composition</h3>
            <p className="text-xs text-slate-500 mb-2">Aggregated multi-village feedstock balance</p>
          </div>
          <FeedstockChart data={charts?.wasteDistribution} />
          <div className="mt-2 text-center text-[11px] text-slate-400">
            Co-digestion ratio optimal for sustained methanogenesis
          </div>
        </div>
      </div>

      {/* Operational Status & Active Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Plant Status Breakdown */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
          <h3 className="text-base font-bold text-slate-900 mb-1">State Digester Status</h3>
          <p className="text-xs text-slate-500 mb-4">Functional health across registered plants</p>

          <div className="space-y-3.5">
            <div className="flex items-center justify-between p-3 rounded-2xl bg-emerald-50/60 border border-emerald-100">
              <div className="flex items-center gap-2.5">
                <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                <span className="text-xs font-semibold text-slate-800">Active Operational</span>
              </div>
              <span className="text-sm font-bold text-emerald-700">{metrics?.activePlants || 0} Units</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-2xl bg-amber-50/60 border border-amber-100">
              <div className="flex items-center gap-2.5">
                <span className="w-3 h-3 rounded-full bg-amber-500"></span>
                <span className="text-xs font-semibold text-slate-800">Under Maintenance</span>
              </div>
              <span className="text-sm font-bold text-amber-700">
                {(metrics?.totalPlants || 0) - (metrics?.activePlants || 0)} Units
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-2xl bg-sky-50/60 border border-sky-100">
              <div className="flex items-center gap-2.5">
                <span className="w-3 h-3 rounded-full bg-sky-500"></span>
                <span className="text-xs font-semibold text-slate-800">Community Digesters</span>
              </div>
              <span className="text-sm font-bold text-sky-700">{metrics?.communityPlants || 0} Units</span>
            </div>
          </div>

          <Link
            to="/monitoring"
            className="mt-6 w-full py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center justify-center gap-1.5 transition-colors"
          >
            <span>Inspect All Plant Telemetry</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Live System Alerts */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Biochemical Anomaly Notifications</h3>
              <p className="text-xs text-slate-500">Alarms flagged by real-time plant kinetics monitoring</p>
            </div>
            <Link to="/monitoring" className="text-xs text-emerald-600 hover:underline font-semibold">
              View All Alerts
            </Link>
          </div>

          <div className="space-y-3">
            {!recentAlerts || recentAlerts.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl border border-slate-100">
                All digesters currently operating within normal mesophilic parameters (Temperature 28-35°C, pH 6.8-7.5).
              </div>
            ) : (
              recentAlerts.map((alert) => (
                <div
                  key={alert._id}
                  className="p-3.5 rounded-2xl border border-slate-200/70 bg-slate-50/60 flex items-start justify-between gap-3"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-xl bg-amber-100 text-amber-700 mt-0.5">
                      <AlertTriangle className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 leading-snug">{alert.title}</h4>
                      <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">{alert.message}</p>
                      <span className="text-[10px] text-slate-400 mt-1 block">
                        {new Date(alert.createdAt).toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 whitespace-nowrap">
                    Active
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Admin Quick Action Hub */}
      <div className="bg-slate-100/70 rounded-3xl p-6 border border-slate-200">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">
          Administrative Governance Console
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          <Link
            to="/villages"
            className="p-4 rounded-2xl bg-white border border-slate-200/80 hover:border-emerald-300 hover:shadow-md transition-all flex flex-col items-center text-center group"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <Building2 className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-800">Villages Registry</span>
            <span className="text-[10px] text-slate-500 mt-0.5">Onboard Panchayats</span>
          </Link>

          <Link
            to="/users"
            className="p-4 rounded-2xl bg-white border border-slate-200/80 hover:border-emerald-300 hover:shadow-md transition-all flex flex-col items-center text-center group"
          >
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-800">User Access Control</span>
            <span className="text-[10px] text-slate-500 mt-0.5">Roles & permissions</span>
          </Link>

          <Link
            to="/schemes"
            className="p-4 rounded-2xl bg-white border border-slate-200/80 hover:border-emerald-300 hover:shadow-md transition-all flex flex-col items-center text-center group"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <Landmark className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-800">Government Schemes</span>
            <span className="text-[10px] text-slate-500 mt-0.5">Subsidy management</span>
          </Link>

          <Link
            to="/reports"
            className="p-4 rounded-2xl bg-white border border-slate-200/80 hover:border-emerald-300 hover:shadow-md transition-all flex flex-col items-center text-center group"
          >
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <FileText className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-800">Reports & Backups</span>
            <span className="text-[10px] text-slate-500 mt-0.5">DB backup vault</span>
          </Link>

          <Link
            to="/optimizer"
            className="p-4 rounded-2xl bg-white border border-slate-200/80 hover:border-emerald-300 hover:shadow-md transition-all flex flex-col items-center text-center group"
          >
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <Route className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-800">Route Optimizer</span>
            <span className="text-[10px] text-slate-500 mt-0.5">Logistics & siting</span>
          </Link>

          <Link
            to="/simulator"
            className="p-4 rounded-2xl bg-white border border-slate-200/80 hover:border-emerald-300 hover:shadow-md transition-all flex flex-col items-center text-center group"
          >
            <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <Cpu className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-800">Digital Twin</span>
            <span className="text-[10px] text-slate-500 mt-0.5">What-if simulations</span>
          </Link>
        </div>
      </div>
      {/* Admin Operations Modals */}
      <FinancialLedgerModal
        isOpen={showLedger}
        onClose={() => setShowLedger(false)}
      />

      <PlantBreakdownModal
        isOpen={showBreakdowns}
        onClose={() => setShowBreakdowns(false)}
        onBreakdownReported={() => {
          if (onRefresh) onRefresh();
        }}
      />

      <EmergencyAlertModal
        isOpen={showEmergency}
        onClose={() => setShowEmergency(false)}
      />
    </div>
  );
};

export default AdminDashboardView;
