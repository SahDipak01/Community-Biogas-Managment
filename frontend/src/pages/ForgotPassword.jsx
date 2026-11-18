import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useNotification } from '../context/NotificationContext';
import api from '../services/api';
import { Flame, Lock, Mail, KeyRound, ArrowRight, ArrowLeft, CheckCircle2, Shield, Eye, EyeOff, Copy, Check } from 'lucide-react';

const ForgotPassword = () => {
  const [step, setStep] = useState(1); // 1 = Request Token, 2 = Reset Password
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const { addToast } = useNotification();
  const navigate = useNavigate();

  // Step 1: Request password reset token
  const handleRequestToken = async (e) => {
    e.preventDefault();
    if (!email) {
      addToast('Please enter your email address', 'warning');
      return;
    }

    try {
      setLoading(true);
      const res = await api.post('/auth/forgot-password', { email: email.trim() });
      if (res.data.success) {
        addToast(res.data.message || 'Reset token generated successfully', 'success');
        if (res.data.resetToken) {
          setToken(res.data.resetToken);
        }
        setStep(2);
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Could not find an account with that email address.';
      addToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Set new password using token
  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!token || !newPassword) {
      addToast('Please enter both the reset token and your new password', 'warning');
      return;
    }

    if (newPassword.length < 6) {
      addToast('Password must be at least 6 characters long', 'warning');
      return;
    }

    if (newPassword !== confirmPassword) {
      addToast('Passwords do not match. Please re-enter.', 'warning');
      return;
    }

    try {
      setLoading(true);
      const res = await api.post('/auth/reset-password', {
        token: token.trim(),
        password: newPassword
      });
      if (res.data.success) {
        addToast('Password has been successfully reset! Please sign in with your new password.', 'success');
        navigate('/login');
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Invalid or expired reset token. Please try requesting a new one.';
      addToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const copyTokenToClipboard = () => {
    if (token) {
      navigator.clipboard.writeText(token);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      addToast('Reset token copied to clipboard', 'info');
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
            Account Security & Self-Service Password Recovery
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl p-7 border border-slate-200/80 shadow-xl shadow-slate-200/50">
          {/* Step Indicator Tabs */}
          <div className="flex items-center justify-between mb-6 p-1 bg-slate-100 rounded-2xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => setStep(1)}
              className={`flex-1 py-2 text-center rounded-xl transition-all ${
                step === 1 ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              1. Request Reset
            </button>
            <button
              type="button"
              onClick={() => setStep(2)}
              className={`flex-1 py-2 text-center rounded-xl transition-all ${
                step === 2 ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              2. Set New Password
            </button>
          </div>

          {step === 1 ? (
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Mail className="w-4 h-4 text-emerald-600" />
                <h3 className="text-lg font-bold text-slate-800">Forgot Password</h3>
              </div>
              <p className="text-xs text-slate-500 mb-6">
                Enter your registered email address to generate an authorized password reset token.
              </p>

              <form onSubmit={handleRequestToken} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Registered Email Address</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@biogas.gov.in"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                      required
                      autoComplete="email"
                    />
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
                      <span>Generate Reset Token</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-4 text-center">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="text-xs text-slate-500 hover:text-emerald-700 font-medium transition-colors"
                >
                  Already have a reset token? <span className="text-emerald-600 font-semibold underline">Reset here</span>
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-2 mb-1">
                <KeyRound className="w-4 h-4 text-emerald-600" />
                <h3 className="text-lg font-bold text-slate-800">Set New Password</h3>
              </div>
              <p className="text-xs text-slate-500 mb-5">
                Provide your secure reset token and choose a new password with at least 6 characters.
              </p>

              {token && (
                <div className="mb-4 p-3 rounded-2xl bg-emerald-50 border border-emerald-200/80">
                  <div className="flex items-center justify-between mb-1 text-[11px] font-bold text-emerald-800">
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      Active Reset Token Ready
                    </span>
                    <button
                      type="button"
                      onClick={copyTokenToClipboard}
                      className="text-emerald-700 hover:text-emerald-900 inline-flex items-center gap-1 text-[11px]"
                    >
                      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      {copied ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                  <p className="text-[11px] font-mono text-emerald-900 break-all select-all">{token}</p>
                </div>
              )}

              <form onSubmit={handleResetPassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Reset Token</label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={token}
                      onChange={(e) => setToken(e.target.value)}
                      placeholder="Paste your reset token here"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">New Password</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Minimum 6 characters"
                      className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                      required
                      minLength={6}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Confirm New Password</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-type new password"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                      required
                      minLength={6}
                      autoComplete="new-password"
                    />
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
                      <span>Reset Password & Sign In</span>
                      <CheckCircle2 className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-4 text-center">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-xs text-slate-500 hover:text-slate-700 font-medium inline-flex items-center gap-1 transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Request a different token</span>
                </button>
              </div>
            </div>
          )}

          {/* Footer Back Link */}
          <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-between text-xs">
            <Link to="/login" className="inline-flex items-center gap-1.5 text-slate-500 hover:text-slate-800 font-semibold transition-colors">
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Sign In</span>
            </Link>
            <Link to="/register" className="text-emerald-600 font-semibold hover:underline">
              Create Account
            </Link>
          </div>
        </div>

        <p className="text-[11px] text-slate-400 text-center mt-6">
          Encrypted credentials with salted bcrypt password security
        </p>
      </div>
    </div>
  );
};

export default ForgotPassword;
