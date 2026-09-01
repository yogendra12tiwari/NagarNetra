const TABS = [
  { id: "rawfeed", label: "Raw Feed" },
  { id: "analysis", label: "Analysis" },
  { id: "insights", label: "Insights" },
  { id: "coordination", label: "Coordination" },
  { id: "feedback", label: "Feedback" },
];

export default function TabBar({ activeTab, onTabChange }) {
  return (
    <nav className="h-11 bg-white border-b border-gray-200 flex justify-center items-end px-3 sm:px-6 gap-0 shrink-0 overflow-x-auto">
      {TABS.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            id={`tab-${tab.id}`}
            onClick={() => onTabChange(tab.id)}
            className={`
              relative px-4 sm:px-5 py-2 text-sm font-medium transition-colors duration-150 whitespace-nowrap
              ${isActive
                ? "text-indigo-600 border-b-2 border-indigo-600"
                : "text-gray-500 border-b-2 border-transparent hover:text-gray-800 hover:border-gray-300"
              }
            `}
          >
            {tab.label}
          </button>
        );
      })}
    </nav>
  );
}
