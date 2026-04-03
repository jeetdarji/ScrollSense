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