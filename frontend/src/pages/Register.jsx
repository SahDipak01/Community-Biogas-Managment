import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import api from '../services/api';
import { Flame, Lock, Mail, User, Phone, MapPin, ArrowRight, Eye, EyeOff } from 'lucide-react';

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa',
  'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala',
  'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland',
  'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Delhi', 'Jammu and Kashmir',
  'Ladakh', 'Puducherry'
];

// Additional regional village options users can choose directly during registration
const PRESET_VILLAGES = [
  { key: 'preset:madhopur', name: 'Madhopur Gram Panchayat', district: 'Patna', state: 'Bihar', latitude: 25.5941, longitude: 85.1376 },
  { key: 'preset:kheda', name: 'Kheda Gram', district: 'Pune', state: 'Maharashtra', latitude: 18.5204, longitude: 73.8567 },
  { key: 'preset:devgarh', name: 'Devgarh Village', district: 'Udaipur', state: 'Rajasthan', latitude: 24.5854, longitude: 73.7125 },
  { key: 'preset:pollachi', name: 'Green Valley Gram', district: 'Coimbatore', state: 'Tamil Nadu', latitude: 10.6582, longitude: 77.0082 },
  { key: 'preset:bolpur', name: 'Birbhum Gram', district: 'Bolpur', state: 'West Bengal', latitude: 23.6687, longitude: 87.6828 },
  { key: 'preset:khanna', name: 'Hoshiarpur Kalan', district: 'Ludhiana', state: 'Punjab', latitude: 30.901, longitude: 75.8573 },
  { key: 'preset:sehore', name: 'Narmada Puram Gram', district: 'Sehore', state: 'Madhya Pradesh', latitude: 23.2032, longitude: 77.0844 },
  { key: 'preset:dhamtari', name: 'Kisan Nagar Gram', district: 'Raipur', state: 'Chhattisgarh', latitude: 21.2514, longitude: 81.6296 },
  { key: 'preset:roorkee', name: 'Haridwar Khurd', district: 'Haridwar', state: 'Uttarakhand', latitude: 29.9457, longitude: 78.1642 }
];

const Register = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'household',
    phone: '',
    villageId: ''
  });
  const [customVillage, setCustomVillage] = useState({
    name: '',
    district: '',
    state: '',
    pincode: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [villages, setVillages] = useState([]);
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const { addToast } = useNotification();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchVillages = async () => {
      try {
        const res = await api.get('/villages');
        if (res.data.success) {
          setVillages(res.data.data);
          if (res.data.data.length > 0) {
            setFormData((prev) => ({ ...prev, villageId: res.data.data[0]._id }));
          }
        }
      } catch (err) {
        console.warn('Failed to load villages list:', err.message);
      }
    };
    fetchVillages();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.password) {
      addToast('Please fill out all required fields', 'warning');
      return;
    }

    const payload = { ...formData };

    if (formData.villageId === 'custom') {
      if (!customVillage.name.trim() || !customVillage.district.trim() || !customVillage.state.trim()) {
        addToast('Please enter your Village Name, District, and State', 'warning');
        return;
      }
      payload.villageId = '';
      payload.customVillage = {
        name: customVillage.name.trim(),
        district: customVillage.district.trim(),
        state: customVillage.state.trim(),
        pincode: customVillage.pincode.trim()
      };
    } else if (formData.villageId.startsWith('preset:')) {
      const matchedPreset = PRESET_VILLAGES.find((p) => p.key === formData.villageId);
      if (matchedPreset) {
        payload.villageId = '';
        payload.customVillage = {
          name: matchedPreset.name,
          district: matchedPreset.district,
          state: matchedPreset.state,
          latitude: matchedPreset.latitude,
          longitude: matchedPreset.longitude
        };
      }
    }

    try {
      setLoading(true);
      const user = await register(payload);
      addToast(`Account created successfully! Welcome, ${user.name}`, 'success');
      navigate('/');
    } catch (err) {
      const msg = err.response?.data?.message || 'Registration failed. Please check inputs.';
      addToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-slate-50 to-teal-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full my-8">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-lg shadow-emerald-500/25 mb-2">
            <Flame className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Create Biogas Account</h2>
          <p className="text-xs text-slate-500 mt-0.5">Register as Household User, Village Coordinator, or Admin</p>
        </div>

        <div className="bg-white rounded-3xl p-7 border border-slate-200/80 shadow-xl shadow-slate-200/50">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Full Name</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="e.g. Ramesh Patel"
                  className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="user@example.com"
                  className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Password (Min 6 chars)</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  required
                  minLength={6}
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

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">System Role</label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white"
                >
                  <option value="household">Household User</option>
                  <option value="coordinator">Village Coordinator</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Phone Number</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="+91 98..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Assigned Village</label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <select
                  name="villageId"
                  value={formData.villageId}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white"
                >
                  <option value="">Select Village (Optional for Admin)</option>
                  {villages.length > 0 && (
                    <optgroup label="Registered Villages">
                      {villages.map((v) => (
                        <option key={v._id} value={v._id}>
                          {v.name} ({v.district}, {v.state})
                        </option>
                      ))}
                    </optgroup>
                  )}
                  <optgroup label="Additional Regional Locations">
                    {PRESET_VILLAGES.filter(
                      (p) => !villages.some((v) => v.name.toLowerCase() === p.name.toLowerCase())
                    ).map((p) => (
                      <option key={p.key} value={p.key}>
                        {p.name} ({p.district}, {p.state})
                      </option>
                    ))}
                  </optgroup>
                  <option value="custom">+ Other — Enter My Own Village / Location</option>
                </select>
              </div>

              {formData.villageId === 'custom' && (
                <div className="mt-3 p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-200 space-y-2.5">
                  <p className="text-[11px] font-semibold text-emerald-800">Enter Your Village / Location Details</p>
                  <input
                    type="text"
                    value={customVillage.name}
                    onChange={(e) => setCustomVillage({ ...customVillage, name: e.target.value })}
                    placeholder="Village / Town Name (e.g. Sitapur Gram)"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    required
                  />
                  <div className="grid grid-cols-2 gap-2.5">
                    <input
                      type="text"
                      value={customVillage.district}
                      onChange={(e) => setCustomVillage({ ...customVillage, district: e.target.value })}
                      placeholder="District"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      required
                    />
                    <input
                      type="text"
                      list="indian-states-list"
                      value={customVillage.state}
                      onChange={(e) => setCustomVillage({ ...customVillage, state: e.target.value })}
                      placeholder="State / Region"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      required
                    />
                    <datalist id="indian-states-list">
                      {INDIAN_STATES.map((st) => (
                        <option key={st} value={st} />
                      ))}
                    </datalist>
                  </div>
                  <input
                    type="text"
                    value={customVillage.pincode}
                    onChange={(e) => setCustomVillage({ ...customVillage, pincode: e.target.value })}
                    placeholder="Pincode (Optional, e.g. 221001)"
                    maxLength={10}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-4 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Create Account</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-5 pt-4 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-500">
              Already have an account?{' '}
              <Link to="/login" className="text-emerald-600 font-semibold hover:underline">
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
