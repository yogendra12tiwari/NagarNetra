import React, { Suspense, lazy } from 'react';
import TopBar from "../components/TopBar";
import TabBar from "../components/TabBar";

const MapTab = lazy(() => import("../components/tabs/MapTab"));
const AnalysisTab = lazy(() => import("../components/tabs/AnalysisTab"));
const InsightsTab = lazy(() => import("../components/tabs/InsightsTab"));
const CoordinationTab = lazy(() => import("../components/tabs/CoordinationTab"));
const FeedbackTab = lazy(() => import("../components/tabs/FeedbackTab"));

export default function AdminPanel({
  dynamicStats,
  timeFilter,
  setTimeFilter,
  severityFilter,
  setSeverityFilter,
  activeTab,
  setActiveTab,
  filteredPoints,
  filteredReports,
  teamAssignments,
  setTeamAssignments,
  teams,
  setTeams,
  onResolve,
  resolvingIds,
  feedbacks,
  user,
  onLogout
}) {
  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#f5f6f8]">
      <TopBar 
        activePoints={dynamicStats.activePoints} 
        newToday={dynamicStats.newToday}
        timeFilter={timeFilter}
        setTimeFilter={setTimeFilter}
        severityFilter={severityFilter}
        setSeverityFilter={setSeverityFilter}
        user={user}
        onLogout={onLogout}
      />
      <TabBar activeTab={activeTab} onTabChange={setActiveTab} />

      <main className="flex flex-1 overflow-hidden">
        <Suspense fallback={<div className="flex w-full h-full items-center justify-center text-gray-500">Loading tab...</div>}>
          {activeTab === "rawfeed" && (
            <MapTab dumpPoints={filteredPoints} reports={filteredReports} />
          )}
          {activeTab === "analysis" && (
            <AnalysisTab dumpPoints={filteredPoints} reports={filteredReports} />
          )}
          {activeTab === "coordination" && (
            <CoordinationTab 
              dumpPoints={filteredPoints}
              reports={filteredReports}
              teamAssignments={teamAssignments} 
              setTeamAssignments={setTeamAssignments} 
              teams={teams}
              setTeams={setTeams}
              onResolve={onResolve}
              resolvingIds={resolvingIds}
            />
          )}
          {activeTab === "insights" && (
            <InsightsTab dumpPoints={filteredPoints} stats={dynamicStats} />
          )}
          {activeTab === "feedback" && (
            <FeedbackTab feedbacks={feedbacks} reports={filteredReports} points={filteredPoints} />
          )}
        </Suspense>
      </main>
    </div>
  );
}
