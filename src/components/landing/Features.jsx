import React, { useState } from 'react';

const FEATURES = [
  {
    id: "F1",
    label: "CONTENT DIET DASHBOARD",
    title: "CONTENT DIET DASHBOARD",
    desc: "See your YouTube consumption broken down into three buckets: goal-relevant, genuine interests, and random junk. Stacked bar charts and weekly trend graphs, updated every time you connect. Zero video titles ever appear — only categories and percentages.",
    statLabel: "USERS ACT ON PLATFORM TIME WARNINGS",
    statValue: "12%",
    statSource: "Source: Social Media Screen Time Report, 2025"
  },
  {
    id: "F2",
    label: "INTENTION GATE",
    title: "INTENTION GATE",
    desc: "Before every scroll session, answer one 3-second question: why are you opening this app right now? Boredom? Stress? Planned entertainment? After 2 weeks, your motivation map reveals the truth about your scroll habits.",
    statLabel: "OF SOCIAL MEDIA USE DRIVEN BY HABIT",
    statValue: "33%",
    statSource: "Source: Baker Center for Children and Families"
  },
  {
    id: "F3",
    label: "TRIGGER PATTERN DETECTOR",
    title: "TRIGGER PATTERN DETECTOR",
    desc: "After 2–3 weeks of data, AI analyzes your behavioral patterns in plain English. It identifies your highest-risk days, the content spirals you fall into, and the exact times your resolve breaks down.",
    statLabel: "OF TEENS ONLINE 'ALMOST CONSTANTLY'",
    statValue: "46%",
    statSource: "Source: Pew Research Center, 2024"
  },
  {
    id: "F4",
    label: "GOAL RELEVANCE SCORE",
    title: "GOAL RELEVANCE SCORE",
    desc: "Every week, ScrollSense calculates what percentage of your total content consumption is connected to your stated goals. Content connected to your stated goals counts. Content that isn't, doesn't. Simple and personal.",
    statLabel: "OF SCREEN TIME SPENT ON SOCIAL & MESSAGING",
    statValue: "65%",
    statSource: "Source: DataReportal / BroadbandSearch, 2025"
  },
  {
    id: "F5",
    label: "TIME REFUND TRACKER",
    title: "TIME REFUND TRACKER",
    desc: "Instead of saying '4 hours wasted,' ScrollSense converts reclaimed time into meaningful alternatives aligned with your goals. See how many meaningful alternatives — books, workouts, creative work, real rest — your saved time represents.",
    statLabel: "DAYS LOST TO SOCIAL MEDIA YEARLY",
    statValue: "36",
    statSource: "Source: 141 min/day × 365 ÷ 60 ÷ 24, Statista 2025"
  },
  {
    id: "F6",
    label: "CROSS-PLATFORM MAP",
    title: "CROSS-PLATFORM MAP",
    desc: "Upload your Instagram data export and see YouTube + Instagram unified in a single timeline. The platform-switching loop — where you bounce between apps when one gets boring — finally becomes visible.",
    statLabel: "SOCIAL PLATFORMS USED PER PERSON MONTHLY",
    statValue: "6.8",
    statSource: "Source: DataReportal / GWI, 2025"
  }
];

const Features = () => {
  const [activeFeature, setActiveFeature] = useState(FEATURES[0].id);

  return (
    <section id="features" className="bg-[#09090B] py-24 md:py-32 border-t border-[#3F3F46]">
      <div className="max-w-[95vw] mx-auto px-4 md:px-8">
        
        <div className="mb-4">
          <span className="text-xs uppercase tracking-widest text-[#DFE104]">WHAT SCROLLSENSE DOES</span>
        </div>

        <h2 className="text-5xl md:text-7xl font-bold uppercase tracking-tighter leading-[0.85] text-[#FAFAFA] mb-16">
          SIX FEATURES. ONE MIRROR.
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-16 items-start relative">
          
          {/* Left Column (Sticky Sidebar) — navigation only, no repeated heading */}
          <div className="hidden lg:block sticky top-32">
            <nav className="flex flex-col">
              {FEATURES.map((feat) => (
                <a 
                  key={`nav-${feat.id}`}
                  href={`#feature-${feat.id}`}
                  className={`text-sm uppercase tracking-widest py-3 border-b border-[#3F3F46] transition-colors focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#DFE104] ${activeFeature === feat.id ? 'text-[#DFE104]' : 'text-[#3F3F46] hover:text-[#A1A1AA]'}`}
                  onClick={() => setActiveFeature(feat.id)}
                >
                  {feat.label}
                </a>
              ))}
            </nav>
          </div>

          {/* Right Column (Scrolling Cards) */}
          <div className="flex flex-col gap-6 w-full">
            {FEATURES.map((feat, idx) => (
              <div 
                key={feat.id}
                id={`feature-${feat.id}`}
                className="sticky top-32 border-2 border-[#3F3F46] bg-[#09090B] p-8 md:p-10 rounded-none group cursor-default transition-all duration-300 hover:bg-[#DFE104] hover:border-[#DFE104] overflow-hidden"
                style={{ zIndex: 10 + idx }}
                onMouseEnter={() => setActiveFeature(feat.id)}
              >
                <div 
                  className="text-[5rem] font-bold leading-none text-[#27272A] group-hover:text-black/20 transition-colors duration-300 overflow-hidden"
                  aria-hidden="true"
                >
                  {feat.id}
                </div>
                
                <div className="text-xs uppercase tracking-widest text-[#DFE104] group-hover:text-black transition-colors duration-300 mt-[-1rem] relative z-10">
                  {feat.label}
                </div>
                
                <h3 className="text-2xl md:text-3xl lg:text-4xl font-bold uppercase tracking-tighter text-[#FAFAFA] group-hover:text-black transition-colors duration-300 mt-2 relative z-10">
                  {feat.title}
                </h3>
                
                <p className="text-base md:text-lg text-[#A1A1AA] group-hover:text-black/80 transition-colors duration-300 mt-4 leading-relaxed relative z-10">
                  {feat.desc}
                </p>
                
                <div className="mt-6 pt-6 flex flex-col gap-1 border-t border-[#3F3F46] group-hover:border-black/20 transition-colors duration-300 relative z-10">
                  <span className="text-xs uppercase tracking-widest text-[#A1A1AA] group-hover:text-black/60 transition-colors duration-300">
                    {feat.statLabel}
                  </span>
                  <span className="text-2xl font-bold text-[#DFE104] group-hover:text-black transition-colors duration-300">
                    {feat.statValue}
                  </span>
                  <span className="text-[10px] text-[#3F3F46] group-hover:text-black/40 transition-colors duration-300 normal-case">
                    {feat.statSource}
                  </span>
                </div>
              </div>
            ))}
          </div>

        </div>

      </div>
    </section>
  );
};

export default Features;
