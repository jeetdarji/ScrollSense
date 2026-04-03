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
          <p className="text-xs text-[#A1A1AA] mt-2 leading-relaxed">Gemini is reviewing your YouTube history. This takes 1–3 minutes and runs once.</p>
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