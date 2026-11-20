import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  LogIn,
  TrendingUp,
  Recycle,
  Users,
  Leaf,
  ShieldCheck,
  Check
} from 'lucide-react';
import biogasLandscape from '../assets/biogas-plant-landscape.jpg';
import LeafFlameLogo from '../components/common/LeafFlameLogo';

const Login = () => {
  const [email, setEmail] = useState(() => localStorage.getItem('biogas_remembered_email') || '');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(() => Boolean(localStorage.getItem('biogas_remembered_email')));
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const { addToast } = useNotification();
  const navigate = useNavigate();

  useEffect(() => {
    if (rememberMe && email) {
      localStorage.setItem('biogas_remembered_email', email);
    } else if (!rememberMe) {
      localStorage.removeItem('biogas_remembered_email');
    }
  }, [rememberMe, email]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      addToast('Please enter both email and password', 'warning');
      return;
    }

    try {
      setLoading(true);
      const user = await login(email.trim(), password);
      addToast(`Welcome back, ${user.name}!`, 'success');
      navigate('/');
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        (err.code === 'ERR_NETWORK' || err.message === 'Network Error'
          ? 'Cannot connect to backend server. Please check your internet connection.'
          : 'Login failed. Please check your credentials.');
      addToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const featureCards = [
    {
      id: 'feasibility',
      titleLine1: 'Biogas',
      titleLine2: 'Feasibility',
      icon: TrendingUp
    },
    {
      id: 'waste',
      titleLine1: 'Waste',
      titleLine2: 'Management',
      icon: Recycle
    },
    {
      id: 'community',
      titleLine1: 'Community',
      titleLine2: 'Sharing',
      icon: Users
    },
    {
      id: 'energy',
      titleLine1: 'Sustainable',
      titleLine2: 'Energy',
      icon: Leaf
    }
  ];

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-[#eefbf4] via-[#f7fcf9] to-[#eaf9f1] flex items-center justify-center p-3 sm:p-5 lg:p-8 overflow-hidden selection:bg-emerald-500 selection:text-white">
      {/* Decorative Top-Left Fresh Foliage SVG */}
      <div className="absolute top-0 left-0 pointer-events-none z-10 w-36 h-36 sm:w-56 sm:h-56 opacity-90 transition-transform duration-700 hover:scale-105">
        <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
          <path
            d="M-20 -20 Q40 60 70 120"
            stroke="#15803d"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          {/* Leaf 1 */}
          <path
            d="M20 10 C35 -5 65 0 75 25 C60 35 35 30 20 10 Z"
            fill="url(#leafGreen1)"
            opacity="0.95"
          />
          <path d="M22 12 Q50 15 72 23" stroke="#166534" strokeWidth="1" />
          {/* Leaf 2 */}
          <path
            d="M45 45 C65 25 95 35 100 65 C80 75 55 70 45 45 Z"
            fill="url(#leafGreen2)"
            opacity="0.95"
          />
          <path d="M47 47 Q75 50 97 63" stroke="#166534" strokeWidth="1" />
          {/* Leaf 3 */}
          <path
            d="M70 90 C85 70 120 80 125 110 C105 120 75 115 70 90 Z"
            fill="url(#leafGreen1)"
            opacity="0.9"
          />
          <path d="M72 92 Q100 95 122 108" stroke="#166534" strokeWidth="1" />
          {/* Leaf 4 drooping */}
          <path
            d="M5 40 C-5 65 15 90 40 90 C45 70 30 50 5 40 Z"
            fill="url(#leafGreen2)"
            opacity="0.85"
          />
          <defs>
            <linearGradient id="leafGreen1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#86efac" />
              <stop offset="60%" stopColor="#22c55e" />
              <stop offset="100%" stopColor="#15803d" />
            </linearGradient>
            <linearGradient id="leafGreen2" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#4ade80" />
              <stop offset="60%" stopColor="#16a34a" />
              <stop offset="100%" stopColor="#166534" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Ambient Eco-Friendly Flowing Wave Accents (Bottom Left & Right) */}
      <div className="absolute bottom-0 left-0 right-0 pointer-events-none z-0 overflow-hidden leading-none">
        <svg
          viewBox="0 0 1440 220"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-28 sm:h-40 md:h-52 opacity-60 preserve-3d"
        >
          <path
            d="M0 130 C320 80 540 180 880 120 C1180 60 1340 160 1440 140 L1440 220 L0 220 Z"
            fill="#86efac"
            fillOpacity="0.35"
          />
          <path
            d="M0 160 C380 120 620 210 960 150 C1240 100 1380 190 1440 170 L1440 220 L0 220 Z"
            fill="#34d399"
            fillOpacity="0.25"
          />
          <path
            d="M0 190 C440 150 720 220 1080 180 C1300 150 1400 200 1440 195 L1440 220 L0 220 Z"
            fill="#059669"
            fillOpacity="0.15"
          />
        </svg>
      </div>

      {/* Main Showcase Presentation Box */}
      <div className="relative z-10 w-full max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center">
        {/* Left Column: Branding, 4 Feature Cards & Biogas Plant Landscape */}
        <div className="lg:col-span-7 flex flex-col justify-between space-y-5 sm:space-y-6">
          {/* Brand Header */}
          <div>
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="flex-shrink-0 p-1 bg-white/70 rounded-2xl shadow-sm border border-emerald-100/70">
                <LeafFlameLogo className="w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20" />
              </div>

              {/* Vertical Divider */}
              <div className="w-[2.5px] h-12 sm:h-14 md:h-16 bg-gradient-to-b from-emerald-600 via-emerald-700 to-teal-800 rounded-full" />

              {/* Headings */}
              <div>
                <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-[#064e3b] tracking-tight leading-none">
                  Rural Community
                </h1>
                <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-[#059669] tracking-tight leading-tight mt-0.5">
                  Biogas Management
                </h2>
              </div>
            </div>

            {/* Subtitle */}
            <p className="text-xs sm:text-[13px] text-slate-600 font-medium tracking-wide mt-2.5 sm:mt-3 pl-1">
              Feasibility Analysis • Resource Management • Sustainable Energy
            </p>

            {/* Tagline Divider */}
            <div className="flex items-center gap-3 mt-2 sm:mt-2.5">
              <div className="h-[1px] flex-1 max-w-[50px] sm:max-w-[70px] bg-emerald-400/80" />
              <span className="text-xs sm:text-[13px] font-bold text-[#047857] italic tracking-wide">
                Clean Energy. Greener Tomorrow.
              </span>
              <div className="h-[1px] flex-1 max-w-[50px] sm:max-w-[70px] bg-emerald-400/80" />
            </div>
          </div>

          {/* 4 Feature Pills / Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
            {featureCards.map((feat) => {
              const Icon = feat.icon;
              return (
                <div
                  key={feat.id}
                  className="bg-white/85 hover:bg-white backdrop-blur-md rounded-2xl p-2.5 sm:p-3 border border-emerald-100/90 shadow-sm hover:shadow-md hover:border-emerald-300 transition-all duration-200 flex flex-col items-center justify-center text-center group"
                >
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors flex items-center justify-center mb-1.5 shadow-inner">
                    <Icon className="w-5 h-5 transition-transform group-hover:scale-110" />
                  </div>
                  <span className="text-[11px] sm:text-xs font-bold text-slate-800 leading-tight">
                    {feat.titleLine1}
                  </span>
                  <span className="text-[11px] sm:text-xs font-bold text-slate-800 leading-tight">
                    {feat.titleLine2}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Biogas Plant Landscape Hero Image Box */}
          <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden border border-emerald-200/80 shadow-md shadow-emerald-950/5 group bg-slate-100">
            <img
              src={biogasLandscape}
              alt="Community Biogas Plant with Biodigester Dome and Greener Village Sign"
              className="w-full h-44 sm:h-52 md:h-60 object-cover object-center transition-transform duration-700 ease-out group-hover:scale-[1.02]"
              loading="eager"
            />
            {/* Subtle Gradient overlay along bottom for crisp integration */}
            <div className="absolute inset-0 bg-gradient-to-t from-emerald-950/20 via-transparent to-transparent pointer-events-none" />
          </div>
        </div>

        {/* Right Column: Clean White Login Card */}
        <div className="lg:col-span-5 w-full flex justify-center">
          <div className="w-full max-w-sm sm:max-w-md bg-white rounded-[28px] sm:rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-xl shadow-slate-200/60 transition-all">
            {/* Card Header with Logo */}
            <div className="text-center mb-5">
              <div className="flex justify-center mb-2">
                <LeafFlameLogo className="w-12 h-12 sm:w-14 sm:h-14 drop-shadow-sm" />
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-[#064e3b] tracking-tight">
                Rural Community Biogas
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-500 font-medium mt-0.5">
                Feasibility and Resource Management System
              </p>
            </div>

            {/* Divider: Login to Your Account */}
            <div className="flex items-center gap-3 mb-5">
              <div className="h-[1.5px] flex-1 bg-emerald-600/70" />
              <span className="text-xs sm:text-[13px] font-bold text-[#064e3b] whitespace-nowrap">
                Login to Your Account
              </span>
              <div className="h-[1.5px] flex-1 bg-emerald-600/70" />
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email Input */}
              <div>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email address"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                    required
                    autoComplete="email"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none p-0.5"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Options Row: Remember Me & Forgot Password */}
              <div className="flex items-center justify-between text-xs pt-0.5">
                <label className="flex items-center gap-2 cursor-pointer select-none text-slate-700 font-medium">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 accent-[#059669] cursor-pointer"
                  />
                  <span>Remember me</span>
                </label>

                <Link
                  to="/forgot-password"
                  className="font-bold text-[#059669] hover:text-[#047857] hover:underline transition-colors"
                >
                  Forgot Password?
                </Link>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3 px-4 rounded-xl bg-[#059669] hover:bg-[#047857] active:bg-[#065f46] text-white text-sm font-bold shadow-md shadow-emerald-600/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <LogIn className="w-4 h-4 stroke-[2.5]" />
                    <span>Login</span>
                  </>
                )}
              </button>
            </form>

            {/* Registration Navigation */}
            <div className="mt-5 text-center text-xs text-slate-600">
              Don't have an account?{' '}
              <Link to="/register" className="text-[#059669] font-bold hover:underline">
                Register here
              </Link>
            </div>

            {/* Bottom Security & Trust Badges */}
            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-around text-[10px] sm:text-[11px] font-medium text-slate-500">
              <div className="flex items-center gap-1 text-[#047857]">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Secure Access</span>
              </div>
              <div className="w-[1px] h-3 bg-slate-200" />
              <div className="flex items-center gap-1 text-[#047857]">
                <Users className="w-3.5 h-3.5" />
                <span>Community Driven</span>
              </div>
              <div className="w-[1px] h-3 bg-slate-200" />
              <div className="flex items-center gap-1 text-[#047857]">
                <Leaf className="w-3.5 h-3.5" />
                <span>Green Future</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
