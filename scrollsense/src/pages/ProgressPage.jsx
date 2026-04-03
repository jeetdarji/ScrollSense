import React from 'react';
import DashboardNav from '../components/dashboard/DashboardNav';
import TimeRefundTracker from '../components/progress/TimeRefundTracker';
import BehavioralTrendGraph from '../components/progress/BehavioralTrendGraph';

export default function ProgressPage() {
  return (
    <div className="min-h-screen bg-[#09090B]">
      
      <svg aria-hidden="true" style={{
        position: 'fixed', 
        top: 0, 
        left: 0, 
        width: '100vw',
        height: '100vh', 
        opacity: 0.03, 
        pointerEvents: 'none', 
        zIndex: 9999 
      }}>
        <filter id="noise-progress">
          <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="4" stitchTiles="stitch"/>
          <feColorMatrix type="saturate" values="0"/>
        </filter>
        <rect width="100%" height="100%" filter="url(#noise-progress)"/>
      </svg>
      
      <DashboardNav />
      
      <div className="pt-[56px]">
        <div className="max-w-[95vw] mx-auto px-4 py-8 md:py-12">
          
          <p className="text-xs uppercase tracking-widest text-[#DFE104] mb-2">
            YOUR PROGRESS
          </p>
          <h1 style={{ fontSize: 'clamp(2rem, 6vw, 4rem)' }} className="font-bold uppercase tracking-tighter leading-[0.85] text-[#FAFAFA]">
            TIME RECLAIMED. HABITS SHIFTING.
          </h1>
          <p className="text-sm md:text-base text-[#A1A1AA] leading-relaxed max-w-2xl mt-3 mb-2">
            This page only shows forward movement. No streaks. No resets. One bad week is one data point — not a failure.
          </p>
          <div className="border-b-2 border-[#3F3F46] mt-6 mb-10" />
          
          <div className="grid grid-cols-1 gap-6">
            <TimeRefundTracker />
            <BehavioralTrendGraph />
          </div>
          
          <div className="pb-16" />
        </div>
      </div>
      
    </div>
  );
}