import React, { useState, useEffect } from 'react';
import DashboardNav from '../components/dashboard/DashboardNav';
import CravingLog from '../components/dashboard/CravingLog';
import SessionLogger from '../components/dashboard/SessionLogger';
import { DailyIntentionBanner } from '../components/dashboard/DailyIntentionBanner';
import { LogSessionButton } from '../components/dashboard/LogSessionButton';
import { LogSessionModal } from '../components/dashboard/LogSessionModal';
import { useDashboardStore } from '../store/dashboardStore';

import ContentDietDashboard from '../components/dashboard/ContentDietDashboard';
import WeeklyCheckin from '../components/dashboard/WeeklyCheckin';
import InterestBudgetTracker from '../components/dashboard/InterestBudgetTracker';
import GoalRelevanceScore from '../components/dashboard/GoalRelevanceScore';

export default function DashboardPage() {
  const [prefilledSessionData, setPrefilledSessionData] = useState(null);
  const [isLogSessionOpen, setIsLogSessionOpen] = useState(false);
  const clearIntentionIfStale = useDashboardStore(state => state.clearIntentionIfStale);

  useEffect(() => {
    clearIntentionIfStale();
  }, [clearIntentionIfStale]);

  const handleTimerSessionLog = (data) => {
    setPrefilledSessionData(data);
    const loggerElement = document.getElementById('session-logger-section');    
    if (loggerElement) {
      loggerElement.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const clearPrefilled = () => {
    setPrefilledSessionData(null);
  };

  const today = new Date();
  const formattedDate = `${today.toLocaleDateString('en-US', { weekday: 'short' })}, ${today.getDate()} ${today.toLocaleDateString('en-US', { month: 'short' })}`.toUpperCase();                                                                
  
  return (
    <div className="min-h-screen bg-[#09090B] pb-[env(safe-area-inset-bottom)] relative">
      <svg
        aria-hidden="true"
        className="noise-overlay"
        style={{ position:'fixed', top:0, left:0, width:'100vw', height:'100vh', opacity:0.03, pointerEvents:'none', zIndex:9999 }}
      >
        <filter id="noise-dash">
          <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="4" stitchTiles="stitch"/>
          <feColorMatrix type="saturate" values="0"/>
        </filter>
        <rect width="100%" height="100%" filter="url(#noise-dash)"/>
      </svg>

      <DashboardNav />

      <main className="pt-[56px]">
        <div className="max-w-[95vw] mx-auto px-4 py-8 md:py-12 pb-16">
          <DailyIntentionBanner />

          {/* HEADER */}
          <div className="mb-10">
            <div className="text-xs uppercase tracking-widest text-[#A1A1AA] mb-2 font-medium">
              TODAY'S OVERVIEW
            </div>
            <div className="flex items-end justify-between flex-wrap gap-4">    
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold uppercase tracking-tighter leading-[0.9] text-[#FAFAFA]">
                YOUR DASHBOARD
              </h1>
              <div className="text-sm uppercase tracking-widest text-[#A1A1AA] font-medium">
                {formattedDate}
              </div>
            </div>
            <div className="w-full border-b-2 border-[#3F3F46] mt-6"></div>     
          </div>

          {/* MAIN DASHBOARD GRID */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            
            {/* ROW 1 */}
            <ContentDietDashboard className="lg:col-span-2" />

            {/* ROW 2 */}
            <InterestBudgetTracker />
            <GoalRelevanceScore />

            {/* ROW 3 */}
            <WeeklyCheckin className="lg:col-span-2" />

            {/* ROW 4 */}
            <div className="min-h-[400px]">
              <LogSessionButton onOpen={() => setIsLogSessionOpen(true)} variant="card" />
            </div>
            <div className="min-h-[400px]">
              <CravingLog />
            </div>

            {/* ADDITIONAL: Session Logger from previous implementations */}
            <div id="session-logger-section" className="lg:col-span-2 min-h-[350px]">
              <SessionLogger
                prefilledData={prefilledSessionData}
                onCompletePrefill={clearPrefilled}
              />
            </div>
          </div>

        </div>
      </main>

      <LogSessionModal 
        isOpen={isLogSessionOpen} 
        onClose={() => setIsLogSessionOpen(false)} 
      />
      
      <LogSessionButton 
        onOpen={() => setIsLogSessionOpen(true)} 
        variant="fab"    
      />
    </div>
  );
}