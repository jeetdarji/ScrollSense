import DashboardNav from '../components/dashboard/DashboardNav'
import TriggerPatternDetector from '../components/patterns/TriggerPatternDetector'
import EchoChamberScore from '../components/patterns/EchoChamberScore'
import CrossPlatformMap from '../components/patterns/CrossPlatformMap'
import HabitNudgeEngine from '../components/patterns/HabitNudgeEngine'

export default function PatternsPage() {
  return (
    <div className="min-h-screen bg-[#09090B]">
      
      {/* Noise overlay */}
      <svg
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-[9999] h-full w-full opacity-[0.03]"
      >
        <filter id="noise-patterns">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.8"
            numOctaves="4"
            stitchTiles="stitch"
          />
        </filter>
        <rect width="100%" height="100%" filter="url(#noise-patterns)" />
      </svg>
      
      <DashboardNav />
      
      <div className="pt-[56px]">
        <div className="max-w-[95vw] mx-auto px-4 py-8 md:py-12">
          
          {/* Page header */}
          <div className="mb-10">
            <div className="text-xs uppercase tracking-widest text-[#DFE104] mb-2">
              BEHAVIORAL PATTERNS
            </div>
            <h1 className="text-3xl md:text-5xl font-bold uppercase tracking-tighter leading-[0.9] text-[#FAFAFA]">
              WHAT YOUR HABITS REVEAL
            </h1>
            <p className="text-sm md:text-base text-[#A1A1AA] leading-relaxed max-w-2xl mt-3 mb-2">
              Your scroll patterns are more predictable than you think. The data below is built from your actual activity — not assumptions.
            </p>
            <div className="border-b-2 border-[#3F3F46] mt-6 mb-10" />
          </div>
          
          {/* Features grid */}
          <div className="grid grid-cols-1 gap-6">
            <TriggerPatternDetector />
            <EchoChamberScore />
            <CrossPlatformMap />
            <HabitNudgeEngine />
          </div>
          
          {/* Bottom padding for mobile */}
          <div className="pb-16" />
        </div>
      </div>
      
    </div>
  )
}
