import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { useLanguage } from '../../context/LanguageContext';
import { getPendingOps } from '../../services/offlineSync';
import EmergencyAlertModal from '../modals/EmergencyAlertModal';
import VoiceAssistantModal from '../modals/VoiceAssistantModal';
import OfflineSyncModal from '../modals/OfflineSyncModal';
import WastePickupModal from '../modals/WastePickupModal';
import PlantBreakdownModal from '../modals/PlantBreakdownModal';
import GrievanceModal from '../modals/GrievanceModal';
import {
  Bell,
  Menu,
  X,
  LogOut,
  User,
  Shield,
  MapPin,
  CheckCheck,
  Flame,
  AlertTriangle,
  Info,
  Mic,
  Globe,
  AlertOctagon,
  Wifi,
  WifiOff
} from 'lucide-react';

const Navbar = ({ onToggleSidebar }) => {
  const { user, logout } = useAuth();
  const { notifications, unreadCount, markAllAsRead } = useNotification();
  const { language, setLanguage, t } = useLanguage();
  const [showNotifications, setShowNotifications] = useState(false);
  const notifRef = useRef(null);

  // Modals state
  const [showEmergency, setShowEmergency] = useState(false);
  const [showVoice, setShowVoice] = useState(false);
  const [showSync, setShowSync] = useState(false);
  const [showWaste, setShowWaste] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [showGrievance, setShowGrievance] = useState(false);

  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check pending count
    getPendingOps().then((ops) => setPendingSyncCount(ops.length)).catch(() => {});

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getRoleBadge = (role) => {
    switch (role) {
      case 'admin':
        return (
          <span className="bg-emerald-100 text-emerald-800 text-[11px] font-semibold px-2 py-0.5 rounded-full border border-emerald-300">
            Administrator
          </span>
        );
      case 'coordinator':
        return (
          <span className="bg-sky-100 text-sky-800 text-[11px] font-semibold px-2 py-0.5 rounded-full border border-sky-300">
            Village Coordinator
          </span>
        );
      default:
        return (
          <span className="bg-amber-100 text-amber-800 text-[11px] font-semibold px-2 py-0.5 rounded-full border border-amber-300">
            Household User
          </span>
        );
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200/80 px-4 sm:px-6 py-2.5">
      <div className="flex items-center justify-between">
        {/* Left Section: Brand & Sidebar Toggle */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleSidebar}
            className="lg:hidden p-2 rounded-xl text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-sm shadow-emerald-500/20">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-900 leading-tight">
                Rural Biogas <span className="text-emerald-600 font-semibold text-xs px-1.5 py-0.5 rounded bg-emerald-50 border border-emerald-200">System</span>
              </h1>
              <p className="text-[11px] text-slate-500 hidden sm:block">Feasibility & Resource Management Platform</p>
            </div>
          </div>
        </div>

        {/* Right Section: Emergency trigger, Language, Voice, Sync, Notifications, Profile */}
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          {/* Emergency Alert Button - Red Pulse */}
          <button
            onClick={() => setShowEmergency(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-600/30 transition-all animate-pulse"
            title="Report Urgent Gas Leak or Pipeline Hazard"
          >
            <AlertOctagon className="w-4 h-4" />
            <span className="hidden sm:inline">
              {language === 'ta' ? 'அவசரம்!' : 'EMERGENCY'}
            </span>
          </button>

          {/* Voice Assistant Button */}
          <button
            onClick={() => setShowVoice(true)}
            className="p-2 rounded-xl text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors"
            title="Rural Voice Assistant"
          >
            <Mic className="w-4 h-4" />
          </button>

          {/* Language Selector Button */}
          <button
            onClick={() => setLanguage(language === 'en' ? 'ta' : 'en')}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold border border-slate-200 hover:bg-slate-100 text-slate-700 transition-colors"
            title="Switch Language / மொழியை மாற்றுக"
          >
            <Globe className="w-3.5 h-3.5 text-emerald-600" />
            <span>{language === 'en' ? 'தமிழ்' : 'English'}</span>
          </button>

          {/* Offline Sync Status Indicator */}
          <button
            onClick={() => setShowSync(true)}
            className={`p-2 rounded-xl border transition-colors relative ${
              isOnline
                ? 'text-slate-600 border-slate-200 hover:bg-slate-100'
                : 'text-amber-700 bg-amber-50 border-amber-300'
            }`}
            title="Offline & Sync Center"
          >
            {isOnline ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
            {pendingSyncCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 text-white text-[9px] font-bold flex items-center justify-center">
                {pendingSyncCount}
              </span>
            )}
          </button>

          {/* Notifications Dropdown */}
          <div ref={notifRef} className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
              title="System Alerts & Notifications"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-slate-200 py-3 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-4 pb-2.5 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-800">Notifications</span>
                    {unreadCount > 0 && (
                      <span className="text-xs bg-rose-100 text-rose-700 font-medium px-2 py-0.5 rounded-full">
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="text-xs text-emerald-600 hover:text-emerald-700 flex items-center gap-1 font-medium"
                    >
                      <CheckCheck className="w-3.5 h-3.5" /> Mark read
                    </button>
                  )}
                </div>

                <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-400">
                      No recent notifications or alerts.
                    </div>
                  ) : (
                    notifications.map((notif) => (
                      <div
                        key={notif._id}
                        className={`p-3.5 hover:bg-slate-50/80 transition-colors flex gap-3 ${
                          !notif.isRead ? 'bg-emerald-50/30' : ''
                        }`}
                      >
                        <div className="pt-0.5 flex-shrink-0">
                          {notif.type === 'alert' || notif.type === 'emergency' ? (
                            <AlertTriangle className="w-4 h-4 text-rose-500" />
                          ) : notif.type === 'warning' ? (
                            <AlertTriangle className="w-4 h-4 text-amber-500" />
                          ) : (
                            <Info className="w-4 h-4 text-sky-500" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-slate-800 leading-snug">{notif.title}</p>
                          <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">{notif.message}</p>
                          <span className="text-[10px] text-slate-400 mt-1 block">
                            {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User Profile & Logout */}
          <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
            <div className="hidden sm:block text-right">
              <div className="text-xs font-semibold text-slate-800">{user?.name || 'User'}</div>
              <div>{getRoleBadge(user?.role)}</div>
            </div>

            <button
              onClick={logout}
              title="Sign Out"
              className="p-2 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Render Popups & Accessibility Modals */}
      <EmergencyAlertModal
        isOpen={showEmergency}
        onClose={() => setShowEmergency(false)}
      />

      <VoiceAssistantModal
        isOpen={showVoice}
        onClose={() => setShowVoice(false)}
        onOpenWasteModal={() => setShowWaste(true)}
        onOpenBreakdownModal={() => setShowBreakdown(true)}
        onOpenGrievanceModal={() => setShowGrievance(true)}
        onOpenEmergencyModal={() => setShowEmergency(true)}
      />

      <OfflineSyncModal
        isOpen={showSync}
        onClose={() => {
          setShowSync(false);
          getPendingOps().then((ops) => setPendingSyncCount(ops.length)).catch(() => {});
        }}
      />

      <WastePickupModal
        isOpen={showWaste}
        onClose={() => setShowWaste(false)}
      />

      <PlantBreakdownModal
        isOpen={showBreakdown}
        onClose={() => setShowBreakdown(false)}
      />

      <GrievanceModal
        isOpen={showGrievance}
        onClose={() => setShowGrievance(false)}
      />
    </header>
  );
};

export default Navbar;
