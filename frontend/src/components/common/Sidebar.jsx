import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  Calculator,
  Recycle,
  Users2,
  Gauge,
  Map,
  Landmark,
  BarChart3,
  Home,
  Building2,
  ShieldCheck,
  Route,
  Award,
  Sprout,
  Cpu,
  X
} from 'lucide-react';

const Sidebar = ({ isOpen, onClose }) => {
  const { user, isAdmin, isCoordinator, isHousehold } = useAuth();

  const navItems = [
    { to: '/', label: 'Overview Dashboard', icon: LayoutDashboard },
    { to: '/calculator', label: 'Feasibility Calculator', icon: Calculator },
    { to: '/feedstock', label: 'Feedstock & Waste', icon: Recycle },
    { to: '/community', label: 'Community Sharing', icon: Users2 },
    { to: '/monitoring', label: 'Plant Monitoring', icon: Gauge },
    { to: '/map', label: 'Geographical Map', icon: Map },
    { to: '/schemes', label: 'Government Schemes', icon: Landmark },
    { to: '/reports', label: 'Reports & Analytics', icon: BarChart3 }
  ];

  const advancedItems = [
    { to: '/optimizer', label: 'Allocation & Route Optimizer', icon: Route },
    { to: '/incentives', label: 'Contribution & Incentives', icon: Award },
    { to: '/digestate', label: 'Digestate Fertilizer Planner', icon: Sprout },
    { to: '/simulator', label: 'Digital Twin Simulator', icon: Cpu }
  ];

  // Role-specific additions
  if (isHousehold) {
    navItems.splice(1, 0, { to: '/my-household', label: 'My Household & Cattle', icon: Home });
  }

  if (isAdmin || isCoordinator) {
    navItems.push({ to: '/households', label: 'Household Directory', icon: Home });
  }

  if (isAdmin) {
    navItems.push({ to: '/villages', label: 'Villages Registry', icon: Building2 });
    navItems.push({ to: '/users', label: 'Access Control', icon: ShieldCheck });
  }

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm lg:hidden animate-in fade-in duration-200"
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed top-0 left-0 bottom-0 z-40 w-64 bg-slate-900 text-white flex flex-col transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${
          isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
      >
        {/* Header inside sidebar */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center text-white font-bold text-base shadow-md shadow-emerald-500/20">
              BG
            </div>
            <div>
              <span className="font-bold text-sm text-white tracking-wide block">RURAL BIOGAS</span>
              <span className="text-[10px] text-emerald-400 font-semibold uppercase tracking-wider block">
                Resource System
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation links */}
        <div className="flex-1 overflow-y-auto px-3.5 py-4 space-y-1">
          <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            System Modules
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => onClose?.()}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all duration-150 ${
                    isActive
                      ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                  }`
                }
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}

          <div className="px-3 pt-4 pb-2 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
            Advanced Planning & Simulation
          </div>

          {advancedItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => onClose?.()}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all duration-150 ${
                    isActive
                      ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                  }`
                }
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </div>

        {/* User Card at Bottom of Sidebar */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-700/60 border border-emerald-500/40 flex items-center justify-center text-xs font-semibold text-emerald-200">
              {user?.name ? user.name[0].toUpperCase() : 'U'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-white truncate">{user?.name || 'User'}</p>
              <p className="text-[10px] text-slate-400 truncate capitalize">{user?.role || 'Guest'} Mode</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
