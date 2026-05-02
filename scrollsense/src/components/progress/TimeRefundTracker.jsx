import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  X, CheckCircle, Target, BookOpen, Moon, 
  MapPin, Code, FileText, Laptop, Palette, Eye,
  Briefcase, BarChart2, PenTool, Search, Brain,
  GraduationCap, Infinity as InfinityIcon,
  Sun, Headphones, Globe, Phone, Music, Heart, 
  Monitor, MessageSquare, Layers, TrendingUp, Mail, Film, Flame, Info
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, Cell, ResponsiveContainer 
} from 'recharts';

const ICON_MAP = {
  Moon, BookOpen, MapPin, Code, FileText, Laptop, Palette, Eye,
  Briefcase, BarChart2, PenTool, Search, Brain, GraduationCap,
  Sun, Headphones, Globe, Phone, Music, Heart, Target,
  Monitor, MessageSquare, Layers, TrendingUp, Mail, Film, Flame,
};

const MILESTONES = [
  { hours: 5,   label: '5 HOURS',   message: '5 hours back.',           sub: 'Half a workday reclaimed.' },
  { hours: 10,  label: '10 HOURS',  message: '10 hours reclaimed.',     sub: 'A full workday returned.' },
  { hours: 25,  label: '25 HOURS',  message: '25 hours.',               sub: 'Over three full workdays.' },
  { hours: 50,  label: '50 HOURS',  message: '50 HOURS.',               sub: 'An entire work week reclaimed.' },
  { hours: 100, label: '100 HOURS', message: '100 HOURS.',              sub: 'Two and a half work weeks. Incredible.' },
  { hours: 200, label: '200 HOURS', message: '200 HOURS.',              sub: 'Five full work weeks. Transformed.' }
];

const readStorage = (key) => {
  try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : null; } catch { return null; }
};

export default function TimeRefundTracker({ data, isLoading }) {
  const navigate = useNavigate();

  // Milestone celebration (UI-only state in localStorage)
  const initialSeen = readStorage('scrollsense_progress_milestones') || [];
  const [seenMilestones, setSeenMilestones] = useState(initialSeen);

  const totalReclaimedHours = data?.totalReclaimedHours || 0;
  const totalReclaimedMinutes = data?.totalReclaimedMinutes || 0;
  const alternatives = data?.alternatives || [];
  const needsGoalSetup = data?.needsGoalSetup || false;
  const weeklyData = data?.weeklyData || [];
  const upcomingMilestone = data?.nextMilestone || null;
  const percentToNext = data?.percentToNextMilestone || 0;
  const minutesToNext = data?.minutesToNextMilestone || 0;
  const baselinePerWeek = data?.baselinePerWeek || 0;
  const dailyLimit = baselinePerWeek ? Math.round(baselinePerWeek / 7) : 141;

  // Detect new uncelebrated milestone
  const newMilestone = MILESTONES.find(m => totalReclaimedHours >= m.hours && !seenMilestones.includes(m.hours)) || null;
  const [showMilestone, setShowMilestone] = useState(false);
  useEffect(() => { if (newMilestone) setShowMilestone(true); }, [newMilestone?.hours]);

  const handleDismissMilestone = () => {
    if (newMilestone) {
      const newSeen = [...seenMilestones, newMilestone.hours];
      setSeenMilestones(newSeen);
      localStorage.setItem('scrollsense_progress_milestones', JSON.stringify(newSeen));
    }
    setShowMilestone(false);
  };

  // Animated counter
  const [displayCount, setDisplayCount] = useState(0);
  useEffect(() => {
    const target = totalReclaimedHours >= 1 ? totalReclaimedHours : totalReclaimedMinutes;
    if (target === 0) { setDisplayCount(0); return; }
    const duration = 1500;
    const steps = 30;
    const interval = duration / steps;
    let step = 0;
    const timer = setInterval(() => {
      step++;
      const progress = step / steps;
      setDisplayCount(target * (1 - Math.pow(1 - progress, 3)));
      if (step >= steps) { setDisplayCount(target); clearInterval(timer); }
    }, interval);
    return () => clearInterval(timer);
  }, [totalReclaimedHours, totalReclaimedMinutes]);

  const currentMilestone = [...MILESTONES].reverse().find(m => totalReclaimedHours >= m.hours) || null;
  const hoursToGo = minutesToNext / 60;

  if (isLoading) {
    return (
      <div className="border-2 border-[#3F3F46] bg-[#09090B] p-6 md:p-8 animate-pulse">
        <div className="h-4 w-40 bg-[#27272A] mb-2" />
        <div className="h-10 w-72 bg-[#27272A] mb-8" />
        <div className="h-32 bg-[#27272A] mb-4" />
        <div className="h-24 bg-[#27272A]" />
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
      <div className="flex justify-between items-start flex-wrap gap-4 mb-8">
        <div>
          <p className="text-xs uppercase tracking-widest text-[#DFE104] mb-1">
            TIME REFUND TRACKER
          </p>
          <h2 className="text-2xl md:text-4xl font-bold uppercase tracking-tighter leading-[0.85] text-[#FAFAFA]">
            TIME YOU'VE TAKEN BACK
          </h2>
        </div>
        <div className="px-3 py-1 border border-[#3F3F46] text-[#A1A1AA] text-[10px] font-bold tracking-widest">
          F9
        </div>
      </div>

      <AnimatePresence>
        {showMilestone && newMilestone && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full bg-[#DFE104] p-6 relative overflow-hidden mb-8"
          >
            <X 
              size={16} 
              color="black" 
              className="absolute top-4 right-4 cursor-pointer z-20" 
              onClick={handleDismissMilestone}
            />
            <div 
              style={{ fontSize: 'clamp(3rem, 8vw, 6rem)' }}
              className="font-bold uppercase tracking-tighter leading-none text-black opacity-20 absolute right-6 top-1/2 transform -translate-y-1/2 aria-hidden z-0"
            >
              {newMilestone.label}
            </div>
            <div className="relative z-10">
              <p className="text-xs uppercase tracking-widest text-black/60 mb-1">
                MILESTONE REACHED
              </p>
              <h3 className="text-2xl md:text-3xl font-bold uppercase tracking-tighter text-black leading-[0.9]">
                {newMilestone.message}
              </h3>
              <p className="text-sm text-black/70 mt-2 leading-relaxed max-w-md">
                {newMilestone.sub}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <div className="flex items-end">
            <span style={{ fontSize: 'clamp(4rem, 10vw, 8rem)' }} className="font-bold uppercase tracking-tighter leading-none text-[#DFE104]">
              {totalReclaimedHours >= 1 ? displayCount.toFixed(1) : Math.round(displayCount)}
            </span>
            {totalReclaimedHours >= 1 ? (
              <span className="text-2xl font-bold text-[#A1A1AA] ml-2 mb-3 tracking-tighter">HRS</span>
            ) : (
              <span className="text-2xl font-bold text-[#A1A1AA] ml-2 mb-3 tracking-tighter">MIN</span>
            )}
          </div>
          <div className="mt-3">
            <p className="text-xs uppercase tracking-widest text-[#A1A1AA]">
              TOTAL HOURS RECLAIMED
            </p>
            
            <div className="mt-4 p-3 bg-[#27272A]/30 border border-[#3F3F46] flex flex-col gap-2">
               <div className="flex items-start gap-2">
                 <Info size={12} color="#DFE104" className="mt-0.5 flex-shrink-0" />
                 <p className="text-[10px] uppercase text-[#A1A1AA] leading-relaxed">
                   <strong className="text-[#FAFAFA]">DYNAMIC MATH:</strong> Base saved time + <strong className="text-[#DFE104]">Relevance Bonus</strong> (educational viewing is refunded back) - <strong className="text-red-400">Session Penalty</strong> (excessive app logins deduct from your total).
                 </p>
               </div>
            </div>
          </div>
        </div>

        <div>
          {upcomingMilestone && (
            <>
              <p className="text-xs uppercase tracking-widest text-[#A1A1AA] mb-3">NEXT MILESTONE</p>
              <h4 className="text-2xl font-bold uppercase tracking-tighter text-[#FAFAFA] mb-2">
                {upcomingMilestone.label}
              </h4>
              <div className="w-full h-[8px] bg-[#27272A] mb-2 relative">
                <div 
                  className="bg-[#DFE104] h-[8px] transition-all duration-700 absolute left-0 top-0"
                  style={{ width: `${Math.min(percentToNext, 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] uppercase text-[#3F3F46]">
                <span>{totalReclaimedHours.toFixed(1)} HRS</span>
                <span>{upcomingMilestone.hours} HRS</span>
              </div>
              <p className="mt-2 text-sm font-bold uppercase text-[#A1A1AA] tracking-tighter">
                {hoursToGo.toFixed(1)} HRS TO GO
              </p>
            </>
          )}

          <div className="mt-6">
            <p className="text-xs uppercase tracking-widest text-[#A1A1AA] mb-3">MILESTONES</p>
            <div className="flex flex-col gap-2">
              {MILESTONES.map((m, idx) => {
                const achieved = totalReclaimedHours >= m.hours;
                const isCurrent = currentMilestone?.hours === m.hours;
                return (
                  <div key={idx} className="flex items-center gap-3 py-2">
                    <div 
                      className={`w-3 h-3 border-2 flex-shrink-0 ${
                        achieved || isCurrent ? 'bg-[#DFE104] border-[#DFE104]' : 'bg-transparent border-[#27272A]'
                      } ${isCurrent ? 'animate-pulse' : ''}`}
                    />
                    <span className={`text-xs uppercase tracking-tighter ${
                      achieved || isCurrent ? 'text-[#DFE104] font-bold' : 'text-[#3F3F46]'
                    }`}>
                      {m.label}
                    </span>
                    <span className={`text-[10px] truncate ${
                      achieved ? 'text-[#A1A1AA]' : 'text-[#27272A]'
                    }`}>
                      {m.message}
                    </span>
                    {achieved && <CheckCircle size={12} color="#DFE104" className="ml-auto flex-shrink-0" />}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {totalReclaimedHours < 0.1 ? (
        <div className="text-center py-8 mt-8 border-t border-[#3F3F46]">
          <div style={{ fontSize: '8rem' }} className="font-bold text-[#27272A] leading-none mb-4 -tracking-tight" aria-hidden>0</div>
          <h3 className="text-sm font-bold uppercase tracking-tighter text-[#FAFAFA] mt-2">
            START LOGGING SESSIONS TO SEE YOUR TIME REFUND
          </h3>
          <p className="text-xs text-[#A1A1AA] mt-2 max-w-xs mx-auto leading-relaxed">
            Dynamic tracking calculates your daily {dailyLimit}-minute limit, rewards you with a relevance bonus for educational viewing, and penalizes high-frequency session switching.
          </p>
        </div>
      ) : (
        <>
          <div className="flex justify-between items-center mt-12 pt-6 border-t border-[#3F3F46] mb-4">
            <h3 className="text-sm font-bold uppercase tracking-tighter text-[#FAFAFA]">
              WHAT THAT TIME COULD BECOME
            </h3>
            {needsGoalSetup && (
              <span 
                className="text-[10px] uppercase tracking-widest text-[#DFE104] cursor-pointer hover:underline"
                onClick={() => navigate('/onboarding')}
              >
                UPDATE YOUR GOALS →
              </span>
            )}
          </div>

          {needsGoalSetup && (
            <div className="bg-[#27272A]/40 border border-[#3F3F46] p-4 mb-4 flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-4 flex-1">
                <Target size={16} color="#A1A1AA" className="flex-shrink-0" />
                <div>
                  <p className="text-xs font-bold uppercase tracking-tighter text-[#FAFAFA]">
                    YOUR ALTERNATIVES ARE GENERIC RIGHT NOW
                  </p>
                  <p className="text-xs text-[#A1A1AA] mt-0.5 leading-relaxed hidden md:block">
                    Set specific goals in onboarding and ScrollSense will show you alternatives that actually matter to you.
                  </p>
                </div>
              </div>
              <button 
                onClick={() => navigate('/onboarding')}
                className="border border-[#3F3F46] px-4 py-2 text-xs uppercase tracking-tighter text-[#FAFAFA] hover:border-[#DFE104] hover:text-[#DFE104] transition-all cursor-pointer whitespace-nowrap"
              >
                SET GOALS →
              </button>
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {alternatives.slice(0, 4).map((alt, i) => {
              const IconComp = ICON_MAP[alt.icon] || Target;
              return (
                <motion.div 
                  key={i}
                  whileTap={{ scale: 0.97 }}
                  className="border-2 border-[#3F3F46] p-4 md:p-5 flex flex-col hover:border-[#DFE104]/40 hover:bg-[#27272A]/30 transition-all cursor-default"
                >
                  <IconComp size={20} color="#DFE104" className="mb-3" />
                  <span style={{ fontSize: 'clamp(1.8rem, 4vw, 3rem)' }} className="font-bold uppercase tracking-tighter leading-none text-[#FAFAFA]">
                    {alt.count}
                  </span>
                  <span className="text-xs font-bold uppercase tracking-tighter text-[#A1A1AA] mt-2">
                    {alt.activity}
                  </span>
                  <span className="text-[10px] text-[#3F3F46] uppercase tracking-wider mt-1">
                    {alt.unit}
                  </span>
                </motion.div>
              );
            })}
          </div>

          <div className="mt-8 pt-6 border-t border-[#3F3F46]">
            <h3 className="text-sm font-bold uppercase tracking-tighter text-[#FAFAFA] mb-4">
              RECLAIMED BY WEEK
            </h3>
            {weeklyData.length > 0 ? (
              <div style={{ height: typeof window !== 'undefined' && window.innerWidth < 768 ? 140 : 160 }}>
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                  <BarChart data={weeklyData} barSize={28} margin={{ top: 16, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272A" vertical={false} />
                    <XAxis 
                      dataKey="weekLabel" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#A1A1AA', fontSize: 11, fontFamily: 'Space Grotesk' }} 
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#A1A1AA', fontSize: 11, fontFamily: 'Space Grotesk' }} 
                      tickFormatter={(v) => `${v}m`} 
                      width={45}
                    />
                    <Tooltip 
                      cursor={{ fill: '#27272A', opacity: 0.4 }}
                      contentStyle={{ background: '#27272A', border: '1px solid #3F3F46', borderRadius: 0, fontFamily: 'Space Grotesk', fontSize: 12, color: '#FAFAFA' }}
                      formatter={(val, name, props) => {
                        const payload = props.payload;
                        const br = payload.baseReclaimed || 0;
                        const rb = payload.relevanceBonus || 0;
                        const fp = payload.fragmentationPenalty || 0;
                        return [
                         `${Math.round(val)} MIN TOTAL\n(Base: ${br} | Bonus: +${rb} | Penalty: -${fp})`,
                         'Reclaimed'
                        ];
                      }}
                      labelStyle={{ color: '#A1A1AA', marginBottom: 4 }}
                    />
                    <Bar dataKey="reclaimedMinutes">
                      {weeklyData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.reclaimedMinutes > 0 ? '#DFE104' : '#27272A'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <div className="text-[10px] uppercase text-[#3F3F46] text-center mt-2 tracking-widest">
                  HIGHER = MORE TIME RECLAIMED THAT WEEK
                </div>
              </div>
            ) : (
              <div className="text-xs text-[#A1A1AA] py-4 uppercase">NOT ENOUGH WEEKLY DATA YET</div>
            )}
          </div>
        </>
      )}

      <div className="flex items-center justify-between gap-4 mt-8 pt-4 border-t border-[#3F3F46] flex-wrap">
        <div className="flex items-center gap-2">
          <InfinityIcon size={13} color="#3F3F46" className="flex-shrink-0" />
          <p className="text-[10px] uppercase tracking-wider text-[#3F3F46] leading-relaxed">
            CUMULATIVE SINCE YOU JOINED. ONE BAD WEEK ADDS A DATA POINT — NEVER SUBTRACTS.
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
