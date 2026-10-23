import { MapPin, BarChart2, Sparkles, Users, CheckSquare } from "lucide-react";

const TABS = [
  { id: "rawfeed", label: "Live Hazard Map", icon: MapPin },
  { id: "analysis", label: "Hazard Analytics", icon: BarChart2 },
  { id: "insights", label: "AI Risk & Triage", icon: Sparkles },
  { id: "coordination", label: "Crew Dispatch", icon: Users },
  { id: "feedback", label: "Citizen Verification", icon: CheckSquare },
];

export default function TabBar({ activeTab, onTabChange }) {
  return (
    <nav className="h-11 bg-white border-b border-gray-200 flex justify-center items-end px-3 sm:px-6 gap-1 shrink-0 overflow-x-auto">
      {TABS.map((tab) => {
        const isActive = tab.id === activeTab;
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            id={`tab-${tab.id}`}
            onClick={() => onTabChange(tab.id)}
            className={`
              relative px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold transition-colors duration-150 whitespace-nowrap flex items-center gap-1.5 cursor-pointer
              ${isActive
                ? "text-amber-600 border-b-2 border-amber-600 font-bold"
                : "text-gray-500 border-b-2 border-transparent hover:text-gray-800 hover:border-gray-300"
              }
            `}
          >
            <Icon size={14} className={isActive ? "text-amber-600" : "text-gray-400"} />
            <span>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
