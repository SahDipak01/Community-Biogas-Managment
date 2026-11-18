import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import {
  ShieldCheck,
  Search,
  User,
  Users,
  Shield,
  Home,
  CheckCircle2,
  XCircle,
  Building,
  History,
  RefreshCw,
  KeyRound,
  X
} from 'lucide-react';

const UserManagement = () => {
  const { user } = useAuth();
  const { addToast } = useNotification();

  const [activeTab, setActiveTab] = useState('users'); // users | audit
  const [users, setUsers] = useState([]);
  const [villages, setVillages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedRole, setSelectedRole] = useState('all');

  // Password reset modal state
  const [resetModalUser, setResetModalUser] = useState(null);
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [modalSaving, setModalSaving] = useState(false);

  // Audit Log state
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditEntityFilter, setAuditEntityFilter] = useState('all');
  const [auditSearch, setAuditSearch] = useState('');

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (selectedRole && selectedRole !== 'all') params.append('role', selectedRole);

      const [uRes, vRes] = await Promise.all([api.get(`/users?${params.toString()}`), api.get('/villages')]);

      if (uRes.data.success) setUsers(uRes.data.data);
      if (vRes.data.success) setVillages(vRes.data.data);
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      setAuditLoading(true);
      const params = new URLSearchParams();
      if (auditEntityFilter && auditEntityFilter !== 'all') params.append('entityType', auditEntityFilter);
      if (auditSearch) params.append('search', auditSearch);
      params.append('limit', '100');
      const res = await api.get(`/users/audit-logs?${params.toString()}`);
      if (res.data.success) setAuditLogs(res.data.data);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setAuditLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [search, selectedRole]);

  useEffect(() => {
    if (activeTab === 'audit') {
      fetchAuditLogs();
    }
  }, [activeTab, auditEntityFilter, auditSearch]);

  const handleRoleChange = async (userId, newRole) => {
    try {
      const res = await api.put(`/users/${userId}`, { role: newRole });
      if (res.data.success) {
        addToast(`User role updated to ${newRole}`, 'success');
        fetchUsers();
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Error updating role', 'error');
    }
  };

  const handleStatusToggle = async (userId, currentStatus) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    try {
      const res = await api.put(`/users/${userId}`, { status: newStatus });
      if (res.data.success) {
        addToast(`User account set to ${newStatus}`, 'success');
        fetchUsers();
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Error updating status', 'error');
    }
  };

  const handleAdminResetSubmit = async () => {
    if (!resetModalUser || !newPasswordInput || newPasswordInput.length < 6) return;
    try {
      setModalSaving(true);
      const res = await api.put(`/users/${resetModalUser._id}/reset-password`, {
        newPassword: newPasswordInput
      });
      if (res.data.success) {
        addToast(res.data.message || 'Password updated successfully', 'success');
        setResetModalUser(null);
        setNewPasswordInput('');
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to update user password', 'error');
    } finally {
      setModalSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold mb-2 border border-emerald-200">
            <ShieldCheck className="w-3.5 h-3.5" />
            Security & Role Access Control
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900">User Governance & Permissions</h2>
          <p className="text-xs text-slate-500 mt-1 max-w-xl">
            Control role hierarchies for Administrators, Village Resource Coordinators, and Rural Household users, and review timestamped system audit trails.
          </p>
        </div>

        <div className="inline-flex rounded-xl bg-slate-100 p-1 text-xs font-bold self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('users')}
            className={`px-3.5 py-2 rounded-lg transition-colors flex items-center gap-1.5 ${
              activeTab === 'users' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Users ({users.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`px-3.5 py-2 rounded-lg transition-colors flex items-center gap-1.5 ${
              activeTab === 'audit' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Audit Logs</span>
          </button>
        </div>
      </div>

      {activeTab === 'users' && (
        <>
          {/* Search and Filters */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, or phone..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500 text-xs"
          />
        </div>

        <select
          value={selectedRole}
          onChange={(e) => setSelectedRole(e.target.value)}
          className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-slate-50 focus:outline-none"
        >
          <option value="all">All Roles</option>
          <option value="admin">Administrators</option>
          <option value="coordinator">Village Coordinators</option>
          <option value="household">Household Users</option>
        </select>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                <th className="p-3.5 pl-6">User Name</th>
                <th className="p-3.5">Email Address</th>
                <th className="p-3.5">Contact Phone</th>
                <th className="p-3.5">Assigned Village</th>
                <th className="p-3.5">System Role</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 pr-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="7" className="p-8 text-center text-slate-400">
                    Loading user registry...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan="7" className="p-8 text-center text-slate-400">
                    No users matching criteria.
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u._id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="p-3.5 pl-6 font-bold text-slate-900">{u.name}</td>
                    <td className="p-3.5 text-slate-600">{u.email}</td>
                    <td className="p-3.5 text-slate-600">{u.phone || 'N/A'}</td>
                    <td className="p-3.5 text-slate-600">
                      {u.village ? u.village.name : <span className="italic text-slate-400">Unassigned</span>}
                    </td>
                    <td className="p-3.5">
                      <select
                        value={u.role}
                        disabled={u._id === user?._id}
                        onChange={(e) => handleRoleChange(u._id, e.target.value)}
                        className="px-2.5 py-1 rounded-lg border border-slate-200 font-semibold text-slate-800 bg-slate-50 disabled:opacity-50"
                      >
                        <option value="admin">Administrator</option>
                        <option value="coordinator">Village Coordinator</option>
                        <option value="household">Household User</option>
                      </select>
                    </td>
                    <td className="p-3.5">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          u.status === 'active'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {u.status === 'active' ? (
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        ) : (
                          <XCircle className="w-3 h-3 text-rose-600" />
                        )}
                        <span className="capitalize">{u.status}</span>
                      </span>
                    </td>
                    <td className="p-3.5 pr-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setResetModalUser(u);
                            setNewPasswordInput('');
                          }}
                          title="Reset Password for this user"
                          className="text-[11px] font-semibold px-2.5 py-1 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300 transition-colors inline-flex items-center gap-1"
                        >
                          <KeyRound className="w-3 h-3 text-slate-500" />
                          <span>Reset Pwd</span>
                        </button>
                        {u._id !== user?._id && (
                          <button
                            onClick={() => handleStatusToggle(u._id, u.status)}
                            className={`text-xs font-semibold px-3 py-1 rounded-lg border transition-colors ${
                              u.status === 'active'
                                ? 'text-rose-600 border-rose-200 hover:bg-rose-50'
                                : 'text-emerald-600 border-emerald-200 hover:bg-emerald-50'
                            }`}
                          >
                            {u.status === 'active' ? 'Suspend' : 'Activate'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
        </>
      )}

      {activeTab === 'audit' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={auditSearch}
                onChange={(e) => setAuditSearch(e.target.value)}
                placeholder="Search action, actor email, or event summary..."
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500 text-xs"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={auditEntityFilter}
                onChange={(e) => setAuditEntityFilter(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-slate-50"
              >
                <option value="all">All Modules</option>
                <option value="User">Users & Auth</option>
                <option value="Database">Database Backup/Restore</option>
                <option value="FeedstockRecord">Feedstock Records</option>
                <option value="PlantMonitoring">Plant Monitoring</option>
                <option value="BiogasPlant">Biogas Plants</option>
                <option value="DigestateDistribution">Digestate & Fertilizer</option>
                <option value="SimulationScenario">Digital Twin Scenarios</option>
                <option value="GovernmentScheme">Government Schemes</option>
                <option value="Household">Households</option>
              </select>

              <button
                onClick={fetchAuditLogs}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                    <th className="p-3.5 pl-6">Timestamp</th>
                    <th className="p-3.5">Actor</th>
                    <th className="p-3.5">Action</th>
                    <th className="p-3.5">Module</th>
                    <th className="p-3.5 pr-6">Event Summary</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {auditLoading ? (
                    <tr>
                      <td colSpan="5" className="p-8 text-center text-slate-400">
                        Loading system audit logs...
                      </td>
                    </tr>
                  ) : auditLogs.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="p-8 text-center text-slate-400">
                        No audit events recorded yet for this filter.
                      </td>
                    </tr>
                  ) : (
                    auditLogs.map((log) => (
                      <tr key={log._id} className="hover:bg-slate-50/60">
                        <td className="p-3.5 pl-6 whitespace-nowrap text-slate-600 font-mono text-[11px]">
                          {new Date(log.createdAt).toLocaleString()}
                        </td>
                        <td className="p-3.5">
                          <div className="font-bold text-slate-900">{log.actorName || 'System'}</div>
                          <span className="text-[10px] text-slate-400">
                            {log.actorEmail || 'system'} • {log.actorRole}
                          </span>
                        </td>
                        <td className="p-3.5">
                          <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold text-[10px]">
                            {log.action}
                          </span>
                        </td>
                        <td className="p-3.5 font-semibold text-slate-700">{log.entityType}</td>
                        <td className="p-3.5 pr-6 text-slate-700">{log.summary}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Admin Reset Password Modal */}
      {resetModalUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full border border-slate-200 shadow-xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Reset Password</h3>
                  <p className="text-[11px] text-slate-500 truncate max-w-[180px]">{resetModalUser.email}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setResetModalUser(null);
                  setNewPasswordInput('');
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                New Password for {resetModalUser.name}
              </label>
              <input
                type="text"
                value={newPasswordInput}
                onChange={(e) => setNewPasswordInput(e.target.value)}
                placeholder="Enter at least 6 characters"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                autoFocus
              />
              <p className="text-[10px] text-slate-400 mt-1">Must be at least 6 characters long</p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setResetModalUser(null);
                  setNewPasswordInput('');
                }}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAdminResetSubmit}
                disabled={!newPasswordInput || newPasswordInput.length < 6 || modalSaving}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm disabled:opacity-50 transition-colors"
              >
                {modalSaving ? 'Saving...' : 'Update Password'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
