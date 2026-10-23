import React, { useState, useEffect } from "react";
import {
  AlertTriangle,
  Clock,
  Zap,
  Layers,
  ChevronDown,
  LogOut,
  UserCheck
} from "lucide-react";
import NagarNetraLogo from "./NagarNetraLogo";

export default function TopHeader({
  timeFilter = "all",
  setTimeFilter,
  priorityFilter = "all",
  setPriorityFilter,
  categoryFilter = "all",
  setCategoryFilter,
  mapViewMode = "pins",
  setMapViewMode,
  user,
  onLogout
}) {
  const [timeString, setTimeString] = useState("");
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeString(
        now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 10000);
    return () => clearInterval(timer);
  }, []);

  const userName = user?.displayName || user?.email?.split("@")[0] || "Akanksha Mishra";
  const userInitial = userName.charAt(0).toUpperCase();

  return (
    <header className="h-16 bg-white border-b border-slate-200/80 px-4 sm:px-6 flex items-center justify-between gap-4 shrink-0 z-30 select-none">
      {/* ── Brand Logo & Title ────────────────────────────────────────── */}
      <div className="flex items-center gap-3 shrink-0">
        <NagarNetraLogo size={36} />
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <h1 className="text-base font-black text-slate-900 tracking-tight leading-none">
              NagarNetra
            </h1>
            <span className="text-[10px] font-extrabold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full tracking-wider">
              LIVE
            </span>
          </div>
          <span className="text-[10px] font-semibold text-slate-400 tracking-tight mt-0.5">
            AI-Powered Road Hazard Intelligence
          </span>
        </div>
      </div>

      {/* ── Central Filter Bar ─────────────────────────────────────────── */}
      <div className="hidden md:flex items-center gap-2.5 bg-slate-50/70 border border-slate-200/80 rounded-xl p-1 px-2.5">
        {/* Live Clock Pill */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white border border-slate-200/60 rounded-lg text-xs font-bold text-slate-700 shadow-xs">
          <Clock size={13} className="text-slate-400" />
          <span>{timeString || "00:16"}</span>
        </div>

        {/* Time Range Filter */}
        <div className="relative">
          <select
            value={timeFilter}
            onChange={(e) => setTimeFilter && setTimeFilter(e.target.value)}
            className="appearance-none bg-white border border-slate-200/60 hover:border-slate-300 rounded-lg pl-2.5 pr-6 py-1 text-xs font-semibold text-slate-700 cursor-pointer shadow-xs outline-none"
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>
          <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>

        {/* Priority Filter */}
        <div className="relative flex items-center">
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter && setPriorityFilter(e.target.value)}
            className="appearance-none bg-white border border-slate-200/60 hover:border-slate-300 rounded-lg pl-6 pr-6 py-1 text-xs font-semibold text-slate-700 cursor-pointer shadow-xs outline-none"
          >
            <option value="all">Priority: All</option>
            <option value="critical">Priority: Critical</option>
            <option value="high">Priority: High</option>
            <option value="med">Priority: Medium</option>
            <option value="low">Priority: Low</option>
          </select>
          <Zap size={11} className="absolute left-2 text-slate-400 pointer-events-none" />
          <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>

        {/* Hazards Category Filter */}
        <div className="relative flex items-center">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter && setCategoryFilter(e.target.value)}
            className="appearance-none bg-white border border-slate-200/60 hover:border-slate-300 rounded-lg pl-6 pr-6 py-1 text-xs font-semibold text-slate-700 cursor-pointer shadow-xs outline-none max-w-[140px] truncate"
          >
            <option value="all">Hazards: All</option>
            <option value="pothole_or_damaged_road">Pothole / Road</option>
            <option value="open_manhole">Open Manhole</option>
            <option value="waterlogging">Waterlogging</option>
            <option value="fallen_tree_or_obstruction">Fallen Tree</option>
            <option value="broken_streetlight">Streetlight</option>
            <option value="stray_cattle">Stray Cattle</option>
            <option value="unrelated_or_uncertain">Uncertain / Review</option>
          </select>
          <AlertTriangle size={11} className="absolute left-2 text-slate-400 pointer-events-none" />
          <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>

        {/* Grid Selector */}
        {setMapViewMode && (
          <div className="relative flex items-center">
            <select
              value={mapViewMode}
              onChange={(e) => setMapViewMode(e.target.value)}
              className="appearance-none bg-white border border-slate-200/60 hover:border-slate-300 rounded-lg pl-6 pr-6 py-1 text-xs font-semibold text-slate-700 cursor-pointer shadow-xs outline-none"
            >
              <option value="pins">Grid: Markers</option>
              <option value="satellite">Grid: Satellite</option>
              <option value="hexgrid">Grid: Hex</option>
              <option value="heatmap">Grid: Heatmap</option>
            </select>
            <Layers size={11} className="absolute left-2 text-slate-400 pointer-events-none" />
            <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
        )}
      </div>

      {/* ── User Profile & Actions ───────────────────────────────────────── */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="relative">
          <div
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center gap-2.5 cursor-pointer p-1 rounded-xl hover:bg-slate-50 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-emerald-700 text-white font-bold text-xs flex items-center justify-center shadow-xs">
              {userInitial}
            </div>
            <div className="hidden sm:flex flex-col text-left leading-none">
              <span className="text-xs font-bold text-slate-800">{userName}</span>
              <span className="text-[10px] text-slate-400 font-medium mt-0.5">Team Member</span>
            </div>
          </div>

          {userMenuOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-lg p-1.5 z-50 animate-in fade-in zoom-in-95">
              <div className="px-3 py-2 border-b border-slate-100">
                <p className="text-xs font-bold text-slate-800 truncate">{userName}</p>
                <p className="text-[10px] text-slate-400 truncate">{user?.email || "admin@nagarnetra.gov.in"}</p>
              </div>
              {onLogout && (
                <button
                  onClick={() => {
                    setUserMenuOpen(false);
                    onLogout();
                  }}
                  className="w-full mt-1 flex items-center gap-2 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"
                >
                  <LogOut size={13} />
                  <span>Log Out</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
