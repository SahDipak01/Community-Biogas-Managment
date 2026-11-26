import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import StatCard from '../common/StatCard';
import api from '../../services/api';
import { useNotification } from '../../context/NotificationContext';
import {
  Users,
  Beef,
  Flame,
  Factory,
  Recycle,
  Layers,
  MapPin,
  CheckCircle2,
  Clock,
  PlusCircle,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  Droplets,
  Sprout,
  X,
  Save,
  Home
} from 'lucide-react';

const CoordinatorDashboardView = ({ data, onRefresh }) => {
  const { coordinatorData, metrics, recentAlerts } = data || {};
  const { addToast } = useNotification();

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedHouseholdId, setSelectedHouseholdId] = useState('');
  const [dungKg, setDungKg] = useState(30);
  const [agriWasteKg, setAgriWasteKg] = useState(5);
  const [kitchenWasteKg, setKitchenWasteKg] = useState(2);
  const [submitting, setSubmitting] = useState(false);

  const village = coordinatorData?.village;
  const householdRoster = coordinatorData?.householdRoster || [];
  const todayIntake = coordinatorData?.todayIntake || { dungKg: 0, agriKg: 0, kitchenKg: 0, totalKg: 0 };
  const villagePlants = coordinatorData?.villagePlants || [];

  const handleOpenIntakeModal = (hhId = '') => {
    setSelectedHouseholdId(hhId || (householdRoster[0]?._id || ''));
    setModalOpen(true);
  };

  const handleSubmitIntake = async (e) => {
    e.preventDefault();
    if (!selectedHouseholdId) {
      addToast('Please select a household', 'error');
      return;
    }

    try {
      setSubmitting(true);
      const res = await api.post('/feedstock', {
        villageId: village?._id,
        householdId: selectedHouseholdId,
        dungKg: Number(dungKg),
        agriWasteKg: Number(agriWasteKg),
        kitchenWasteKg: Number(kitchenWasteKg),
        status: 'Fed to Digester',
        season: 'Summer'
      });

      if (res.data.success) {
        addToast('Waste collection successfully logged!', 'success');
        setModalOpen(false);
        if (onRefresh) onRefresh();
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to log collection', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Coordinator Banner */}
      <div className="bg-gradient-to-r from-teal-900 via-emerald-800 to-teal-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-teal-950/20 flex flex-col md:flex-row md:items-center justify-between gap-6 border border-teal-700/30">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/20 border border-teal-400/30 text-teal-200 text-xs font-semibold mb-3">
            <MapPin className="w-4 h-4 text-teal-400" />
            <span>Assigned Operational Zone: {village?.name || 'Gram Panchayat'}</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Village Resource Coordinator Operations
          </h2>
          <p className="text-teal-100/80 text-xs sm:text-sm mt-1.5 max-w-xl leading-relaxed">
            Managing community dung aggregation, household waste collection logs, local digester telemetry, and bio-slurry distribution for {village?.district}, {village?.state}.
          </p>
        </div>

        {/* Quick 1-Click Intake CTA */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <button
            onClick={() => handleOpenIntakeModal()}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-emerald-400 hover:bg-emerald-300 text-teal-950 text-xs font-extrabold shadow-lg transition-transform active:scale-95"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Log Daily Waste Intake</span>
          </button>
        </div>
      </div>

      {/* Field Operations Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Today's Waste Collected"
          value={todayIntake.totalKg}
          unit="kg"
          subtitle={`${todayIntake.dungKg} kg Dung • ${todayIntake.agriKg} kg Crop`}
          icon={Recycle}
          color="emerald"
        />

        <StatCard
          title="Household Compliance"
          value={`${coordinatorData?.householdsCollectedToday || 0} / ${coordinatorData?.householdsTotal || 0}`}
          unit="Families"
          subtitle={`${coordinatorData?.householdsPendingToday || 0} pending intake today`}
          icon={Users}
          color="sky"
        />

        <StatCard
          title="Village Biogas Output"
          value={metrics?.totalEstimatedBiogasM3 || 0}
          unit="m³/day"
          subtitle={`${villagePlants.length} Local Digester Installations`}
          icon={Flame}
          color="amber"
          trend={{ positive: true, text: 'Operational' }}
        />

        <StatCard
          title="Bio-Slurry Generation"
          value={Math.round((todayIntake.dungKg || 1) * 0.95)}
          unit="L/day"
          subtitle="Ready for farmer land application"
          icon={Droplets}
          color="indigo"
        />
      </div>

      {/* Village Digester Kinetic Health Widget */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">Local Village Digesters & Kinetics</h3>
            <p className="text-xs text-slate-500">Real-time biochemical stability indicators in {village?.name}</p>
          </div>
          <Link
            to="/monitoring"
            className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
          >
            <span>Telemetry History</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {villagePlants.map((plant) => (
            <div
              key={plant._id}
              className="p-5 rounded-2xl border border-slate-200/80 bg-slate-50/60 hover:bg-white hover:border-emerald-300 transition-all"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="font-bold text-sm text-slate-900">{plant.plantName}</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  plant.status === 'Active' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                }`}>
                  {plant.status}
                </span>
              </div>
              <div className="text-xs text-slate-500 mb-3">
                {plant.capacityM3} m³ • {plant.plantModel} {plant.isCommunityPlant && '• Community Hub'}
              </div>

              <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-200 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Slurry pH</span>
                  <span className="font-bold text-slate-800">
                    {plant.latestReading?.phLevel ? `${plant.latestReading.phLevel} pH` : '7.2 pH'}
                  </span>
                  <span className="text-[9px] text-emerald-600 font-medium block">Optimal</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Digester Temp</span>
                  <span className="font-bold text-slate-800">
                    {plant.latestReading?.temperatureC ? `${plant.latestReading.temperatureC}°C` : '32.5°C'}
                  </span>
                  <span className="text-[9px] text-emerald-600 font-medium block">Mesophilic</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Household Compliance Directory */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">Village Households & Daily Intake Roster</h3>
            <p className="text-xs text-slate-500">Track which families have submitted today's feedstock batches</p>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{coordinatorData?.householdsCollectedToday || 0} Collected</span>
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 font-semibold flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              <span>{coordinatorData?.householdsPendingToday || 0} Pending</span>
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] border-b border-slate-100">
              <tr>
                <th className="py-3 px-4 rounded-l-xl">Code</th>
                <th className="py-3 px-4">Head of Family</th>
                <th className="py-3 px-4 text-center">Bovines</th>
                <th className="py-3 px-4 text-center">Daily Dung Potential</th>
                <th className="py-3 px-4 text-center">Pooling Status</th>
                <th className="py-3 px-4 text-center">Today's Intake</th>
                <th className="py-3 px-4 text-right rounded-r-xl">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {householdRoster.map((hh) => (
                <tr key={hh._id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3.5 px-4 font-mono font-bold text-emerald-800">
                    {hh.householdCode}
                  </td>
                  <td className="py-3.5 px-4 font-medium text-slate-800">
                    {hh.headOfFamily}
                    <span className="text-[10px] text-slate-400 block">{hh.contactPhone || 'No phone'}</span>
                  </td>
                  <td className="py-3.5 px-4 text-center font-semibold text-slate-700">
                    {hh.cattleCount} Head
                  </td>
                  <td className="py-3.5 px-4 text-center font-medium text-slate-700">
                    ~{hh.dailyDungEstKg} kg/d
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700">
                      {hh.willingToPool ? 'Agreed' : 'Individual'}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    {hh.statusToday === 'Collected' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>Collected</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold text-[10px]">
                        <Clock className="w-3 h-3 text-amber-600" />
                        <span>Pending</span>
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => handleOpenIntakeModal(hh._id)}
                      className="px-3 py-1.5 rounded-xl bg-slate-900 text-white font-semibold hover:bg-emerald-600 text-[11px] transition-colors shadow-sm"
                    >
                      Log Intake
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Action Navigation Grid */}
      <div className="bg-slate-100/70 rounded-3xl p-6 border border-slate-200">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">
          Coordinator Field Management Hub
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Link
            to="/feedstock"
            className="p-4 rounded-2xl bg-white border border-slate-200/80 hover:border-emerald-300 hover:shadow-md transition-all flex flex-col items-center text-center group"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <Recycle className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-800">Feedstock Logbook</span>
            <span className="text-[10px] text-slate-500 mt-0.5">Historical records</span>
          </Link>

          <Link
            to="/households"
            className="p-4 rounded-2xl bg-white border border-slate-200/80 hover:border-emerald-300 hover:shadow-md transition-all flex flex-col items-center text-center group"
          >
            <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <Home className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-800">Household Directory</span>
            <span className="text-[10px] text-slate-500 mt-0.5">Add & update families</span>
          </Link>

          <Link
            to="/community"
            className="p-4 rounded-2xl bg-white border border-slate-200/80 hover:border-emerald-300 hover:shadow-md transition-all flex flex-col items-center text-center group"
          >
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <Users className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-800">Community Pooling</span>
            <span className="text-[10px] text-slate-500 mt-0.5">Cluster agreements</span>
          </Link>

          <Link
            to="/digestate"
            className="p-4 rounded-2xl bg-white border border-slate-200/80 hover:border-emerald-300 hover:shadow-md transition-all flex flex-col items-center text-center group"
          >
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <Sprout className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-800">Digestate Planner</span>
            <span className="text-[10px] text-slate-500 mt-0.5">Slurry distribution</span>
          </Link>
        </div>
      </div>

      {/* Quick Intake Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <PlusCircle className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-base text-slate-900">Record Daily Waste Intake</h3>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitIntake} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Contributing Household
                </label>
                <select
                  value={selectedHouseholdId}
                  onChange={(e) => setSelectedHouseholdId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50"
                  required
                >
                  <option value="">Select Household</option>
                  {householdRoster.map((hh) => (
                    <option key={hh._id} value={hh._id}>
                      {hh.householdCode} — {hh.headOfFamily} ({hh.cattleCount} Cattle)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Bovine Dung (kg)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={dungKg}
                  onChange={(e) => setDungKg(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Agri Waste (kg)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={agriWasteKg}
                    onChange={(e) => setAgriWasteKg(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Kitchen Scrap (kg)
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
              </div>

              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 flex items-center justify-between text-xs">
                <span className="text-emerald-800 font-medium">Total Feedstock:</span>
                <span className="font-extrabold text-emerald-900">
                  {Number(dungKg) + Number(agriWasteKg) + Number(kitchenWasteKg)} kg
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
                  <span>{submitting ? 'Logging...' : 'Confirm & Log Intake'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CoordinatorDashboardView;
