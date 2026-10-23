import React from "react";
import {
  LayoutGrid,
  BarChart2,
  Cpu,
  Truck,
  ShieldCheck
} from "lucide-react";

const NAV_ITEMS = [
  { id: "rawfeed", label: "Live Hazard Map", icon: LayoutGrid },
  { id: "analysis", label: "Hazard Analytics", icon: BarChart2 },
  { id: "insights", label: "AI Risk & Triage", icon: Cpu },
  { id: "coordination", label: "Crew Dispatch", icon: Truck },
  { id: "feedback", label: "Citizen Verification", icon: ShieldCheck },
];

export default function Sidebar({ activeTab, onTabChange }) {
  return (
    <aside className="w-48 shrink-0 bg-white border-r border-slate-200/80 flex flex-col p-2.5 select-none z-20">
      {/* Navigation Buttons */}
      <nav className="flex flex-col gap-1" aria-label="Main Navigation">
        {NAV_ITEMS.map((item) => {
          const isActive = activeTab === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              id={`tab-${item.id}`}
              onClick={() => onTabChange(item.id)}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-150 text-left cursor-pointer ${
                isActive
                  ? "bg-blue-50 text-blue-600 font-bold shadow-xs border border-blue-100/60"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-transparent"
              }`}
            >
              <Icon
                size={16}
                className={isActive ? "text-blue-600 shrink-0" : "text-slate-500 shrink-0"}
              />
              <span className="tracking-tight truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
