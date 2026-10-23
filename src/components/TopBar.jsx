import { AlertTriangle, Filter, Calendar, LogOut, UserCheck, Layers } from "lucide-react";

export default function TopBar({
  activeHazards = 0,
  criticalHazards = 0,
  pendingReview = 0,
  timeFilter,
  setTimeFilter,
  priorityFilter,
  setPriorityFilter,
  categoryFilter,
  setCategoryFilter,
  user,
  onLogout
}) {
  return (
    <header className="min-h-14 bg-white border-b border-gray-200 flex items-center justify-between gap-2 px-3 py-2 sm:px-6 sm:py-0 shrink-0 z-10 flex-wrap lg:flex-nowrap">
      {/* Brand */}
      <div className="flex items-center gap-2.5 shrink-0">
        <img
          src="/nagarnetra-logo.png"
          alt="NagarNetra Logo"
          className="w-8 h-8 rounded-lg object-contain shadow-xs border border-indigo-100 bg-[#5b4aee] p-0.5"
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src = "/favicon.svg";
          }}
        />
        <div className="leading-tight">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-black text-gray-900 tracking-tight">NagarNetra</span>
            <span className="text-[9px] font-bold bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded font-mono">LIVE</span>
          </div>
          <span className="block text-[10px] text-gray-400 uppercase tracking-widest leading-none mt-0.5 font-semibold">
            SI-02 Road Hazard Command Center
          </span>
        </div>
      </div>

      {/* Filters (Center) */}
      <div className="order-3 lg:order-none w-full lg:w-auto overflow-x-auto flex items-center gap-3 bg-gray-50/90 px-3 py-1.5 rounded-lg border border-gray-200/80">
        
        {/* Time Filter */}
        <div className="flex items-center gap-1.5 border-r border-gray-200 pr-3">
          <Calendar size={13} className="text-gray-400" />
          <span className="text-[10px] font-bold text-gray-500 uppercase">Time:</span>
          <select
            value={timeFilter}
            onChange={(e) => setTimeFilter(e.target.value)}
            className="bg-transparent text-xs font-semibold text-gray-800 outline-none cursor-pointer hover:text-amber-600 transition-colors"
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>
        </div>

        {/* Priority Filter */}
        <div className="flex items-center gap-1.5 border-r border-gray-200 pr-3">
          <Filter size={13} className="text-gray-400" />
          <span className="text-[10px] font-bold text-gray-500 uppercase">Priority:</span>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="bg-transparent text-xs font-semibold text-gray-800 outline-none cursor-pointer hover:text-amber-600 transition-colors"
          >
            <option value="all">All Priorities</option>
            <option value="critical">Critical (75–100)</option>
            <option value="high">High (50–74)</option>
            <option value="med">Medium (25–49)</option>
            <option value="low">Low (1–24)</option>
          </select>
        </div>

        {/* Category Filter */}
        <div className="flex items-center gap-1.5 pl-0.5">
          <Layers size={13} className="text-gray-400" />
          <span className="text-[10px] font-bold text-gray-500 uppercase">Category:</span>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-transparent text-xs font-semibold text-gray-800 outline-none cursor-pointer hover:text-amber-600 transition-colors max-w-[150px] truncate"
          >
            <option value="all">All Categories</option>
            <option value="pothole_or_damaged_road">Pothole / Road</option>
            <option value="open_manhole">Open Manhole</option>
            <option value="waterlogging">Waterlogging</option>
            <option value="fallen_tree_or_obstruction">Fallen Tree / Obstruction</option>
            <option value="broken_streetlight">Broken Streetlight</option>
            <option value="stray_cattle">Stray Cattle</option>
            <option value="unrelated_or_uncertain">Review / Uncertain</option>
          </select>
        </div>
      </div>

      {/* Stats & User Info */}
      <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
        <StatPill label="Active Hazards" value={activeHazards} color="amber" />
        <StatPill label="Critical / High" value={criticalHazards} color="rose" />
        {pendingReview > 0 && (
          <StatPill label="Review Needed" value={pendingReview} color="purple" />
        )}

        {user && (
          <div className="flex items-center gap-2 border-l border-gray-200 pl-2 sm:pl-3 ml-1">
            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 rounded-full text-xs font-medium text-slate-700">
              <UserCheck size={13} className="text-emerald-600" />
              <span className="max-w-[130px] truncate">{user.email || "Admin"}</span>
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
    amber: "bg-amber-50 text-amber-800 ring-amber-200",
    rose: "bg-rose-50 text-rose-700 ring-rose-200",
    purple: "bg-purple-50 text-purple-700 ring-purple-200",
    emerald: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  };
  return (
    <div className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full ring-1 ${colors[color] || colors.amber}`}>
      <span className="hidden sm:inline text-xs font-medium text-gray-500">{label}</span>
      <span className="text-xs sm:text-sm font-bold">{value}</span>
    </div>
  );
}
