import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { Flame, Lock, Mail, ArrowRight, ShieldCheck, Users, Home, Eye, EyeOff } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { addToast } = useNotification();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      addToast('Please enter both email and password', 'warning');
      return;
    }

    try {
      setLoading(true);
      const user = await login(email, password);
      addToast(`Welcome back, ${user.name}!`, 'success');
      navigate('/');
    } catch (err) {
      const msg = err.response?.data?.message || 'Login failed. Please check your credentials.';
      addToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Demo role shortcuts for instant 1-click evaluation
  const setDemoCredentials = (role) => {
    if (role === 'admin') {
      setEmail('admin@biogas.gov.in');
      setPassword('Admin@123');
    } else if (role === 'coordinator') {
      setEmail('coordinator@biogas.gov.in');
      setPassword('Coord@123');
    } else {
      setEmail('household@biogas.gov.in');
      setPassword('House@123');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-slate-50 to-teal-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-lg shadow-emerald-500/25 mb-3">
            <Flame className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Rural Biogas Management</h2>
          <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
            Community Feasibility, Organic Resource Pooling & Digester Monitoring Platform
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-3xl p-7 border border-slate-200/80 shadow-xl shadow-slate-200/50">
          <h3 className="text-lg font-bold text-slate-800 mb-1">Sign in to your account</h3>
          <p className="text-xs text-slate-500 mb-6">Choose a quick demo role or enter your credentials</p>

          {/* Quick Demo Login Chips */}
          <div className="mb-6 p-3 bg-slate-50 rounded-2xl border border-slate-200/60">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-2 text-center">
              Quick 1-Click Demo Logins
            </span>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setDemoCredentials('admin')}
                className="flex flex-col items-center p-2 rounded-xl border border-emerald-200 bg-emerald-50/70 hover:bg-emerald-100/70 transition-all text-emerald-800"
              >
                <ShieldCheck className="w-4 h-4 text-emerald-600 mb-1" />
                <span className="text-[11px] font-bold">Admin</span>
              </button>

              <button
                type="button"
                onClick={() => setDemoCredentials('coordinator')}
                className="flex flex-col items-center p-2 rounded-xl border border-sky-200 bg-sky-50/70 hover:bg-sky-100/70 transition-all text-sky-800"
              >
                <Users className="w-4 h-4 text-sky-600 mb-1" />
                <span className="text-[11px] font-bold">Coordinator</span>
              </button>

              <button
                type="button"
                onClick={() => setDemoCredentials('household')}
                className="flex flex-col items-center p-2 rounded-xl border border-amber-200 bg-amber-50/70 hover:bg-amber-100/70 transition-all text-amber-800"
              >
                <Home className="w-4 h-4 text-amber-600 mb-1" />
                <span className="text-[11px] font-bold">Household</span>
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@biogas.gov.in"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Sign In to Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-500">
              Need a new account?{' '}
              <Link to="/register" className="text-emerald-600 font-semibold hover:underline">
                Register household or village
              </Link>
            </p>
          </div>
        </div>

        <p className="text-[11px] text-slate-400 text-center mt-6">
          Aligned with Ministry of New & Renewable Energy (MNRE) Bioenergy Standards
        </p>
      </div>
    </div>
  );
};

export default Login;
