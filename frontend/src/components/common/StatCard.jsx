import React from 'react';

const StatCard = ({ title, value, unit = '', subtitle, icon: Icon, color = 'emerald', trend }) => {
  const colorMap = {
    emerald: {
      bg: 'bg-emerald-50 text-emerald-600',
      border: 'border-emerald-100 hover:border-emerald-300'
    },
    amber: {
      bg: 'bg-amber-50 text-amber-600',
      border: 'border-amber-100 hover:border-amber-300'
    },
    sky: {
      bg: 'bg-sky-50 text-sky-600',
      border: 'border-sky-100 hover:border-sky-300'
    },
    indigo: {
      bg: 'bg-indigo-50 text-indigo-600',
      border: 'border-indigo-100 hover:border-indigo-300'
    },
    purple: {
      bg: 'bg-purple-50 text-purple-600',
      border: 'border-purple-100 hover:border-purple-300'
    }
  };

  const currentTheme = colorMap[color] || colorMap.emerald;

  return (
    <div className={`bg-white rounded-2xl p-5 border shadow-sm transition-all duration-200 ${currentTheme.border}`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">{title}</span>
        {Icon && (
          <div className={`p-2.5 rounded-xl ${currentTheme.bg}`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>

      <div className="flex items-baseline gap-1.5">
        <div className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </div>
        {unit && <span className="text-xs font-semibold text-slate-500">{unit}</span>}
      </div>

      {(subtitle || trend) && (
        <div className="mt-2.5 flex items-center justify-between text-xs text-slate-500">
          <span>{subtitle}</span>
          {trend && (
            <span className={`font-semibold ${trend.positive ? 'text-emerald-600' : 'text-rose-600'}`}>
              {trend.positive ? '+' : ''}{trend.text}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default StatCard;
