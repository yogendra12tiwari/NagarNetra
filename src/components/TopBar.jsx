import { Trash2, Filter, Calendar, LogOut, UserCheck } from "lucide-react";

export default function TopBar({
  activePoints,
  newToday,
  timeFilter,
  setTimeFilter,
  severityFilter,
  setSeverityFilter,
  user,
  onLogout
}) {
  return (
    <header className="min-h-14 bg-white border-b border-gray-200 flex items-center justify-between gap-2 px-3 py-2 sm:px-6 sm:py-0 shrink-0 z-10 flex-wrap lg:flex-nowrap">
      {/* Brand */}
      <div className="flex items-center gap-2.5 shrink-0">
        <div className="w-8 h-8 bg-indigo-600 rounded-md flex items-center justify-center">
          <Trash2 size={16} color="white" strokeWidth={2} />
        </div>
        <div className="leading-tight">
          <span className="text-sm font-semibold text-gray-900 tracking-tight">NagarNetra</span>
          <span className="block text-[10px] text-gray-400 uppercase tracking-widest leading-none mt-0.5">
            Civic Command Center
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
            className="bg-transparent text-xs font-semibold text-gray-800 outline-none cursor-pointer hover:text-indigo-600 transition-colors"
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
            className="bg-transparent text-xs font-semibold text-gray-800 outline-none cursor-pointer hover:text-indigo-600 transition-colors"
          >
            <option value="all">All Zones</option>
            <option value="high">Critical (7+)</option>
            <option value="med">Moderate (3-6)</option>
            <option value="low">Low (1-2)</option>
          </select>
        </div>
      </div>

      {/* Stats & User Info */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        <StatPill label="Active Points" value={activePoints} color="indigo" />
        <StatPill label="New Today" value={newToday} color="emerald" />

        {user && (
          <div className="flex items-center gap-2 border-l border-gray-200 pl-2 sm:pl-3 ml-1">
            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 rounded-full text-xs font-medium text-slate-700">
              <UserCheck size={13} className="text-emerald-600" />
              <span className="max-w-[140px] truncate">{user.email || "Admin"}</span>
            </div>
            {onLogout && (
              <button
                onClick={onLogout}
                title="Log out of Admin Portal"
                className="p-1.5 text-gray-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer flex items-center gap-1 text-xs font-medium"
              >
                <LogOut size={15} />
                <span className="hidden sm:inline">Logout</span>
              </button>
            )}
          </div>
        )}
      </div>
    </header>
  );
}

function StatPill({ label, value, color }) {
  const colors = {
    indigo: "bg-indigo-50 text-indigo-700 ring-indigo-200",
    emerald: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  };
  return (
    <div className={`flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-full ring-1 ${colors[color]}`}>
      <span className="hidden sm:inline text-xs font-medium text-gray-500">{label}</span>
      <span className="text-sm font-bold">{value}</span>
    </div>
  );
}
