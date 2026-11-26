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
  X,
  Sparkles,
  ChevronRight
} from 'lucide-react';

const Sidebar = ({ isOpen, onClose }) => {
  const { user, isAdmin, isCoordinator } = useAuth();

  // Role-customized navigation schemes
  const getRoleConfig = () => {
    if (isAdmin) {
      return {
        roleTitle: 'National Administrator',
        roleSub: 'Ministry / System Command',
        roleBadge: 'System HQ',
        badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
        sections: [
          {
            title: 'GOVERNANCE & POLICY',
            items: [
              { to: '/', label: 'Overview Command Center', icon: LayoutDashboard, tag: 'HQ' },
              { to: '/villages', label: 'Villages Registry', icon: Building2, tag: 'Admin' },
              { to: '/users', label: 'Access & Role Security', icon: ShieldCheck, tag: 'Vault' },
              { to: '/schemes', label: 'Government Subsidies', icon: Landmark },
              { to: '/reports', label: 'National Audit Reports', icon: BarChart3 },
              { to: '/map', label: 'GIS Geospatial Map', icon: Map }
            ]
          },
          {
            title: 'ADVANCED MODELING & AI TWIN',
            items: [
              { to: '/simulator', label: 'Digital Twin Simulator', icon: Cpu, tag: 'AI Twin' },
              { to: '/optimizer', label: 'Supply Route Optimizer', icon: Route },
              { to: '/monitoring', label: 'Plant Health Supervision', icon: Gauge },
              { to: '/households', label: 'National Household Roster', icon: Home },
              { to: '/digestate', label: 'Digestate Distribution', icon: Sprout },
              { to: '/calculator', label: 'Feasibility Calculator', icon: Calculator }
            ]
          }
        ]
      };
    }

    if (isCoordinator) {
      return {
        roleTitle: 'Village Coordinator',
        roleSub: 'Rampur Gram Panchayat',
        roleBadge: 'Field Ops',
        badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
        sections: [
          {
            title: 'VILLAGE FIELD OPERATIONS',
            items: [
              { to: '/', label: 'Operations Command Center', icon: LayoutDashboard, tag: 'Field' },
              { to: '/households', label: 'Household Compliance Roster', icon: Home, tag: 'Registry' },
              { to: '/feedstock', label: 'Daily Feedstock Intake', icon: Recycle, tag: 'Daily Log' },
              { to: '/monitoring', label: 'Digester Kinetics & Gas', icon: Gauge, tag: 'Digester' },
              { to: '/community', label: 'Community Resource Sharing', icon: Users2 },
              { to: '/map', label: 'Village Geospatial Map', icon: Map }
            ]
          },
          {
            title: 'FARMER EXTENSION & REWARDS',
            items: [
              { to: '/calculator', label: 'Household Biogas Advisor', icon: Calculator, tag: 'Advisor' },
              { to: '/incentives', label: 'Green Reward Points', icon: Award },
              { to: '/digestate', label: 'Bio-Slurry Dispatch', icon: Sprout },
              { to: '/schemes', label: 'Subsidy Schemes', icon: Landmark },
              { to: '/reports', label: 'Village Performance Metrics', icon: BarChart3 }
            ]
          }
        ]
      };
    }

    // Default: Farming Household
    return {
      roleTitle: 'Farming Household',
      roleSub: user?.name ? `${user.name} (HH-RAM-001)` : 'Rameshwar Lal Yadav (HH-RAM-001)',
      roleBadge: 'Family Hub',
      badgeBg: 'bg-teal-500/20 text-teal-300 border-teal-500/30',
      sections: [
        {
          title: 'MY FAMILY & LIVESTOCK',
          items: [
            { to: '/', label: 'Family Bioenergy Hub', icon: LayoutDashboard, tag: 'Home' },
            { to: '/my-household', label: 'My Household Profile', icon: Home, tag: 'Profile' },
            { to: '/feedstock', label: 'Log Today’s Waste Intake', icon: Recycle, tag: 'Self-Log' },
            { to: '/calculator', label: 'Feasibility & Savings Calc', icon: Calculator }
          ]
        },
        {
          title: 'BENEFITS & COMMUNITY SHARING',
          items: [
            { to: '/community', label: 'Village Sharing Network', icon: Users2 },
            { to: '/digestate', label: 'Bio-Slurry Entitlement', icon: Sprout, tag: 'Fertilizer' },
            { to: '/incentives', label: 'Green Points & Rewards', icon: Award, tag: 'Points' },
            { to: '/schemes', label: 'Available Subsidies', icon: Landmark },
            { to: '/map', label: 'Community Biogas Map', icon: Map }
          ]
        }
      ]
    };
  };

  const config = getRoleConfig();

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm lg:hidden animate-in fade-in duration-200"
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed top-0 left-0 bottom-0 z-40 w-64 bg-slate-900 text-white flex flex-col transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${
          isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
      >
        {/* Header inside sidebar */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center text-white font-bold text-base shadow-md shadow-emerald-500/20">
              BG
            </div>
            <div>
              <span className="font-bold text-xs text-white tracking-wide block">RURAL BIOGAS</span>
              <span className="text-[9px] text-emerald-400 font-bold uppercase tracking-wider block">
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

        {/* Role Badge Pill */}
        <div className="px-4 py-2.5 bg-slate-800/40 border-b border-slate-800/60 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-300">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span className="truncate">{config.roleTitle}</span>
          </div>
          <span
            className={`text-[9px] font-bold px-2 py-0.5 rounded-md border uppercase tracking-wider ${config.badgeBg}`}
          >
            {config.roleBadge}
          </span>
        </div>

        {/* Navigation links by Section */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
          {config.sections.map((section, sIdx) => (
            <div key={sIdx} className="space-y-1">
              <div className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                <span>{section.title}</span>
              </div>

              {section.items.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => onClose?.()}
                    className={({ isActive }) =>
                      `flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all duration-150 group ${
                        isActive
                          ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30'
                          : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
                      }`
                    }
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <Icon className="w-4 h-4 flex-shrink-0 group-hover:scale-110 transition-transform" />
                      <span className="truncate">{item.label}</span>
                    </div>

                    {item.tag && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 group-hover:bg-slate-700/80 group-hover:text-white flex-shrink-0 ml-1">
                        {item.tag}
                      </span>
                    )}
                  </NavLink>
                );
              })}
            </div>
          ))}
        </div>

        {/* User Card at Bottom of Sidebar */}
        <div className="p-3.5 border-t border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-700/50 border border-emerald-500/40 flex items-center justify-center text-xs font-semibold text-emerald-200 flex-shrink-0">
              {user?.name ? user.name[0].toUpperCase() : 'U'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-white truncate">{user?.name || 'Authorized User'}</p>
              <p className="text-[10px] text-slate-400 truncate">{config.roleSub}</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
