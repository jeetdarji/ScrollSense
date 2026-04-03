# Dashboard Frontend Code Overview

This document contains all the frontend code related to the Dashboard feature. It includes the dashboard page, dashboard components, hooks, and library files.

## `pages/DashboardPage.jsx`

```javascript
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import { useYouTubeData } from '../hooks/useYouTubeData';
import api from '../lib/axios';
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
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading } = useAuthStore();
  const { isConnected, isClassifying, onboardingRequired, refetchStatus } = useYouTubeData();
  const [prefilledSessionData, setPrefilledSessionData] = useState(null);
  const [isLogSessionOpen, setIsLogSessionOpen] = useState(false);
  const clearIntentionIfStale = useDashboardStore(state => state.clearIntentionIfStale);

  
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
    const isLocalOnboarded = localStorage.getItem('scrollsense_onboarded') === 'true';
    if (
      isAuthenticated && 
      (user?.onboardingComplete || isLocalOnboarded) && 
      !isConnected && 
      !isClassifying
    ) {
      api.post('/youtube/connect')
        .then(() => refetchStatus())
        .catch(err => {
          if (err.response?.data?.code !== 'ONBOARDING_INCOMPLETE') {
            console.error('YouTube auto-connect failed:', err.message);
          }
        });
    }
  }, [isAuthenticated, user?.onboardingComplete, isConnected, isClassifying, refetchStatus]);

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
```

---

## `components/dashboard/ContentDietDashboard.jsx`

```javascript
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Target, PlayCircle, ChevronDown, Plus, EyeOff, Info } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useYouTubeData } from '../../hooks/useYouTubeData';
import YouTubeConnectPrompt from './YouTubeConnectPrompt';
import SkeletonCard from './SkeletonCard';
import api from '../../lib/axios';
import clsx from 'clsx';

const formatMinutes = (mins) => {
  if (!mins) return '0M';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}H ${m}M` : `${m}M`;
};

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const totalMins = payload[0].payload.totalMinutes;
    return (
      <div style={{ background: '#27272A', border: '1px solid #3F3F46', borderRadius: 0, fontFamily: 'Space Grotesk', fontSize: 12, padding: '8px' }}>
        <p className="font-bold text-[#FAFAFA] mb-2">{label}</p>
        {payload.map((entry, index) => (
          <p key={`item-${index}`} style={{ color: entry.color }} className="font-bold">
            {entry.name}: {entry.value}%
          </p>
        ))}
        <p className="text-xs text-[#A1A1AA] mt-2 border-t border-[#3F3F46] pt-1">{totalMins} MIN TOTAL</p>
      </div>
    );
  }
  return null;
};

const CustomLegend = (props) => {
  const { payload } = props;
  return (
    <div className="flex gap-6 justify-center mt-4 flex-wrap">
      {payload.map((entry, index) => (
        <div key={`item-${index}`} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-none" style={{ backgroundColor: entry.color }} />
          <span className="text-xs uppercase tracking-widest text-[#A1A1AA]">{entry.value}</span>
        </div>
      ))}
    </div>
  );
};

export default function ContentDietDashboard({ className }) {
  const { isConnected, isLoading, isClassifying, weeklyBreakdown, currentWeek, contentSuggestions, topChannels, refetchStatus } = useYouTubeData();
  const [view, setView] = useState('WEEKLY');
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);

  const onConnect = async () => {
    try {
      await api.post('/youtube/connect');
      refetchStatus();
    } catch (err) {
      if (err.response?.data?.code === 'ONBOARDING_INCOMPLETE') {
        console.warn('Complete onboarding before connecting YouTube');
      } else {
        console.error('Failed to connect YouTube', err.message);
      }
    }
  };

  const chartH = typeof window !== 'undefined' && window.innerWidth < 768 ? 200 : 280;

  if (!isConnected) {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} viewport={{ once: true }} className={clsx("border-2 border-[#3F3F46] bg-[#09090B] p-6 md:p-8", className)}>
        <YouTubeConnectPrompt 
          featureName="CONTENT DIET" 
          featureId="F6" 
          onConnect={onConnect}
        />
      </motion.div>
    );
  }

  if (isLoading) {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} viewport={{ once: true }} className={clsx("border-2 border-[#3F3F46] bg-[#09090B] p-6 md:p-8", className)}>
        <SkeletonCard showChart={true} lines={3} />
      </motion.div>
    );
  }

  if (!currentWeek) {
    return (
      <div className="border-2 border-[#3F3F46] bg-[#09090B] 
                      p-6 md:p-8 lg:col-span-2">
        <div className="animate-pulse">
          <div className="h-4 bg-[#27272A] w-48 mb-4"/>
          <div className="h-8 bg-[#27272A] w-72 mb-8"/>
          <div className="flex items-end gap-2 h-32">
            {[40,60,35,75,45,65,80].map((h,i) => (
              <div key={i} className="flex-1 bg-[#27272A]" 
                   style={{height:`${h}%`}}/>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const diffTotal = currentWeek?.changeVsLastWeek?.totalMinutes ?? 0;
  const diffGoal = currentWeek?.changeVsLastWeek?.goal ?? 0;
  const hasHistory = (currentWeek?.weeksOfData ?? 0) >= 2;
  const hasInstagram = !!localStorage.getItem('scrollsense_instagram_processed');

  const pieData = [
    { name: 'Goal Relevant', value: currentWeek?.goal ?? 0 },
    { name: 'Interest', value: currentWeek?.interest ?? 0 },
    { name: 'Junk', value: currentWeek?.junk ?? 0 },
  ];
  const PIE_COLORS = ['#DFE104', 'rgba(250,250,250,0.4)', '#3F3F46'];

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} viewport={{ once: true }} className={clsx("border-2 border-[#3F3F46] bg-[#09090B] p-6 md:p-8 relative", className)}>
      
      {isClassifying ? (
        <div className="w-full bg-[#27272A]/40 border border-[#3F3F46] p-6 text-center">
          <div className="w-full h-[2px] bg-[#27272A] relative overflow-hidden">
            <motion.div
              className="absolute inset-y-0 left-0 w-1/3 bg-[#DFE104]"
              animate={{ x: ['-100%', '400%'] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
            />
          </div>
          <h3 className="mt-4 text-sm font-bold uppercase tracking-tighter text-[#FAFAFA]">CLASSIFYING YOUR CONTENT...</h3>
          <p className="text-xs text-[#A1A1AA] mt-2 leading-relaxed">GPT-4o mini is reviewing your YouTube history. This takes 1–3 minutes and runs once.</p>
          <p className="text-xs text-[#3F3F46] mt-3 uppercase tracking-wider">Come back shortly — we'll notify you when it's ready.</p>
        </div>
      ) : (
        <>
          <div className="flex justify-between items-start flex-wrap gap-4 mb-8">
            <div>
              <div className="text-xs uppercase tracking-widest text-[#DFE104] mb-1">CONTENT DIET DASHBOARD</div>
              <h2 className="text-2xl md:text-3xl font-bold uppercase tracking-tighter text-[#FAFAFA] leading-[0.9]">
                WHAT YOU'VE BEEN WATCHING
              </h2>
            </div>
            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="border border-[#3F3F46] px-2 py-0.5 text-xs uppercase tracking-widest text-[#3F3F46]">F6</div>
              <div className="flex border-2 border-[#3F3F46] flex-1 md:flex-none">
                {['WEEKLY', 'BREAKDOWN'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setView(tab)}
                    className={clsx(
                      "px-4 py-1.5 text-xs uppercase tracking-wider font-bold transition-all duration-200 flex-1 md:flex-none",
                      view === tab ? "bg-[#DFE104] text-black" : "bg-transparent text-[#A1A1AA]"
                    )}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 md:gap-3 mb-8">
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5 mb-1">
                <Clock size={12} color="#A1A1AA" />
                <span className="text-[10px] md:text-xs uppercase tracking-widest text-[#A1A1AA]">TOTAL THIS WEEK</span>
              </div>
              <div className="text-xl md:text-3xl font-bold uppercase text-[#FAFAFA]">
                {formatMinutes(currentWeek?.totalMinutes ?? 0)}
              </div>
              {hasHistory ? (
                <div className={clsx("text-[10px] md:text-xs uppercase tracking-widest mt-1", diffTotal < 0 ? "text-[#DFE104]" : "text-red-500")}>
                  {diffTotal > 0 ? '+' : ''}{diffTotal} MIN VS LAST WEEK
                </div>
              ) : (
                <div className="text-[10px] md:text-xs text-[#3F3F46] mt-1">FIRST WEEK</div>
              )}
            </div>

            <div className="flex flex-col">
              <div className="flex items-center gap-1.5 mb-1">
                <Target size={12} color="#DFE104" />
                <span className="text-[10px] md:text-xs uppercase tracking-widest text-[#A1A1AA]">GOAL RELEVANT</span>
              </div>
              <div className="text-xl md:text-3xl font-bold uppercase text-[#DFE104]">
                {currentWeek?.goal ?? 0}%
              </div>
              {hasHistory ? (
                <div className={clsx("text-[10px] md:text-xs uppercase mt-1", diffGoal > 0 ? "text-[#DFE104]" : "text-red-500")}>
                  {diffGoal > 0 ? '+' : ''}{diffGoal}pp vs last week
                </div>
              ) : (
                <div className="text-[10px] md:text-xs text-[#3F3F46] mt-1">WEEK 1 BASELINE</div>
              )}
            </div>

            <div className="flex flex-col">
              <div className="flex items-center gap-1.5 mb-1">
                <PlayCircle size={12} color="#A1A1AA" />
                <span className="text-[10px] md:text-xs uppercase tracking-widest text-[#A1A1AA]">VIDEOS CLASSIFIED</span>
              </div>
              <div className="text-xl md:text-3xl font-bold uppercase text-[#FAFAFA]">
                {currentWeek?.totalVideos ?? 0}
              </div>
              <div className="flex flex-col mt-1">
                <span className="text-[10px] text-[#3F3F46] uppercase">YOUTUBE THIS WEEK</span>
                {hasInstagram && (
                  <span className="text-[10px] text-[#3F3F46] uppercase mt-0.5">+ INSTAGRAM TIMING</span>
                )}
              </div>
            </div>
          </div>

          {view === 'WEEKLY' ? (
            (currentWeek?.weeksOfData ?? 0) === 0 || (weeklyBreakdown?.length ?? 0) === 0 ? (
              <div className="text-center py-12">
                <div className="text-[5rem] font-bold text-[#27272A] leading-none mb-2" aria-hidden="true">W1</div>
                <h3 className="text-sm font-bold uppercase tracking-tighter text-[#FAFAFA] mt-2">YOUR FIRST WEEK IS BEING TRACKED</h3>
                <p className="text-xs text-[#A1A1AA] mt-2 max-w-xs mx-auto leading-relaxed">
                  Log sessions and come back — your chart builds over time.
                </p>
              </div>
            ) : (
              <div style={{ height: chartH }} className="w-full">
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                  <BarChart data={weeklyBreakdown} margin={{ top: 8, right: 8, left: -20, bottom: 0 }} barSize={28} barCategoryGap="30%">
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272A" vertical={false} />
                    <XAxis dataKey="week" axisLine={false} tickLine={false} tick={{ fill: '#A1A1AA', fontSize: 11, fontFamily: 'Space Grotesk' }} />
                    <YAxis tickFormatter={(v) => v + '%'} domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fill: '#A1A1AA', fontSize: 11, fontFamily: 'Space Grotesk' }} />
                    <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(39, 39, 42, 0.4)' }} />
                    <Legend content={<CustomLegend />} />
                    <Bar dataKey="goal" fill="#DFE104" stackId="a" name="Goal Relevant" />
                    <Bar dataKey="interest" fill="#FAFAFA" fillOpacity={0.4} stackId="a" name="Interest" />
                    <Bar dataKey="junk" fill="#3F3F46" stackId="a" name="Junk" />
                  </BarChart>
                </ResponsiveContainer>
                <div style={{ display:'flex', justifyContent:'center', 
                              alignItems:'center', gap:'16px', marginTop:'8px',
                              flexWrap:'wrap' }}>
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 bg-[#DFE104] inline-block" />
                    <span className="text-[10px] uppercase tracking-widest text-[#A1A1AA]">
                      YOUTUBE — VIDEO TITLES CLASSIFIED
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 bg-[#3F3F46] inline-block" />
                    <span className="text-[10px] uppercase tracking-widest text-[#3F3F46]">
                      INSTAGRAM — CREATOR TIMING ONLY
                    </span>
                  </div>
                </div>
              </div>
            )
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="flex flex-col items-center">
                <div style={{ height: 220, width: '100%', position: 'relative' }}>
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value" stroke="none">
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip 
                        contentStyle={{ background: '#27272A', border: '1px solid #3F3F46', borderRadius: 0, fontFamily: 'Space Grotesk', fontSize: 12, color: '#FAFAFA' }}
                        itemStyle={{ color: '#FAFAFA', fontWeight: 'bold' }}
                        formatter={(value) => `${value}%`}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-[26px] font-bold text-[#DFE104] leading-none mb-1">{currentWeek.goal}%</span>
                    <span className="text-[10px] text-[#A1A1AA] uppercase tracking-widest font-['Space_Grotesk']">GOAL</span>
                  </div>
                </div>
                <div className="flex flex-col gap-2 mt-4 w-full max-w-[220px]">
                  {pieData.map((d, i) => (
                    <div key={d.name} className="flex justify-between items-center">
                      <div className="flex items-center">
                        <div className="w-2 h-2 mr-2 inline-block rounded-none" style={{ backgroundColor: PIE_COLORS[i] }} />
                        <span className="text-sm uppercase tracking-wider text-[#A1A1AA]">{d.name}</span>
                      </div>
                      <span className="text-sm font-bold uppercase text-[#FAFAFA]">{d.value}%</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-xs uppercase tracking-widest text-[#A1A1AA] mb-4">TOP CHANNELS THIS WEEK</div>
                <div className="flex flex-col">
                  {topChannels.map((c, i) => (
                    <div key={i} className="flex items-center gap-3 py-3 border-b border-[#3F3F46] last:border-0">
                      <div className="w-2 h-2 rounded-none flex-shrink-0" style={{ backgroundColor: c.category === 'goal' ? '#DFE104' : c.category === 'interest' ? 'rgba(250,250,250,0.4)' : '#3F3F46' }} />
                      <div className="flex-1">
                        <div className="text-sm font-bold uppercase tracking-tighter text-[#FAFAFA] truncate">{c.name}</div>
                        <div className={clsx("text-[10px] uppercase tracking-widest mt-0.5", c.category === 'goal' ? "text-[#DFE104]" : c.category === 'interest' ? "text-[#A1A1AA]" : "text-[#3F3F46]")}>
                          {c.category}
                        </div>
                      </div>
                      <div className="text-sm font-bold uppercase text-[#A1A1AA] flex-shrink-0">{c.minutes} MIN</div>
                    </div>
                  ))}
                </div>
                <div className="flex flex-col gap-1 mt-4">
                  <div className="flex items-center gap-1.5">
                    <EyeOff size={11} color="#3F3F46" />
                    <span className="text-[10px] text-[#3F3F46] uppercase tracking-wider">
                      YOUTUBE: video titles classified then discarded — only category label stored
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Info size={11} color="#3F3F46" />
                    <span className="text-[10px] text-[#3F3F46] uppercase tracking-wider">
                      INSTAGRAM: creator usernames only — video titles not available in instagram's export
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="mt-6">
            <div onClick={() => setSuggestionsOpen(!suggestionsOpen)} className="flex items-center justify-between cursor-pointer border-t border-[#3F3F46] pt-6 group">
              <span className="text-xs uppercase tracking-widest text-[#A1A1AA] group-hover:text-[#FAFAFA] transition-colors">IMPROVE YOUR GOAL SCORE</span>
              <motion.div animate={{ rotate: suggestionsOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                <ChevronDown size={16} color="#3F3F46" />
              </motion.div>
            </div>
            <AnimatePresence>
              {suggestionsOpen && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                  <div className="flex flex-col gap-3 mt-4">
                    {contentSuggestions.map((s, i) => (
                      <div key={i} className="border-2 border-[#3F3F46] p-4 flex items-center gap-4">
                        <Plus size={16} color="#DFE104" className="flex-shrink-0" />
                        <div className="flex-1">
                          <div className="text-sm font-bold uppercase text-[#FAFAFA] tracking-tighter">{s.name}</div>
                          <div className="text-xs text-[#A1A1AA] mt-0.5">{s.reason}</div>
                        </div>
                        <div className="text-[10px] uppercase tracking-widest text-[#3F3F46] hover:text-[#DFE104] cursor-pointer transition-colors ml-auto whitespace-nowrap">
                          ADD →
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </>
      )}
    </motion.div>
  );
}
```

---

## `components/dashboard/CravingLog.jsx`

```javascript
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Meh, Zap, Repeat, UserX, Shield, Minus, TrendingDown, Lock, CheckCircle, MessageSquare, Eye, PenLine, X } from 'lucide-react';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { useCravingData } from '../../hooks/useCravingData';

const TRIGGERS = [
  { id: 'boredom', icon: Meh, label: 'BOREDOM' },
  { id: 'anxiety', icon: Zap, label: 'ANXIETY' },
  { id: 'habit', icon: Repeat, label: 'HABIT' },
  { id: 'loneliness', icon: UserX, label: 'LONELINESS' }
];

const OUTCOMES = [
  { id: 'resisted', icon: Shield, title: 'RESISTED', desc: "Felt the urge, didn't open the app", color: '#DFE104' },
  { id: 'partial', icon: Minus, title: 'PARTIALLY SCROLLED', desc: 'Opened the app but closed it quickly', color: '#A1A1AA' },
  { id: 'gave_in', icon: TrendingDown, title: 'GAVE IN', desc: 'Ended up having a full scroll session', color: '#3F3F46' }
];

export default function CravingLog() {
  const [state, setState] = useState('idle'); // 'idle', 'logging', 'complete'
  const [trigger, setTrigger] = useState(null);
  const [outcome, setOutcome] = useState(null);
  const [cravingDescription, setCravingDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const [history, setHistory] = useLocalStorage('scrollsense_cravings', []);
  const [privateNotes, setPrivateNotes] = useLocalStorage('scrollsense_craving_notes', {});
  const { 
    recentCravings, 
    totalCravings,
    logCraving, 
    isLogging,
    resistanceRate,
  } = useCravingData();

  const handleLog = async () => {
    if (!trigger || !outcome) return;

    const entryId = Date.now().toString();
    const cravingData = {
      trigger,
      outcome,
      timestamp: new Date().toISOString(),
    };

    // 1. Save to localStorage (notes/cravingDescription stay here — never sent to server)
    try {
      const existing = JSON.parse(
        localStorage.getItem('scrollsense_cravings') || '[]'
      );
      existing.push({ 
        id: entryId, 
        cravingDescription: cravingDescription.trim(),
        ...cravingData 
      });
      localStorage.setItem('scrollsense_cravings', JSON.stringify(existing));
      setHistory(existing);
    } catch (e) { console.error(e) }

    // Save notes separately
    if (notes.trim()) {
      try {
        const notesStore = JSON.parse(
          localStorage.getItem('scrollsense_craving_notes') || '{}'
        );
        notesStore[entryId] = notes.trim();
        localStorage.setItem(
          'scrollsense_craving_notes', 
          JSON.stringify(notesStore)
        );
        setPrivateNotes({ ...privateNotes, [entryId]: notes.trim() });
      } catch (e) { console.error(e) }
    }

    // 2. Send to backend 
    try {
      await logCraving(cravingData);
    } catch (err) {
      console.error('Craving sync failed:', err.message);
    }

    // 3. Show complete state (keep existing logic)
    setState('complete');
    setTimeout(() => {
      setState('idle');
      setTrigger(null);
      setOutcome(null);
      setCravingDescription('');
      setNotes('');
    }, 4000);
  };

  const renderOutcomeBadge = (outcomeId) => {
    switch(outcomeId) {
      case 'resisted':
        return <span className="text-[10px] uppercase tracking-widest text-[#DFE104] border border-[#DFE104]/30 px-2 py-0.5">RESISTED</span>;
      case 'partial':
        return <span className="text-[10px] uppercase tracking-widest text-[#A1A1AA] border border-[#A1A1AA]/30 px-2 py-0.5">PARTIAL</span>;
      case 'gave_in':
        return <span className="text-[10px] uppercase tracking-widest text-[#3F3F46] border border-[#3F3F46]/30 px-2 py-0.5">GAVE IN</span>;
      default:
        return null;
    }
  };

  const getOutcomeColor = (outcomeId) => {
    switch(outcomeId) {
      case 'resisted': return 'bg-[#DFE104]';
      case 'partial': return 'bg-[#A1A1AA]';
      case 'gave_in': return 'bg-[#3F3F46]';
      default: return 'bg-transparent';
    }
  };

  const getTimeAgo = (timestamp) => {
    const min = Math.floor((new Date() - new Date(timestamp)) / 60000);
    if (min < 60) return `${min || 1} min ago`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr} hr ago`;
    return `${Math.floor(hr / 24)} days ago`;
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      viewport={{ once: true }}
      className="border-2 border-[#3F3F46] bg-[#09090B] p-4 md:p-8 h-full flex flex-col"
    >
      <div className="flex justify-between items-start mb-6">
        <div>
          <div className="text-xs uppercase tracking-widest text-[#DFE104] mb-1">CRAVING LOG</div>
          <h2 className="text-xl md:text-2xl font-bold uppercase tracking-tighter text-[#FAFAFA] leading-[0.9]">
            REFLECT ON A CRAVING
          </h2>
        </div>
        <div className="border border-[#3F3F46] px-2 py-0.5 text-xs uppercase tracking-widest text-[#3F3F46]">
          F4
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        <AnimatePresence mode="wait">
          {state === 'idle' && (
            <motion.div
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
            >
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={() => setState('logging')}
                className="w-full border-2 border-[#3F3F46] p-6 text-center hover:border-[#DFE104]/50 hover:bg-[#27272A]/30 transition-all duration-200 cursor-pointer"
              >
                <Plus size={24} className="text-[#DFE104] mb-2 mx-auto" />
                <div className="text-base font-bold uppercase tracking-tighter text-[#FAFAFA]">LOG A CRAVING</div>
                <div className="text-xs text-[#A1A1AA] mt-1 font-medium">Remember a moment today when you felt the urge to scroll.</div>
              </motion.button>

              <button
                onClick={() => setIsHistoryOpen(true)}
                className="w-full mt-4 border border-dashed border-[#3F3F46] py-3 text-xs font-bold uppercase tracking-widest text-[#A1A1AA] hover:text-[#FAFAFA] hover:border-[#A1A1AA] transition-all duration-200 cursor-pointer bg-transparent"
              >
                VIEW HISTORY ({totalCravings})
              </button>
            </motion.div>
          )}

          {state === 'logging' && (
            <motion.div
              key="logging"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
            >
              {/* Trigger */}
              <div className="text-xs uppercase tracking-widest text-[#A1A1AA] mb-4 font-medium">WHAT TRIGGERED THE URGE TO SCROLL?</div>
              <div className="grid grid-cols-2 md:flex md:flex-wrap gap-2">
                {TRIGGERS.map((t) => {
                  const Icon = t.icon;
                  const isSelected = trigger === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setTrigger(t.id)}
                      className={`border-2 p-3 flex flex-1 items-center justify-center md:justify-start gap-2 text-sm uppercase tracking-wider font-medium transition-all duration-200 ${
                        isSelected 
                          ? 'border-[#DFE104] bg-[#27272A] text-[#FAFAFA]' 
                          : 'border-[#3F3F46] text-[#A1A1AA] hover:border-[#FAFAFA]/30 hover:text-[#FAFAFA]'
                      }`}
                    >
                      <Icon size={16} />
                      {t.label}
                    </button>
                  );
                })}
              </div>

              {/* Outcome */}
              <div className="mt-6">
                <div className="text-xs uppercase tracking-widest text-[#A1A1AA] mb-4 font-medium">WHAT DID YOU DO?</div>
                <div className="flex flex-col gap-2">
                  {OUTCOMES.map((o) => {
                    const Icon = o.icon;
                    const isSelected = outcome === o.id;
                    return (
                      <button
                        key={o.id}
                        onClick={() => setOutcome(o.id)}
                        className={`border-2 p-4 flex items-center gap-3 text-left transition-all duration-200 ${
                          isSelected
                            ? 'border-[#DFE104] bg-[#27272A]'
                            : 'border-[#3F3F46] hover:border-[#FAFAFA]/30'
                        }`}
                      >
                        <Icon size={18} className={isSelected ? 'text-[#DFE104]' : 'text-[#3F3F46]'} />
                        <div>
                          <div className="font-bold uppercase tracking-tighter text-sm text-[#FAFAFA]">{o.title}</div>
                          <div className="text-xs text-[#A1A1AA] font-medium">{o.desc}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Description */}
              <div className="mt-6">
                <div className="flex items-center gap-2 mb-2">
                  <PenLine size={12} className="text-[#A1A1AA]" />
                  <div className="text-xs uppercase tracking-widest text-[#A1A1AA] font-medium">DESCRIBE IT (OPTIONAL)</div>
                </div>
                <textarea
                  value={cravingDescription}
                  onChange={(e) => setCravingDescription(e.target.value)}
                  maxLength={400}
                  placeholder="What were you craving exactly? What were you hoping to feel?"
                  style={{ minHeight: '72px' }}
                  className="bg-transparent border-2 border-[#3F3F46] focus:border-[#DFE104] transition-colors duration-200 text-sm text-[#FAFAFA] placeholder:text-[#3F3F46] outline-none w-full p-3 resize-none"
                />
                <div className="text-right text-[10px] text-[#3F3F46] mt-1 font-medium">{cravingDescription.length}/400</div>
                <div className="flex items-center gap-1.5 mt-1">
                  <Eye size={10} className="text-[#3F3F46]" />
                  <div className="text-[10px] text-[#3F3F46] uppercase tracking-wider">May be reviewed to improve ScrollSense — never shared publicly.</div>
                </div>
              </div>

              <div className="mt-8 flex gap-3">
                <button
                  onClick={() => {
                    setState('idle');
                    setTrigger(null);
                    setOutcome(null);
                    setCravingDescription('');
                    setNotes('');
                  }}
                  className="flex-1 border-2 border-[#3F3F46] bg-transparent text-[#FAFAFA] font-bold uppercase tracking-tighter h-12 hover:bg-[#FAFAFA] hover:text-black transition-colors"
                >
                  CANCEL
                </button>
                <button
                  onClick={isLogging ? undefined : handleLog}
                  disabled={(!trigger || !outcome) || isLogging}
                  className={`flex-1 h-12 font-bold uppercase tracking-tighter transition-all ${
                    trigger && outcome
                      ? 'bg-[#DFE104] text-black hover:scale-[1.02] active:scale-95'
                      : 'bg-[#27272A] text-[#3F3F46] cursor-not-allowed'
                  }`}
                >{isLogging ? "SAVING..." : "LOG IT"}</button>
              </div>

            </motion.div>
          )}

          {state === 'complete' && (
            <motion.div
              key="complete"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="text-center py-4 flex flex-col justify-center h-full"
            >
              <CheckCircle size={28} className="text-[#DFE104] mx-auto mb-3" />
              
              {outcome === 'resisted' && (
                <>
                  <div className="font-bold uppercase tracking-tighter text-lg text-[#DFE104]">CRAVING RESISTED.</div>
                  <div className="text-sm mt-1 text-[#A1A1AA] font-medium">That awareness is the whole point.</div>
                </>
              )}
              {outcome === 'partial' && (
                <>
                  <div className="font-bold uppercase tracking-tighter text-lg text-[#FAFAFA]">LOGGED.</div>
                  <div className="text-sm mt-1 text-[#A1A1AA] font-medium">Noticing is the first step.</div>
                </>
              )}
              {outcome === 'gave_in' && (
                <>
                  <div className="font-bold uppercase tracking-tighter text-lg text-[#FAFAFA]">LOGGED.</div>
                  <div className="text-sm mt-1 text-[#A1A1AA] font-medium">No judgment — data is data.</div>
                </>
              )}

              <button 
                onClick={() => { setState('idle'); setTrigger(null); setOutcome(null); setNotes(''); }}
                className="text-xs uppercase tracking-widest text-[#3F3F46] hover:text-[#A1A1AA] mt-8 cursor-pointer font-medium transition-colors"
              >
                LOG ANOTHER
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* History Modal */}
      <AnimatePresence>
        {isHistoryOpen && (
          <div 
            onClick={(e) => { if(e.target === e.currentTarget) setIsHistoryOpen(false) }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] flex justify-center items-center p-4 md:p-6"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2 }}
              className="bg-[#09090B] border-2 border-[#3F3F46] w-full max-w-lg max-h-[80vh] flex flex-col rounded-none shadow-2xl"
            >
              <div className="flex justify-between items-center border-b border-[#3F3F46] px-6 py-4 bg-[#09090B] sticky top-0 z-10">
                <div className="text-base font-bold uppercase tracking-tighter text-[#FAFAFA]">REFLECTION HISTORY</div>
                <button
                  onClick={() => setIsHistoryOpen(false)}
                  className="text-[#A1A1AA] hover:text-[#FAFAFA] cursor-pointer p-1 bg-transparent border-none"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6" style={{ overscrollBehavior: 'contain' }}>
                {recentCravings.length > 0 ? (
                  <div className="flex flex-col gap-4">
                    {recentCravings.map((entry) => (
                      <div key={entry.id} className="flex items-start gap-4 pb-4 border-b border-[#3F3F46]/50 last:border-0 last:pb-0">
                        <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1.5 ${getOutcomeColor(entry.outcome)}`} />
                        <div className="flex-1">
                          <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
                            <div className="text-sm font-bold uppercase tracking-tighter text-[#FAFAFA]">{entry.trigger}</div>
                            {renderOutcomeBadge(entry.outcome)}
                          </div>
                          <div className="text-xs text-[#3F3F46] font-medium mb-2">{entry.relativeTime || getTimeAgo(entry.timestamp)}</div>
                          
                          {entry.cravingDescription && (
                            <div className="text-sm text-[#A1A1AA] bg-[#27272A]/30 p-3 border border-[#3F3F46]/50 rounded-none mb-2 break-words">
                              {entry.cravingDescription}
                            </div>
                          )}
                          {privateNotes[entry.id] && (
                            <div className="text-sm text-[#3F3F46] flex items-start gap-2 bg-transparent p-0 break-words mt-2">
                              <Lock size={12} className="shrink-0 mt-0.5" />
                              <span className="italic">{privateNotes[entry.id]}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-[#A1A1AA] text-center py-10 font-medium">
                    No reflections yet. Come back here after you've had an urge to scroll — even if you gave in.
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
```

---

## `components/dashboard/DailyIntentionBanner.jsx`

```javascript
import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDashboardStore } from '../../store/dashboardStore';
import { Meh, Zap, Search, Play, BookOpen, CheckCircle, X, Lock } from 'lucide-react';
import { useSessionData } from '../../hooks/useSessionData';
import useAuthStore from '../../store/authStore';
import api from '../../lib/axios';

const INTENTIONS = [
  { id: 'boredom', icon: Meh, label: 'BOREDOM' },
  { id: 'stress', icon: Zap, label: 'STRESS / ESCAPE' },
  { id: 'specific', icon: Search, label: 'LOOKING FOR SOMETHING' },
  { id: 'entertainment', icon: Play, label: 'PLANNED ENTERTAINMENT' },
  { id: 'learning', icon: BookOpen, label: 'WANT TO LEARN' },
];

export const DailyIntentionBanner = () => {
  const { todayIntention, setTodayIntention, dismissIntentionBanner, clearIntentionIfStale } = useDashboardStore();
  const { logIntention, isLoggingIntention, todayIntention: backendTodayIntention } = useSessionData()
  const user = useAuthStore(state => state.user)

  useEffect(() => {
    clearIntentionIfStale();
  }, [clearIntentionIfStale]);

  const handleSelect = async (optionId) => {
    setTodayIntention(optionId);
    
    // Save to local storage for frontend stats
    try {
      const stored = JSON.parse(localStorage.getItem('scrollsense_intentions') || '[]');
      stored.push({
        id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
        intentionCategory: optionId,
        timestamp: new Date().toISOString(),
        type: 'daily'
      });
      localStorage.setItem('scrollsense_intentions', JSON.stringify(stored));
    } catch (e) {
      console.error("Local storage fail", e);
    }
    
    // Fire API non-blocking
    api.post('/sessions/intention', { intentionCategory: optionId, type: 'daily' }).catch(() => {});
  };

  if (todayIntention.dismissed) {
    return null; // STATE C - HIDDEN
  }

  return (
    <AnimatePresence mode="wait">
      {todayIntention.value === '' ? (
        // STATE A - QUESTION
        <motion.div
          key="question"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="w-full bg-[#27272A] border-2 border-[#3F3F46] p-5 md:p-6 mb-6 rounded-none"
        >
          <div className="flex justify-between items-start mb-5">
            <div className="flex flex-col">
              <span className="text-xs uppercase tracking-widest text-[#DFE104] mb-1">
                DAILY CHECK-IN
              </span>
              <span className="text-lg md:text-xl font-bold uppercase tracking-tighter text-[#FAFAFA] leading-[0.9]">
                WHAT'S YOUR INTENTION FOR SOCIAL MEDIA TODAY?
              </span>
            </div>
            <span className="text-[10px] uppercase tracking-widest text-[#3F3F46]">
              ONCE A DAY
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            {INTENTIONS.map(({ id, icon: Icon, label }) => (
              <motion.button
                key={id}
                whileTap={{ scale: 0.97 }}
                onClick={() => handleSelect(id)}
                className={`border-2 border-[#3F3F46] hover:border-[#FAFAFA]/30 px-4 py-2.5 flex items-center gap-2 cursor-pointer transition-all duration-200 rounded-none text-sm font-bold uppercase tracking-tighter text-[#A1A1AA] hover:text-[#FAFAFA] bg-transparent ${isLoggingIntention ? 'opacity-60' : ''}`}
              >
                <Icon size={16} />
                {label}
              </motion.button>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-[#3F3F46] flex items-center gap-2">
            <Lock size={11} className="text-[#3F3F46]" />
            <span className="text-[10px] uppercase tracking-widest text-[#3F3F46]">
              THIS STAYS PRIVATE — USED ONLY FOR YOUR PATTERN ANALYSIS
            </span>
          </div>
        </motion.div>
      ) : (
        // STATE B - CONFIRMED
        <motion.div
          key="confirmed"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0, overflow: 'hidden' }}
          transition={{ duration: 0.25 }}
          className="flex items-center justify-between bg-[#27272A]/50 border border-[#3F3F46]/50 px-4 py-3 mb-6 rounded-none"
        >
          <div className="flex items-center gap-3">
            <CheckCircle size={14} className="text-[#DFE104] shrink-0" />
            <span className="text-xs uppercase tracking-widest text-[#A1A1AA] mr-2 hidden sm:inline-block">
              TODAY'S INTENTION:
            </span>
            <div className="bg-[#27272A] border border-[#DFE104]/30 px-3 py-1 text-xs font-bold uppercase tracking-tighter text-[#DFE104] rounded-none">
              {INTENTIONS.find(i => i.id === todayIntention.value)?.label || todayIntention.value}
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => useDashboardStore.getState().resetTodayIntention()}
              className="text-[10px] uppercase tracking-widest text-[#3F3F46] hover:text-[#A1A1AA] cursor-pointer bg-transparent border-none appearance-none p-0"
            >
              CHANGE
            </button>
            <button
              onClick={dismissIntentionBanner}
              className="p-1 cursor-pointer bg-transparent border-none appearance-none flex items-center justify-center text-[#3F3F46] hover:text-[#A1A1AA]"
              title="Dismiss"
            >
              <X size={14} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
```

---

## `components/dashboard/DashboardNav.jsx`

```javascript
import React, { useState } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { Bell, Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import useAuthStore from '../../store/authStore';

export default function DashboardNav() {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const navigate = useNavigate();

  const user = useAuthStore(state => state.user);
  const clearUser = useAuthStore(state => state.clearUser);

  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : user?.email
    ? user.email[0].toUpperCase()
    : 'U';

  const handleSignOut = () => {
    clearUser();
    localStorage.removeItem('scrollsense_user');
    navigate('/');
  };

  const navLinks = [
    { name: 'DASHBOARD', path: '/dashboard' },
    { name: 'PATTERNS', path: '/patterns' },
    { name: 'PROGRESS', path: '/progress' },
    { name: 'COMMUNITY', path: '/community' },
    { name: 'SETTINGS', path: '/settings' }
  ];

  return (
    <>
      <nav className="fixed top-0 left-0 w-full h-[56px] bg-[#09090B] border-b border-[#3F3F46] z-50 font-space">
        <div className="max-w-[95vw] mx-auto px-4 h-full flex items-center justify-between">
          
          {/* LEFT: Logo */}
          <Link 
            to="/" 
            className="font-bold uppercase tracking-tighter text-sm text-[#FAFAFA] hover:text-[#DFE104] transition-colors duration-200"
          >
            SCROLLSENSE
          </Link>

          {/* CENTER: Desktop Nav */}
          <div className="hidden md:flex items-center">
            {navLinks.map((link) => (
              <NavLink
                key={link.path}
                to={link.path}
                className={({ isActive }) =>
                  `text-xs uppercase tracking-widest px-4 py-1.5 transition-colors duration-200 ${
                    isActive 
                      ? 'text-[#FAFAFA] border-b-2 border-[#DFE104] pb-0' 
                      : 'text-[#A1A1AA] hover:text-[#FAFAFA]'
                  }`
                }
              >
                {link.name}
              </NavLink>
            ))}
          </div>

          {/* RIGHT: Notifications & Avatar */}
          <div className="flex items-center gap-2">
            <button className="p-2 text-[#A1A1AA] hover:text-[#FAFAFA] transition-colors">
              <Bell size={18} />
            </button>
            <div 
              className="hidden md:block relative"
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
            >
              <div className="w-[32px] h-[32px] border-2 border-[#3F3F46] bg-[#27272A] flex items-center justify-center cursor-pointer hover:border-[#DFE104]/50 transition-colors duration-200 rounded-none">
                <span className="text-xs font-bold text-[#FAFAFA] uppercase">{initials}</span>
              </div>
              
              <AnimatePresence>
                {showTooltip && (
                  <motion.div
                    initial={{ opacity: 0, y: 4, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 4, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-[calc(100%+8px)] right-0 z-[100] max-w-[200px]"
                  >
                    <div className="bg-[#27272A] border border-[#3F3F46] px-3 py-2 whitespace-nowrap flex flex-col gap-1 rounded-none shadow-none">
                      {user?.name && (
                        <span className="text-xs font-bold uppercase tracking-tighter text-[#FAFAFA]">
                          {user.name}
                        </span>
                      )}
                      <span className="text-[10px] text-[#A1A1AA] uppercase tracking-wider overflow-hidden text-ellipsis">
                        {user?.email || 'No email set'}
                      </span>
                      <div className="border-t border-[#3F3F46] my-1" />
                      <span 
                        onClick={handleSignOut}
                        className="text-[10px] uppercase tracking-widest text-[#3F3F46] hover:text-[#A1A1AA] cursor-pointer transition-colors"
                      >
                        SIGN OUT
                      </span>
                    </div>
                    <div className="absolute top-[-4px] right-[12px] w-2 h-2 bg-[#27272A] border-l border-t border-[#3F3F46] transform rotate-45" />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            {/* Mobile Hamburger */}
            <button 
              className="md:hidden p-2 text-[#A1A1AA] hover:text-[#FAFAFA] transition-colors"
              onClick={() => setIsMobileOpen(true)}
            >
              <Menu size={20} />
            </button>
          </div>
        </div>
      </nav>

      {/* MOBILE DRAWER */}
      <AnimatePresence>
        {isMobileOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileOpen(false)}
              className="fixed inset-0 bg-black/60 z-[99]"
            />
            {/* Drawer */}
            <motion.div
              initial={{ x: 240 }}
              animate={{ x: 0 }}
              exit={{ x: 240 }}
              transition={{ duration: 0.25 }}
              className="fixed top-0 right-0 h-full w-[240px] bg-[#09090B] border-l-2 border-[#3F3F46] z-[100] pt-16 px-6 font-space"
            >
              <button 
                onClick={() => setIsMobileOpen(false)}
                className="absolute top-4 right-4 text-[#A1A1AA] hover:text-[#FAFAFA] transition-colors"
              >
                <X size={20} />
              </button>

              <div className="flex flex-col gap-1">
                {navLinks.map((link) => (
                  <NavLink
                    key={link.path}
                    to={link.path}
                    onClick={() => setIsMobileOpen(false)}
                    className={({ isActive }) =>
                      `py-4 border-b border-[#3F3F46] text-sm uppercase tracking-widest ${
                        isActive ? 'text-[#DFE104]' : 'text-[#A1A1AA]'
                      }`
                    }
                  >
                    {link.name}
                  </NavLink>
                ))}
                
                <div className="py-4 mt-8 border-t border-[#3F3F46] flex flex-col gap-2">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-[32px] h-[32px] border-2 border-[#3F3F46] bg-[#27272A] flex items-center justify-center rounded-none">
                      <span className="text-xs font-bold text-[#FAFAFA] uppercase">{initials}</span>
                    </div>
                    <div className="flex flex-col overflow-hidden">
                       <span className="text-[10px] font-bold uppercase tracking-tighter text-[#FAFAFA] truncate">{user?.name || 'User'}</span>
                       <span className="text-[8px] text-[#A1A1AA] uppercase tracking-wider truncate">{user?.email || 'No email set'}</span>
                    </div>
                  </div>
                  <button onClick={handleSignOut} className="text-left text-sm uppercase tracking-widest text-[#A1A1AA] hover:text-[#FAFAFA] transition-colors">
                    LOG OUT
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
```

---

## `components/dashboard/GoalRelevanceScore.jsx`

```javascript
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, TrendingUp, TrendingDown, Minus, Info, EyeOff, ChevronDown, Plus } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ReferenceLine, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { useYouTubeData } from '../../hooks/useYouTubeData';
import YouTubeConnectPrompt from './YouTubeConnectPrompt';
import SkeletonCard from './SkeletonCard';
import api from '../../lib/axios';
import clsx from 'clsx';

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{ background: '#27272A', border: '1px solid #3F3F46', borderRadius: 0, fontFamily: 'Space Grotesk', fontSize: 12, padding: '8px', color: '#FAFAFA' }}>
        {payload[0].value}% Goal Relevant
      </div>
    );
  }
  return null;
};

export default function GoalRelevanceScore({ className }) {
  const { isConnected, isLoading, currentWeek, goalScoreHistory, contentSuggestions, refetchDashboard } = useYouTubeData();
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);

  const onConnect = async () => {
    try {
      await api.post('/youtube/connect');
      refetchDashboard();
    } catch (err) {
      console.error('YouTube connect failed:', err.message);
    }
  };

  const chartH = typeof window !== 'undefined' && window.innerWidth < 768 ? 160 : 200;

  if (!isConnected) {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} viewport={{ once: true }} className={clsx("border-2 border-[#3F3F46] bg-[#09090B] p-6 md:p-8", className)}>
        <YouTubeConnectPrompt featureName="GOAL RELEVANCE" featureId="F13" onConnect={onConnect} />
      </motion.div>
    );
  }

  if (isLoading) {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} viewport={{ once: true }} className={clsx("border-2 border-[#3F3F46] bg-[#09090B] p-6 md:p-8", className)}>
        <SkeletonCard showChart={true} lines={2} />
      </motion.div>
    );
  }

  const diff = currentWeek?.changeVsLastWeek?.goal ?? 0;
  const diffFromAvg = (currentWeek?.goal ?? 0) - 8;
  const hasHistory = (currentWeek?.weeksOfData ?? 0) >= 2;

  let storedFocusArea = 'YOUR FOCUS AREA';
  try {
    const stored = JSON.parse(localStorage.getItem('scrollsense_onboarding') || '{}');
    if (stored.careerPath) storedFocusArea = stored.careerPath;
    else if (stored.careerPathPreset) storedFocusArea = stored.careerPathPreset;
  } catch(e) {}

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} viewport={{ once: true }} className={clsx("border-2 border-[#3F3F46] bg-[#09090B] p-6 md:p-8 flex flex-col h-full", className)}>
      <div className="flex justify-between items-start mb-6">
        <div>
          <div className="text-xs uppercase tracking-widest text-[#DFE104] mb-1">GOAL RELEVANCE SCORE</div>
          <h2 className="text-xl md:text-2xl font-bold uppercase tracking-tighter text-[#FAFAFA] leading-[0.9]">
            HOW ALIGNED IS YOUR FEED?
          </h2>
        </div>
        <div className="border border-[#3F3F46] px-2 py-0.5 text-xs uppercase tracking-widest text-[#3F3F46]">F13</div>
      </div>

      <div className="flex flex-col md:flex-row md:items-end gap-4 mb-8">
        <div className="flex flex-col">
          <div className="flex items-end gap-1">
            <span className="text-[clamp(4rem,10vw,7rem)] font-bold uppercase tracking-tighter leading-none text-[#DFE104]">
              {currentWeek?.goal ?? 0}
            </span>
            <span className="text-[2rem] font-bold text-[#A1A1AA] mb-2">%</span>
          </div>
          
          <div className="mt-2 text-xs uppercase tracking-widest">
            {hasHistory ? (
              <div className="flex items-center gap-1">
                {diff > 0 ? <TrendingUp size={13} color="#DFE104" /> : diff < 0 ? <TrendingDown size={13} color="#ef4444" /> : <Minus size={13} color="#3F3F46" />}
                <span className={clsx(diff > 0 ? "text-[#DFE104]" : diff < 0 ? "text-red-500" : "text-[#3F3F46]")}>
                  {diff > 0 ? '+' : ''}{diff}pp from last week
                </span>
              </div>
            ) : (
              <span className="text-[#3F3F46]">WEEK 1 — BASELINE SET</span>
            )}
          </div>
        </div>

        <div className="md:ml-auto w-full md:w-auto border-2 border-[#3F3F46] p-4">
          <div className="text-[10px] uppercase tracking-widest text-[#A1A1AA] mb-1">GLOBAL AVERAGE</div>
          <div className="text-2xl font-bold uppercase text-[#3F3F46]">8%</div>
          <div className="text-xs text-[#3F3F46] mt-1">of feeds are goal-relevant</div>
          <div className="mt-3 pt-3 border-t border-[#3F3F46]">
            {diffFromAvg > 0 ? (
              <span className="text-xs uppercase tracking-widest text-[#DFE104] font-bold">{diffFromAvg}pp ABOVE AVERAGE</span>
            ) : diffFromAvg < 0 ? (
              <span className="text-xs uppercase tracking-widest text-[#A1A1AA]">{Math.abs(diffFromAvg)}pp BELOW AVERAGE</span>
            ) : (
              <span className="text-xs uppercase tracking-widest text-[#3F3F46]">AT AVERAGE</span>
            )}
          </div>
        </div>
      </div>

      <div style={{ height: chartH }} className="w-full mb-2">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={goalScoreHistory || []} margin={{ top: 8, right: 16, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272A" vertical={false} />
            <XAxis dataKey="week" axisLine={false} tickLine={false} tick={{ fill: '#A1A1AA', fontSize: 11, fontFamily: 'Space Grotesk' }} />
            <YAxis tickFormatter={(v) => v + '%'} domain={[0, 30]} axisLine={false} tickLine={false} tick={{ fill: '#A1A1AA', fontSize: 11, fontFamily: 'Space Grotesk' }} />
            <ReferenceLine y={8} stroke="#3F3F46" strokeDasharray="4 4" label={{ value: 'AVG', position: 'right', fill: '#3F3F46', fontSize: 10, fontFamily: 'Space Grotesk' }} />
            <RechartsTooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(39, 39, 42, 0.4)' }} />
            <Line type="monotone" dataKey="score" stroke="#DFE104" strokeWidth={2} dot={{ fill: '#DFE104', r: 3, strokeWidth: 0 }} activeDot={{ fill: '#DFE104', r: 5, stroke: '#09090B', strokeWidth: 2 }} />
          </LineChart>
        </ResponsiveContainer>
        {!hasHistory && (
          <div className="flex items-center gap-2 mt-3">
            <Info size={12} color="#3F3F46" />
            <span className="text-xs text-[#3F3F46] uppercase tracking-wider">
              Trend line builds over 2 weeks — {Math.max(0, 2 - (currentWeek?.weeksOfData ?? 0))} more week(s) to go.
            </span>
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center gap-2">
        <Target size={12} color="#DFE104" />
        <span className="text-xs uppercase tracking-widest text-[#A1A1AA]">
          CONTENT MATCHED AGAINST: {storedFocusArea.toUpperCase()}
        </span>
      </div>

      <div style={{ display:'flex', alignItems:'center', gap:'6px', 
                    marginTop:'6px', marginBottom:'1.5rem' }}>
        <Info size={11} color="#3F3F46" />
        <span style={{ fontSize:'10px', color:'#3F3F46', 
                       textTransform:'uppercase', letterSpacing:'0.08em' }}>
          YOUTUBE: video titles classified · INSTAGRAM: creator 
          diversity only — titles not available in export
        </span>
      </div>

      <div className="mt-2 mb-6">
        <div className="text-xs uppercase tracking-widest text-[#A1A1AA] mb-4">THIS WEEK'S BREAKDOWN</div>
        <div className="flex flex-col gap-3">
          {[
            { label: 'GOAL RELEVANT', value: currentWeek?.goal ?? 0, color: '#DFE104', textColor: '#DFE104' },
            { label: 'GENUINE INTEREST', value: currentWeek?.interest ?? 0, color: 'rgba(250,250,250,0.4)', textColor: '#A1A1AA' },
            { label: 'RANDOM / JUNK', value: currentWeek?.junk ?? 0, color: '#3F3F46', textColor: '#3F3F46' }
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="w-2 h-2 flex-shrink-0" style={{ backgroundColor: item.color }} />
              <div className="text-sm uppercase tracking-tighter font-bold text-[#FAFAFA] min-w-[100px] md:min-w-[130px]">{item.label}</div>
              <div className="flex-1 h-[4px] bg-[#27272A] relative">
                <div className="h-[4px] transition-all duration-700 absolute left-0 top-0" style={{ backgroundColor: item.color, width: `${item.value}%` }} />
              </div>
              <div className="text-sm font-bold uppercase min-w-[40px] text-right" style={{ color: item.textColor }}>{item.value}%</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display:'flex', alignItems:'center', gap:'6px',
                    marginTop:'0.75rem', marginBottom:'1.5rem' }}>
        <Info size={10} color="#3F3F46" />
        <span style={{ fontSize:'10px', color:'#3F3F46',
                       textTransform:'uppercase', letterSpacing:'0.07em',
                       lineHeight:'1.5' }}>
          GOAL SCORE IS BASED ON YOUTUBE WATCH HISTORY · 
          INSTAGRAM DATA DOES NOT INCLUDE VIDEO TITLES
        </span>
      </div>

      <div className="flex items-center gap-1.5 mb-6">
        <EyeOff size={11} color="#3F3F46" />
        <span className="text-xs text-[#3F3F46]">Titles classified then discarded. Only the category label is stored.</span>
      </div>

      <div className="mt-auto">
        <div onClick={() => setSuggestionsOpen(!suggestionsOpen)} className="flex justify-between items-center cursor-pointer border-t border-[#3F3F46] pt-6 group">
          <span className="text-xs uppercase tracking-widest text-[#A1A1AA] group-hover:text-[#FAFAFA] transition-colors">CHANNELS TO BOOST YOUR SCORE</span>
          <motion.div animate={{ rotate: suggestionsOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronDown size={16} color="#3F3F46" />
          </motion.div>
        </div>
        <AnimatePresence>
          {suggestionsOpen && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
              <div className="flex flex-col gap-3 mt-4">
                {contentSuggestions.map((s, i) => (
                  <div key={i} className="border-2 border-[#3F3F46] p-4 flex items-center gap-4">
                    <Plus size={15} color="#DFE104" className="flex-shrink-0" />
                    <div className="flex-1">
                      <div className="text-sm font-bold uppercase tracking-tighter text-[#FAFAFA]">{s.name}</div>
                      <div className="text-xs text-[#A1A1AA] mt-0.5">{s.reason}</div>
                    </div>
                    <div className="text-[10px] uppercase text-[#3F3F46] hover:text-[#DFE104] cursor-pointer transition-colors ml-auto whitespace-nowrap">
                      ADD →
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
```

---

## `components/dashboard/IntentionGate.jsx`

```javascript
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Meh, Zap, Search, Play, BookOpen, ChevronRight, CheckCircle } from 'lucide-react';
import { useLocalStorage } from '../../hooks/useLocalStorage';

const INTENTIONS = [
  { id: 'boredom', icon: Meh, title: 'BOREDOM', desc: 'Nothing to do, opening out of habit' },
  { id: 'stress', icon: Zap, title: 'STRESS OR ESCAPE', desc: 'Using scroll to avoid something' },
  { id: 'specific', icon: Search, title: 'LOOKING FOR SOMETHING', desc: 'I have a specific video or topic in mind' },
  { id: 'entertainment', icon: Play, title: 'PLANNED ENTERTAINMENT', desc: 'I intentionally set aside time for this' },
  { id: 'learning', icon: BookOpen, title: 'WANT TO LEARN', desc: 'Looking for educational or skill content' }
];

export default function IntentionGate() {
  const [state, setState] = useState('idle'); // 'idle', 'selecting', 'logged'
  const [selectedIntention, setSelectedIntention] = useState(null);
  const [countdown, setCountdown] = useState(8);
  const [history, setHistory] = useLocalStorage('scrollsense_intentions', []);

  // Filter history for this week to compute stats
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thisWeekHistory = history.filter(h => new Date(h.timestamp) >= oneWeekAgo);

  const stats = React.useMemo(() => {
    if (thisWeekHistory.length === 0) return null;
    const counts = {};
    thisWeekHistory.forEach(h => {
      counts[h.intentionCategory] = (counts[h.intentionCategory] || 0) + 1;
    });
    let mostCommon = '';
    let maxCount = 0;
    for (const [key, val] of Object.entries(counts)) {
      if (val > maxCount) {
        maxCount = val;
        mostCommon = key;
      }
    }
    const intentionObj = INTENTIONS.find(i => i.id === mostCommon);
    return {
      mostCommonTitle: intentionObj ? intentionObj.title : mostCommon,
      totalCount: thisWeekHistory.length
    };
  }, [thisWeekHistory]);

  const handleSelect = (id) => {
    const newEntry = {
      id: Date.now().toString(),
      intentionCategory: id,
      timestamp: new Date().toISOString()
    };
    setHistory([...history, newEntry]);
    setSelectedIntention(INTENTIONS.find(i => i.id === id));
    setState('logged');
    setCountdown(8);
    // Fire and forget APi simulation here if needed
  };

  useEffect(() => {
    let timer;
    if (state === 'logged' && countdown > 0) {
      timer = setTimeout(() => setCountdown(c => c - 1), 1000);
    } else if (state === 'logged' && countdown === 0) {
      setState('idle');
      setSelectedIntention(null);
    }
    return () => clearTimeout(timer);
  }, [state, countdown]);

  const getInsightText = (id) => {
    switch (id) {
      case 'boredom': return "Heads up — boredom sessions typically run 2.3× longer. Your session timer is active.";
      case 'stress': return "Stress scrolling often doesn't reduce stress. Consider setting a 15-minute limit.";
      case 'specific': return "Great — you know what you're looking for. Set a timer so you stay on track.";
      case 'entertainment': return "Enjoy it — this is intentional time well spent.";
      case 'learning': return "Learning mode. Your session will be marked as career-relevant.";
      default: return "";
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      viewport={{ once: true }}
      className="border-2 border-[#3F3F46] bg-[#09090B] p-4 md:p-8 h-full flex flex-col"
    >
      <div className="flex justify-between items-start mb-6">
        <div>
          <div className="text-xs uppercase tracking-widest text-[#DFE104] mb-1">INTENTION GATE</div>
          <h2 className="text-xl md:text-2xl font-bold uppercase tracking-tighter text-[#FAFAFA] leading-[0.9]">
            WHY ARE YOU OPENING THE APP?
          </h2>
        </div>
        <div className="border border-[#3F3F46] px-2 py-0.5 text-xs uppercase tracking-widest text-[#3F3F46]">
          F2
        </div>
      </div>

      <div className="flex-1 flex flex-col justify-center">
        <AnimatePresence mode="wait">
          {state === 'idle' && (
            <motion.div
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="text-center py-8"
            >
              <div className="text-[6rem] font-bold text-[#27272A] leading-none mb-4 select-none" aria-hidden="true">?</div>
              <p className="text-base text-[#A1A1AA] mb-2 font-medium">Starting a scroll session?</p>
              <p className="text-sm text-[#3F3F46] mb-8 font-medium">Log your intention before you open YouTube or Instagram.</p>
              
              <button 
                onClick={() => setState('selecting')}
                className="w-full bg-[#DFE104] text-black font-bold uppercase tracking-tighter h-12 px-6 hover:scale-[1.02] active:scale-95 transition-all duration-200"
              >
                LOG INTENTION NOW
              </button>

              {stats && (
                <div className="flex gap-4 justify-center mt-8 pt-6 border-t border-[#3F3F46]">
                  <div className="text-left">
                    <div className="text-xs uppercase tracking-widest text-[#A1A1AA]">MOST COMMON</div>
                    <div className="text-lg font-bold uppercase text-[#FAFAFA] tracking-tighter">{stats.mostCommonTitle}</div>
                  </div>
                  <div className="w-[2px] bg-[#3F3F46]"></div>
                  <div className="text-left">
                    <div className="text-xs uppercase tracking-widest text-[#A1A1AA]">THIS WEEK</div>
                    <div className="text-lg font-bold uppercase text-[#DFE104] tracking-tighter">{stats.totalCount} SESSIONS</div>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {state === 'selecting' && (
            <motion.div
              key="selecting"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
            >
              <div className="text-xs uppercase tracking-widest text-[#3F3F46] mb-6">BE HONEST — THIS STAYS PRIVATE</div>
              <div className="flex flex-col gap-3">
                {INTENTIONS.map((intention) => {
                  const Icon = intention.icon;
                  return (
                    <motion.button
                      key={intention.id}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleSelect(intention.id)}
                      className="border-2 border-[#3F3F46] p-4 flex items-center gap-4 cursor-pointer hover:border-[#FAFAFA]/30 hover:bg-[#27272A]/50 transition-all duration-200 text-left"
                    >
                      <Icon size={20} className="text-[#A1A1AA] flex-shrink-0" />
                      <div className="flex-1">
                        <div className="text-sm font-bold uppercase tracking-tighter text-[#FAFAFA]">{intention.title}</div>
                        <div className="text-xs text-[#A1A1AA] mt-0.5">{intention.desc}</div>
                      </div>
                      <ChevronRight size={16} className="text-[#3F3F46] flex-shrink-0" />
                    </motion.button>
                  );
                })}
              </div>
              <div className="mt-6 text-center">
                <button 
                  onClick={() => setState('idle')}
                  className="text-xs uppercase tracking-widest text-[#3F3F46] hover:text-[#A1A1AA] transition-colors"
                >
                  CANCEL
                </button>
              </div>
            </motion.div>
          )}

          {state === 'logged' && selectedIntention && (
            <motion.div
              key="logged"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="text-center py-6 flex flex-col justify-center h-full"
            >
              <CheckCircle size={32} className="text-[#DFE104] mx-auto mb-4" />
              <div className="text-lg font-bold uppercase tracking-tighter text-[#FAFAFA] mb-1">INTENTION LOGGED</div>
              
              <div className="mt-4">
                <div className="text-xs text-[#A1A1AA] mb-2 font-medium">You're opening the app because:</div>
                <div className="text-2xl font-bold uppercase tracking-tighter text-[#DFE104]">{selectedIntention.title}</div>
              </div>

              <div className="mt-6 border-l-4 border-[#DFE104] pl-4 bg-[#27272A]/40 py-3 pr-4 text-left">
                <p className="text-xs text-[#A1A1AA] leading-relaxed font-medium">
                  {getInsightText(selectedIntention.id)}
                </p>
              </div>

              <div className="mt-8">
                <div className="text-xs text-[#3F3F46] uppercase tracking-widest mb-2 font-medium">
                  Resetting in {countdown}s
                </div>
                <div className="w-full h-[2px] bg-[#27272A] relative overflow-hidden">
                  <motion.div 
                    initial={{ width: '100%' }}
                    animate={{ width: '0%' }}
                    transition={{ duration: 8, ease: "linear" }}
                    className="absolute left-0 top-0 h-full bg-[#3F3F46]"
                  />
                </div>
              </div>

              <div className="mt-6">
                <button 
                  onClick={() => { setState('idle'); setSelectedIntention(null); }}
                  className="text-xs uppercase tracking-widest text-[#3F3F46] hover:text-[#A1A1AA] transition-colors"
                >
                  LOG ANOTHER
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
```

---

## `components/dashboard/InterestBudgetTracker.jsx`

```javascript
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, AlertCircle, Sparkles, Info } from 'lucide-react';
import { useYouTubeData } from '../../hooks/useYouTubeData';
import { useNavigate } from 'react-router-dom';
import YouTubeConnectPrompt from './YouTubeConnectPrompt';
import SkeletonCard from './SkeletonCard';
import api from '../../lib/axios';
import clsx from 'clsx';

export default function InterestBudgetTracker({ className }) {
  const { isConnected, isLoading, interests, refetchDashboard } = useYouTubeData();
  const navigate = useNavigate();
  const [timeLeft, setTimeLeft] = useState({ h: 0, m: 0 });

  const onConnect = async () => {
    try {
      await api.post('/youtube/connect');
      refetchDashboard();
    } catch (err) {
      console.error('YouTube connect failed:', err.message);
    }
  };

  const instagramTopics = (() => {
    try {
      const stored = localStorage.getItem('scrollsense_instagram_topics')
      return stored ? JSON.parse(stored) : []
    } catch { return [] }
  })()

  const hasInstagramTopics = instagramTopics.length > 0;

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date();
      const midnight = new Date();
      midnight.setHours(24, 0, 0, 0);
      const diff = midnight - now;
      setTimeLeft({
        h: Math.floor(diff / 3600000),
        m: Math.floor((diff % 3600000) / 60000)
      });
    };
    updateTimer();
    const interval = setInterval(updateTimer, 60000);
    return () => clearInterval(interval);
  }, []);

  if (!isConnected) {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} viewport={{ once: true }} className={clsx("border-2 border-[#3F3F46] bg-[#09090B] p-6 md:p-8", className)}>
        <YouTubeConnectPrompt featureName="INTEREST BUDGETS" featureId="F12" onConnect={onConnect} />
      </motion.div>
    );
  }

  if (isLoading) {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} viewport={{ once: true }} className={clsx("border-2 border-[#3F3F46] bg-[#09090B] p-6 md:p-8", className)}>
        <SkeletonCard lines={5} />
      </motion.div>
    );
  }

  const inBudgetCount = (interests || []).filter(i => i.status !== 'over').length;
  const overBudgetCount = (interests || []).filter(i => i.status === 'over').length;
  const topInterest = [...(interests || [])].sort((a, b) => b.consumedMinutes - a.consumedMinutes)[0];
  const avoidanceCandidate = (interests || []).find(i => i.weeklyAvgMinutes > i.dailyBudgetMinutes * 1.3);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} viewport={{ once: true }} className={clsx("border-2 border-[#3F3F46] bg-[#09090B] p-6 md:p-8 flex flex-col h-full", className)}>
      <div className="flex justify-between items-start mb-6">
        <div>
          <div className="text-xs uppercase tracking-widest text-[#DFE104] mb-1">INTEREST BUDGET TRACKER</div>
          <h2 className="text-xl md:text-2xl font-bold uppercase tracking-tighter text-[#FAFAFA]">
            DAILY INTEREST BUDGETS
          </h2>
        </div>
        <div className="border border-[#3F3F46] px-2 py-0.5 text-xs uppercase tracking-widest text-[#3F3F46]">F12</div>
      </div>

      <div className="flex items-center gap-2 mb-6">
        <RefreshCw size={11} color="#3F3F46" />
        <span className="text-xs uppercase tracking-widest text-[#3F3F46]">
          RESETS AT MIDNIGHT · {timeLeft.h}H {timeLeft.m}M LEFT TODAY
        </span>
      </div>

      <div className="flex flex-col flex-1">
        {(interests || []).map((interest) => {
          const budget = interest.dailyBudgetMinutes;
          const consumed = interest.consumedMinutes;
          const isOver = interest.status === 'over';
          
          const pct = Math.min((consumed / budget) * 100, 100);
          let fillColor = 'bg-[#DFE104]';
          if (isOver) fillColor = 'bg-red-500';
          else if (consumed >= budget * 0.8) fillColor = 'bg-[#A1A1AA]';

          let textColor = 'text-[#FAFAFA]';
          if (isOver) textColor = 'text-red-500';
          else if (interest.status === 'near_limit') textColor = 'text-[#A1A1AA]';

          return (
            <div key={interest.id} className="flex flex-col gap-2 border-b border-[#3F3F46] py-5 last:border-0 last:pb-0 first:pt-0">
              <div className="flex justify-between items-center mb-1">
                <span className={clsx("text-sm font-bold uppercase tracking-tighter", textColor)}>
                  {interest.label}
                </span>
                <div className="flex items-center gap-1.5">
                  <div className={clsx("w-1.5 h-1.5 rounded-none", isOver ? "bg-red-500" : interest.status === 'near_limit' ? "bg-[#A1A1AA]" : "bg-[#DFE104]")} />
                  <span className={clsx("text-[10px] uppercase tracking-widest", isOver ? "text-red-500" : interest.status === 'near_limit' ? "text-[#A1A1AA]" : "text-[#DFE104]")}>
                    {isOver ? "OVERTIME" : interest.status === 'near_limit' ? "NEAR LIMIT" : "ON TRACK"}
                  </span>
                </div>
              </div>

              <div className="w-full h-[8px] bg-[#27272A] relative rounded-none overflow-hidden">
                <div className={clsx("absolute left-0 top-0 h-full transition-all duration-700", fillColor)} style={{ width: `${pct}%` }} />
              </div>

              {isOver && (
                <div className="w-full h-[4px] bg-[#27272A] mt-1 relative rounded-none overflow-hidden">
                  <div className="absolute left-0 top-0 h-full bg-red-500/50 transition-all duration-700" style={{ width: `${Math.min(((consumed - budget) / budget) * 100, 100)}%` }} />
                </div>
              )}

              <div className="flex justify-between items-center mt-1">
                <span className={clsx("text-xs uppercase tracking-widest", isOver ? "text-red-500" : interest.status === 'near_limit' ? "text-[#A1A1AA]" : "text-[#3F3F46]")}>
                  {consumed} / {budget} MIN
                </span>
                <span className="text-[10px] uppercase tracking-widest text-[#3F3F46]">
                  AVG {interest.weeklyAvgMinutes} MIN/DAY
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {hasInstagramTopics && (
        <div style={{ borderTop: '1px solid #3F3F46', paddingTop: '1.25rem', marginTop: '1.25rem' }}>
          <div className="flex items-center gap-2 mb-4">
            <Sparkles size={13} color="#A1A1AA" />
            <span className="text-xs uppercase tracking-widest text-[#A1A1AA]">
              INSTAGRAM SAYS YOU'RE INTO
            </span>
          </div>

          <div className="flex flex-wrap gap-2 mb-3">
            {instagramTopics.slice(0, 10).map((topic, i) => {
              const onboarding = JSON.parse(
                localStorage.getItem('scrollsense_onboarding') || '{}'
              );
              const userInterests = (onboarding.interests || [])
                .map(i => i.label?.toLowerCase());
              
              const isMatch = userInterests.some(interest => 
                topic.toLowerCase().includes(interest) || 
                interest.includes(topic.toLowerCase())
              );

              return (
                <div 
                  key={i}
                  className={clsx(
                    "border px-3 py-1 text-[10px] uppercase tracking-widest rounded-none cursor-default",
                    isMatch 
                      ? "border-[#DFE104]/40 text-[#DFE104] bg-[#DFE104]/5" 
                      : "border-[#27272A] text-[#3F3F46] bg-transparent"
                  )}
                >
                  {topic}
                </div>
              );
            })}
          </div>

          {(() => {
            const onboarding = JSON.parse(
              localStorage.getItem('scrollsense_onboarding') || '{}'
            );
            const userInterests = (onboarding.interests || [])
              .map(i => i.label?.toLowerCase());
            
            const matchCount = instagramTopics.slice(0, 10).filter(topic =>
              userInterests.some(i => 
                topic.toLowerCase().includes(i) || i.includes(topic.toLowerCase())
              )
            ).length;
            const matchPercent = Math.round(
              matchCount / Math.min(instagramTopics.length, 10) * 100
            );

            let pctColor = '#3F3F46';
            if (matchPercent >= 70) pctColor = '#DFE104';
            else if (matchPercent >= 40) pctColor = '#A1A1AA';

            return (
              <div 
                className="mt-2 mb-3 text-[10px] uppercase tracking-widest font-bold" 
                style={{ color: pctColor }}
              >
                {matchPercent}% OF YOUR DECLARED INTERESTS CONFIRMED BY INSTAGRAM'S ALGORITHM
              </div>
            );
          })()}

          <div className="flex items-center gap-1.5">
            <Info size={10} color="#3F3F46" />
            <span className="text-[10px] text-[#3F3F46] uppercase tracking-wider">
              FROM your_topics.json · INSTAGRAM'S OWN INTEREST LABELS
            </span>
          </div>
        </div>
      )}

      <div className="mt-6 pt-6 border-t border-[#3F3F46]">
        <div className="text-xs uppercase tracking-widest text-[#A1A1AA] mb-4">THIS WEEK AT A GLANCE</div>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <div className="text-xl font-bold uppercase text-[#DFE104]">{inBudgetCount}</div>
            <div className="text-xs uppercase text-[#A1A1AA] mt-1">IN BUDGET</div>
          </div>
          <div>
            <div className={clsx("text-xl font-bold uppercase", overBudgetCount > 0 ? "text-red-500" : "text-[#DFE104]")}>{overBudgetCount}</div>
            <div className="text-xs uppercase text-[#A1A1AA] mt-1">OVER BUDGET</div>
          </div>
          <div>
            <div className="text-sm font-bold uppercase tracking-tighter text-[#FAFAFA] truncate px-1">{topInterest?.label || '-'}</div>
            <div className="text-xs uppercase text-[#A1A1AA] mt-1">MOST CONSUMED</div>
          </div>
        </div>
      </div>

      {avoidanceCandidate && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-4 border-l-4 border-[#A1A1AA] pl-4 py-3 bg-[#27272A]/30 pr-4">
          <div className="flex items-center gap-2 mb-1">
            <AlertCircle size={13} color="#A1A1AA" />
            <span className="text-xs uppercase tracking-widest text-[#A1A1AA] font-bold">PATTERN DETECTED</span>
          </div>
          <p className="text-xs text-[#A1A1AA] leading-relaxed">
            {avoidanceCandidate.label} has run over budget most days this week. Consistent overruns can sometimes signal avoidance rather than genuine enjoyment.
          </p>
        </motion.div>
      )}

      <div className="mt-4 flex justify-end">
        <span 
          onClick={() => navigate('/settings')}
          className="text-xs uppercase tracking-widest text-[#3F3F46] hover:text-[#A1A1AA] cursor-pointer transition-colors"
        >
          EDIT BUDGETS →
        </span>
      </div>
    </motion.div>
  );
}
```

---

## `components/dashboard/LogSessionButton.jsx`

```javascript
import React, { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const LogSessionButton = ({ onOpen, variant }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const [todaySessionCount, setTodaySessionCount] = useState(0);

  useEffect(() => {
    if (variant === 'fab') {
      const hasVisited = localStorage.getItem('scrollsense_fab_visited');
      if (!hasVisited) {
        setShowTooltip(true);
        localStorage.setItem('scrollsense_fab_visited', 'true');
        const timer = setTimeout(() => setShowTooltip(false), 4000);
        return () => clearTimeout(timer);
      }
    } else {
      // Desktop variant
      const countSessions = () => {
        try {
          const sessions = JSON.parse(localStorage.getItem('scrollsense_sessions') || '[]');
          const today = new Date().toISOString().split('T')[0];
          const count = sessions.filter(s => s.timestamp.startsWith(today)).length;
          setTodaySessionCount(count);
        } catch (e) {
          setTodaySessionCount(0);
        }
      };
      countSessions();
      // Simple event listener in case it changes
      window.addEventListener('storage', countSessions);
      return () => window.removeEventListener('storage', countSessions);
    }
  }, [variant]);

  if (variant === 'fab') {
    return (
      <div className="fixed bottom-6 right-6 z-40 md:hidden">
        <motion.button
          onClick={onOpen}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="w-16 h-16 bg-[#DFE104] rounded-none flex items-center justify-center cursor-pointer border-2 border-[#DFE104]"
        >
          <Plus size={24} className="text-[#000000]" />
        </motion.button>
        <AnimatePresence>
          {showTooltip && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute right-[calc(100%+8px)] top-1/2 -translate-y-1/2 bg-[#27272A] border border-[#3F3F46] px-3 py-2 whitespace-nowrap text-xs uppercase tracking-widest text-[#FAFAFA] flex items-center"
            >
              LOG A SESSION
              <div className="absolute top-1/2 -right-[5px] -translate-y-1/2 w-0 h-0 border-t-[5px] border-t-transparent border-b-[5px] border-b-transparent border-l-[5px] border-l-[#3F3F46]" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // Desktop Card Variant
  return (
    <div className="hidden md:flex border-2 border-[#3F3F46] bg-[#09090B] p-6 lg:p-8 flex-col justify-between min-h-[200px]">
      <div>
        <div className="text-xs uppercase tracking-widest text-[#DFE104] mb-1">
          SESSION LOGGER
        </div>
        <h2 className="text-xl md:text-2xl font-bold uppercase tracking-tighter text-[#FAFAFA] leading-[0.9]">
          JUST FINISHED SCROLLING?
        </h2>
        <p className="text-sm text-[#A1A1AA] mt-2">
          Log it in under 15 seconds.
        </p>
      </div>
      <div className="mt-auto pt-6">
        <button
          onClick={onOpen}
          className="w-full bg-[#DFE104] text-black font-bold h-14 uppercase tracking-tighter rounded-none hover:scale-105 transition-all flex items-center justify-center gap-2 border-2 border-[#DFE104]"
        >
          <Plus size={16} />
          LOG A SESSION
        </button>
        <div className="text-xs uppercase tracking-widest text-[#3F3F46] text-center mt-4">
          {todaySessionCount} SESSIONS LOGGED TODAY
        </div>
      </div>
    </div>
  );
};
```

---

## `components/dashboard/LogSessionModal.jsx`

```javascript
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Play, Camera, Layers, CheckCircle } from 'lucide-react';
import { useSessionData } from '../../hooks/useSessionData'

const PLATFORMS = [
  { id: 'youtube', label: 'YOUTUBE', icon: Play },
  { id: 'instagram', label: 'INSTAGRAM', icon: Camera },
  { id: 'both', label: 'BOTH', icon: Layers },
];

const MOODS = [
  { rating: 5, emoji: '😄', label: 'GREAT' },
  { rating: 4, emoji: '😊', label: 'GOOD' },
  { rating: 3, emoji: '😐', label: 'NEUTRAL' },
  { rating: 2, emoji: '😕', label: 'MEH' },
  { rating: 1, emoji: '😞', label: 'WORSE' },
];

const DURATIONS = [
  { value: 15, label: '15 MIN' },
  { value: 30, label: '30 MIN' },
  { value: 45, label: '45 MIN' },
  { value: 60, label: '1 HOUR' },
  { value: 90, label: '1.5 HRS' },
  { value: 120, label: '2+ HRS' },
];

export const LogSessionModal = ({ isOpen, onClose }) => {
  const [duration, setDuration] = useState(null);
  const [customDuration, setCustomDuration] = useState('');
  const [platform, setPlatform] = useState(null);
  const [mood, setMood] = useState(null);
  
  const [showValidation, setShowValidation] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const { logSession, isLoggingSession } = useSessionData();

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Reset state when opened
  useEffect(() => {
    if (isOpen) {
      setDuration(null);
      setCustomDuration('');
      setPlatform(null);
      setMood(null);
      setShowValidation(false);
      setSaveSuccess(false);
    }
  }, [isOpen]);

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleCustomDurationChange = (e) => {
    setDuration(null); // clears quick tap selection
    setCustomDuration(e.target.value);
  };

  const handleDurationTap = (val) => {
    setDuration(val);
    setCustomDuration('');
  };

  const handleSave = async () => {
    const finalDuration = duration || parseInt(customDuration, 10);

    if (!finalDuration || !mood) {
      setShowValidation(true);
      return;
    }

    const sessionData = {
      durationMinutes: Number(finalDuration),
      moodRating: Number(mood),
      platform: platform || 'youtube',
      timestamp: new Date().toISOString(),
    };

    // 1. Save to localStorage (keep existing logic for offline support)
    try {
      const existing = JSON.parse(
        localStorage.getItem('scrollsense_sessions') || '[]'
      );
      existing.push({
        id: Date.now().toString(),
        ...sessionData
      });
      localStorage.setItem('scrollsense_sessions', JSON.stringify(existing));
      window.dispatchEvent(new Event('storage'));
    } catch (e) {
      console.error(e);
    }

    // 2. Save to backend via real mutation
    try {
      await logSession(sessionData);
    } catch (err) {
      // localStorage already saved — don't block the UX
      console.error('Session sync failed:', err.message);
    }

    // 3. Show success flash then close (keep existing success state logic)
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      onClose();
      // Reset form
      setDuration(null);
      setCustomDuration('');
      setMood(null);
      setPlatform(null);
    }, 500);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div 
        onClick={handleBackdropClick}
        className="fixed inset-0 bg-black/70 z-[200] flex justify-center items-end md:items-center"
      >
        <motion.div
          initial={isMobile ? { y: '100%' } : { opacity: 0, y: 10 }}
          animate={isMobile ? { y: 0 } : { opacity: 1, y: 0 }}
          exit={isMobile ? { y: '100%' } : { opacity: 0, y: 10 }}
          transition={{ duration: isMobile ? 0.3 : 0.25, ease: 'easeOut' }}
          className={`bg-[#09090B] border-[#3F3F46] w-full 
            ${isMobile ? 'border-t-2 max-h-[90vh] pb-[env(safe-area-inset-bottom)] pb-safe rounded-t-none' : 'max-w-md border-2 rounded-none'}`}
        >
          {isMobile && (
            <div className="w-10 h-1 bg-[#3F3F46] mx-auto mt-3 mb-4 rounded-none" />
          )}

          <div className="px-6 pt-4 md:pt-6 pb-4 border-b border-[#3F3F46] flex justify-between items-center">
            <span className="text-base font-bold uppercase tracking-tighter text-[#FAFAFA]">
              LOG SESSION
            </span>
            <button 
              onClick={onClose}
              className="text-[#A1A1AA] hover:text-[#FAFAFA] cursor-pointer p-1 bg-transparent border-none appearance-none"
            >
              <X size={18} />
            </button>
          </div>

          <div className="px-6 py-6 flex flex-col gap-8 max-h-[70vh] overflow-y-auto">
            {/* Q1: HOW LONG */}
            <div>
              <div className="text-xs uppercase tracking-widest text-[#A1A1AA] mb-4">
                HOW LONG WERE YOU SCROLLING?
              </div>
              <div className="grid grid-cols-3 gap-2">
                {DURATIONS.map(({ value, label }) => (
                  <motion.button
                    key={value}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => handleDurationTap(value)}
                    className={`border-2 py-3 text-center cursor-pointer transition-all duration-200 rounded-none bg-transparent ${
                      duration === value 
                        ? 'border-[#DFE104] bg-[#27272A] text-[#DFE104]' 
                        : 'border-[#3F3F46] text-[#A1A1AA]'
                    } text-sm font-bold uppercase tracking-tighter`}
                  >
                    {label}
                  </motion.button>
                ))}
              </div>
              <div className="mt-3 flex items-center gap-3">
                <span className="text-xs uppercase tracking-widest text-[#3F3F46]">EXACT:</span>
                <input 
                  type="number" 
                  min="1" 
                  max="480"
                  value={customDuration}
                  onChange={handleCustomDurationChange}
                  placeholder="--"
                  className="bg-transparent border-b-2 border-[#3F3F46] focus:border-[#DFE104] text-[#FAFAFA] text-base font-bold w-20 pb-1 outline-none text-center rounded-none"
                />
                <span className="text-xs uppercase text-[#3F3F46]">MIN</span>
              </div>
            </div>

            {/* Q2: WHICH PLATFORM */}
            <div>
              <div className="text-xs uppercase tracking-widest text-[#A1A1AA] mb-4">
                WHICH PLATFORM?
              </div>
              <div className="flex flex-wrap gap-2">
                {PLATFORMS.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => setPlatform(id)}
                    className={`border-2 px-4 py-2.5 flex items-center gap-2 text-sm font-bold uppercase tracking-tighter rounded-none cursor-pointer transition-all ${
                      platform === id
                        ? 'border-[#DFE104] bg-[#27272A] text-[#FAFAFA]'
                        : 'border-[#3F3F46] text-[#A1A1AA] hover:border-[#FAFAFA]/30 bg-transparent'
                    }`}
                  >
                    <Icon size={14} />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Q3: HOW DO YOU FEEL */}
            <div>
              <div className="text-xs uppercase tracking-widest text-[#A1A1AA] mb-4">
                HOW DO YOU FEEL NOW?
              </div>
              <div className="flex justify-between">
                {MOODS.map(({ rating, emoji, label }) => (
                  <button
                    key={rating}
                    onClick={() => setMood(rating)}
                    className={`flex-1 flex flex-col items-center gap-2 cursor-pointer py-3 border-b-2 transition-all bg-transparent ${
                      mood === rating ? 'border-[#DFE104]' : 'border-[#3F3F46]'
                    } min-h-[56px] appearance-none`}
                  >
                    <span style={{ fontSize: '24px' }}>{emoji}</span>
                    <span className={`text-[10px] uppercase tracking-widest mt-1 ${
                      mood === rating ? 'text-[#DFE104]' : 'text-[#3F3F46]'
                    }`}>
                      {label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="px-6 pb-6 pt-4 border-t border-[#3F3F46]">
            {saveSuccess ? (
              <div className="flex items-center justify-center gap-2 h-14 bg-[#27272A] rounded-none">
                <CheckCircle size={20} className="text-[#DFE104]" />
                <span className="text-sm font-bold uppercase text-[#DFE104] tracking-tighter">SESSION SAVED</span>
              </div>
            ) : (
              <>
                <AnimatePresence>
                  {showValidation && (
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 5 }}
                      className="text-xs uppercase tracking-widest text-[#A1A1AA] text-center mb-2"
                    >
                      SELECT A DURATION AND MOOD TO SAVE
                    </motion.div>
                  )}
                </AnimatePresence>
                <button
                  onClick={isLoggingSession ? undefined : handleSave}
                  className={`w-full font-bold h-14 uppercase tracking-tighter rounded-none transition-all flex items-center justify-center border-2 ${
                    (!duration && !customDuration) || !mood 
                      ? 'bg-[#27272A] text-[#3F3F46] border-[#3F3F46]' 
                      : `bg-[#DFE104] text-black border-[#DFE104] hover:scale-105 cursor-pointer ${isLoggingSession ? 'opacity-80' : ''}`
                  }`}
                >
                  {isLoggingSession ? 'SAVING...' : 'SAVE SESSION'}
                </button>
              </>
            )}
            {!saveSuccess && (
              <button
                onClick={onClose}
                className="text-xs uppercase tracking-widest text-[#3F3F46] hover:text-[#A1A1AA] cursor-pointer text-center mt-3 block w-full bg-transparent border-none appearance-none"
              >
                CANCEL
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
```

---

## `components/dashboard/SessionLogger.jsx`

```javascript
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PenLine, Timer, Play, Camera, CheckCircle, Lightbulb } from 'lucide-react';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { useSessionData } from '../../hooks/useSessionData';

const MOODS = [
  { rating: 5, emoji: '😄', label: 'GREAT' },
  { rating: 4, emoji: '😊', label: 'GOOD' },
  { rating: 3, emoji: '😐', label: 'NEUTRAL' },
  { rating: 2, emoji: '😕', label: 'MEH' },
  { rating: 1, emoji: '😞', label: 'WORSE' }
];

export default function SessionLogger({ prefilledData, onCompletePrefill }) {
  const [state, setState] = useState('idle'); // 'idle', 'logging', 'complete'
  
  const [platform, setPlatform] = useState(null);
  const [duration, setDuration] = useState(30);
  const [mood, setMood] = useState(null);

  const [history, setHistory] = useLocalStorage('scrollsense_sessions', []);
  
  const { 
    todaySessions: backendTodaySessions,
    todaySummary,
    moodInsight,
    logSession,
    isLoggingSession,
  } = useSessionData();

  // Today's stats
  const todaySessions = backendTodaySessions;
  const todayTotal = todaySummary.totalMinutes;

  // External trigger for timer
  useEffect(() => {
    if (prefilledData && state === 'idle') {
      setState('logging');
      setDuration(Math.max(5, prefilledData.duration || 5)); // ensure at least 5
      if (prefilledData.mood) setMood(prefilledData.mood);
      // optionally guess platform if we had intention data, but we can just leave null
      if (onCompletePrefill) onCompletePrefill();
    }
  }, [prefilledData, state, onCompletePrefill]);

  const handleLog = async () => {
    if (!platform || !mood) return;

    const sessionData = {
      durationMinutes: Number(duration),
      moodRating: Number(mood),
      platform,
      timestamp: new Date().toISOString(),
    };

    // localStorage save (keep existing)
    try {
      const existing = JSON.parse(
        localStorage.getItem('scrollsense_sessions') || '[]'
      );
      existing.push({ id: Date.now().toString(), ...sessionData });
      localStorage.setItem('scrollsense_sessions', JSON.stringify(existing));
      setHistory(existing);
    } catch(e) { console.error(e) }

    // Real API save
    try {
      await logSession(sessionData);
    } catch (err) {
      console.error('Session sync failed:', err.message);
    }

    setState('complete');
    setTimeout(() => {
      setState('idle');
      setPlatform(null);
      setDuration(30);
      setMood(null);
    }, 5000);
  };

  // Generate Insight
  const getInsight = () => {
    if (moodInsight.hasEnoughData && moodInsight.threshold) {
      return `Sessions over ${moodInsight.threshold} min leave you feeling worse ${moodInsight.worsePercent}% of the time.`;
    }
    return "You're consistently logging sessions. This helps surface patterns.";
  };
  const insightText = getInsight();

  // Handle manual/timer start
  const timerDataAvailable = prefilledData !== undefined && prefilledData !== null; 
  // We actually need to know if the timer stopped recently but since we just take props, 
  // we'll highlight FROM TIMER if prefilledData was passed in within last update, 
  // actually prefill is immediate, so the button acts as an alternative if we had it.
  // The design calls for checking if timer data is available. Let's assume we maintain a minimal
  // local record or just use the prefill prop.
  
  const getMoodColor = (r) => {
    if (r >= 4) return 'bg-[#DFE104]';
    if (r === 3) return 'bg-[#A1A1AA]';
    return 'bg-[#3F3F46]';
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      viewport={{ once: true }}
      className="border-2 border-[#3F3F46] bg-[#09090B] p-4 md:p-8 h-full flex flex-col"
    >
      <div className="flex justify-between items-start mb-6">
        <div>
          <div className="text-xs uppercase tracking-widest text-[#DFE104] mb-1">SESSION LOGGER</div>
          <h2 className="text-xl md:text-2xl font-bold uppercase tracking-tighter text-[#FAFAFA] leading-[0.9]">
            HOW WAS YOUR SESSION?
          </h2>
        </div>
        <div className="border border-[#3F3F46] px-2 py-0.5 text-xs uppercase tracking-widest text-[#3F3F46]">
          F5
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        <AnimatePresence mode="wait">
          {state === 'idle' && (
            <motion.div
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
            >
              <div className="grid grid-cols-2 gap-3 mb-6">
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => {
                    setPlatform(null); setDuration(30); setMood(null); setState('logging');
                  }}
                  className="border-2 border-[#3F3F46] p-4 text-center cursor-pointer hover:border-[#DFE104]/50 hover:bg-[#27272A]/30 transition-all"
                >
                  <PenLine size={20} className="text-[#A1A1AA] mb-2 mx-auto" />
                  <div className="text-sm font-bold uppercase tracking-tighter text-[#FAFAFA]">LOG MANUALLY</div>
                  <div className="text-xs text-[#A1A1AA] mt-1 font-medium">Just finished scrolling?</div>
                </motion.button>

                <motion.button
                  whileTap={timerDataAvailable ? { scale: 0.97 } : {}}
                  className={`border-2 p-4 text-center ${
                    timerDataAvailable 
                      ? 'border-[#DFE104] bg-[#27272A] cursor-pointer' 
                      : 'border-[#3F3F46] opacity-50 cursor-not-allowed'
                  }`}
                  onClick={() => {
                    if (timerDataAvailable && prefilledData) {
                       setDuration(Math.max(5, prefilledData.duration || 5));
                       setState('logging');
                    }
                  }}
                >
                  <Timer size={20} className={`mb-2 mx-auto ${timerDataAvailable ? 'text-[#DFE104]' : 'text-[#A1A1AA]'}`} />
                  <div className="text-sm font-bold uppercase tracking-tighter text-[#FAFAFA]">FROM TIMER</div>
                  <div className={`text-xs mt-1 font-medium ${timerDataAvailable ? 'text-[#DFE104]' : 'text-[#3F3F46]'}`}>
                    {timerDataAvailable ? `Last session: ${prefilledData.duration} min` : "Stop a timer session first"}
                  </div>
                </motion.button>
              </div>

              {/* Today's Summary */}
              <div className="mt-2">
                <div className="text-xs uppercase tracking-widest text-[#A1A1AA] mb-3 font-medium">TODAY</div>
                
                {todaySessions.length > 0 ? (
                  <>
                    <div className="w-full h-[6px] flex gap-1 mb-2">
                      {todaySessions.map((s, i) => (
                        <div 
                          key={i} 
                          className={`h-full ${getMoodColor(s.moodRating)}`}
                          style={{ flexGrow: s.durationMinutes || 1 }}
                        />
                      ))}
                    </div>
                    <div className="text-xs uppercase tracking-widest text-[#A1A1AA] font-medium">
                      TOTAL TODAY: {todayTotal} MIN
                    </div>
                  </>
                ) : (
                  <div className="text-sm text-[#3F3F46] text-center py-4 font-medium">
                    No sessions logged today.
                  </div>
                )}
              </div>

              {/* Insight */}
              {insightText && (
                <div className="mt-4 border-l-4 border-[#DFE104] pl-4 py-2 bg-[#27272A]/30">
                  <div className="text-xs text-[#A1A1AA] leading-relaxed font-medium">
                    <Lightbulb size={14} className="text-[#DFE104] inline mr-2" />
                    {insightText}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {state === 'logging' && (
            <motion.div
              key="logging"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
            >
              {/* Platform */}
              <div className="mb-6">
                <div className="text-xs uppercase tracking-widest text-[#A1A1AA] mb-3 font-medium">WHICH PLATFORM?</div>
                <div className="flex gap-3">
                  <button 
                    onClick={() => setPlatform('youtube')}
                    className={`flex-1 flex items-center justify-center gap-2 border-2 p-3 text-sm uppercase tracking-wider font-medium transition-all ${
                      platform === 'youtube' ? 'border-[#DFE104] bg-[#27272A] text-[#FAFAFA]' : 'border-[#3F3F46] text-[#A1A1AA] hover:border-[#FAFAFA]/30 hover:text-[#FAFAFA]'
                    }`}
                  >
                    <Play size={14} /> YOUTUBE
                  </button>
                  <button 
                    onClick={() => setPlatform('instagram')}
                    className={`flex-1 flex items-center justify-center gap-2 border-2 p-3 text-sm uppercase tracking-wider font-medium transition-all ${
                      platform === 'instagram' ? 'border-[#DFE104] bg-[#27272A] text-[#FAFAFA]' : 'border-[#3F3F46] text-[#A1A1AA] hover:border-[#FAFAFA]/30 hover:text-[#FAFAFA]'
                    }`}
                  >
                    <Camera size={14} /> INSTAGRAM
                  </button>
                </div>
              </div>

              {/* Duration */}
              <div className="mb-6">
                <div className="flex justify-between mb-3">
                  <div className="text-xs uppercase tracking-widest text-[#A1A1AA] font-medium">HOW LONG WAS THE SESSION?</div>
                  <div className="text-xs font-bold uppercase text-[#DFE104]">{duration} MIN</div>
                </div>
                <input 
                  type="range" 
                  min="5" max="240" step="5" 
                  value={duration}
                  onChange={(e) => setDuration(parseInt(e.target.value, 10))}
                  className="w-full accent-[#DFE104]"
                />
                <div className="flex justify-between mt-1 text-[10px] uppercase text-[#3F3F46] font-medium">
                  <span>5 MIN</span>
                  <span>30 MIN</span>
                  <span>1 HR</span>
                  <span>2 HR+</span>
                </div>
              </div>

              {/* Mood */}
              <div className="mb-6">
                <div className="text-xs uppercase tracking-widest text-[#A1A1AA] mb-4 mt-6 font-medium">HOW DO YOU FEEL NOW?</div>
                <div className="flex justify-between gap-2">
                  {MOODS.map(m => {
                    const isSelected = mood === m.rating;
                    return (
                      <div 
                        key={m.rating}
                        onClick={() => setMood(m.rating)}
                        className={`flex flex-col items-center gap-2 cursor-pointer flex-1 border-b-2 pb-2 transition-all ${
                          isSelected ? 'border-[#DFE104]' : 'border-[#3F3F46] hover:border-[#A1A1AA]'
                        }`}
                      >
                        <div className="text-2xl min-w-[44px] min-h-[44px] flex items-center justify-center">{m.emoji}</div>
                        <div className={`text-[10px] uppercase tracking-widest font-medium ${isSelected ? 'text-[#FAFAFA]' : 'text-[#3F3F46]'}`}>
                          {m.label}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="mt-8 flex gap-3">
                <button
                  onClick={() => { setState('idle'); setPlatform(null); setDuration(30); setMood(null); }}
                  className="flex-1 border-2 border-[#3F3F46] bg-transparent text-[#FAFAFA] font-bold uppercase tracking-tighter h-12 hover:bg-[#FAFAFA] hover:text-black transition-colors"
                >
                  CANCEL
                </button>
                <button
                  onClick={isLoggingSession ? undefined : handleLog}
                  disabled={(!platform || !mood) || isLoggingSession}
                  className={`flex-[2] h-12 font-bold uppercase tracking-tighter transition-all ${
                    platform && mood
                      ? 'bg-[#DFE104] text-black hover:scale-[1.02] active:scale-95'
                      : 'bg-[#27272A] text-[#3F3F46] cursor-not-allowed'
                  }`}
                >{isLoggingSession ? "SAVING..." : "SAVE SESSION"}</button>
              </div>
            </motion.div>
          )}

          {state === 'complete' && (
            <motion.div
              key="complete"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="text-center py-4 flex flex-col justify-center h-full"
            >
              <CheckCircle size={28} className="text-[#DFE104] mx-auto mb-3" />
              
              {mood >= 4 && (
                <>
                  <div className="font-bold uppercase tracking-tighter text-lg text-[#DFE104]">GOOD SESSION.</div>
                  <div className="text-sm mt-1 text-[#A1A1AA] font-medium">Glad it was worth it.</div>
                </>
              )}
              {mood === 3 && (
                <>
                  <div className="font-bold uppercase tracking-tighter text-lg text-[#FAFAFA]">SESSION LOGGED.</div>
                  <div className="text-sm mt-1 text-[#A1A1AA] font-medium">Neutral is fine — you know how you spent it.</div>
                </>
              )}
              {mood <= 2 && (
                <>
                  <div className="font-bold uppercase tracking-tighter text-lg text-[#FAFAFA]">SESSION LOGGED.</div>
                  <div className="text-sm mt-1 text-[#A1A1AA] font-medium">Worth knowing. That data will help you spot patterns.</div>
                </>
              )}

              {history.length === 1 && (
                <div className="border-2 border-[#DFE104] p-4 mt-6 text-left">
                  <div className="text-xs uppercase tracking-widest text-[#DFE104] mb-1 font-medium">FIRST SESSION LOGGED</div>
                  <div className="text-xs text-[#A1A1AA] font-medium">
                    After 7 sessions, ScrollSense will show you personal insights about your mood and duration patterns.
                  </div>
                </div>
              )}

              <button 
                onClick={() => { setState('idle'); setPlatform(null); setDuration(30); setMood(null); }}
                className="text-xs uppercase tracking-widest text-[#3F3F46] hover:text-[#A1A1AA] mt-8 cursor-pointer font-medium transition-colors"
              >
                LOG ANOTHER SESSION
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
```

---

## `components/dashboard/SkeletonCard.jsx`

```javascript
import React from 'react';

export default function SkeletonCard({ lines = 4, showChart = false }) {
  const widths = ['100%', '75%', '50%', '66%', '40%', '80%'];
  const bars = ['40%', '60%', '35%', '75%', '45%', '65%', '80%'];

  return (
    <div className="w-full">
      {showChart && (
        <div className="flex items-end gap-2 h-32 mb-4">
          {bars.map((h, i) => (
            <div
              key={i}
              className="flex-1 bg-[#27272A] animate-pulse rounded-none"
              style={{ height: h }}
            />
          ))}
        </div>
      )}
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-3 bg-[#27272A] animate-pulse mb-3 rounded-none"
          style={{ width: widths[i % widths.length] }}
        />
      ))}
    </div>
  );
}
```

---

## `components/dashboard/WeeklyCheckin.jsx`

```javascript
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Clock, Target, TrendingDown, Lightbulb, Zap, CheckCircle, Lock } from 'lucide-react';
import { useYouTubeData } from '../../hooks/useYouTubeData';
import clsx from 'clsx';

const formatMinutes = (mins) => {
  if (!mins) return '0M';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}H ${m}M` : `${m}M`;
};

export default function WeeklyCheckin({ className }) {
  const { checkin } = useYouTubeData();
  const [isEmailOn, setIsEmailOn] = useState(false);
  const [showEmailInput, setShowEmailInput] = useState(false);

  const renderColdStart = () => {
    const pct = Math.min(((checkin?.sessionsLogged ?? 0) / 3) * 100, 100);
    return (
      <div className="py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="text-xs uppercase tracking-widest text-[#A1A1AA] mb-1">
              FIRST CHECK-IN AFTER 3 SESSIONS
            </div>
            <div className="text-lg font-bold uppercase tracking-tighter text-[#FAFAFA]">
              {checkin?.sessionsLogged ?? 0} OF 3 SESSIONS LOGGED
            </div>
          </div>
          <div className="flex items-baseline">
            <span className="text-[3rem] font-bold text-[#DFE104] leading-none">{checkin?.sessionsLogged ?? 0}</span>
            <span className="text-[2rem] text-[#3F3F46] mx-1">/</span>
            <span className="text-[3rem] font-bold text-[#27272A] leading-none">3</span>
          </div>
        </div>

        <div className="w-full h-[6px] bg-[#27272A] mb-6 rounded-none overflow-hidden relative">
          <div className="bg-[#DFE104] h-[6px] transition-all duration-700 absolute left-0 top-0" style={{ width: `${pct}%` }} />
        </div>

        <div className="flex justify-between mt-2 mb-8 relative">
          {[1, 2, 3].map((n) => {
            const completed = (checkin?.sessionsLogged ?? 0) >= n;
            return (
              <div key={n} className="flex flex-col items-center">
                <div className={clsx("w-2 h-2 rounded-none", completed ? "bg-[#DFE104]" : "bg-[#27272A] border border-[#3F3F46]")} />
                <div className={clsx("mt-2 text-[10px] uppercase tracking-widest", completed ? "text-[#DFE104]" : "text-[#3F3F46]")}>
                  SESSION {n}
                </div>
              </div>
            );
          })}
        </div>

        <div>
          <div className="text-xs uppercase tracking-widest text-[#A1A1AA] mb-4">WHAT YOUR CHECK-IN WILL SHOW</div>
          <div className="grid grid-cols-2 gap-3">
            {[ 
              { icon: Clock, text: "Total scroll time" },
              { icon: Target, text: "Goal relevance %" },
              { icon: TrendingDown, text: "Improvement vs before" },
              { icon: Lightbulb, text: "One AI insight" }
            ].map((item, i) => (
              <div key={i} className="border border-[#27272A] p-3 flex items-center gap-3">
                <item.icon size={14} color="#3F3F46" className="flex-shrink-0" />
                <span className="text-xs uppercase tracking-wider text-[#3F3F46] leading-tight">{item.text}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 text-center">
          <span className="text-xs text-[#3F3F46] uppercase tracking-widest cursor-pointer hover:text-[#A1A1AA] transition-colors">
            Log your next session to get closer →
          </span>
        </div>
      </div>
    );
  };

  const renderAvailable = () => {
    let triggerText = "YOUR WEEKLY CHECK-IN";
    if (checkin?.triggerReason === 'sessions') triggerText = `GENERATED AFTER ${checkin?.sessionsLogged ?? 0} SESSIONS LOGGED`;
    if (checkin?.triggerReason === 'days') triggerText = "GENERATED AFTER 3 DAYS OF DATA";

    return (
      <>
        <div className="flex items-center gap-2 mb-6">
          <Zap size={12} color="#DFE104" />
          <span className="text-xs uppercase tracking-widest text-[#A1A1AA]">{triggerText}</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="flex flex-col border-b border-[#3F3F46] pb-4 md:border-b-0 md:border-r last:border-0 md:pr-4">
            <span className="text-[10px] uppercase tracking-widest text-[#A1A1AA] mb-1">TOTAL SCROLL TIME</span>
            <span className="text-2xl font-bold uppercase text-[#FAFAFA]">{formatMinutes(checkin?.totalScrollMinutes ?? 0)}</span>
          </div>
          <div className="flex flex-col border-b border-[#3F3F46] pb-4 md:border-b-0 md:border-r last:border-0 md:px-4">
            <span className="text-[10px] uppercase tracking-widest text-[#A1A1AA] mb-1">GOAL RELEVANT</span>
            <span className="text-2xl font-bold uppercase text-[#DFE104]">{checkin?.goalPercent ?? 0}%</span>
          </div>
          <div className="flex flex-col border-b border-[#3F3F46] pb-4 md:border-b-0 md:border-r last:border-0 md:px-4">
            <span className="text-[10px] uppercase tracking-widest text-[#A1A1AA] mb-1">VS PREVIOUS</span>
            {(checkin?.improvementMinutes ?? 0) > 0 ? (
              <span className="text-2xl font-bold uppercase text-[#DFE104]">-{(checkin?.improvementMinutes ?? 0)} MIN</span>
            ) : (checkin?.improvementMinutes ?? 0) < 0 ? (
              <span className="text-2xl font-bold uppercase text-red-500">+{Math.abs(checkin?.improvementMinutes ?? 0)} MIN</span>
            ) : (
              <span className="text-2xl font-bold uppercase text-[#3F3F46]">FIRST DATA</span>
            )}
            <span className="text-[10px] uppercase text-[#3F3F46] mt-1">
              {checkin?.isFirstCheckin || (checkin?.improvementMinutes ?? 0) === 0 ? "BASELINE SET" : "FEWER MINUTES = BETTER"}
            </span>
          </div>
          <div className="flex flex-col border-[#3F3F46] pb-4 md:border-b-0 last:border-0 md:pl-4">
            <span className="text-[10px] uppercase tracking-widest text-[#A1A1AA] mb-1">RECLAIMED</span>
            <span className="text-2xl font-bold uppercase text-[#DFE104]">{formatMinutes(checkin?.timeReclaimedMinutes ?? 0)}</span>
          </div>
        </div>

        <div className="mb-6">
          <div className="text-xs uppercase text-[#A1A1AA] mb-3">PLATFORM SPLIT</div>
          <div className="flex w-full h-[10px]">
            <div className="bg-[#DFE104]" style={{ width: `${checkin?.platformBreakdown?.youtube ?? 0}%` }} />
            <div className="bg-[#3F3F46]" style={{ width: `${checkin?.platformBreakdown?.instagram ?? 0}%` }} />
          </div>
          <div className="flex justify-between mt-2">
            <span className="text-xs uppercase text-[#DFE104]">YOUTUBE {checkin?.platformBreakdown?.youtube ?? 0}%</span>
            <span className="text-xs uppercase text-[#A1A1AA]">INSTAGRAM {checkin?.platformBreakdown?.instagram ?? 0}%</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="border border-[#3F3F46] p-4">
            <div className="text-[10px] uppercase tracking-widest text-[#A1A1AA] mb-1">BIGGEST TRIGGER</div>
            <div className="text-lg font-bold uppercase tracking-tighter text-[#FAFAFA]">{checkin?.mostCommonTrigger ?? ''}</div>
          </div>
          <div className="border border-[#3F3F46] p-4">
            <div className="text-[10px] uppercase tracking-widest text-[#A1A1AA] mb-1">HEAVIEST DAY</div>
            <div className="text-lg font-bold uppercase tracking-tighter text-[#FAFAFA]">{checkin?.heaviestScrollDay ?? ''}</div>
          </div>
        </div>

        <div className="mb-6">
          <div className="text-xs uppercase tracking-widest text-[#A1A1AA] mb-2">INTEREST BUDGETS</div>
          <div className="text-sm text-[#A1A1AA] leading-relaxed">{checkin?.interestBudgetStatus ?? ''}</div>
        </div>

        <div className="border-l-4 border-[#DFE104] pl-5 py-4 bg-[#27272A]/30 pr-4">
          <div className="flex items-center gap-2 mb-2">
            <Lightbulb size={13} color="#DFE104" />
            <span className="text-xs uppercase tracking-widest text-[#DFE104] font-bold">AI INSIGHT</span>
          </div>
          <p className="text-sm md:text-base text-[#FAFAFA] leading-relaxed">{checkin?.aiInsight ?? ''}</p>
          <div className="mt-3 flex items-center gap-1.5">
            <Lock size={10} color="#3F3F46" />
            <span className="text-[10px] text-[#3F3F46] uppercase tracking-wider">Based on your behavioral data only · GPT-4o mini</span>
          </div>
        </div>

        <div className="border-t border-[#3F3F46] pt-4 mt-6">
          {!isEmailOn ? (
            <>
              <div className="flex justify-between items-center h-6">
                <span className="text-xs uppercase tracking-widest text-[#3F3F46]">GET CHECK-INS IN YOUR INBOX</span>
                {!showEmailInput && (
                  <span 
                    className="text-xs uppercase text-[#DFE104] cursor-pointer hover:underline"
                    onClick={() => setShowEmailInput(true)}
                  >
                    ENABLE →
                  </span>
                )}
              </div>
              <motion.div 
                initial={false}
                animate={{ height: showEmailInput ? 'auto' : 0, opacity: showEmailInput ? 1 : 0 }}
                className="overflow-hidden"
              >
                <div className="mt-3 flex gap-3 items-end">
                  <input 
                    type="email" 
                    placeholder="your@email.com" 
                    className="border-b-2 border-[#3F3F46] focus:border-[#DFE104] bg-transparent text-[#FAFAFA] text-sm outline-none pb-1 flex-1 transition-colors"
                  />
                  <button 
                    onClick={() => { setIsEmailOn(true); setShowEmailInput(false); }}
                    className="bg-[#DFE104] text-black font-bold h-10 px-4 text-xs uppercase tracking-tighter rounded-none"
                  >
                    SAVE
                  </button>
                </div>
              </motion.div>
            </>
          ) : (
            <div className="flex items-center h-6">
              <CheckCircle size={12} color="#DFE104" className="mr-2" />
              <span className="text-xs uppercase text-[#DFE104]">SENDING TO YOUR EMAIL</span>
              <span className="text-xs uppercase text-[#3F3F46] hover:text-[#A1A1AA] cursor-pointer ml-2 transition-colors" onClick={() => setIsEmailOn(false)}>
                · DISABLE
              </span>
            </div>
          )}
        </div>
      </>
    );
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} viewport={{ once: true }} className={clsx("border-2 border-[#3F3F46] bg-[#09090B] p-6 md:p-8", className)}>
      <div className="flex justify-between items-start flex-wrap gap-4 mb-6">
        <div>
          <div className="text-xs uppercase tracking-widest text-[#DFE104] mb-1">YOUR CHECK-IN</div>
          <h2 className="text-xl md:text-2xl font-bold uppercase tracking-tighter text-[#FAFAFA] leading-[0.9]">
            HOW YOUR WEEK LOOKED
          </h2>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto mt-2 md:mt-0">
          <div className="border border-[#3F3F46] px-2 py-0.5 text-xs uppercase tracking-widest text-[#3F3F46]">F10</div>
          
          <div className="flex items-center gap-2">
            <Mail size={13} color="#3F3F46" />
            <div 
              onClick={() => {
                if (isEmailOn) {
                  setIsEmailOn(false);
                } else {
                  setShowEmailInput(true);
                }
              }}
              className="w-8 h-4 relative cursor-pointer border"
              style={{ backgroundColor: isEmailOn ? 'rgba(223,225,4,0.2)' : '#27272A', borderColor: isEmailOn ? 'rgba(223,225,4,0.5)' : '#3F3F46' }}
            >
              <motion.div 
                className="w-3 h-3 absolute top-0.5"
                style={{ backgroundColor: isEmailOn ? '#DFE104' : '#3F3F46' }}
                animate={{ left: isEmailOn ? '17px' : '2px' }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              />
            </div>
            <span className="text-[10px] uppercase tracking-widest text-[#3F3F46]">EMAIL</span>
          </div>
        </div>
      </div>

      {checkin?.available ? renderAvailable() : renderColdStart()}
    </motion.div>
  );
}
```

---

## `components/dashboard/YouTubeConnectPrompt.jsx`

```javascript
import React from 'react';
import { Lock } from 'lucide-react';

export default function YouTubeConnectPrompt({ featureName, featureId, onConnect }) {
  return (
    <div className="flex flex-col items-center text-center py-10 px-4">
      <div className="text-[5rem] font-bold text-[#27272A] leading-none mb-2" aria-hidden="true">
        {featureId}
      </div>
      <h3 className="text-base font-bold uppercase tracking-tighter text-[#FAFAFA] mb-2">
        CONNECT YOUTUBE TO UNLOCK {featureName}
      </h3>
      <p className="text-sm text-[#A1A1AA] max-w-xs leading-relaxed mb-6">
        Connect your YouTube account once. Your content breakdown updates automatically in the background.
      </p>
      <button 
        onClick={onConnect || (() => console.warn('onConnect not provided'))}
        className="bg-[#DFE104] text-black font-bold uppercase tracking-tighter h-12 px-8 rounded-none hover:scale-105 transition-all"
      >
        CONNECT YOUTUBE — FREE
      </button>
      <div className="flex items-center gap-1.5 mt-3 justify-center">
        <Lock size={11} color="#3F3F46" />
        <span className="text-xs text-[#3F3F46] uppercase tracking-wider">
          YouTube data only. Never Gmail, Drive, or Photos.
        </span>
      </div>
    </div>
  );
}
```

---

## `hooks/useCravingData.js`

```javascript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/axios'

const hasToken = () => !!sessionStorage.getItem('accessToken')

export function useCravingData() {
  const queryClient = useQueryClient()

  // Recent cravings list — powers idle state list in CravingLog
  const recentQuery = useQuery({
    queryKey: ['cravings-recent'],
    queryFn: async () => {
      const res = await api.get('/cravings/recent')
      return res.data
    },
    staleTime: 60000,
    enabled: hasToken(),
  })

  // Craving stats — resistance rate etc.
  const statsQuery = useQuery({
    queryKey: ['cravings-stats'],
    queryFn: async () => {
      const res = await api.get('/cravings/stats')
      return res.data
    },
    staleTime: 2 * 60 * 1000,
    enabled: hasToken(),
  })

  // Log craving mutation
  const logCravingMutation = useMutation({
    mutationFn: async (cravingData) => {
      // cravingData: { trigger, outcome, timestamp }
      // NOTE: notes field intentionally excluded — stays in localStorage
      const { trigger, outcome, timestamp } = cravingData
      const res = await api.post('/cravings', { trigger, outcome, timestamp })
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cravings-recent'] })
      queryClient.invalidateQueries({ queryKey: ['cravings-stats'] })
    },
  })

  const recent = recentQuery.data || {}
  const stats = statsQuery.data || {}

  return {
    // Recent list for idle state
    recentCravings: recent.cravings ?? [],
    totalCravings: recent.total ?? 0,

    // Stats
    resistanceRate: stats.resistanceRate ?? null,
    mostCommonTrigger: stats.mostCommonTrigger ?? null,
    thisWeekCount: stats.thisWeek ?? 0,
    outcomes: stats.outcomes ?? { resisted: 0, partial: 0, gaveIn: 0 },

    // Loading
    isLoadingRecent: recentQuery.isLoading,

    // Mutation
    logCraving: logCravingMutation.mutateAsync,
    isLogging: logCravingMutation.isPending,
    logError: logCravingMutation.error,
  }
}
```

---

## `hooks/useLocalStorage.js`

```javascript
import { useState } from 'react';

export function useLocalStorage(key, initialValue) {
  const [storedValue, setStoredValue] = useState(() => {
    if (typeof window === 'undefined') {
      return initialValue;
    }
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  const setValue = (value) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch (error) {
      console.warn(`Error setting localStorage key "${key}":`, error);
    }
  };

  return [storedValue, setValue];
}
```

---

## `hooks/useSessionData.js`

```javascript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/axios'

const hasToken = () => !!sessionStorage.getItem('accessToken')

export function useSessionData() {
  const queryClient = useQueryClient()

  // Today's sessions — powers SessionLogger idle state
  const todayQuery = useQuery({
    queryKey: ['sessions-today'],
    queryFn: async () => {
      const res = await api.get('/sessions/today')
      return res.data
    },
    staleTime: 30000,           // 30 seconds — updates frequently
    refetchOnWindowFocus: true, // refresh when user comes back to tab
    enabled: hasToken(),
  })

  // Session stats — powers insight callout in SessionLogger
  const statsQuery = useQuery({
    queryKey: ['sessions-stats'],
    queryFn: async () => {
      const res = await api.get('/sessions/stats')
      return res.data
    },
    staleTime: 2 * 60 * 1000,
    enabled: hasToken(),
  })

  // Log a session mutation
  const logSessionMutation = useMutation({
    mutationFn: async (sessionData) => {
      // sessionData: { durationMinutes, moodRating, platform, timestamp }
      const res = await api.post('/sessions/log', sessionData)
      return res.data
    },
    onSuccess: () => {
      // Invalidate all session-related queries so UI updates immediately
      queryClient.invalidateQueries({ queryKey: ['sessions-today'] })
      queryClient.invalidateQueries({ queryKey: ['sessions-stats'] })
      queryClient.invalidateQueries({ queryKey: ['digest-status'] })
      queryClient.invalidateQueries({ queryKey: ['digest-checkin'] })
      // Also refresh dashboard so F6/F10/F12/F13 update
      queryClient.invalidateQueries({ queryKey: ['youtube-dashboard'] })
    },
  })

  // Log intention mutation
  const logIntentionMutation = useMutation({
    mutationFn: async (intentionData) => {
      // intentionData: { intentionCategory, timestamp, type: 'daily' }
      const res = await api.post('/sessions/intention', intentionData)
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions-today'] })
    },
  })

  const today = todayQuery.data || {}
  const stats = statsQuery.data || {}

  return {
    // Today's data
    todaySessions: today.sessions ?? [],
    todaySummary: today.summary ?? {
      count: 0,
      totalMinutes: 0,
      averageMood: null,
      platformBreakdown: {},
    },
    todayIntention: today.todayIntention ?? null,

    // Stats for insight callout
    weekStats: stats.week ?? {
      totalMinutes: 0,
      avgMood: null,
      avgDuration: null,
      sessionCount: 0,
    },
    allTimeStats: stats.allTime ?? {
      totalMinutes: 0,
      totalSessions: 0,
    },
    moodInsight: stats.moodInsight ?? {
      threshold: null,
      worsePercent: null,
      hasEnoughData: false,
    },
    dailyLimitMinutes: stats.dailyLimitMinutes ?? 90,

    // Loading states
    isLoadingToday: todayQuery.isLoading,
    isLoadingStats: statsQuery.isLoading,

    // Mutations
    logSession: logSessionMutation.mutateAsync,
    isLoggingSession: logSessionMutation.isPending,
    logSessionError: logSessionMutation.error,

    logIntention: logIntentionMutation.mutateAsync,
    isLoggingIntention: logIntentionMutation.isPending,
  }
}
```

---

## `hooks/useSessionTimer.js`

```javascript
import { useState, useEffect, useRef } from 'react';
import { useLocalStorage } from './useLocalStorage';

export function useSessionTimer() {
  const [timerState, setTimerState] = useLocalStorage('scrollsense_timer', {
    isRunning: false,
    startTime: null,
    todayMinutes: 0,
    lastResetDate: new Date().toDateString(),
  });

  const [onboardingData] = useLocalStorage('scrollsense_onboarding', {});
  const dailyLimitMinutes = onboardingData?.dailyLimit ? parseInt(onboardingData.dailyLimit, 10) : 90;

  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const intervalRef = useRef(null);

  // Handle cross-day reset
  useEffect(() => {
    const today = new Date().toDateString();
    if (timerState.lastResetDate !== today) {
      setTimerState(prev => ({
        ...prev,
        todayMinutes: 0,
        lastResetDate: today,
        isRunning: false,
        startTime: null
      }));
    }
  }, [timerState.lastResetDate, setTimerState]);

  useEffect(() => {
    if (timerState.isRunning && timerState.startTime) {
      const start = new Date(timerState.startTime).getTime();
      
      const updateElapsed = () => {
        const now = new Date().getTime();
        const diffInSeconds = Math.floor((now - start) / 1000);
        setElapsedSeconds(diffInSeconds);
      };

      updateElapsed(); // Initial call
      intervalRef.current = setInterval(updateElapsed, 1000);
    } else {
      setElapsedSeconds(0);
      if (intervalRef.current) clearInterval(intervalRef.current);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [timerState.isRunning, timerState.startTime]);

  const startTimer = () => {
    setTimerState(prev => ({
      ...prev,
      isRunning: true,
      startTime: new Date().toISOString()
    }));
  };

  const stopTimer = () => {
    const sessionMinutes = Math.floor(elapsedSeconds / 60);
    setTimerState(prev => ({
      ...prev,
      isRunning: false,
      startTime: null,
      todayMinutes: prev.todayMinutes + sessionMinutes
    }));
    return sessionMinutes;
  };

  const resetToday = () => {
    setTimerState(prev => ({
      ...prev,
      todayMinutes: 0,
    }));
  };

  const percentUsed = Math.min((timerState.todayMinutes / dailyLimitMinutes) * 100, 100);
  const isOverLimit = timerState.todayMinutes >= dailyLimitMinutes;

  return {
    isRunning: timerState.isRunning,
    elapsedSeconds,
    todayMinutes: timerState.todayMinutes,
    dailyLimitMinutes,
    percentUsed,
    isOverLimit,
    startTimer,
    stopTimer,
    resetToday
  };
}
```

---

## `hooks/useYouTubeData.js`

```javascript
import { useQuery } from '@tanstack/react-query'
import api from '../lib/axios'

const hasToken = () => !!sessionStorage.getItem('accessToken')

export function useYouTubeData() {
  const dashboardQuery = useQuery({
    queryKey: ['youtube-dashboard'],
    queryFn: async () => {
      const res = await api.get('/insights/dashboard')
      return res.data
    },
    staleTime: 5 * 60 * 1000,
    retry: 2,
    retryDelay: 1000,
    enabled: hasToken(),
  })

  const statusQuery = useQuery({
    queryKey: ['youtube-status'],
    queryFn: async () => {
      const res = await api.get('/youtube/status')
      return res.data
    },
    refetchInterval: (query) => {
      return query.state.data?.isClassifying ? 5000 : false
    },
    staleTime: 10000,
    retry: 1,
    enabled: hasToken(),
  })

  const checkinQuery = useQuery({
    queryKey: ['digest-checkin'],
    queryFn: async () => {
      const res = await api.get('/digest/checkin')
      return res.data
    },
    staleTime: 10 * 60 * 1000,
    retry: 1,
    enabled: hasToken(),
    onError: () => {},
  })

  const checkinStatusQuery = useQuery({
    queryKey: ['digest-status'],
    queryFn: async () => {
      const res = await api.get('/digest/status')
      return res.data
    },
    staleTime: 60000,
    retry: 1,
    enabled: hasToken(),
  })

  const isLoading = dashboardQuery.isLoading
  const dashData = dashboardQuery.data || {}
  const status = statusQuery.data || {}
  const checkin = checkinQuery.data || { 
    available: false, sessionsLogged: 0 
  }
  const checkinStatus = checkinStatusQuery.data || { 
    sessionsLogged: 0, progressPercent: 0 
  }

  return {
    isConnected: status.isConnected ?? dashData.isConnected ?? false,
    isLoading,
    isClassifying: status.isClassifying ?? false,
    classificationProgress: status.classificationProgress ?? 0,
    onboardingRequired: dashData.onboardingRequired ?? false,

    weeklyBreakdown: dashData.weeklyBreakdown ?? [],
    currentWeek: dashData.currentWeek ?? {
      goal: 0,
      interest: 0,
      junk: 100,
      totalMinutes: 0,
      totalVideos: 0,
      changeVsLastWeek: null,
      hasEnoughDataForTrend: false,
      weeksOfData: 0,
    },
    topChannels: dashData.topChannels ?? [],
    contentSuggestions: dashData.contentSuggestions ?? [],

    checkin: {
      ...checkin,
      sessionsLogged: checkinStatus.sessionsLogged ?? 
                      checkin.sessionsLogged ?? 0,
      progressPercent: checkinStatus.progressPercent ?? 0,
      sessionsNeeded: checkinStatus.sessionsNeeded ?? 
                      Math.max(0, 3 - (checkinStatus.sessionsLogged ?? 0)),
    },

    interests: dashData.interests ?? [],

    goalScoreHistory: dashData.goalScoreHistory ?? [],

    userContext: dashData.userContext ?? {},

    refetchDashboard: dashboardQuery.refetch,
    refetchStatus: statusQuery.refetch,
    refetchCheckin: checkinQuery.refetch,
  }
}
```

---

## `lib/axios.js`

```javascript
import axios from 'axios'
import useAuthStore from '../store/authStore'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,     // sends httpOnly cookie on every request
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
})

// Attach access token to every request
api.interceptors.request.use(
  (config) => {
    // getState() is correct way to read Zustand outside React
    const token = useAuthStore.getState().accessToken
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Handle token expiry — refresh and retry automatically
let isRefreshing = false
let failedQueue = []

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error)
    else prom.resolve(token)
  })
  failedQueue = []
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    if (
      error.response?.status === 401 &&
      error.response?.data?.code === 'TOKEN_EXPIRED' &&
      !originalRequest._retry
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`
            return api(originalRequest)
          })
          .catch((err) => Promise.reject(err))
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        const res = await api.post('/auth/refresh')
        const { accessToken, user } = res.data
        useAuthStore.getState().setAccessToken(accessToken)
        useAuthStore.getState().setUser(user)
        processQueue(null, accessToken)
        originalRequest.headers.Authorization = `Bearer ${accessToken}`
        return api(originalRequest)
      } catch (refreshError) {
        processQueue(refreshError, null)
        useAuthStore.getState().clearUser()
        window.location.href = '/login'
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  }
)

export default api
```

---

## `lib/lenis.js`

```javascript
import Lenis from '@studio-freight/lenis'

let lenisInstance = null

export function initLenis() {
  lenisInstance = new Lenis({
    duration: 1.2,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smooth: true,
    mouseMultiplier: 1,
    smoothTouch: false,
    touchMultiplier: 2,
    infinite: false,
  })

  function raf(time) {
    if (!lenisInstance) return
    lenisInstance.raf(time)
    requestAnimationFrame(raf)
  }
  requestAnimationFrame(raf)

  return lenisInstance
}

export function destroyLenis() {
  if (lenisInstance) {
    lenisInstance.destroy()
    lenisInstance = null
  }
}

export function getLenis() {
  return lenisInstance
}
```

---

