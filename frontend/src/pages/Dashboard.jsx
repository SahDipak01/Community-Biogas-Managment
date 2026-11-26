import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import AdminDashboardView from '../components/dashboard/AdminDashboardView';
import CoordinatorDashboardView from '../components/dashboard/CoordinatorDashboardView';
import HouseholdDashboardView from '../components/dashboard/HouseholdDashboardView';
import { ShieldCheck, Briefcase, Home, Eye } from 'lucide-react';

const Dashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [selectedVillage, setSelectedVillage] = useState('all');
  // For Admin role: allow previewing other role perspectives
  const [viewMode, setViewMode] = useState(user?.role || 'household');

  useEffect(() => {
    if (user?.role) {
      setViewMode(user.role);
    }
  }, [user]);

  const fetchDashboardData = async (villageId) => {
    try {
      setLoading(true);
      const url =
        villageId && villageId !== 'all'
          ? `/dashboard/summary?villageId=${villageId}`
          : '/dashboard/summary';
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
          <p className="text-xs font-medium text-slate-500">Loading personalized role metrics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Admin Role Perspective Switcher Bar (Only visible to Administrators) */}
      {user?.role === 'admin' && (
        <div className="bg-white rounded-2xl p-2.5 px-4 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-600 font-medium">
            <Eye className="w-4 h-4 text-emerald-600" />
            <span>Administrator Perspective Switcher:</span>
          </div>
          <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200">
            <button
              onClick={() => setViewMode('admin')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                viewMode === 'admin'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Admin Center</span>
            </button>
            <button
              onClick={() => setViewMode('coordinator')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                viewMode === 'coordinator'
                  ? 'bg-teal-700 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Briefcase className="w-3.5 h-3.5" />
              <span>Coordinator View</span>
            </button>
            <button
              onClick={() => setViewMode('household')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                viewMode === 'household'
                  ? 'bg-emerald-700 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Home className="w-3.5 h-3.5" />
              <span>Household View</span>
            </button>
          </div>
        </div>
      )}

      {/* Render the specialized Role Dashboard */}
      {viewMode === 'admin' && (
        <AdminDashboardView
          data={data}
          selectedVillage={selectedVillage}
          onSelectVillage={setSelectedVillage}
          onRefresh={() => fetchDashboardData(selectedVillage)}
        />
      )}

      {viewMode === 'coordinator' && (
        <CoordinatorDashboardView
          data={data}
          onRefresh={() => fetchDashboardData(selectedVillage)}
        />
      )}

      {viewMode === 'household' && (
        <HouseholdDashboardView
          data={data}
          onRefresh={() => fetchDashboardData(selectedVillage)}
        />
      )}
    </div>
  );
};

export default Dashboard;
