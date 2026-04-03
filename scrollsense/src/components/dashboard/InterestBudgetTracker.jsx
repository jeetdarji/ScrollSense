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

      <div className="mb-6 border border-[#3F3F46] bg-[#27272A]/30 px-3 py-2 flex items-center gap-2">
        <div className="w-2 h-2 rounded-none bg-red-500" />
        <span className="text-[10px] uppercase tracking-widest text-[#A1A1AA]">
          POWERED BY BACKGROUND YOUTUBE TRACKING
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
                <div className="flex items-center gap-2">
                  <span className={clsx("text-sm font-bold uppercase tracking-tighter", textColor)}>
                    {interest.label}
                  </span>
                  <span className="text-[9px] bg-red-500/10 text-red-500 px-1 py-0.5 uppercase tracking-widest border border-red-500/20">
                    AUTO
                  </span>
                </div>
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