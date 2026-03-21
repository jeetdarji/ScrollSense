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

const readStorage = (key) => {
  try {
    const s = localStorage.getItem(key);
    return s ? JSON.parse(s) : null;
  } catch { return null; }
};

const MOCK_WEEKLY_DATA = [
  { week:'W1', weekLabel:'Nov 4',  youtube:280, instagram:320, total:600, goalPct:6,  avgMood:2.1, daysLogged:5 },
  { week:'W2', weekLabel:'Nov 11', youtube:260, instagram:300, total:560, goalPct:7,  avgMood:2.3, daysLogged:6 },
  { week:'W3', weekLabel:'Nov 18', youtube:290, instagram:280, total:570, goalPct:8,  avgMood:2.5, daysLogged:7 },
  { week:'W4', weekLabel:'Nov 25', youtube:240, instagram:260, total:500, goalPct:9,  avgMood:2.8, daysLogged:6 },
  { week:'W5', weekLabel:'Dec 2',  youtube:220, instagram:250, total:470, goalPct:10, avgMood:3.0, daysLogged:7 },
  { week:'W6', weekLabel:'Dec 9',  youtube:200, instagram:240, total:440, goalPct:11, avgMood:3.2, daysLogged:5 },
  { week:'W7', weekLabel:'Dec 16', youtube:190, instagram:220, total:410, goalPct:12, avgMood:3.4, daysLogged:7 },
  { week:'W8', weekLabel:'Dec 23', youtube:210, instagram:260, total:470, goalPct:11, avgMood:2.9, daysLogged:6 },
  { week:'W9', weekLabel:'Dec 30', youtube:180, instagram:210, total:390, goalPct:13, avgMood:3.5, daysLogged:7 },
  { week:'W10', weekLabel:'Jan 6', youtube:170, instagram:200, total:370, goalPct:14, avgMood:3.7, daysLogged:7 },
  { week:'W11', weekLabel:'Jan 13',youtube:185, instagram:215, total:400, goalPct:13, avgMood:3.4, daysLogged:6 },
  { week:'W12', weekLabel:'Jan 20',youtube:155, instagram:185, total:340, goalPct:16, avgMood:3.9, daysLogged:7 },
];

function getISOWeekInfo(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  
  const mon = new Date(date);
  mon.setDate(mon.getDate() - (mon.getDay() === 0 ? 6 : mon.getDay() - 1));
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const label = `${monthNames[mon.getMonth()]} ${mon.getDate()}`;
  return { id: `${d.getFullYear()}-W${weekNo}`, label, time: d.getTime() };
}

function linearTrend(data, key) {
  const n = data.length;
  if (n < 2) return data.map(d => ({ ...d, trendLine: d[key] }));
  
  const xs = data.map((_, i) => i);
  const ys = data.map(d => d[key]);
  const sumX = xs.reduce((s,x) => s+x, 0);
  const sumY = ys.reduce((s,y) => s+y, 0);
  const sumXY = xs.reduce((s,x,i) => s+x*ys[i], 0);
  const sumXX = xs.reduce((s,x) => s+x*x, 0);
  
  const slope = (n*sumXY - sumX*sumY) / (n*sumXX - sumX*sumX);
  const intercept = (sumY - slope*sumX) / n;
  
  return data.map((d,i) => ({
    ...d,
    trendLine: Math.round(intercept + slope * i)
  }));
}

function buildTrendData(youtubeData, instagramData, sessions) {
  // Rough aggregation for real data. 
  // We'll map everything to ISO weeks and assemble a unified structure 
  let weeksMap = {};

  if (youtubeData && youtubeData.weeklyBreakdown) {
    youtubeData.weeklyBreakdown.forEach((w) => {
      const start = new Date(w.weekStart || w.week);
      const wi = getISOWeekInfo(start);
      if (!weeksMap[wi.id]) weeksMap[wi.id] = { week: wi.id, weekLabel: wi.label, time: wi.time, youtube: 0, instagram: 0, total: 0, goalPct: 0, avgMood: 0, _moods: [], _days: new Set() };
      weeksMap[wi.id].youtube += w.totalMinutes || 0;
      weeksMap[wi.id].goalPct = w.goal || 0; // rough use of goal %
    });
  }

  if (instagramData && instagramData.inferredSessions) {
    instagramData.inferredSessions.forEach((s) => {
      const d = new Date(s.start || s.timestamp);
      const wi = getISOWeekInfo(d);
      if (!weeksMap[wi.id]) weeksMap[wi.id] = { week: wi.id, weekLabel: wi.label, time: wi.time, youtube: 0, instagram: 0, total: 0, goalPct: 0, avgMood: 0, _moods: [], _days: new Set() };
      weeksMap[wi.id].instagram += s.durationMinutes || 0;
    });
  }

  if (sessions && sessions.length > 0) {
    sessions.forEach(s => {
      const d = new Date(s.timestamp);
      const wi = getISOWeekInfo(d);
      if (!weeksMap[wi.id]) weeksMap[wi.id] = { week: wi.id, weekLabel: wi.label, time: wi.time, youtube: 0, instagram: 0, total: 0, goalPct: 0, avgMood: 0, _moods: [], _days: new Set() };
      if (s.platform === 'youtube') weeksMap[wi.id].youtube += s.durationMinutes;
      else if (s.platform === 'instagram') weeksMap[wi.id].instagram += s.durationMinutes;
      else weeksMap[wi.id].total += s.durationMinutes; // other

      weeksMap[wi.id]._moods.push(s.moodRating);
      weeksMap[wi.id]._days.add(d.toDateString());
    });
  }

  const result = Object.values(weeksMap).sort((a,b) => a.time - b.time).map(w => {
    const total = w.youtube + w.instagram + (w.total || 0);
    const avgMood = w._moods.length > 0 ? w._moods.reduce((a,b)=>a+b,0)/w._moods.length : 3;
    return {
      week: w.week,
      weekLabel: w.weekLabel,
      youtube: w.youtube,
      instagram: w.instagram,
      total: total,
      goalPct: w.goalPct,
      avgMood: avgMood,
      daysLogged: w._days.size
    };
  });

  return result.length > 0 ? result : MOCK_WEEKLY_DATA;
}

export default function BehavioralTrendGraph() {
  const [activeMetric, setActiveMetric] = useState('scroll'); // 'scroll' | 'goal' | 'mood'
  const [showPlatformSplit, setShowPlatformSplit] = useState(false);

  const youtubeData = readStorage('scrollsense_youtube_processed');
  const instagramData = readStorage('scrollsense_instagram_processed');
  const sessions = readStorage('scrollsense_sessions') || [];

  const weeksOfData = youtubeData?.weeksOfData || 0;
  
  // Real cold start check
  const daysTracked = new Set(sessions.map(s => new Date(s.timestamp).toDateString())).size;
  const hasEnoughData = weeksOfData >= 2 || (daysTracked >= 14);

  const trendData = useMemo(() => {
    let dataToUse = MOCK_WEEKLY_DATA;
    if (hasEnoughData) {
      dataToUse = buildTrendData(youtubeData, instagramData, sessions);
      // Fallback if processing returned something too tiny
      if (dataToUse.length < 2) dataToUse = MOCK_WEEKLY_DATA;
    }
    return dataToUse;
  }, [hasEnoughData, youtubeData, instagramData, sessions]);

  const trendDataWithLine = useMemo(() => linearTrend(trendData, 'total'), [trendData]);

  const firstWeekTotal = trendData[0]?.total || 0;
  const lastWeekTotal = trendData[trendData.length-1]?.total || 0;
  const improvementMinutes = firstWeekTotal - lastWeekTotal;
  const improvementPct = firstWeekTotal > 0 ? Math.round((improvementMinutes / firstWeekTotal) * 100) : 0;
  const isImproving = improvementMinutes > 0;

  const chartH = typeof window !== 'undefined' && window.innerWidth < 768 ? 220 : 300;
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  // Custom tooltips depending on the metric
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-[#27272A] border border-[#3F3F46] p-2 text-xs font-['Space_Grotesk'] text-[#FAFAFA] rounded-none">
          <p className="text-[#A1A1AA] mb-1 font-bold">{label}</p>
          {activeMetric === 'scroll' && (
            <>
              <p className="text-[#DFE104] font-bold">{data.total} MIN TOTAL</p>
              {showPlatformSplit && (
                <div className="mt-1 pt-1 border-t border-[#3F3F46]/50">
                  <p className="text-xs text-[#FAFAFA]">YT: {data.youtube}m</p>
                  <p className="text-xs text-[#FAFAFA]/70">IG: {data.instagram}m</p>
                </div>
              )}
            </>
          )}
          {activeMetric === 'goal' && (
            <p className="text-[#DFE104] font-bold">{data.goalPct}% GOAL RELEVANCE</p>
          )}
          {activeMetric === 'mood' && (
            <p className="text-[#DFE104] font-bold">AVG MOOD: {data.avgMood.toFixed(1)}</p>
          )}
        </div>
      );
    }
    return null;
  };

  const getDataSourceText = () => {
    if (youtubeData && instagramData) return "YOUTUBE + INSTAGRAM DATA";
    if (youtubeData) return "YOUTUBE ONLY · UPLOAD INSTAGRAM FOR FULL PICTURE";
    return "SESSION LOGS ONLY";
  };

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
            const daysToUnlock = Math.max(0, 14 - daysTracked);
            const progressPct = Math.min((daysTracked / 14) * 100, 100);
            return (
              <>
                <div className="w-full h-[6px] bg-[#27272A] mb-3 relative">
                  <div 
                    className="bg-[#DFE104] h-[6px] transition-all duration-700 absolute left-0 top-0"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] uppercase mb-3">
                  <span className="text-[#A1A1AA]">{daysTracked} DAYS TRACKED</span>
                  <span className="text-[#3F3F46]">14 DAYS</span>
                </div>
                <div className="mt-3">
                  {daysToUnlock > 0 ? (
                    <p className="text-xs uppercase tracking-widest text-[#A1A1AA]">
                      {daysToUnlock} MORE DAY{daysToUnlock > 1 ? 'S' : ''} TO UNLOCK YOUR TREND GRAPH
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
                {trendData.length} WEEKS
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
                const goalChange = (trendData[trendData.length-1]?.goalPct || 0) - (trendData[0]?.goalPct || 0);
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
              <p className="text-[10px] uppercase text-[#A1A1AA] mb-1 tracking-widest">AVG MOOD</p>
              {(() => {
                const moodChange = (trendData[trendData.length-1]?.avgMood || 0) - (trendData[0]?.avgMood || 0);
                return (
                  <>
                    <p className={`text-xl font-bold uppercase tracking-tighter ${moodChange > 0 ? 'text-[#DFE104]' : 'text-[#A1A1AA]'}`}>
                      {moodChange > 0 ? '+' : ''}{moodChange.toFixed(1)}
                    </p>
                    <p className="text-[10px] uppercase text-[#3F3F46] mt-1 tracking-widest">OUT OF 5</p>
                  </>
                );
              })()}
            </div>
          </div>

          <div style={{ height: chartH }} className="w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={trendDataWithLine} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
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
                    {showPlatformSplit ? (
                      <>
                        <Area yAxisId="scroll" dataKey="instagram" stackId="scroll" fill="rgba(250,250,250,0.3)" fillOpacity={0.5} stroke="rgba(250,250,250,0.2)" strokeWidth={1} name="Instagram" type="monotone" />
                        <Area yAxisId="scroll" dataKey="youtube" stackId="scroll" fill="#DFE104" fillOpacity={0.15} stroke="#DFE104" strokeWidth={1.5} name="YouTube" type="monotone" />
                      </>
                    ) : (
                      <Area yAxisId="scroll" dataKey="total" fill="#DFE104" fillOpacity={0.08} stroke="#DFE104" strokeWidth={1.5} name="Total Scroll" type="monotone" />
                    )}
                    <Line yAxisId="scroll" dataKey="trendLine" stroke="#DFE104" strokeWidth={2} strokeDasharray="6 3" dot={false} name="Trend" connectNulls type="monotone" />
                  </>
                )}

                {activeMetric === 'goal' && (
                  <>
                    <Area yAxisId="scroll" dataKey="goalPct" fill="#DFE104" fillOpacity={0.1} stroke="#DFE104" strokeWidth={2} name="Goal Relevance %" type="monotone" />
                    <ReferenceLine y={8} yAxisId="scroll" stroke="#3F3F46" strokeDasharray="4 4" label={{ value: 'AVG 8%', fill: '#3F3F46', fontSize: 10, position: 'insideTopLeft', fontFamily: 'Space Grotesk' }} />
                  </>
                )}

                {activeMetric === 'mood' && (
                  <>
                    <Area yAxisId="scroll" dataKey="avgMood" fill="rgba(250,250,250,0.2)" fillOpacity={0.3} stroke="rgba(250,250,250,0.5)" strokeWidth={2} name="Avg Mood" type="monotone" />
                    <ReferenceLine y={3} yAxisId="scroll" stroke="#3F3F46" strokeDasharray="4 4" label={{ value: 'NEUTRAL', fill: '#3F3F46', fontSize: 9, position: 'insideTopLeft', fontFamily: 'Space Grotesk' }} />
                  </>
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          <div className="flex flex-col md:flex-row justify-between flex-wrap gap-4 mt-6">
            {activeMetric === 'scroll' ? (
              <div 
                className="flex items-center gap-3 cursor-pointer"
                onClick={() => setShowPlatformSplit(!showPlatformSplit)}
              >
                <div className={`w-8 h-4 relative border transition-all duration-300 flex items-center px-0.5 ${showPlatformSplit ? 'bg-[#DFE104]/20 border-[#DFE104]/50' : 'bg-[#27272A] border-[#3F3F46]'}`}>
                  <motion.div 
                    layout 
                    className={`w-3 h-3 ${showPlatformSplit ? 'bg-[#DFE104]' : 'bg-[#3F3F46]'}`}
                    initial={false}
                    animate={{ x: showPlatformSplit ? 12 : 0 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                </div>
                <span className="text-[10px] uppercase tracking-widest text-[#A1A1AA] font-bold">
                  SHOW PLATFORM SPLIT
                </span>
              </div>
            ) : <div />}

            <div className="flex items-center gap-1.5">
              <Info size={10} color="#3F3F46" />
              <span className="text-[10px] uppercase text-[#3F3F46] tracking-widest">
                {getDataSourceText()}
              </span>
            </div>
          </div>
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

      <div className="mt-6 flex items-center gap-2">
        <Database size={11} color="#3F3F46" />
        <p className="text-[10px] uppercase tracking-wider text-[#3F3F46]">
          {(() => {
            const sources = [];
            if (youtubeData) sources.push(`YOUTUBE: ${weeksOfData} WEEKS`);
            if (instagramData) sources.push('INSTAGRAM: REEL TIMING');
            if (sessions.length > 0) sources.push(`${sessions.length} SESSION LOGS`);
            return `DATA: ${sources.join(' · ')}`;
          })()}
        </p>
      </div>

    </motion.div>
  );
}
