import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import Modal from '../components/common/Modal';
import {
  Recycle,
  Plus,
  Filter,
  Search,
  Download,
  Calendar,
  Layers,
  Beef,
  Sparkles,
  CheckCircle2
} from 'lucide-react';

const FeedstockManagement = () => {
  const { user, isAdmin, isCoordinator } = useAuth();
  const { addToast } = useNotification();

  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalDung: 0, totalAgri: 0, totalKitchen: 0, grandTotal: 0 });
  const [villages, setVillages] = useState([]);
  const [plants, setPlants] = useState([]);

  // Filter state
  const [selectedVillage, setSelectedVillage] = useState('all');
  const [selectedSeason, setSelectedSeason] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // New Record Modal
  const [showModal, setShowModal] = useState(false);
  const [newRecord, setNewRecord] = useState({
    villageId: '',
    collectionDate: new Date().toISOString().split('T')[0],
    dungKg: 50,
    agriWasteKg: 10,
    kitchenWasteKg: 5,
    season: 'Summer',
    collectorName: user?.name || 'Village Self-Help Group',
    status: 'Fed to Digester',
    destinationPlantId: '',
    notes: ''
  });

  const fetchRecords = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page,
        limit: 12,
        villageId: selectedVillage,
        season: selectedSeason,
        status: selectedStatus
      });

      const res = await api.get(`/feedstock?${params.toString()}`);
      if (res.data.success) {
        setRecords(res.data.data);
        setStats(res.data.stats);
        setTotalPages(res.data.totalPages || 1);
      }
    } catch (err) {
      console.error('Error fetching feedstock logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const [vRes, pRes] = await Promise.all([api.get('/villages'), api.get('/plants')]);
        if (vRes.data.success) {
          setVillages(vRes.data.data);
          if (vRes.data.data.length > 0) {
            setNewRecord((prev) => ({ ...prev, villageId: vRes.data.data[0]._id }));
          }
        }
        if (pRes.data.success) setPlants(pRes.data.data);
      } catch (err) {
        console.warn('Metadata load deferred:', err.message);
      }
    };
    fetchMetadata();
  }, []);

  useEffect(() => {
    fetchRecords();
  }, [selectedVillage, selectedSeason, selectedStatus, page]);

  const handleCreateRecord = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/feedstock', newRecord);
      if (res.data.success) {
        addToast('Daily feedstock record added successfully!', 'success');
        setShowModal(false);
        fetchRecords();
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Error recording feedstock', 'error');
    }
  };

  const handleExportCsv = async () => {
    try {
      const res = await api.get('/reports/export-csv?type=feedstock_logs', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `feedstock_collection_logs_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      addToast('Feedstock logs exported to CSV!', 'success');
    } catch (err) {
      addToast('Failed to export feedstock CSV', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Action */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold mb-2 border border-emerald-200">
            <Recycle className="w-3.5 h-3.5" />
            Biomass Inventory & Co-Digestion Log
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Feedstock & Resource Management</h2>
          <p className="text-xs text-slate-500 mt-1 max-w-xl">
            Track daily collection of animal dung, agricultural crop residues, and household biodegradable waste with seasonal utilization analytics.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            onClick={handleExportCsv}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Export CSV</span>
          </button>

          {(isAdmin || isCoordinator) && (
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Record Daily Waste</span>
            </button>
          )}
        </div>
      </div>

      {/* Aggregate Statistics Header Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Total Bovine Dung
          </span>
          <div className="text-xl font-bold text-slate-900 mt-1">
            {(stats.totalDung || 0).toLocaleString()} <span className="text-xs font-normal text-slate-500">kg</span>
          </div>
          <span className="text-[11px] text-emerald-600 mt-1 block">Primary methanogen source</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Agricultural Residue
          </span>
          <div className="text-xl font-bold text-slate-900 mt-1">
            {(stats.totalAgri || 0).toLocaleString()} <span className="text-xs font-normal text-slate-500">kg</span>
          </div>
          <span className="text-[11px] text-amber-600 mt-1 block">Husk, straw & crop scrap</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Kitchen Biodegradables
          </span>
          <div className="text-xl font-bold text-slate-900 mt-1">
            {(stats.totalKitchen || 0).toLocaleString()} <span className="text-xs font-normal text-slate-500">kg</span>
          </div>
          <span className="text-[11px] text-sky-600 mt-1 block">High volatile solids</span>
        </div>

        <div className="p-4 rounded-2xl bg-gradient-to-tr from-emerald-700 to-teal-700 text-white shadow-md">
          <span className="text-[11px] font-medium text-emerald-100 uppercase tracking-wider block">
            Grand Total Biomass
          </span>
          <div className="text-2xl font-black mt-1">
            {((stats.grandTotal || 0) / 1000).toFixed(2)} <span className="text-xs font-normal">Tons</span>
          </div>
          <span className="text-[11px] text-emerald-200 mt-1 block">~{Math.round((stats.grandTotal || 0) * 0.038)} m³ biogas potential</span>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-semibold text-slate-700">Filters:</span>
          </div>

          <select
            value={selectedVillage}
            onChange={(e) => {
              setSelectedVillage(e.target.value);
              setPage(1);
            }}
            className="px-3 py-1.5 rounded-lg border border-slate-200 font-medium text-slate-700 bg-slate-50 focus:outline-none"
          >
            <option value="all">All Villages</option>
            {villages.map((v) => (
              <option key={v._id} value={v._id}>
                {v.name}
              </option>
            ))}
          </select>

          <select
            value={selectedSeason}
            onChange={(e) => {
              setSelectedSeason(e.target.value);
              setPage(1);
            }}
            className="px-3 py-1.5 rounded-lg border border-slate-200 font-medium text-slate-700 bg-slate-50 focus:outline-none"
          >
            <option value="all">All Seasons</option>
            <option value="Summer">Summer (Peak Digestion)</option>
            <option value="Winter">Winter (Retention Delayed)</option>
            <option value="Monsoon">Monsoon (High Moisture)</option>
            <option value="Post-Monsoon">Post-Monsoon</option>
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => {
              setSelectedStatus(e.target.value);
              setPage(1);
            }}
            className="px-3 py-1.5 rounded-lg border border-slate-200 font-medium text-slate-700 bg-slate-50 focus:outline-none"
          >
            <option value="all">All Utilization Status</option>
            <option value="Fed to Digester">Fed to Digester</option>
            <option value="Recorded">Recorded (Pending Feeding)</option>
            <option value="Stored / Composted">Stored / Composted</option>
          </select>
        </div>

        <span className="text-slate-400">
          Showing Page {page} of {totalPages}
        </span>
      </div>

      {/* Feedstock Logs Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                <th className="p-3.5 pl-6">Collection Date</th>
                <th className="p-3.5">Village / Origin</th>
                <th className="p-3.5 text-right">Bovine Dung</th>
                <th className="p-3.5 text-right">Agri Residue</th>
                <th className="p-3.5 text-right">Kitchen Scrap</th>
                <th className="p-3.5 text-right">Total Feedstock</th>
                <th className="p-3.5">Season</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 pr-6">Destination Plant</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="9" className="p-8 text-center text-slate-400">
                    Loading feedstock logs...
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan="9" className="p-8 text-center text-slate-400">
                    No collection records found matching criteria.
                  </td>
                </tr>
              ) : (
                records.map((r) => (
                  <tr key={r._id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="p-3.5 pl-6 font-semibold text-slate-800">
                      {new Date(r.collectionDate).toLocaleDateString([], {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </td>
                    <td className="p-3.5 text-slate-600">
                      <div>{r.village ? r.village.name : 'Central Hub'}</div>
                      {r.household && (
                        <span className="text-[10px] text-slate-400">HH: {r.household.householdCode}</span>
                      )}
                    </td>
                    <td className="p-3.5 text-right font-medium text-emerald-700">{r.dungKg} kg</td>
                    <td className="p-3.5 text-right font-medium text-amber-700">{r.agriWasteKg} kg</td>
                    <td className="p-3.5 text-right font-medium text-sky-700">{r.kitchenWasteKg} kg</td>
                    <td className="p-3.5 text-right font-bold text-slate-900">{r.totalKg} kg</td>
                    <td className="p-3.5">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[11px] font-medium">
                        {r.season}
                      </span>
                    </td>
                    <td className="p-3.5">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          r.status === 'Fed to Digester'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="p-3.5 pr-6 text-slate-600 truncate max-w-[150px]">
                      {r.destinationPlant ? r.destinationPlant.plantName : 'Central Inflow Pit'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination footer */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs">
            <button
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 disabled:opacity-40"
            >
              Previous
            </button>
            <span className="text-slate-500">
              Page {page} of {totalPages}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Record Feedstock Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Record Daily Biomass Waste Collection"
      >
        <form onSubmit={handleCreateRecord} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Village</label>
              <select
                value={newRecord.villageId}
                onChange={(e) => setNewRecord({ ...newRecord, villageId: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500"
                required
              >
                {villages.map((v) => (
                  <option key={v._id} value={v._id}>
                    {v.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Collection Date</label>
              <input
                type="date"
                value={newRecord.collectionDate}
                onChange={(e) => setNewRecord({ ...newRecord, collectionDate: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500"
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
                value={newRecord.dungKg}
                onChange={(e) => setNewRecord({ ...newRecord, dungKg: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 font-semibold focus:outline-none focus:border-emerald-500"
                required
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Agri Waste (kg)</label>
              <input
                type="number"
                min="0"
                value={newRecord.agriWasteKg}
                onChange={(e) => setNewRecord({ ...newRecord, agriWasteKg: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 font-semibold focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Kitchen Waste (kg)</label>
              <input
                type="number"
                min="0"
                value={newRecord.kitchenWasteKg}
                onChange={(e) => setNewRecord({ ...newRecord, kitchenWasteKg: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 font-semibold focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="p-3 bg-emerald-50/70 rounded-xl border border-emerald-200 flex justify-between font-bold text-emerald-900">
            <span>Calculated Total Daily Batch:</span>
            <span>
              {(newRecord.dungKg + newRecord.agriWasteKg + newRecord.kitchenWasteKg).toFixed(1)} kg
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Season</label>
              <select
                value={newRecord.season}
                onChange={(e) => setNewRecord({ ...newRecord, season: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200"
              >
                <option value="Summer">Summer</option>
                <option value="Winter">Winter</option>
                <option value="Monsoon">Monsoon</option>
                <option value="Post-Monsoon">Post-Monsoon</option>
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Destination Digester</label>
              <select
                value={newRecord.destinationPlantId}
                onChange={(e) => setNewRecord({ ...newRecord, destinationPlantId: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200"
              >
                <option value="">General Feedstock Pit</option>
                {plants.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.plantName} ({p.capacityM3} m³)
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Recorded By / SHG Collector</label>
            <input
              type="text"
              value={newRecord.collectorName}
              onChange={(e) => setNewRecord({ ...newRecord, collectorName: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200"
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
              Save Feedstock Log
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default FeedstockManagement;
