import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import StatCard from '../components/common/StatCard';
import StatusBadge from '../components/common/StatusBadge';
import ProductionChart from '../components/charts/ProductionChart';
import FeedstockChart from '../components/charts/FeedstockChart';
import {
  Users,
  Beef,
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
  Cpu
} from 'lucide-react';

const Dashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [selectedVillage, setSelectedVillage] = useState('all');

  const fetchDashboardData = async (villageId) => {
    try {
      setLoading(true);
      const url = villageId && villageId !== 'all' ? `/dashboard/summary?villageId=${villageId}` : '/dashboard/summary';
      const res = await api.get(url);
      if (res.data.success) {
        setData(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData(selectedVillage);
  }, [selectedVillage]);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-600 rounded-full animate-spin" />
          <p className="text-xs font-medium text-slate-500">Loading live village metrics...</p>
        </div>
      </div>
    );
  }

  const { metrics, charts, recentAlerts, villages } = data || {};

  return (
    <div className="space-y-6">
      {/* Top Banner & Village Filter */}
      <div className="bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 rounded-3xl p-6 sm:p-8 text-white shadow-lg shadow-emerald-900/10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-100 text-xs font-semibold mb-3">
            <Leaf className="w-3.5 h-3.5 text-emerald-300" />
            Rural Clean Energy & Bio-Economy Platform
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Biogas Resource & Feasibility Dashboard
          </h2>
          <p className="text-emerald-100/80 text-xs sm:text-sm mt-1.5 max-w-xl leading-relaxed">
            Real-time tracking of community bovine dung, agricultural waste collection, digester production metrics, and financial savings.
          </p>
        </div>

        {/* Village Selection Dropdown */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="bg-white/10 backdrop-blur border border-white/20 p-2.5 rounded-2xl flex items-center gap-2">
            <MapPin className="w-4 h-4 text-emerald-300 flex-shrink-0" />
            <select
              value={selectedVillage}
              onChange={(e) => setSelectedVillage(e.target.value)}
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

          <Link
            to="/calculator"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-white text-emerald-800 text-xs font-bold shadow-md hover:bg-emerald-50 transition-colors"
          >
            <Calculator className="w-4 h-4 text-emerald-600" />
            <span>Feasibility Tool</span>
          </Link>
        </div>
      </div>

      {/* Main Stat Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Registered Households"
          value={metrics?.totalHouseholds || 0}
          unit="Families"
          subtitle="In participating villages"
          icon={Users}
          color="emerald"
        />

        <StatCard
          title="Available Bovine Cattle"
          value={metrics?.totalCattle || 0}
          unit="Head"
          subtitle="Cows, Buffaloes & Bullocks"
          icon={Beef}
          color="amber"
        />

        <StatCard
          title="Daily Dung Availability"
          value={metrics?.estimatedDailyDungKg || 0}
          unit="kg/day"
          subtitle="Theoretical organic feedstock"
          icon={Recycle}
          color="indigo"
        />

        <StatCard
          title="Daily Biogas Production"
          value={metrics?.totalEstimatedBiogasM3 || 0}
          unit="m³/day"
          subtitle={`${metrics?.activePlants || 0} Active Digesters`}
          icon={Flame}
          color="emerald"
          trend={{ positive: true, text: '92% Capacity' }}
        />
      </div>

      {/* Second Row Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Registered Biogas Plants"
          value={metrics?.totalPlants || 0}
          unit="Units"
          subtitle={`${metrics?.communityPlants || 0} Community Hubs`}
          icon={Factory}
          color="purple"
        />

        <StatCard
          title="Daily Waste Collected"
          value={metrics?.avgDailyWasteCollectedKg || 0}
          unit="kg/day"
          subtitle="Dung, crop & kitchen scrap"
          icon={Layers}
          color="sky"
        />

        <StatCard
          title="Monthly Economic Savings"
          value={`₹${(metrics?.estimatedMonthlySavingsINR || 0).toLocaleString()}`}
          subtitle={`~${metrics?.monthlyLpgCylinders || 0} LPG cylinders replaced`}
          icon={IndianRupee}
          color="emerald"
        />

        <StatCard
          title="Annual CO2 Avoided"
          value={metrics?.annualCo2ReductionTons || 0}
          unit="Tons/yr"
          subtitle="Carbon offset footprint"
          icon={Leaf}
          color="emerald"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Production Trends Area Chart */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">7-Day Biogas Production vs Target</h3>
              <p className="text-xs text-slate-500">Continuous anaerobic yield in cubic meters (m³)</p>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg font-medium">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Steady Output</span>
            </div>
          </div>
          <ProductionChart data={charts?.past7DaysProduction} />
        </div>

        {/* Feedstock Waste Composition Donut Chart */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">Feedstock Composition</h3>
            <p className="text-xs text-slate-500 mb-2">Aggregated 30-day waste breakdown</p>
          </div>
          <FeedstockChart data={charts?.wasteDistribution} />
          <div className="mt-2 text-center text-[11px] text-slate-400">
            Optimal C:N ratio achieved through mixed co-digestion
          </div>
        </div>
      </div>

      {/* Operational Status & Active Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Plant Status Breakdown */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
          <h3 className="text-base font-bold text-slate-900 mb-1">Plant Operating Status</h3>
          <p className="text-xs text-slate-500 mb-4">Functional state across registered digesters</p>

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

        {/* Live System Alerts & Warnings */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Recent Plant Health Alerts</h3>
              <p className="text-xs text-slate-500">Biochemical threshold anomalies flagged by monitoring engine</p>
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

      {/* Quick Action Hub */}
      <div className="bg-slate-100/70 rounded-3xl p-6 border border-slate-200">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">
          Quick Operational Actions
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Link
            to="/calculator"
            className="p-4 rounded-2xl bg-white border border-slate-200/80 hover:border-emerald-300 hover:shadow-md transition-all flex flex-col items-center text-center group"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <Calculator className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-800">Feasibility Sizing</span>
            <span className="text-[10px] text-slate-500 mt-0.5">Assess plant viability</span>
          </Link>

          <Link
            to="/feedstock"
            className="p-4 rounded-2xl bg-white border border-slate-200/80 hover:border-emerald-300 hover:shadow-md transition-all flex flex-col items-center text-center group"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <Recycle className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-800">Log Daily Feedstock</span>
            <span className="text-[10px] text-slate-500 mt-0.5">Record waste batches</span>
          </Link>

          <Link
            to="/community"
            className="p-4 rounded-2xl bg-white border border-slate-200/80 hover:border-emerald-300 hover:shadow-md transition-all flex flex-col items-center text-center group"
          >
            <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <Users className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-800">Community Pooling</span>
            <span className="text-[10px] text-slate-500 mt-0.5">Cluster agreements</span>
          </Link>

          <Link
            to="/map"
            className="p-4 rounded-2xl bg-white border border-slate-200/80 hover:border-emerald-300 hover:shadow-md transition-all flex flex-col items-center text-center group"
          >
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <MapPin className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-800">Geographical GIS</span>
            <span className="text-[10px] text-slate-500 mt-0.5">Interactive map layer</span>
          </Link>

          <Link
            to="/optimizer"
            className="p-4 rounded-2xl bg-white border border-slate-200/80 hover:border-emerald-300 hover:shadow-md transition-all flex flex-col items-center text-center group"
          >
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <Route className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-800">Route Optimizer</span>
            <span className="text-[10px] text-slate-500 mt-0.5">Plant siting & logistics</span>
          </Link>

          <Link
            to="/incentives"
            className="p-4 rounded-2xl bg-white border border-slate-200/80 hover:border-emerald-300 hover:shadow-md transition-all flex flex-col items-center text-center group"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <Award className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-800">Incentive Platform</span>
            <span className="text-[10px] text-slate-500 mt-0.5">Rankings & rewards</span>
          </Link>

          <Link
            to="/digestate"
            className="p-4 rounded-2xl bg-white border border-slate-200/80 hover:border-emerald-300 hover:shadow-md transition-all flex flex-col items-center text-center group"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <Sprout className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-800">Digestate Planner</span>
            <span className="text-[10px] text-slate-500 mt-0.5">Bio-slurry to farmland</span>
          </Link>

          <Link
            to="/simulator"
            className="p-4 rounded-2xl bg-white border border-slate-200/80 hover:border-emerald-300 hover:shadow-md transition-all flex flex-col items-center text-center group"
          >
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <Cpu className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-800">Digital Twin</span>
            <span className="text-[10px] text-slate-500 mt-0.5">What-If scenarios</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
