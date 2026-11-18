import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import Modal from '../components/common/Modal';
import {
  BarChart3,
  Download,
  Printer,
  FileSpreadsheet,
  Building2,
  Calendar,
  Layers,
  Flame,
  Award,
  TrendingUp,
  Leaf,
  Database,
  Upload,
  HardDrive,
  AlertTriangle,
  ShieldCheck
} from 'lucide-react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';

const ReportsAnalytics = () => {
  const { isAdmin } = useAuth();
  const { addToast } = useNotification();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [restoring, setRestoring] = useState(false);
  const [serverBackups, setServerBackups] = useState([]);
  const [creatingBackup, setCreatingBackup] = useState(false);
  const [pendingRestore, setPendingRestore] = useState(null); // { sourceLabel, metadata, payload, serverBackupFilename }
  const [restoreConfirmed, setRestoreConfirmed] = useState(false);
  const fileInputRef = useRef(null);

  const fetchServerBackups = async () => {
    if (!isAdmin) return;
    try {
      const res = await api.get('/reports/backups');
      if (res.data.success) {
        setServerBackups(res.data.data || []);
      }
    } catch (err) {
      console.warn('Could not load server backups:', err.message);
    }
  };

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const res = await api.get('/reports/analytics');
      if (res.data.success) {
        setData(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load reports:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
    fetchServerBackups();
  }, [isAdmin]);

  const handleDownloadCsv = async (type = 'village_summary') => {
    try {
      const res = await api.get(`/reports/export-csv?type=${type}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `biogas_report_${type}_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      addToast('Report downloaded as CSV!', 'success');
    } catch (err) {
      addToast('Failed to download CSV report', 'error');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDatabaseBackup = async () => {
    try {
      const res = await api.get('/reports/backup', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/json' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `biogas_database_backup_${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      addToast('Full MongoDB database backup downloaded (JSON)!', 'success');
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to export database backup', 'error');
    }
  };

  const handleCreateServerBackup = async () => {
    try {
      setCreatingBackup(true);
      const res = await api.post('/reports/backups/create');
      if (res.data.success) {
        addToast(`Server snapshot saved (${res.data.data.filename}) with SHA-256 checksum!`, 'success');
        fetchServerBackups();
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to create server backup snapshot', 'error');
    } finally {
      setCreatingBackup(false);
    }
  };

  const handleDownloadServerBackup = async (filename) => {
    try {
      const res = await api.get(`/reports/backups/${encodeURIComponent(filename)}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/json' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      addToast(`Downloaded server backup ${filename}`, 'success');
    } catch (err) {
      addToast('Failed to download server backup', 'error');
    }
  };

  const handleFileSelectForRestore = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!parsed?.metadata || !parsed?.collections) {
        addToast('Invalid backup JSON: missing metadata or collections block.', 'error');
        return;
      }
      setRestoreConfirmed(false);
      setPendingRestore({
        sourceLabel: `Uploaded File: ${file.name}`,
        metadata: parsed.metadata,
        payload: parsed,
        serverBackupFilename: null
      });
    } catch (err) {
      addToast('Could not parse uploaded JSON backup file.', 'error');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleOpenServerRestoreModal = (b) => {
    setRestoreConfirmed(false);
    setPendingRestore({
      sourceLabel: `Server Snapshot: ${b.filename}`,
      metadata: {
        exportedAt: b.exportedAt,
        exportedBy: b.exportedBy,
        totalDocuments: b.totalDocuments,
        checksumSha256: b.checksumSha256
      },
      payload: null,
      serverBackupFilename: b.filename
    });
  };

  const handleConfirmDatabaseRestore = async () => {
    if (!pendingRestore || !restoreConfirmed) return;
    try {
      setRestoring(true);
      const body = pendingRestore.serverBackupFilename
        ? { serverBackupFilename: pendingRestore.serverBackupFilename, confirmOverwrite: true }
        : { ...pendingRestore.payload, confirmOverwrite: true };

      const res = await api.post('/reports/restore', body);
      if (res.data.success) {
        addToast('Database successfully verified & restored from backup snapshot!', 'success');
        setPendingRestore(null);
        setRestoreConfirmed(false);
        fetchAnalytics();
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Backup checksum check or database restore failed', 'error');
    } finally {
      setRestoring(false);
    }
  };

  const villageSummaries = data?.villageSummaries || [];
  const topContributors = data?.topContributors || [];
  const monthlyComparison = data?.monthlyComparison || [];
  const plantPerformance = data?.plantPerformance || [];
  const seasonalForecast = data?.seasonalForecast;

  return (
    <div className="space-y-6 print:space-y-4 print:p-0">
      {/* Header Banner - hidden in print or styled clean */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4 print:shadow-none print:border-none print:p-2">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold mb-2 border border-emerald-200 print:hidden">
            <BarChart3 className="w-3.5 h-3.5" />
            Bioenergy Performance Auditing & Forecasting
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Reports & Resource Analytics</h2>
          <p className="text-xs text-slate-500 mt-1 max-w-xl">
            Audit village-level feedstock aggregation, seasonal forecast accuracy (MAE/RMSE), household contribution standings, plant performance, and database backups.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 print:hidden self-start lg:self-auto">
          {isAdmin && (
            <>
              <button
                onClick={handleDatabaseBackup}
                className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 text-xs font-semibold transition-colors"
                title="Download full operational database backup as JSON"
              >
                <Database className="w-4 h-4 text-emerald-600" />
                <span>Backup DB</span>
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handleFileSelectForRestore}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={restoring}
                className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
                title="Upload and confirm restoration from JSON backup"
              >
                <Upload className="w-4 h-4 text-slate-600" />
                <span>{restoring ? 'Restoring...' : 'Restore DB'}</span>
              </button>
            </>
          )}

          <button
            onClick={() => handleDownloadCsv('village_summary')}
            className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-md transition-all"
          >
            <Printer className="w-4 h-4" />
            <span>Print PDF</span>
          </button>
        </div>
      </div>

      {/* Monthly Production Trends Chart */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm print:rounded-none print:border-slate-300">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">Monthly Biogas Production vs Feedstock Utilized</h3>
            <p className="text-xs text-slate-500">12-month seasonal comparison reflecting ambient temperature effects</p>
          </div>
          <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-xl">
            Year 2026 Audit
          </span>
        </div>

        <div className="w-full h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyComparison} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#ffffff',
                  borderRadius: '0.75rem',
                  border: '1px solid #e2e8f0',
                  fontSize: '12px'
                }}
              />
              <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
              <Bar dataKey="estimatedBiogasM3" name="Biogas Generated (m³)" fill="#059669" radius={[4, 4, 0, 0]} />
              <Bar dataKey="feedstockUtilizedTons" name="Biomass Consumed (Tons)" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Seasonal Forecasting & MAE / RMSE Statistical Validation */}
      {seasonalForecast && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-5 print:rounded-none print:border-slate-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Seasonal Feedstock Forecasting &amp; Error Validation (MAE / RMSE)
              </h3>
              <p className="text-xs text-slate-500">
                {seasonalForecast.model} evaluated over {seasonalForecast.sampleDays} historical day(s)
                {seasonalForecast.holdoutTestDays ? ` (${seasonalForecast.holdoutTestDays} out-of-sample holdout test days)` : ''}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {seasonalForecast.dataSufficiency && (
                <span className="text-[11px] font-bold text-sky-800 bg-sky-50 px-2.5 py-1 rounded-xl border border-sky-200">
                  {seasonalForecast.dataSufficiency}
                </span>
              )}
              <span
                className={`text-xs font-bold px-3 py-1 rounded-xl border ${
                  seasonalForecast.metrics?.accuracyPercent !== null && seasonalForecast.metrics?.accuracyPercent !== undefined
                    ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                    : 'text-amber-800 bg-amber-50 border-amber-200'
                }`}
              >
                {seasonalForecast.metrics?.accuracyPercent !== null && seasonalForecast.metrics?.accuracyPercent !== undefined
                  ? `Holdout Accuracy: ${seasonalForecast.metrics.accuracyPercent}%`
                  : 'Insufficient Historical Data (<7 days)'}
              </span>
            </div>
          </div>

          {seasonalForecast.sufficiencyWarning && (
            <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <span>{seasonalForecast.sufficiencyWarning}</span>
            </div>
          )}

          {/* MAE / RMSE / MAPE Stat Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
              <span className="text-[10px] font-bold uppercase text-slate-400 block">Holdout MAE</span>
              <span className="text-lg font-black text-slate-900">
                {seasonalForecast.metrics?.holdoutMaeKg !== null && seasonalForecast.metrics?.holdoutMaeKg !== undefined
                  ? `${seasonalForecast.metrics.holdoutMaeKg} kg/d`
                  : 'N/A'}
              </span>
              {seasonalForecast.metrics?.maeKg !== null && seasonalForecast.metrics?.maeKg !== undefined && (
                <span className="text-[10px] text-slate-400 block">Overall: {seasonalForecast.metrics.maeKg} kg/d</span>
              )}
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
              <span className="text-[10px] font-bold uppercase text-slate-400 block">Holdout RMSE</span>
              <span className="text-lg font-black text-sky-700">
                {seasonalForecast.metrics?.holdoutRmseKg !== null && seasonalForecast.metrics?.holdoutRmseKg !== undefined
                  ? `${seasonalForecast.metrics.holdoutRmseKg} kg/d`
                  : 'N/A'}
              </span>
              {seasonalForecast.metrics?.rmseKg !== null && seasonalForecast.metrics?.rmseKg !== undefined && (
                <span className="text-[10px] text-slate-400 block">
                  95% Band: ±{seasonalForecast.uncertaintyRadius95Kg ?? seasonalForecast.uncertaintyRadiusKg ?? 0} kg/d
                </span>
              )}
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
              <span className="text-[10px] font-bold uppercase text-slate-400 block">Mean Abs. % Error (MAPE)</span>
              <span className="text-lg font-black text-amber-700">
                {seasonalForecast.metrics?.mapePercent !== null && seasonalForecast.metrics?.mapePercent !== undefined
                  ? `${seasonalForecast.metrics.mapePercent}%`
                  : 'N/A'}
              </span>
            </div>
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200">
              <span className="text-[10px] font-bold uppercase text-emerald-700 block">Smoothed Baseline</span>
              <span className="text-lg font-black text-emerald-900">
                {seasonalForecast.smoothedBaselineKgPerDay} kg/d
              </span>
            </div>
          </div>

          {/* Actual vs Forecasted Chart */}
          {seasonalForecast.series?.length > 0 && (
            <div className="w-full h-60">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={seasonalForecast.series} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} unit="kg" />
                  <Tooltip contentStyle={{ borderRadius: '0.75rem', fontSize: '12px' }} />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Line type="monotone" dataKey="actualKg" name="Actual Feedstock (kg)" stroke="#059669" strokeWidth={2.5} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="predictedKg" name="Forecasted Feedstock (kg)" stroke="#2563eb" strokeDasharray="5 5" strokeWidth={2} dot={{ r: 2.5 }} />
                  <Line type="monotone" dataKey="upperBoundKg" name="95% Upper Bound" stroke="#94a3b8" strokeDasharray="2 3" strokeWidth={1.2} dot={false} />
                  <Line type="monotone" dataKey="lowerBoundKg" name="95% Lower Bound" stroke="#94a3b8" strokeDasharray="2 3" strokeWidth={1.2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* 4-Season Forward Resource Projections with Uncertainty Ranges */}
          {seasonalForecast.seasonalProjections?.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              {seasonalForecast.seasonalProjections.map((sp) => (
                <div key={sp.season} className="p-3.5 rounded-2xl bg-slate-50/70 border border-slate-200/70">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-slate-900">{sp.season}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      {Math.round(sp.seasonalIndex * 100)}% idx
                    </span>
                  </div>
                  <div className="text-sm font-black text-emerald-700">{sp.projectedDailyFeedstockKg} kg/day</div>
                  {sp.feedstockRangeKg && (
                    <div className="text-[10px] text-sky-700 font-semibold">
                      95% Range: {sp.feedstockRangeKg.min}–{sp.feedstockRangeKg.max} kg/d
                    </div>
                  )}
                  <div className="text-[11px] text-slate-600 mt-0.5">
                    ~{sp.projectedDailyBiogasM3} m³/d biogas
                    {sp.biogasRangeM3 ? ` (${sp.biogasRangeM3.min}–${sp.biogasRangeM3.max})` : ''}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">{sp.note}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Admin Server-Side Database Backup Vault */}
      {isAdmin && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4 print:hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-emerald-600" />
                <span>Database Backup Vault (SHA-256 Verified Snapshots)</span>
              </h3>
              <p className="text-xs text-slate-500">
                Create persistent server-side JSON database backups across all 13 operational collections with automatic rollback protection on restore.
              </p>
            </div>
            <button
              onClick={handleCreateServerBackup}
              disabled={creatingBackup}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm disabled:opacity-50 self-start sm:self-auto"
            >
              <Database className="w-3.5 h-3.5" />
              <span>{creatingBackup ? 'Creating Snapshot...' : 'Save Server Snapshot'}</span>
            </button>
          </div>

          {serverBackups.length === 0 ? (
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70 text-xs text-slate-500">
              No server snapshots saved yet. Click <strong>Save Server Snapshot</strong> to store a verified full-database backup on the server.
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-200 rounded-2xl">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                    <th className="p-3 pl-4">Snapshot File</th>
                    <th className="p-3">Created At</th>
                    <th className="p-3 text-right">Documents</th>
                    <th className="p-3">SHA-256 Checksum</th>
                    <th className="p-3 pr-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {serverBackups.slice(0, 8).map((b) => (
                    <tr key={b.filename} className="hover:bg-slate-50/70">
                      <td className="p-3 pl-4 font-mono text-[11px] font-semibold text-slate-800">{b.filename}</td>
                      <td className="p-3 text-slate-600">{new Date(b.exportedAt).toLocaleString()}</td>
                      <td className="p-3 text-right font-bold text-emerald-700">{b.totalDocuments}</td>
                      <td className="p-3 font-mono text-[10px] text-slate-500">
                        {b.checksumSha256 ? `${b.checksumSha256.slice(0, 14)}…` : 'Legacy'}
                      </td>
                      <td className="p-3 pr-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => handleDownloadServerBackup(b.filename)}
                            className="px-2.5 py-1 rounded-lg border border-slate-200 text-[11px] font-semibold text-slate-700 hover:bg-slate-100"
                          >
                            Download
                          </button>
                          <button
                            onClick={() => handleOpenServerRestoreModal(b)}
                            className="px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-[11px] font-bold text-amber-800 hover:bg-amber-100"
                          >
                            Restore
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Village-wise Resource Availability Summary Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden print:rounded-none">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">Gram Panchayat Resource Summary</h3>
            <p className="text-xs text-slate-500">
              Cattle population, daily bovine dung availability, and installed capacity across villages
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                <th className="p-3.5 pl-6">Gram Panchayat</th>
                <th className="p-3.5">District / State</th>
                <th className="p-3.5 text-right">Households</th>
                <th className="p-3.5 text-right">Cattle Pop.</th>
                <th className="p-3.5 text-right">Dung Availability</th>
                <th className="p-3.5 text-right">Plants (Active)</th>
                <th className="p-3.5 text-right">Installed Cap.</th>
                <th className="p-3.5 pr-6 text-right">Est Annual Savings</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="8" className="p-8 text-center text-slate-400">
                    Loading village reports...
                  </td>
                </tr>
              ) : villageSummaries.length === 0 ? (
                <tr>
                  <td colSpan="8" className="p-8 text-center text-slate-400">
                    No village summaries available.
                  </td>
                </tr>
              ) : (
                villageSummaries.map((v) => (
                  <tr key={v.villageId} className="hover:bg-slate-50/60 transition-colors">
                    <td className="p-3.5 pl-6 font-bold text-slate-900">{v.villageName}</td>
                    <td className="p-3.5 text-slate-600">
                      {v.district}, {v.state}
                    </td>
                    <td className="p-3.5 text-right font-medium text-slate-700">{v.households}</td>
                    <td className="p-3.5 text-right font-medium text-slate-700">{v.cattlePopulation} head</td>
                    <td className="p-3.5 text-right font-bold text-emerald-700">{v.dailyDungAvailabilityKg} kg/d</td>
                    <td className="p-3.5 text-right text-slate-700">
                      {v.biogasPlantsCount} ({v.activePlants} active)
                    </td>
                    <td className="p-3.5 text-right font-semibold text-slate-900">{v.installedCapacityM3} m³</td>
                    <td className="p-3.5 pr-6 text-right font-bold text-emerald-700">
                      ₹{v.annualLpgSavingsINR.toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Household Contribution Rankings & Plant Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Contributing Households */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden print:rounded-none">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Top Household Waste Contributors</h3>
            <span className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
              <Award className="w-3.5 h-3.5" /> Leaderboard
            </span>
          </div>

          <div className="divide-y divide-slate-100 text-xs">
            {topContributors.map((c, i) => (
              <div key={i} className="p-3.5 flex items-center justify-between hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-[11px]">
                    {i + 1}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900">{c.headOfFamily}</h4>
                    <span className="text-[11px] text-slate-400">
                      {c.householdCode} ({c.villageName})
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="font-bold text-emerald-700 block">{c.totalDailyContributionKg} kg / day</span>
                  <span className="text-[10px] text-slate-400">{c.monthlyCredits} credit pts</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Plant Performance Table */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden print:rounded-none">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Active Plant Performance</h3>
            <span className="text-[11px] text-slate-500">Utilization & Carbon Offset</span>
          </div>

          <div className="divide-y divide-slate-100 text-xs">
            {plantPerformance.map((p, i) => (
              <div key={i} className="p-3.5 flex items-center justify-between hover:bg-slate-50 transition-colors">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-slate-900">{p.plantName}</h4>
                    <span className="text-[10px] bg-slate-100 text-slate-600 px-1 rounded">{p.capacityM3} m³</span>
                  </div>
                  <span className="text-[11px] text-slate-500">
                    {p.villageName} | Status: <strong className={p.status === 'Active' ? 'text-emerald-600' : 'text-amber-600'}>{p.status}</strong>
                  </span>
                </div>

                <div className="text-right">
                  <span className="font-bold text-slate-900 block">{p.utilizationRate} Efficiency</span>
                  <span className="text-[10px] text-emerald-600 flex items-center justify-end gap-1">
                    <Leaf className="w-3 h-3" />
                    {p.annualCo2ReductionKg} kg CO₂/yr
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Explicit Database Restore Confirmation Modal */}
      <Modal
        isOpen={Boolean(pendingRestore)}
        onClose={() => {
          setPendingRestore(null);
          setRestoreConfirmed(false);
        }}
        title="Confirm Full Database Restoration"
      >
        {pendingRestore && (
          <div className="space-y-4 text-xs">
            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="block mb-0.5">Destructive Operation Warning</strong>
                Restoring this snapshot will replace all current operational records across 13 MongoDB collections. User accounts remain preserved, and an automatic rollback guard protects against partial write failures.
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Source:</span>
                <strong className="text-slate-900">{pendingRestore.sourceLabel}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Snapshot Timestamp:</span>
                <strong className="text-slate-800">
                  {pendingRestore.metadata?.exportedAt
                    ? new Date(pendingRestore.metadata.exportedAt).toLocaleString()
                    : 'Unknown'}
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Total Documents:</span>
                <strong className="text-emerald-700">{pendingRestore.metadata?.totalDocuments ?? 'Verified on server'}</strong>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Integrity Hash (SHA-256):</span>
                <span className="font-mono text-[10px] text-slate-700 inline-flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  {pendingRestore.metadata?.checksumSha256
                    ? `${pendingRestore.metadata.checksumSha256.slice(0, 18)}…`
                    : 'Not signed'}
                </span>
              </div>
            </div>

            <label className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200 bg-white cursor-pointer">
              <input
                type="checkbox"
                checked={restoreConfirmed}
                onChange={(e) => setRestoreConfirmed(e.target.checked)}
                className="mt-0.5 accent-emerald-600"
              />
              <span className="text-slate-700 font-medium">
                I confirm that I want to overwrite current operational database collections with this verified backup snapshot.
              </span>
            </label>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  setPendingRestore(null);
                  setRestoreConfirmed(false);
                }}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!restoreConfirmed || restoring}
                onClick={handleConfirmDatabaseRestore}
                className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold disabled:opacity-40"
              >
                {restoring ? 'Verifying & Restoring...' : 'Confirm Overwrite & Restore'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ReportsAnalytics;
