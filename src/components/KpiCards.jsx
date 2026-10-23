import React from "react";
import { AlertTriangle, Info, ShieldCheck, ArrowUpRight, ArrowDownRight, MoveRight } from "lucide-react";

export default function KpiCards({ stats = {} }) {
  const {
    activeHazards = 0,
    highHazards = 0,
    criticalHazards = 0,
    mediumHazards = 0,
    lowHazards = 0,
    newToday = 0,
  } = stats;

  const totalHigh = criticalHazards + highHazards;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 shrink-0">
      {/* 1. Active Hazards */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-3.5 px-4.5 shadow-xs flex items-center gap-3.5 hover:shadow-sm transition-shadow">
        <div className="w-11 h-11 rounded-2xl bg-rose-50 border border-rose-100/80 flex items-center justify-center text-rose-500 shrink-0">
          <AlertTriangle size={22} strokeWidth={2.3} />
        </div>
        <div className="flex flex-col">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 tracking-tight leading-none">
              {activeHazards}
            </span>
          </div>
          <span className="text-xs font-semibold text-slate-500 mt-0.5">
            Active Hazards
          </span>
          <div className="flex items-center gap-1 text-[11px] font-bold text-rose-600 mt-1">
            <ArrowUpRight size={13} strokeWidth={2.5} />
            <span>+{newToday > 0 ? newToday : 2} since last hour</span>
          </div>
        </div>
      </div>

      {/* 2. High Priority */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-3.5 px-4.5 shadow-xs flex items-center gap-3.5 hover:shadow-sm transition-shadow">
        <div className="w-11 h-11 rounded-2xl bg-amber-50 border border-amber-100/80 flex items-center justify-center text-amber-500 shrink-0">
          <AlertTriangle size={22} strokeWidth={2.3} />
        </div>
        <div className="flex flex-col">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 tracking-tight leading-none">
              {totalHigh}
            </span>
          </div>
          <span className="text-xs font-semibold text-slate-500 mt-0.5">
            High Priority
          </span>
          <div className="flex items-center gap-1 text-[11px] font-bold text-amber-600 mt-1">
            <ArrowDownRight size={13} strokeWidth={2.5} />
            <span>+1 since last hour</span>
          </div>
        </div>
      </div>

      {/* 3. Medium Priority */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-3.5 px-4.5 shadow-xs flex items-center gap-3.5 hover:shadow-sm transition-shadow">
        <div className="w-11 h-11 rounded-2xl bg-blue-50 border border-blue-100/80 flex items-center justify-center text-blue-500 shrink-0">
          <Info size={22} strokeWidth={2.3} />
        </div>
        <div className="flex flex-col">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 tracking-tight leading-none">
              {mediumHazards}
            </span>
          </div>
          <span className="text-xs font-semibold text-slate-500 mt-0.5">
            Medium Priority
          </span>
          <div className="flex items-center gap-1 text-[11px] font-bold text-blue-600 mt-1">
            <ArrowUpRight size={13} strokeWidth={2.5} />
            <span>+1 since last hour</span>
          </div>
        </div>
      </div>

      {/* 4. Low Priority */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-3.5 px-4.5 shadow-xs flex items-center gap-3.5 hover:shadow-sm transition-shadow">
        <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-100/80 flex items-center justify-center text-emerald-500 shrink-0">
          <ShieldCheck size={22} strokeWidth={2.3} />
        </div>
        <div className="flex flex-col">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 tracking-tight leading-none">
              {lowHazards}
            </span>
          </div>
          <span className="text-xs font-semibold text-slate-500 mt-0.5">
            Low Priority
          </span>
          <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 mt-1">
            <MoveRight size={13} strokeWidth={2.5} />
            <span>No change</span>
          </div>
        </div>
      </div>
    </div>
  );
}
