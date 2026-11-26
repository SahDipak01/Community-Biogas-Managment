import React, { useState, useEffect } from 'react';
import { getPendingOps, syncPendingOps } from '../../services/offlineSync';
import api from '../../services/api';
import { Wifi, WifiOff, RefreshCw, CheckCircle2, AlertCircle, Clock, X, Database } from 'lucide-react';

const OfflineSyncModal = ({ isOpen, onClose }) => {
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [pendingOps, setPendingOps] = useState([]);
  const [syncing, setSyncing] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [serverLogs, setServerLogs] = useState([]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const loadData = async () => {
    try {
      const ops = await getPendingOps();
      setPendingOps(ops);
      if (navigator.onLine) {
        const res = await api.get('/sync/logs').catch(() => null);
        if (res?.data?.success) {
          setServerLogs(res.data.data);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSyncNow = async () => {
    if (!isOnline) {
      setErrorMsg('Cannot synchronize while offline. Please connect to internet.');
      return;
    }

    try {
      setSyncing(true);
      setErrorMsg('');
      setStatusMsg('');
      const res = await syncPendingOps();
      if (res.success) {
        setStatusMsg(`Successfully synchronized ${res.applied || res.count} records with the server.`);
        await loadData();
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || err.message || 'Synchronization failed.');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center">
              <Database className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-wide">Offline Data & Synchronization Hub</h3>
              <p className="text-[11px] text-slate-300">Rural field caching & idempotent sync center</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Connectivity Status Strip */}
        <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            {isOnline ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                <Wifi className="w-3.5 h-3.5 text-emerald-600" /> Online Network Active
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-300">
                <WifiOff className="w-3.5 h-3.5 text-rose-600" /> Offline Mode (Local Storage)
              </span>
            )}
          </div>

          <div className="text-xs text-slate-500 font-medium">
            Pending records: <span className="font-bold text-slate-900">{pendingOps.length}</span>
          </div>
        </div>

        {/* Action & Alerts */}
        <div className="p-5 space-y-4">
          {statusMsg && (
            <div className="p-3 bg-emerald-50 text-emerald-700 text-xs rounded-xl border border-emerald-200 font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{statusMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-xl border border-rose-200 font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Pending queue preview */}
          <div>
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Locally Queued Mutations ({pendingOps.length})
            </h4>

            {pendingOps.length === 0 ? (
              <div className="p-6 text-center border-2 border-dashed border-slate-200 rounded-2xl">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                <p className="text-xs font-bold text-slate-700">All local data is fully synchronized</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Any records entered while offline will be safely queued here in IndexedDB.
                </p>
              </div>
            ) : (
              <div className="max-h-48 overflow-y-auto space-y-2">
                {pendingOps.map((op) => (
                  <div
                    key={op.clientOpId}
                    className="p-3 bg-amber-50/60 border border-amber-200 rounded-xl flex items-center justify-between text-xs"
                  >
                    <div>
                      <p className="font-bold text-slate-800">{op.entityType}</p>
                      <p className="text-[10px] text-slate-500">
                        {op.operation} • OpID: {op.clientOpId.slice(-8)}
                      </p>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-200 text-amber-900">
                      Pending Sync
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Server confirmation logs */}
          {serverLogs.length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Recent Server Sync Audit
              </h4>
              <div className="max-h-36 overflow-y-auto divide-y divide-slate-100 border border-slate-100 rounded-2xl p-2 bg-slate-50/50">
                {serverLogs.slice(0, 5).map((log) => (
                  <div key={log._id} className="py-1.5 flex items-center justify-between text-[11px]">
                    <span className="text-slate-700 font-medium">{log.entityType}</span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(log.serverTimestamp).toLocaleTimeString()}
                    </span>
                    <span className="text-[10px] font-bold text-emerald-600 px-1.5 py-0.5 bg-emerald-50 rounded">
                      {log.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Buttons */}
          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50"
            >
              Close
            </button>
            <button
              onClick={handleSyncNow}
              disabled={syncing || pendingOps.length === 0}
              className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 shadow-sm ${
                pendingOps.length === 0
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/30'
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
              <span>{syncing ? 'Synchronizing...' : 'Synchronize Now'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OfflineSyncModal;
