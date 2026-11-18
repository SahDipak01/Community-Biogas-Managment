import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import Modal from '../components/common/Modal';
import StatusBadge from '../components/common/StatusBadge';
import MonitoringTrendChart from '../components/charts/MonitoringTrendChart';
import {
  Gauge,
  Plus,
  Thermometer,
  Activity,
  Droplets,
  AlertTriangle,
  Flame,
  CheckCircle2,
  Cpu,
  UserCheck,
  ShieldAlert,
  Info
} from 'lucide-react';

const PlantMonitoring = () => {
  const { user, isAdmin, isCoordinator } = useAuth();
  const { addToast } = useNotification();

  const [plants, setPlants] = useState([]);
  const [villages, setVillages] = useState([]);
  const [selectedPlantId, setSelectedPlantId] = useState('all');
  const [selectedReadingType, setSelectedReadingType] = useState('all');
  const [records, setRecords] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [averages, setAverages] = useState(null);
  const [loading, setLoading] = useState(true);

  // Register New Plant Modal
  const [showPlantModal, setShowPlantModal] = useState(false);
  const [plantForm, setPlantForm] = useState({
    plantName: '',
    plantType: 'Fixed Dome (Deenabandhu)',
    capacityM3: 3,
    villageId: '',
    isCommunityPlant: false,
    installationCost: 58000,
    subsidyReceived: 16500,
    gasUtilization: 'Household Cooking',
    notes: ''
  });

  // New Monitoring Reading Modal
  const [showModal, setShowModal] = useState(false);
  const [readingForm, setReadingForm] = useState({
    plantId: '',
    date: new Date().toISOString().split('T')[0],
    feedstockInputKg: 50,
    waterAddedLiters: 50,
    gasProducedM3: 2.1,
    temperatureC: 32.5,
    phLevel: 7.2,
    slurryProducedLiters: 48,
    pressureKPa: 2.5,
    readingType: 'manual', // Explicitly manual vs simulated
    notes: ''
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        plantId: selectedPlantId,
        readingType: selectedReadingType,
        limit: 25
      });

      const [pRes, mRes, aRes, vRes] = await Promise.all([
        api.get('/plants'),
        api.get(`/monitoring?${params.toString()}`),
        api.get('/monitoring/alerts'),
        api.get('/villages')
      ]);

      if (vRes.data.success) {
        setVillages(vRes.data.data);
        if (vRes.data.data.length > 0 && !plantForm.villageId) {
          setPlantForm((prev) => ({
            ...prev,
            villageId: user?.village?._id || vRes.data.data[0]._id
          }));
        }
      }

      if (pRes.data.success) {
        setPlants(pRes.data.data);
        if (pRes.data.data.length > 0 && !readingForm.plantId) {
          setReadingForm((prev) => ({ ...prev, plantId: pRes.data.data[0]._id }));
        }
      }

      if (mRes.data.success) {
        setRecords(mRes.data.data);
        setAverages(mRes.data.averages);
      }

      if (aRes.data.success) {
        setAlerts(aRes.data.data);
      }
    } catch (err) {
      console.error('Failed to load plant telemetry:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedPlantId, selectedReadingType]);

  const handleRecordReading = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/monitoring', readingForm);
      if (res.data.success) {
        if (res.data.alertsTriggered > 0) {
          addToast(`Reading logged! Warning: ${res.data.alertsTriggered} biochemical alert(s) triggered!`, 'warning');
        } else {
          addToast('Operational monitoring entry logged successfully!', 'success');
        }
        setShowModal(false);
        fetchData();
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Error recording monitoring data', 'error');
    }
  };

  const handleCreatePlant = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/plants', plantForm);
      if (res.data.success) {
        addToast(`Biogas plant "${plantForm.plantName}" registered successfully!`, 'success');
        setShowPlantModal(false);
        setPlantForm((prev) => ({ ...prev, plantName: '', notes: '' }));
        fetchData();
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Error registering biogas plant', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold mb-2 border border-emerald-200">
            <Gauge className="w-3.5 h-3.5" />
            Anaerobic Digester Telemetry & Health Engine
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Biogas Plant Monitoring</h2>
          <p className="text-xs text-slate-500 mt-1 max-w-xl">
            Continuous operational tracking of temperature, pH, biogas yield, and slurry discharge with biochemical threshold anomaly alarms.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
          {(isAdmin || isCoordinator) && (
            <button
              onClick={() => setShowPlantModal(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold transition-all"
            >
              <Flame className="w-4 h-4 text-emerald-600" />
              <span>Register Plant</span>
            </button>
          )}
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Log Plant Reading</span>
          </button>
        </div>
      </div>

      {/* Real-time Health Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Digester Temp
            </span>
            <Thermometer className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            {averages?.avgTemp ? averages.avgTemp.toFixed(1) : 32.5}°C
          </div>
          <span className="text-[11px] text-emerald-600 mt-1 block">Optimal Mesophilic (28-35°C)</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Slurry pH Level
            </span>
            <Activity className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            {averages?.avgPh ? averages.avgPh.toFixed(2) : 7.2}
          </div>
          <span className="text-[11px] text-emerald-600 mt-1 block">Neutral Methanogenic (6.8-7.5)</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Avg Daily Gas
            </span>
            <Flame className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-700">
            {averages?.avgGas ? averages.avgGas.toFixed(2) : 2.4} m³
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">Across monitored batch</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Slurry Outflow
            </span>
            <Droplets className="w-4 h-4 text-sky-500" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            {averages?.avgSlurry ? Math.round(averages.avgSlurry) : 50} L/d
          </div>
          <span className="text-[11px] text-sky-600 mt-1 block">Discharged for fertilizer</span>
        </div>
      </div>

      {/* Active Alerts Banner */}
      {alerts && alerts.length > 0 && (
        <div className="bg-amber-50/90 border border-amber-200/90 rounded-3xl p-5 shadow-sm">
          <div className="flex items-center gap-2 text-amber-900 font-bold text-sm mb-3">
            <ShieldAlert className="w-5 h-5 text-amber-600" />
            <span>Active Digester Biochemical Alarms ({alerts.length})</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {alerts.slice(0, 4).map((alert, i) => (
              <div
                key={i}
                className="bg-white p-3.5 rounded-2xl border border-amber-200/80 shadow-xs flex items-start gap-3"
              >
                <AlertTriangle
                  className={`w-4 h-4 flex-shrink-0 mt-0.5 ${
                    alert.severity === 'critical' ? 'text-rose-600' : 'text-amber-500'
                  }`}
                />
                <div className="flex-1 min-w-0 text-xs">
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <span className="font-bold text-slate-900 truncate">{alert.plantName}</span>
                    <span
                      className={`text-[9px] font-bold uppercase px-1.5 py-0.2 rounded ${
                        alert.severity === 'critical'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {alert.alertType}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-snug">{alert.message}</p>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1.5">
                    <span>{new Date(alert.date).toLocaleDateString()}</span>
                    <span className="capitalize italic">Source: {alert.readingType} Entry</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Multi-parameter Trend Chart */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">Digester Kinetics (Temperature & pH vs Gas Yield)</h3>
            <p className="text-xs text-slate-500">Historical trend showing biochemical stability in digester chamber</p>
          </div>

          {/* Plant & Reading Type Filter */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <select
              value={selectedPlantId}
              onChange={(e) => setSelectedPlantId(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-slate-50 focus:outline-none"
            >
              <option value="all">All Biogas Units</option>
              {plants.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.plantName} ({p.plantCode})
                </option>
              ))}
            </select>

            <select
              value={selectedReadingType}
              onChange={(e) => setSelectedReadingType(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-slate-50 focus:outline-none"
            >
              <option value="all">All Reading Sources</option>
              <option value="manual">Manual Logged Only</option>
              <option value="simulated">IoT Simulated Telemetry</option>
            </select>
          </div>
        </div>

        <MonitoringTrendChart data={records} />
      </div>

      {/* Historical Logs Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">Monitoring Log History</h3>
            <p className="text-xs text-slate-500">
              Verified daily logs distinguishing manual field entries from automated sensor simulations
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                <th className="p-3.5 pl-6">Date</th>
                <th className="p-3.5">Plant Asset</th>
                <th className="p-3.5 text-right">Daily Feed (kg)</th>
                <th className="p-3.5 text-right">Gas Produced (m³)</th>
                <th className="p-3.5 text-right">Temp (°C)</th>
                <th className="p-3.5 text-right">pH Level</th>
                <th className="p-3.5 text-right">Slurry (L)</th>
                <th className="p-3.5 text-center">Reading Source</th>
                <th className="p-3.5 pr-6">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="9" className="p-8 text-center text-slate-400">
                    Loading telemetry...
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan="9" className="p-8 text-center text-slate-400">
                    No monitoring logs recorded for this plant yet.
                  </td>
                </tr>
              ) : (
                records.map((r) => (
                  <tr key={r._id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="p-3.5 pl-6 font-semibold text-slate-800">
                      {new Date(r.date).toLocaleDateString([], {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </td>
                    <td className="p-3.5 font-medium text-slate-800">
                      <div>{r.plant?.plantName || 'Digester'}</div>
                      <span className="text-[10px] text-slate-400">{r.plant?.plantCode}</span>
                    </td>
                    <td className="p-3.5 text-right font-medium text-slate-700">{r.feedstockInputKg} kg</td>
                    <td className="p-3.5 text-right font-bold text-emerald-700">{r.gasProducedM3} m³</td>
                    <td className="p-3.5 text-right font-medium text-amber-700">{r.temperatureC}°C</td>
                    <td className="p-3.5 text-right font-medium text-emerald-700">{r.phLevel}</td>
                    <td className="p-3.5 text-right font-medium text-sky-700">{r.slurryProducedLiters} L</td>
                    <td className="p-3.5 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          r.readingType === 'manual'
                            ? 'bg-slate-100 text-slate-700 border border-slate-200'
                            : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                        }`}
                      >
                        {r.readingType === 'manual' ? (
                          <>
                            <UserCheck className="w-3 h-3" /> Manual Entry
                          </>
                        ) : (
                          <>
                            <Cpu className="w-3 h-3" /> IoT Simulated
                          </>
                        )}
                      </span>
                    </td>
                    <td className="p-3.5 pr-6">
                      <StatusBadge status={r.operationalStatus} type="operational" />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Log Reading Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Record Digester Operational Telemetry"
      >
        <form onSubmit={handleRecordReading} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Target Biogas Plant</label>
              <select
                value={readingForm.plantId}
                onChange={(e) => setReadingForm({ ...readingForm, plantId: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500"
                required
              >
                {plants.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.plantName} ({p.plantCode} - {p.capacityM3} m³)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Reading Date</label>
              <input
                type="date"
                value={readingForm.date}
                onChange={(e) => setReadingForm({ ...readingForm, date: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Feedstock Input (kg)</label>
              <input
                type="number"
                min="0"
                step="0.5"
                value={readingForm.feedstockInputKg}
                onChange={(e) =>
                  setReadingForm({ ...readingForm, feedstockInputKg: parseFloat(e.target.value) || 0 })
                }
                className="w-full px-3 py-2 rounded-xl border border-slate-200 font-semibold focus:outline-none focus:border-emerald-500"
                required
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Estimated Gas Output (m³)</label>
              <input
                type="number"
                min="0"
                step="0.1"
                value={readingForm.gasProducedM3}
                onChange={(e) =>
                  setReadingForm({ ...readingForm, gasProducedM3: parseFloat(e.target.value) || 0 })
                }
                className="w-full px-3 py-2 rounded-xl border border-slate-200 font-semibold focus:outline-none focus:border-emerald-500"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Temperature (°C)</label>
              <input
                type="number"
                step="0.1"
                value={readingForm.temperatureC}
                onChange={(e) =>
                  setReadingForm({ ...readingForm, temperatureC: parseFloat(e.target.value) || 0 })
                }
                className="w-full px-3 py-2 rounded-xl border border-slate-200 font-semibold focus:outline-none focus:border-emerald-500"
                required
              />
              <span className="text-[10px] text-slate-400">Normal: 28-36°C</span>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Slurry pH Level</label>
              <input
                type="number"
                min="0"
                max="14"
                step="0.1"
                value={readingForm.phLevel}
                onChange={(e) =>
                  setReadingForm({ ...readingForm, phLevel: parseFloat(e.target.value) || 0 })
                }
                className="w-full px-3 py-2 rounded-xl border border-slate-200 font-semibold focus:outline-none focus:border-emerald-500"
                required
              />
              <span className="text-[10px] text-slate-400">Normal: 6.8-7.5</span>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Slurry Outflow (L)</label>
              <input
                type="number"
                min="0"
                value={readingForm.slurryProducedLiters}
                onChange={(e) =>
                  setReadingForm({ ...readingForm, slurryProducedLiters: parseFloat(e.target.value) || 0 })
                }
                className="w-full px-3 py-2 rounded-xl border border-slate-200 font-semibold focus:outline-none focus:border-emerald-500"
              />
              <span className="text-[10px] text-slate-400">~95% of feed mass</span>
            </div>
          </div>

          {/* Explicit Manual vs Simulated Selector */}
          <div>
            <label className="font-bold text-slate-700 block mb-1.5">Reading Provenance Type</label>
            <div className="grid grid-cols-2 gap-3">
              <label
                className={`p-3 rounded-xl border cursor-pointer flex items-center gap-2.5 transition-all ${
                  readingForm.readingType === 'manual'
                    ? 'border-emerald-500 bg-emerald-50/50 text-emerald-950 font-bold'
                    : 'border-slate-200 text-slate-600'
                }`}
              >
                <input
                  type="radio"
                  name="readingType"
                  value="manual"
                  checked={readingForm.readingType === 'manual'}
                  onChange={() => setReadingForm({ ...readingForm, readingType: 'manual' })}
                  className="text-emerald-600 focus:ring-emerald-500"
                />
                <UserCheck className="w-4 h-4 text-emerald-600" />
                <span>Manual Field Measurement</span>
              </label>

              <label
                className={`p-3 rounded-xl border cursor-pointer flex items-center gap-2.5 transition-all ${
                  readingForm.readingType === 'simulated'
                    ? 'border-indigo-500 bg-indigo-50/50 text-indigo-950 font-bold'
                    : 'border-slate-200 text-slate-600'
                }`}
              >
                <input
                  type="radio"
                  name="readingType"
                  value="simulated"
                  checked={readingForm.readingType === 'simulated'}
                  onChange={() => setReadingForm({ ...readingForm, readingType: 'simulated' })}
                  className="text-indigo-600 focus:ring-indigo-500"
                />
                <Cpu className="w-4 h-4 text-indigo-600" />
                <span>Simulated IoT Node Stream</span>
              </label>
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Field Observations / Flame Quality Notes</label>
            <textarea
              rows="2"
              value={readingForm.notes}
              onChange={(e) => setReadingForm({ ...readingForm, notes: e.target.value })}
              placeholder="e.g. Flame burning with steady blue cone, no odor detected..."
              className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500"
            />
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
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md shadow-emerald-600/20"
            >
              Save Operational Log
            </button>
          </div>
        </form>
      </Modal>

      {/* Register New Biogas Plant Modal */}
      <Modal
        isOpen={showPlantModal}
        onClose={() => setShowPlantModal(false)}
        title="Register New Biogas Plant"
      >
        <form onSubmit={handleCreatePlant} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Plant Name</label>
              <input
                type="text"
                value={plantForm.plantName}
                onChange={(e) => setPlantForm({ ...plantForm, plantName: e.target.value })}
                placeholder="e.g. Shanti Dairy Biogas Unit"
                className="w-full px-3 py-2 rounded-xl border border-slate-200"
                required
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Village</label>
              <select
                value={plantForm.villageId}
                onChange={(e) => setPlantForm({ ...plantForm, villageId: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200"
                required
              >
                {villages.map((v) => (
                  <option key={v._id} value={v._id}>
                    {v.name} ({v.district})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Digester Model</label>
              <select
                value={plantForm.plantType}
                onChange={(e) => setPlantForm({ ...plantForm, plantType: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200"
              >
                <option value="Fixed Dome (Deenabandhu)">Fixed Dome (Deenabandhu)</option>
                <option value="Floating Drum (KVIC)">Floating Drum (KVIC)</option>
                <option value="Pre-fabricated / Bag Digester">Pre-fabricated / Bag Digester</option>
                <option value="Solid-State Anaerobic Digester">Solid-State Anaerobic Digester</option>
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Capacity (m³/day)</label>
              <input
                type="number"
                min="1"
                max="100"
                step="0.5"
                value={plantForm.capacityM3}
                onChange={(e) => setPlantForm({ ...plantForm, capacityM3: parseFloat(e.target.value) || 1 })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Installation Cost (₹)</label>
              <input
                type="number"
                min="0"
                value={plantForm.installationCost}
                onChange={(e) => setPlantForm({ ...plantForm, installationCost: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 font-semibold"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Subsidy Received (₹)</label>
              <input
                type="number"
                min="0"
                value={plantForm.subsidyReceived}
                onChange={(e) => setPlantForm({ ...plantForm, subsidyReceived: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 font-semibold"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 items-center">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Primary Gas Use</label>
              <select
                value={plantForm.gasUtilization}
                onChange={(e) => setPlantForm({ ...plantForm, gasUtilization: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200"
              >
                <option value="Household Cooking">Household Cooking</option>
                <option value="Community Kitchen">Community Kitchen</option>
                <option value="Power Generation / Generator">Power Generation / Generator</option>
                <option value="Bio-CNG Bottling">Bio-CNG Bottling</option>
              </select>
            </div>

            <label className="flex items-center gap-2 pt-4 cursor-pointer font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={plantForm.isCommunityPlant}
                onChange={(e) => setPlantForm({ ...plantForm, isCommunityPlant: e.target.checked })}
                className="rounded text-emerald-600 focus:ring-emerald-500"
              />
              <span>Community Shared Biogas Plant</span>
            </label>
          </div>

          <div className="pt-2 flex justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setShowPlantModal(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
            >
              Register Plant
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default PlantMonitoring;
