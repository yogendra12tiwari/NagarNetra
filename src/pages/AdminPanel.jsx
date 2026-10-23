import React, { Suspense, lazy, useState } from "react";
import TopHeader from "../components/TopHeader";
import Sidebar from "../components/Sidebar";
import KpiCards from "../components/KpiCards";

const MapTab = lazy(() => import("../components/tabs/MapTab"));
const AnalysisTab = lazy(() => import("../components/tabs/AnalysisTab"));
const InsightsTab = lazy(() => import("../components/tabs/InsightsTab"));
const CoordinationTab = lazy(() => import("../components/tabs/CoordinationTab"));
const FeedbackTab = lazy(() => import("../components/tabs/FeedbackTab"));

export default function AdminPanel({
  dynamicStats = {},
  timeFilter,
  setTimeFilter,
  priorityFilter,
  setPriorityFilter,
  categoryFilter,
  setCategoryFilter,
  activeTab = "rawfeed",
  setActiveTab,
  filteredHazards = [],
  filteredPoints = [],
  filteredReports = [],
  teamAssignments,
  setTeamAssignments,
  teams,
  setTeams,
  onResolve,
  onUpdateStatus,
  onVerifyRepair,
  onManualVerify,
  resolvingIds,
  feedbacks,
  user,
  onLogout
}) {
  const [mapViewMode, setMapViewMode] = useState("map");

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#f4f7fb]">
      {/* ── 1. Top Header Bar ─────────────────────────────────────────── */}
      <TopHeader
        timeFilter={timeFilter}
        setTimeFilter={setTimeFilter}
        priorityFilter={priorityFilter}
        setPriorityFilter={setPriorityFilter}
        categoryFilter={categoryFilter}
        setCategoryFilter={setCategoryFilter}
        mapViewMode={mapViewMode}
        setMapViewMode={setMapViewMode}
        user={user}
        onLogout={onLogout}
      />

      {/* ── 2. Body Area (Sidebar + Workspace) ────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Navigation Sidebar */}
        <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />

        {/* Right Main Workspace */}
        <div className="flex-1 flex flex-col overflow-hidden p-3.5 gap-3 min-w-0">
          {/* KPI Summary Cards */}
          <KpiCards stats={dynamicStats} />

          {/* Tab Workspace Module */}
          <main className="flex-1 overflow-hidden min-h-0">
            <Suspense fallback={
              <div className="flex w-full h-full items-center justify-center bg-white rounded-2xl border border-slate-200/80 shadow-xs text-slate-400 text-xs font-semibold gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping"></span>
                <span>Loading workspace module...</span>
              </div>
            }>
              {activeTab === "rawfeed" && (
                <MapTab
                  hazards={filteredHazards}
                  dumpPoints={filteredPoints}
                  reports={filteredReports}
                  onUpdateStatus={onUpdateStatus}
                  onVerifyRepair={onVerifyRepair}
                  onManualVerify={onManualVerify}
                />
              )}
              {activeTab === "analysis" && (
                <div className="h-full bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-y-auto p-4">
                  <AnalysisTab
                    hazards={filteredHazards}
                    dumpPoints={filteredPoints}
                    reports={filteredReports}
                  />
                </div>
              )}
              {activeTab === "coordination" && (
                <div className="h-full bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-y-auto p-4">
                  <CoordinationTab
                    hazards={filteredHazards}
                    dumpPoints={filteredPoints}
                    reports={filteredReports}
                    teamAssignments={teamAssignments}
                    setTeamAssignments={setTeamAssignments}
                    teams={teams}
                    setTeams={setTeams}
                    onResolve={onResolve}
                    resolvingIds={resolvingIds}
                  />
                </div>
              )}
              {activeTab === "insights" && (
                <div className="h-full bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-y-auto p-4">
                  <InsightsTab
                    hazards={filteredHazards}
                    dumpPoints={filteredPoints}
                    stats={dynamicStats}
                  />
                </div>
              )}
              {activeTab === "feedback" && (
                <div className="h-full bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-y-auto p-4">
                  <FeedbackTab
                    feedbacks={feedbacks}
                    reports={filteredReports}
                    points={filteredHazards.length > 0 ? filteredHazards : filteredPoints}
                  />
                </div>
              )}
            </Suspense>
          </main>
        </div>
      </div>
    </div>
  );
}
