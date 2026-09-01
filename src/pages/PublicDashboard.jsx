import React, { Suspense, lazy } from 'react';
import FloatingSearchChat from '../components/FloatingSearchChat';

const MapTab = lazy(() => import('../components/tabs/MapTab'));

export default function PublicDashboard({ 
  points, 
  reports, 
  stats,
  timeFilter,
  setTimeFilter,
  severityFilter,
  setSeverityFilter
}) {
  return (
    <div className="flex flex-col h-screen overflow-hidden relative bg-[#e2e8f0]">
      {/* Background Map layer */}
      <div className="absolute inset-0 z-0">
        <Suspense fallback={<div className="flex h-full w-full items-center justify-center bg-slate-100 text-slate-500 font-medium">Loading Map...</div>}>
          <MapTab dumpPoints={points} reports={reports} isPublic={true} />
        </Suspense>
      </div>

      {/* Floating UI on top */}
      <FloatingSearchChat points={points} />
    </div>
  );
}

