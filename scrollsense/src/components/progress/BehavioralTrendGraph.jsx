import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  Lock, TrendingDown, TrendingUp, Target, 
  Smile, Info, BarChart2, Infinity as InfinityIcon, Database 
} from 'lucide-react';
import { 
  ComposedChart, Line, Area, XAxis, YAxis, 
  CartesianGrid, Tooltip, ReferenceLine, 
  ResponsiveContainer 
} from 'recharts';

export default function BehavioralTrendGraph({ data, isLoading }) {
  const [activeMetric, setActiveMetric] = useState('scroll');

  const hasEnoughData = data?.hasEnoughData || false;
  const weeksTracked = data?.weeksTracked || 0;
  const daysUntilTrendUnlocks = data?.daysUntilTrendUnlocks || 0;
  const overallProgressScore = data?.overallProgressScore;
  const progressLabel = data?.progressLabel || 'NOT ENOUGH DATA YET';
  const weeklyTrends = data?.weeklyTrends || [];

  // Map API data to chart-friendly shape
  const chartData = useMemo(() => {
    return weeklyTrends.map(w => ({
      weekLabel: w.weekLabel,
      total: w.dailyAvgMinutes * 7,
      dailyAvg: w.dailyAvgMinutes,
      trendLine: w.movingAverage != null ? w.movingAverage * 7 : null,
      goalPct: w.goalRelevancePercent,
      avgMood: w.averageMoodRating,
      sessionsCount: w.sessionsCount,
      cravingResistanceRate: w.cravingResistanceRate,
      hasInstagram: w.hasInstagram,
    }));
  }, [weeklyTrends]);

  const hasAnyInstagramWeeks = chartData.some(w => w.hasInstagram);
  const hasAnyYouTubeOnlyWeeks = chartData.some(w => !w.hasInstagram);

  const firstWeekTotal = chartData[0]?.total || 0;
  const lastWeekTotal = chartData[chartData.length - 1]?.total || 0;
  const improvementMinutes = firstWeekTotal - lastWeekTotal;
  const improvementPct = firstWeekTotal > 0 ? Math.round((improvementMinutes / firstWeekTotal) * 100) : 0;
  const isImproving = improvementMinutes > 0;

  const chartH = typeof window !== 'undefined' && window.innerWidth < 768 ? 220 : 300;
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  // Custom tooltips depending on the metric
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload;
      return (
        <div className="bg-[#27272A] border border-[#3F3F46] p-2 text-xs font-['Space_Grotesk'] text-[#FAFAFA] rounded-none">
          <p className="text-[#A1A1AA] mb-1 font-bold">{label}</p>
          {activeMetric === 'scroll' && (
            <>
              <p className="text-[#DFE104] font-bold">{d.total} MIN TOTAL</p>
              {d.cravingResistanceRate != null && (
                <p className="text-[#A1A1AA] mt-0.5">{d.cravingResistanceRate}% CRAVINGS RESISTED</p>
              )}
              {!d.hasInstagram && <p className="text-[#3F3F46] mt-0.5">YOUTUBE ONLY</p>}
            </>
          )}
          {activeMetric === 'goal' && (
            <p className="text-[#DFE104] font-bold">{d.goalPct}% GOAL RELEVANCE</p>
          )}
          {activeMetric === 'mood' && (
            <p className="text-[#DFE104] font-bold">AVG MOOD: {d.avgMood != null ? d.avgMood.toFixed(1) : 'N/A'}</p>
          )}
        </div>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <div className="border-2 border-[#3F3F46] bg-[#09090B] p-6 md:p-8 animate-pulse">
        <div className="h-4 w-48 bg-[#27272A] mb-2" />
        <div className="h-10 w-80 bg-[#27272A] mb-8" />
        <div className="h-64 bg-[#27272A]" />
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      viewport={{ once: true }}
      className="border-2 border-[#3F3F46] bg-[#09090B] p-6 md:p-8"
    >
      <div className="flex justify-between items-start flex-wrap gap-4 mb-6">
        <div>
          <p className="text-xs uppercase tracking-widest text-[#DFE104] mb-1">
            BEHAVIORAL TREND GRAPH
          </p>
          <h2 className="text-2xl md:text-4xl font-bold uppercase tracking-tighter leading-[0.85] text-[#FAFAFA]">
            YOUR DIRECTION OVER TIME
          </h2>
          
          <div className="mt-4">
            {isImproving ? (
              <div className="flex items-center gap-2 border border-[#DFE104]/30 px-3 py-1 w-fit">
                <TrendingDown size={13} color="#DFE104" />
                <span className="text-[10px] uppercase tracking-widest text-[#DFE104]">
                  {improvementPct}% LESS SCROLLING SINCE YOU STARTED
                </span>
              </div>
            ) : improvementPct < 0 ? (
              <div className="flex items-center gap-2 border border-[#3F3F46] px-3 py-1 w-fit">
                <TrendingUp size={13} color="#A1A1AA" />
                <span className="text-[10px] uppercase tracking-widest text-[#A1A1AA]">
                  {Math.abs(improvementPct)}% MORE THIS PERIOD
                </span>
              </div>
            ) : (
              <div className="border border-[#3F3F46] px-3 py-1 w-fit">
                <span className="text-[10px] uppercase tracking-widest text-[#3F3F46]">
                  TREND STABILIZING
                </span>
              </div>
            )}
          </div>
        </div>
        <div className="px-3 py-1 border border-[#3F3F46] text-[#A1A1AA] text-[10px] font-bold tracking-widest">
          F15
        </div>
      </div>

      {!hasEnoughData && (
        <div className="bg-[#27272A]/20 border border-[#3F3F46] p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Lock size={16} color="#A1A1AA" />
            <h3 className="text-sm font-bold uppercase tracking-tighter text-[#FAFAFA]">
              TREND GRAPH UNLOCKS AFTER 2 WEEKS OF DATA
            </h3>
          </div>
          
          {(() => {
            const progressPct = weeksTracked >= 2 ? 100 : Math.min((weeksTracked / 2) * 100, 100);
            return (
              <>
                <div className="w-full h-[6px] bg-[#27272A] mb-3 relative">
                  <div 
                    className="bg-[#DFE104] h-[6px] transition-all duration-700 absolute left-0 top-0"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] uppercase mb-3">
                  <span className="text-[#A1A1AA]">{weeksTracked} WEEK{weeksTracked !== 1 ? 'S' : ''} TRACKED</span>
                  <span className="text-[#3F3F46]">2 WEEKS</span>
                </div>
                <div className="mt-3">
                  {daysUntilTrendUnlocks > 0 ? (
                    <p className="text-xs uppercase tracking-widest text-[#A1A1AA]">
                      TREND UNLOCKS AFTER 2 WEEKS — {daysUntilTrendUnlocks} DAY{daysUntilTrendUnlocks > 1 ? 'S' : ''} TO GO
                    </p>
                  ) : (
                    <p className="text-xs uppercase tracking-widest text-[#DFE104]">
                      UNLOCKING NOW...
                    </p>
                  )}
                </div>
              </>
            );
          })()}

          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="border border-[#27272A] p-3 opacity-40">
              <TrendingDown size={14} color="#3F3F46" />
              <p className="text-[10px] uppercase text-[#3F3F46] mt-2 tracking-widest">SCROLL TIME TREND</p>
            </div>
            <div className="border border-[#27272A] p-3 opacity-40">
              <Target size={14} color="#3F3F46" />
              <p className="text-[10px] uppercase text-[#3F3F46] mt-2 tracking-widest">GOAL RELEVANCE ARC</p>
            </div>
            <div className="border border-[#27272A] p-3 opacity-40">
              <Smile size={14} color="#3F3F46" />
              <p className="text-[10px] uppercase text-[#3F3F46] mt-2 tracking-widest">MOOD OVER TIME</p>
            </div>
          </div>
        </div>
      )}

      {/* Main Content or Preview Background */}
      <div className="relative">
        {!hasEnoughData && (
          <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
            <div className="bg-[#09090B]/80 px-4 py-2 border border-[#3F3F46]">
              <p className="text-xs uppercase tracking-widest text-[#3F3F46]">
                PREVIEW — YOUR REAL DATA BUILDS HERE
              </p>
            </div>
          </div>
        )}

        <div className={!hasEnoughData ? "opacity-30 pointer-events-none" : ""}>
          <div className="flex gap-0 border-2 border-[#3F3F46] w-fit mb-6 overflow-x-auto max-w-full">
            {[
              { id: 'scroll', label: 'SCROLL TIME' },
              { id: 'goal', label: 'GOAL SCORE' },
              { id: 'mood', label: 'MOOD' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveMetric(tab.id)}
                className={`px-4 py-2 text-xs uppercase tracking-wider font-bold whitespace-nowrap transition-all duration-200 ${
                  activeMetric === tab.id ? 'bg-[#DFE104] text-black' : 'bg-transparent text-[#A1A1AA] hover:bg-[#27272A]/30'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div>
              <p className="text-[10px] uppercase text-[#A1A1AA] mb-1 tracking-widest">DATA COVERS</p>
              <p className="text-xl font-bold uppercase text-[#FAFAFA] tracking-tighter">
                {weeksTracked} WEEKS
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase text-[#A1A1AA] mb-1 tracking-widest">SCROLL TIME</p>
              <p className={`text-xl font-bold uppercase tracking-tighter ${isImproving ? 'text-[#DFE104]' : 'text-[#A1A1AA]'}`}>
                {isImproving ? `-${improvementPct}%` : `+${Math.abs(improvementPct)}%`}
              </p>
              <p className="text-[10px] uppercase text-[#3F3F46] mt-1 tracking-widest">SINCE WEEK 1</p>
            </div>
            <div>
              <p className="text-[10px] uppercase text-[#A1A1AA] mb-1 tracking-widest">GOAL RELEVANCE</p>
              {(() => {
                const goalChange = (chartData[chartData.length-1]?.goalPct || 0) - (chartData[0]?.goalPct || 0);
                return (
                  <>
                    <p className={`text-xl font-bold uppercase tracking-tighter ${goalChange > 0 ? 'text-[#DFE104]' : 'text-[#A1A1AA]'}`}>
                      {goalChange > 0 ? '+' : ''}{goalChange}pp
                    </p>
                    <p className="text-[10px] uppercase text-[#3F3F46] mt-1 tracking-widest">PERCENTAGE POINTS</p>
                  </>
                );
              })()}
            </div>
            <div>
              <p className="text-[10px] uppercase text-[#A1A1AA] mb-1 tracking-widest">PROGRESS</p>
              <p className={`text-xl font-bold uppercase tracking-tighter ${overallProgressScore != null && overallProgressScore > 20 ? 'text-[#DFE104]' : 'text-[#A1A1AA]'}`}>
                {overallProgressScore != null ? `${overallProgressScore}%` : '—'}
              </p>
              <p className="text-[10px] uppercase text-[#3F3F46] mt-1 tracking-widest">{progressLabel}</p>
            </div>
          </div>

          {chartData.length > 0 && (
          <>
          <div style={{ height: chartH }} className="w-full">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272A" vertical={false} />
                <XAxis 
                  dataKey="weekLabel" 
                  axisLine={false} 
                  tickLine={false}
                  tick={{ fill: '#A1A1AA', fontSize: 10, fontFamily: 'Space Grotesk' }}
                  interval={isMobile ? 1 : 0}
                />
                
                {/* Primary Y Axis for Scroll Time */}
                <YAxis 
                  yAxisId="scroll"
                  axisLine={false} 
                  tickLine={false} 
                  hide={isMobile && activeMetric === 'scroll'}
                  tick={{ fill: '#A1A1AA', fontSize: 10, fontFamily: 'Space Grotesk' }} 
                  tickFormatter={(v) => activeMetric === 'scroll' ? `${v}m` : v}
                  domain={activeMetric === 'scroll' ? [0, 'dataMax + 100'] : activeMetric === 'mood' ? [1, 5] : [0, 'dataMax + 10']}
                />

                <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#3F3F46', strokeWidth: 1, strokeDasharray: '4 4' }} />

                {activeMetric === 'scroll' && (
                  <>
                    <Area 
                      yAxisId="scroll" dataKey="total" fill="#DFE104" fillOpacity={0.08} stroke="#DFE104" strokeWidth={1.5} name="Total Scroll" type="monotone"
                      dot={(props) => {
                        const { cx, cy, payload, index } = props;
                        if (cx == null || cy == null) return null;
                        return (
                          <circle key={index} cx={cx} cy={cy} r={4} fill="#DFE104" fillOpacity={payload.hasInstagram ? 1 : 0.4} stroke="#DFE104" strokeWidth={1} />
                        );
                      }}
                    />
                    <Line yAxisId="scroll" dataKey="trendLine" stroke="#DFE104" strokeWidth={2} strokeDasharray="6 3" dot={false} name="Trend" connectNulls type="monotone" />
                  </>
                )}

                {activeMetric === 'goal' && (
                  <>
                    <Area yAxisId="scroll" dataKey="goalPct" fill="#DFE104" fillOpacity={0.1} stroke="#DFE104" strokeWidth={2} name="Goal Relevance %" type="monotone" connectNulls />
                    <ReferenceLine y={8} yAxisId="scroll" stroke="#3F3F46" strokeDasharray="4 4" label={{ value: 'AVG 8%', fill: '#3F3F46', fontSize: 10, position: 'insideTopLeft', fontFamily: 'Space Grotesk' }} />
                  </>
                )}

                {activeMetric === 'mood' && (
                  <>
                    <Area yAxisId="scroll" dataKey="avgMood" fill="rgba(250,250,250,0.2)" fillOpacity={0.3} stroke="rgba(250,250,250,0.5)" strokeWidth={2} name="Avg Mood" type="monotone" connectNulls />
                    <ReferenceLine y={3} yAxisId="scroll" stroke="#3F3F46" strokeDasharray="4 4" label={{ value: 'NEUTRAL', fill: '#3F3F46', fontSize: 9, position: 'insideTopLeft', fontFamily: 'Space Grotesk' }} />
                  </>
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          <div className="flex items-center justify-between gap-4 mt-6 flex-wrap">
            <div className="flex items-center gap-1.5">
              <Info size={10} color="#3F3F46" />
              <span className="text-[10px] uppercase text-[#3F3F46] tracking-widest">
                {data?.limitedData
                  ? `PARTIAL DATA — ${weeksTracked} OF 4 WEEKS MINIMUM`
                  : `BASED ON ${weeksTracked} WEEKS OF TRACKING`}
              </span>
            </div>
            {hasAnyInstagramWeeks && hasAnyYouTubeOnlyWeeks && (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 bg-[#DFE104]" />
                  <span className="text-[10px] uppercase text-[#3F3F46] tracking-widest">YT + IG</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 bg-[#DFE104] opacity-40" />
                  <span className="text-[10px] uppercase text-[#3F3F46] tracking-widest">YT ONLY</span>
                </div>
              </div>
            )}
          </div>
          </>
          )}
        </div>
      </div>

      <div className="mt-8 border-t border-[#3F3F46] pt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="flex items-start gap-4">
          <BarChart2 size={16} color="#A1A1AA" className="flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-xs font-bold uppercase tracking-tighter text-[#FAFAFA] mb-1">
              ONE BAD WEEK IS ONE DATA POINT
            </h4>
            <p className="text-xs text-[#3F3F46] leading-relaxed">
              If you have a worse week, it doesn't erase your progress. The primary trend line shows your real trajectory independent of noisy weeks.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-4">
          <InfinityIcon size={16} color="#A1A1AA" className="flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-xs font-bold uppercase tracking-tighter text-[#FAFAFA] mb-1">
              NO STREAKS. NO RESETS.
            </h4>
            <p className="text-xs text-[#3F3F46] leading-relaxed">
              ScrollSense doesn't track streaks. A gap in logging doesn't break anything — you just pick up where you left off. Progress is cumulative, not linear.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Database size={11} color="#3F3F46" />
          <p className="text-[10px] uppercase tracking-wider text-[#3F3F46]">
            DATA: {weeksTracked} WEEKS TRACKED
          </p>
        </div>
        {data?.platformNote && (
          <p className="text-[10px] uppercase tracking-wider text-[#3F3F46]">
            {data.platformNote}
          </p>
        )}
      </div>

    </motion.div>
  );
}
