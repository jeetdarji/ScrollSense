import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ArrowRight, Target, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react';

export default function HabitNudgeEngine({ data, isLoading, nudgeFeedback }) {
  const [activeNudgeIndex, setActiveNudgeIndex] = useState(0);
  const [feedbackSent, setFeedbackSent] = useState(null);

  if (isLoading || !data) {
    return (
      <div className="border-2 border-[#3F3F46] bg-[#09090B] p-6 text-center text-[#A1A1AA]">
        <Sparkles className="mx-auto mb-2 animate-pulse" size={24} />
        Loading Habit Nudges...
      </div>
    );
  }

  const { 
    weeklyGoalMin, 
    predictedUsageMin,
    totalSessions,
    averageSessionLengthMin,
    nudges = [],
    nudgeId,
    contextLabel,
    contentDiet,
    resistanceStats,
  } = data;

  const onTrack = predictedUsageMin <= weeklyGoalMin;
  const activeNudge = nudges[activeNudgeIndex];

  // Content diet display
  const goalPct = contentDiet?.goalPercent ?? 0;
  const junkPct = contentDiet?.junkPercent ?? 0;
  const interestPct = contentDiet?.interestPercent ?? 0;
  const hasDiet = contentDiet && (goalPct + junkPct + interestPct) > 0;

  return (
    <div className="border-2 border-[#3F3F46] bg-[#DFE104] p-6 lg:p-8 relative overflow-hidden group hover:scale-[1.01] transition-transform duration-300">
      {/* Background pattern */}
      <div className="absolute -right-20 -top-20 opacity-10 pointer-events-none group-hover:rotate-12 transition-transform duration-1000 origin-center">
        <div style={{ width: '300px', height: '300px', backgroundImage: 'radial-gradient(circle, #09090B 2px, transparent 2px)', backgroundSize: '24px 24px' }}></div>
      </div>
      
      <div className="flex justify-between items-start mb-6 relative z-10">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Sparkles size={16} className="text-[#09090B]" />
            <div className="text-xs font-bold uppercase tracking-widest text-[#09090B]">PROACTIVE NUDGE</div>
          </div>
          <h2 className="text-2xl font-bold uppercase tracking-tighter text-[#09090B] leading-none">WHAT TO DO INSTEAD</h2>
          <p className="text-xs font-medium text-[#09090B]/80 mt-2 max-w-xl">
            Based on your usual patterns around this time — here's something better to do before you get stuck scrolling.
          </p>
        </div>
      </div>
      
      {!data.nudges || data.nudges.length === 0 ? (
        <div className="border-2 border-[#09090B] bg-transparent p-6 text-[#09090B] font-medium">
          Need more data to generate personalized nudges. Keep tracking your usage.
        </div>
      ) : (
        <div className="grid lg:grid-cols-2 gap-8 relative z-10">
          {/* Stats Column */}
          <div className="flex flex-col justify-end gap-6">
            {/* Context label — explains WHY these nudges were generated */}
            {contextLabel && (
              <div className="border-l-4 border-[#09090B] pl-3 py-1">
                <div className="text-xs font-bold uppercase tracking-widest text-[#09090B]/60 mb-1">WHY NOW</div>
                <div className="text-sm font-bold uppercase tracking-tighter text-[#09090B] leading-tight">{contextLabel}</div>
              </div>
            )}

            {/* Content diet breakdown — if available from latest BehaviorWeek */}
            {hasDiet && (
              <div>
                <div className="text-xs font-bold uppercase tracking-widest text-[#09090B]/60 mb-2">CONTENT DIET</div>
                <div className="w-full h-[6px] flex overflow-hidden mb-2">
                  <div className="bg-[#09090B] h-full" style={{ width: `${goalPct}%` }} title={`Goal ${goalPct}%`} />
                  <div className="bg-[#09090B]/50 h-full" style={{ width: `${interestPct}%` }} title={`Interest ${interestPct}%`} />
                  <div className="bg-[#09090B]/20 h-full" style={{ width: `${junkPct}%` }} title={`Junk ${junkPct}%`} />
                </div>
                <div className="flex gap-3 text-[10px] font-bold uppercase tracking-widest text-[#09090B]">
                  <span>GOAL {goalPct}%</span>
                  <span className="opacity-60">INT {interestPct}%</span>
                  <span className="opacity-40">JUNK {junkPct}%</span>
                </div>
                {junkPct >= 50 && (
                  <div className="flex items-center gap-1 mt-1">
                    <AlertTriangle size={10} className="text-[#09090B]" />
                    <span className="text-[10px] font-bold uppercase text-[#09090B]">HIGH JUNK — ACTION NEEDED</span>
                  </div>
                )}
                {goalPct >= 30 && (
                  <div className="flex items-center gap-1 mt-1">
                    <Target size={10} className="text-[#09090B]" />
                    <span className="text-[10px] font-bold uppercase text-[#09090B]">ON TRACK — KEEP GOING</span>
                  </div>
                )}
              </div>
            )}

            <div className="border-l-4 border-[#09090B] pl-4">
              <div className="text-sm font-bold uppercase tracking-tighter text-[#09090B] mb-1">WEEKLY FORECAST</div>
              <div className="text-3xl font-bold tracking-tighter text-[#09090B] leading-none mb-1">
                {Math.floor(predictedUsageMin / 60)}H {Math.round(predictedUsageMin % 60)}M
              </div>
              <div className="text-xs font-medium uppercase text-[#09090B]/60">
                {onTrack ? 'ON TRACK ' : 'PROJECTED TO EXCEED '} WEEKLY BUDGET OF {Math.round(weeklyGoalMin / 60)}H
              </div>
            </div>
            
            <div className="flex gap-4">
              <div className="flex-1 border-t-2 border-[#09090B]/20 pt-2">
                <div className="text-xl font-bold text-[#09090B]">{Math.round(averageSessionLengthMin || 0)}m</div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-[#09090B]/60">AVG SESSION</div>
              </div>
              <div className="flex-1 border-t-2 border-[#09090B]/20 pt-2">
                <div className="text-xl font-bold text-[#09090B]">{totalSessions || 0}</div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-[#09090B]/60">SESSIONS LOGGED</div>
              </div>
            </div>

            {/* RESISTANCE STATS */}
            {resistanceStats && resistanceStats.totalCravings > 0 && (
              <div className="border-t-2 border-[#09090B]/20 pt-3">
                <div className="text-[10px] font-bold uppercase tracking-widest text-[#09090B]/60 mb-2">SCROLL RESISTANCE</div>
                <div className="flex gap-4">
                  <div>
                    <div className="text-lg font-bold text-[#09090B]">{resistanceStats.resisted}/{resistanceStats.totalCravings}</div>
                    <div className="text-[10px] font-bold uppercase tracking-widest text-[#09090B]/60">RESISTED</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-[#09090B]">{resistanceStats.resistanceRate}%</div>
                    <div className="text-[10px] font-bold uppercase tracking-widest text-[#09090B]/60">RESIST RATE</div>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Nudge Column */}
          <div className="border-2 border-[#09090B] bg-[#09090B] p-6 text-[#FAFAFA] flex flex-col">
            <div className="flex justify-between items-center mb-4 border-b border-[#3F3F46] pb-4">
              <span className="text-xs font-bold uppercase tracking-widest text-[#DFE104]">
                SUGGESTION {activeNudgeIndex + 1}/{nudges.length}
              </span>
              <div className="flex gap-2">
                {nudges.map((_, idx) => (
                    <button 
                      key={idx}
                      onClick={() => setActiveNudgeIndex(idx)}
                      className={`w-2 h-2 rounded-full transition-colors duration-300 ${idx === activeNudgeIndex ? 'bg-[#DFE104]' : 'bg-[#3F3F46]'}`}
                      aria-label={`View nudge ${idx + 1}`}
                    />
                  ))}
              </div>
            </div>
            
            <AnimatePresence mode="wait">
              <motion.div
                key={activeNudgeIndex}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="flex-1 flex flex-col justify-center gap-4"
              >
                <div className="text-[#A1A1AA] text-sm font-medium uppercase tracking-widest">
                  {activeNudge.type === 'content_diet' ? 'CONTENT DIET ACTION' : 'GOAL-ALIGNED ALTERNATIVE'}
                </div>
                <div className="text-xl md:text-2xl font-bold leading-tight uppercase tracking-tighter mb-2">{activeNudge.title}</div>
                <div className="text-sm text-[#A1A1AA] leading-relaxed mb-3 border-l-2 border-[#DFE104] pl-3 py-1">{activeNudge.description}</div>
                {activeNudge.relevanceReason && (
                  <div className="text-[10px] uppercase tracking-widest text-[#3F3F46]">{activeNudge.relevanceReason}</div>
                )}
              </motion.div>
            </AnimatePresence>
            
            <div className="mt-auto flex justify-end gap-3 pt-6">
              {nudgeId && nudgeFeedback && (
                feedbackSent ? (
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#22C55E] px-4 py-2">
                    <CheckCircle size={14} /> NOTED
                  </div>
                ) : (
                  <button
                    className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#FAFAFA] border border-[#3F3F46] px-4 py-2 hover:border-[#DFE104] hover:text-[#DFE104] transition-colors duration-200"
                    onClick={() => {
                      nudgeFeedback.mutate({ nudgeId, action: 'acted_on' });
                      setFeedbackSent(nudgeId);
                    }}
                  >
                    <CheckCircle size={14} /> ACTED ON IT
                  </button>
                )
              )}
              <button 
                className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#09090B] bg-[#DFE104] px-4 py-2 hover:bg-white transition-colors duration-200"
                onClick={() => {
                   if(nudges.length > 1) {
                     setActiveNudgeIndex((activeNudgeIndex + 1) % nudges.length);
                   }
                }}
              >
                NEXT ACTION <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
