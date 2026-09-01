import { Activity, Filter, Calendar, BarChart2 } from "lucide-react";
import { Link } from "react-router-dom";

export default function PublicTopBar({
  stats,
  timeFilter,
  setTimeFilter,
  severityFilter,
  setSeverityFilter,
  resolutionRate,
  totalPoints
}) {
  return (
    <header className="min-h-14 bg-white border-b border-gray-200 flex items-center justify-between gap-2 px-3 py-2 sm:px-6 sm:py-0 shrink-0 z-10 flex-wrap lg:flex-nowrap">
      {/* Brand */}
      <div className="flex items-center gap-2.5 shrink-0">
        <div className="w-8 h-8 bg-emerald-600 rounded-md flex items-center justify-center">
          <Activity size={16} color="white" strokeWidth={2} />
        </div>
        <div className="leading-tight">
          <span className="text-sm font-bold text-gray-900 tracking-tight">NagarNetra Public</span>
          <span className="block text-[10px] text-gray-400 uppercase tracking-widest leading-none mt-0.5">
            Citizen Portal
          </span>
        </div>
      </div>

      {/* Filters (Center) */}
      <div className="order-3 lg:order-none w-full lg:w-auto overflow-x-auto flex items-center gap-4 bg-gray-50/80 px-3 py-1.5 rounded-lg border border-gray-100">
        {/* Time Filter */}
        <div className="flex items-center gap-1.5 border-r border-gray-200 pr-4">
          <Calendar size={13} className="text-gray-400" />
          <span className="text-[10px] font-bold text-gray-500 uppercase">Time:</span>
          <select
            value={timeFilter}
            onChange={(e) => setTimeFilter(e.target.value)}
            className="bg-transparent text-xs font-semibold text-gray-800 outline-none cursor-pointer hover:text-emerald-600 transition-colors"
          >
            <option value="all">All Time</option>
            <option value="30d">Last 30 Days</option>
            <option value="7d">Last 7 Days</option>
          </select>
        </div>

        {/* Severity Filter */}
        <div className="flex items-center gap-1.5 pl-1">
          <Filter size={13} className="text-gray-400" />
          <span className="text-[10px] font-bold text-gray-500 uppercase">Severity:</span>
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="bg-transparent text-xs font-semibold text-gray-800 outline-none cursor-pointer hover:text-emerald-600 transition-colors"
          >
            <option value="all">All Zones</option>
            <option value="high">Critical (7+)</option>
            <option value="med">Moderate (3-6)</option>
            <option value="low">Low (1-2)</option>
          </select>
        </div>
      </div>

      {/* Stats pills & Admin Link */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        <StatPill label="Resolution Rate" value={`${resolutionRate}%`} color="blue" />
        <StatPill label="Active Hotspots" value={stats.activePoints} color="rose" />
        
        {/* Admin Link (Optional, but good for navigation) */}
        <Link 
          to="/admin" 
          className="ml-2 hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-md text-xs font-semibold transition-colors"
        >
          Admin Portal
        </Link>
      </div>
    </header>
  );
}

function StatPill({ label, value, color }) {
  const colors = {
    blue: "bg-blue-50 text-blue-700 ring-blue-200",
    emerald: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    rose: "bg-rose-50 text-rose-700 ring-rose-200",
  };
  return (
    <div className={`flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-full ring-1 ${colors[color]}`}>
      <span className="hidden sm:inline text-xs font-medium text-gray-500">{label}</span>
      <span className="text-sm font-bold">{value}</span>
    </div>
  );
}
