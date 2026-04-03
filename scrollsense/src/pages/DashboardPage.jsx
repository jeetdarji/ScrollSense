import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import { useYouTubeData } from '../hooks/useYouTubeData';
import api from '../lib/axios';
import DashboardNav from '../components/dashboard/DashboardNav';
import CravingLog from '../components/dashboard/CravingLog';
import { DailyIntentionBanner } from '../components/dashboard/DailyIntentionBanner';
import { LogSessionButton } from '../components/dashboard/LogSessionButton';
import { LogSessionModal } from '../components/dashboard/LogSessionModal';
import { useDashboardStore } from '../store/dashboardStore';

import ContentDietDashboard from '../components/dashboard/ContentDietDashboard';
import WeeklyCheckin from '../components/dashboard/WeeklyCheckin';
import InterestBudgetTracker from '../components/dashboard/InterestBudgetTracker';
import GoalRelevanceScore from '../components/dashboard/GoalRelevanceScore';
import SessionLogger from '../components/dashboard/SessionLogger';

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading } = useAuthStore();
  const { isConnected, isClassifying, onboardingRequired, refetchStatus } = useYouTubeData();
  const [isLogSessionOpen, setIsLogSessionOpen] = useState(false);
  const clearIntentionIfStale = useDashboardStore(state => state.clearIntentionIfStale);
  const [prefilledSessionData, setPrefilledSessionData] = useState(null);
  const clearPrefilled = () => setPrefilledSessionData(null);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/login', { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate]);

  useEffect(() => {
    const isLocalOnboarded = localStorage.getItem('scrollsense_onboarded') === 'true';
    if (!isLoading && isAuthenticated && user) {
      if (!user.onboardingComplete && !isLocalOnboarded) {
        navigate('/onboarding', { replace: true });
      }
    }
  }, [user, isAuthenticated, isLoading, navigate]);



  useEffect(() => {
    clearIntentionIfStale();
  }, [clearIntentionIfStale]);

  const today = new Date();
  const formattedDate = `${today.toLocaleDateString('en-US', { weekday: 'short' })}, ${today.getDate()} ${today.toLocaleDateString('en-US', { month: 'short' })}`.toUpperCase();                                                                
  
  const isLocalOnboarded = localStorage.getItem('scrollsense_onboarded') === 'true';
  // Prevent flicker by returning null while redirecting
  if (!isLoading && (!isAuthenticated || (user && !user.onboardingComplete && !isLocalOnboarded))) {
    return null;
  }
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#09090B] flex items-center justify-center">
        <div className="w-full max-w-xs">
          <div className="h-[2px] bg-[#27272A] w-full overflow-hidden">
            <div className="h-[2px] bg-[#DFE104] animate-pulse w-1/2"/>
          </div>
          <p className="text-xs uppercase tracking-widest text-[#3F3F46] text-center mt-4">
            LOADING...
          </p>
        </div>
      </div>
    );
  }

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

            {onboardingRequired && (
              <div className="border-2 border-[#DFE104] bg-[#27272A]/30 p-4 mb-6 flex items-center justify-between">
                <p className="text-xs uppercase tracking-widest text-[#A1A1AA]">
                  Complete your profile to unlock all features
                </p>
                <button
                  onClick={() => navigate('/onboarding')}
                  className="bg-[#DFE104] text-black font-bold uppercase tracking-tighter text-xs h-9 px-4 rounded-none hover:scale-105 transition-all"
                >
                  COMPLETE SETUP
                </button>
              </div>
            )}


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
      <LogSessionButton onOpen={() => setIsLogSessionOpen(true)} variant="fab" />
    </div>
  );
}