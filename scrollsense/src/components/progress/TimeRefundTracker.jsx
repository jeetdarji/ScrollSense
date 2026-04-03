import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  X, CheckCircle, Target, BookOpen, Moon, 
  MapPin, Coffee, Code, Play, Infinity as InfinityIcon
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, Cell, ResponsiveContainer 
} from 'recharts';

const readStorage = (key) => {
  try {
    const s = localStorage.getItem(key)
    return s ? JSON.parse(s) : null
  } catch { return null }
}

const MOCK_SESSIONS = [
  { id:'1',  durationMinutes:35, moodRating:3, platform:'instagram', timestamp: Date.now()-86400000*1 },
  { id:'2',  durationMinutes:20, moodRating:4, platform:'youtube',   timestamp: Date.now()-86400000*2 },
  { id:'3',  durationMinutes:55, moodRating:2, platform:'instagram', timestamp: Date.now()-86400000*3 },
  { id:'4',  durationMinutes:15, moodRating:5, platform:'youtube',   timestamp: Date.now()-86400000*4 },
  { id:'5',  durationMinutes:40, moodRating:3, platform:'instagram', timestamp: Date.now()-86400000*5 },
  { id:'6',  durationMinutes:25, moodRating:4, platform:'youtube',   timestamp: Date.now()-86400000*6 },
  { id:'7',  durationMinutes:60, moodRating:1, platform:'instagram', timestamp: Date.now()-86400000*7 },
  { id:'8',  durationMinutes:30, moodRating:3, platform:'instagram', timestamp: Date.now()-86400000*8 },
  { id:'9',  durationMinutes:18, moodRating:5, platform:'youtube',   timestamp: Date.now()-86400000*9 },
  { id:'10', durationMinutes:45, moodRating:2, platform:'instagram', timestamp: Date.now()-86400000*10 },
];

const MOCK_ONBOARDING = {
  dailyLimitMinutes: 90,
  goals: ['reduce_total', 'reclaim_time', 'better_mood'],
  careerPath: 'Software Development',
  interests: [{ id:'fitness', label:'Fitness', dailyMinutes:20 }],
};

const MILESTONES = [
  { hours: 1,   label: '1 HOUR',   message: 'First hour reclaimed.', sub: 'The first step is always the hardest.' },
  { hours: 2,   label: '2 HOURS',  message: '2 hours reclaimed.', sub: 'That\'s a full movie you chose not to scroll through.' },
  { hours: 5,   label: '5 HOURS',  message: '5 hours back.', sub: 'Half a working day returned to you.' },
  { hours: 10,  label: '10 HOURS', message: '10 hours reclaimed.', sub: 'Double digits. Momentum is real.' },
  { hours: 25,  label: '25 HOURS', message: '25 hours.', sub: 'Over a full day of your life, reclaimed.' },
  { hours: 50,  label: '50 HOURS', message: '50 HOURS.', sub: 'Two full working weeks. This is serious progress.' },
  { hours: 100, label: '100 HOURS',message: '100 HOURS.', sub: 'Four working weeks. You have fundamentally changed.' },
];

const toBooks = (mins) => Math.floor(mins / (30 * 7));
const toWalks = (mins) => Math.floor(mins / 30);
const toSleep = (mins) => Math.round((mins / 60) * 10) / 10;
const toTutorials = (mins) => Math.floor(mins / 20);
const toMeals = (mins) => Math.floor(mins / 20);

function getISOWeekInfo(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  
  // Also create a short label like Jan 6
  const mon = new Date(date);
  mon.setDate(mon.getDate() - (mon.getDay() === 0 ? 6 : mon.getDay() - 1));
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const label = `${monthNames[mon.getMonth()]} ${mon.getDate()}`;
  return { id: `${d.getFullYear()}-W${weekNo}`, label, time: d.getTime() };
}

export default function TimeRefundTracker() {
  const navigate = useNavigate();

  const sessions = readStorage('scrollsense_sessions') || MOCK_SESSIONS;
  const onboarding = readStorage('scrollsense_onboarding') || MOCK_ONBOARDING;
  const initialSeen = readStorage('scrollsense_progress_milestones') || [];
  const [seenMilestones, setSeenMilestones] = useState(initialSeen);

  const dailyLimit = onboarding?.dailyLimitMinutes || 90;
  const goals = onboarding?.goals || [];
  const hasSpecificGoals = goals.length > 0;

  // Process sessions by day
  const sessionsByDay = useMemo(() => {
    return sessions.reduce((acc, s) => {
      const day = new Date(s.timestamp).toDateString();
      if (!acc[day]) acc[day] = { sessions: [], total: 0, platformTotals: { youtube: 0, instagram: 0 } };
      acc[day].sessions.push(s);
      acc[day].total += s.durationMinutes;
      if (s.platform) {
        acc[day].platformTotals[s.platform] = (acc[day].platformTotals[s.platform] || 0) + s.durationMinutes;
      }
      return acc;
    }, {});
  }, [sessions]);

  // Compute reclaimed data
  const { totalReclaimedMinutes, ytReclaimedHours, igReclaimedHours } = useMemo(() => {
    let totalMin = 0;
    let ytMins = 0;
    let igMins = 0;

    Object.entries(sessionsByDay).forEach(([day, data]) => {
      const reclaimed = Math.max(0, dailyLimit - data.total);
      if (reclaimed > 0) {
        totalMin += reclaimed;
        const dominant = data.platformTotals.instagram > data.platformTotals.youtube ? 'instagram' : 'youtube';
        if (dominant === 'instagram') igMins += reclaimed;
        else ytMins += reclaimed;
      }
    });

    return {
      totalReclaimedMinutes: totalMin,
      ytReclaimedHours: ytMins / 60,
      igReclaimedHours: igMins / 60
    };
  }, [sessionsByDay, dailyLimit]);

  const totalReclaimedHours = totalReclaimedMinutes / 60;

  const nextMilestone = MILESTONES.find(m => totalReclaimedHours >= m.hours && !seenMilestones.includes(m.hours)) || null;
  const [showMilestone, setShowMilestone] = useState(nextMilestone !== null);

  const handleDismissMilestone = () => {
    if (nextMilestone) {
      const newSeen = [...seenMilestones, nextMilestone.hours];
      setSeenMilestones(newSeen);
      localStorage.setItem('scrollsense_progress_milestones', JSON.stringify(newSeen));
    }
    setShowMilestone(false);
  };

  const getAlternatives = (totalMins) => {
    const specific = [];
    const universal = [
      { icon: BookOpen, label: 'BOOKS READ', value: toBooks(totalMins), sub: 'at 30 min/day' },
      { icon: Moon, label: 'HOURS OF SLEEP', value: toSleep(totalMins).toFixed(1), sub: 'returned to rest' },
      { icon: MapPin, label: '30-MIN WALKS', value: toWalks(totalMins), sub: 'you could have taken' },
      { icon: Coffee, label: 'SCREEN-FREE MEALS', value: toMeals(totalMins), sub: 'present and undistracted' },
    ];
    
    if (goals.includes('career_content') || goals.includes('understand_patterns')) {
      specific.push({
        icon: Code, label: 'SKILL-BUILDING HOURS',
        value: Math.round((totalMins/60)*10)/10,
        sub: `in ${onboarding?.careerPath || 'your focus area'}`
      });
      specific.push({
        icon: Play, label: 'TUTORIALS WATCHED',
        value: toTutorials(totalMins),
        sub: '20-min tutorials'
      });
    }
    if (goals.includes('better_mood')) {
      specific.push({
        icon: Moon, label: 'HOURS OF BETTER SLEEP',
        value: toSleep(totalMins).toFixed(1),
        sub: 'not scrolling in bed'
      });
    }
    if (goals.includes('reclaim_time') || goals.includes('reduce_total')) {
      specific.push({
        icon: BookOpen, label: 'BOOKS YOU COULD FINISH',
        value: toBooks(totalMins),
        sub: 'at 30 min/day'
      });
    }
    
    // Always show at least 4 items by merging and picking unique labels
    const combined = [...specific, ...universal];
    const unique = combined.filter((v,i,a) => a.findIndex(t => t.label === v.label) === i);
    return unique.slice(0, 4);
  };

  // Build weekly bar chart data
  const weeklyReclaimedData = useMemo(() => {
    const weeks = {};
    Object.entries(sessionsByDay).forEach(([dayStr, data]) => {
      const reclaimed = Math.max(0, dailyLimit - data.total);
      const weekInfo = getISOWeekInfo(new Date(dayStr));
      if (!weeks[weekInfo.id]) {
        weeks[weekInfo.id] = { weekId: weekInfo.id, weekLabel: weekInfo.label, reclaimed: 0, time: weekInfo.time };
      }
      weeks[weekInfo.id].reclaimed += reclaimed;
    });
    
    const sortedWeeks = Object.values(weeks).sort((a,b) => a.time - b.time).slice(-8); // Last 8 weeks
    return sortedWeeks;
  }, [sessionsByDay, dailyLimit]);

  const [displayCount, setDisplayCount] = useState(0);
  useEffect(() => {
    const duration = 1500;
    const steps = 30;
    const interval = duration / steps;
    const target = totalReclaimedHours < 1 ? totalReclaimedMinutes : totalReclaimedHours;
    let step = 0;
    
    if (target === 0) return;
    
    const timer = setInterval(() => {
      step++;
      const progress = step / steps;
      setDisplayCount(target * (1 - Math.pow(1 - progress, 3))); // Ease out
      if (step >= steps) {
        setDisplayCount(target);
        clearInterval(timer);
      }
    }, interval);
    return () => clearInterval(timer);
  }, [totalReclaimedHours, totalReclaimedMinutes]);

  const currentMilestone = [...MILESTONES].reverse().find(m => totalReclaimedHours >= m.hours);
  const upcomingMilestone = MILESTONES.find(m => totalReclaimedHours < m.hours);
  const progressToNext = upcomingMilestone ? (currentMilestone 
    ? ((totalReclaimedHours - currentMilestone.hours) / (upcomingMilestone.hours - currentMilestone.hours)) * 100
    : (totalReclaimedHours / upcomingMilestone.hours) * 100) : 100;
    
  const hoursToGo = upcomingMilestone ? upcomingMilestone.hours - totalReclaimedHours : 0;
  
  const sortedSessions = useMemo(() => [...sessions].sort((a,b) => a.timestamp - b.timestamp), [sessions]);
  const firstSessionTime = sortedSessions.length > 0 ? getISOWeekInfo(sortedSessions[0].timestamp).label : null;

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
        {showMilestone && nextMilestone && (
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
              {nextMilestone.label}
            </div>
            <div className="relative z-10">
              <p className="text-xs uppercase tracking-widest text-black/60 mb-1">
                MILESTONE REACHED
              </p>
              <h3 className="text-2xl md:text-3xl font-bold uppercase tracking-tighter text-black leading-[0.9]">
                {nextMilestone.message}
              </h3>
              <p className="text-sm text-black/70 mt-2 leading-relaxed max-w-md">
                {nextMilestone.sub}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <div className="flex items-end">
            <span style={{ fontSize: 'clamp(4rem, 10vw, 8rem)' }} className="font-bold uppercase tracking-tighter leading-none text-[#DFE104]">
              {totalReclaimedHours < 1 ? Math.round(displayCount) : displayCount.toFixed(1)}
            </span>
            {totalReclaimedHours >= 1 ? (
              <span className="text-2xl font-bold text-[#A1A1AA] ml-2 mb-3 tracking-tighter">HRS</span>
            ) : (
              <span className="text-2xl font-bold text-[#A1A1AA] ml-2 mb-3 tracking-tighter">MIN</span>
            )}
          </div>
          <div className="mt-3">
            <p className="text-xs uppercase tracking-widest text-[#A1A1AA]">
              HOURS RECLAIMED SINCE YOU STARTED
            </p>
            {firstSessionTime && (
              <p className="text-[10px] uppercase text-[#3F3F46] mt-1">
                TRACKING SINCE {firstSessionTime}
              </p>
            )}
          </div>

          <div className="mt-4 pt-4 border-t border-[#3F3F46] space-y-2">
            <div className="flex justify-between items-center text-xs uppercase text-[#A1A1AA]">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-[#DFE104]"></div>
                YOUTUBE
              </div>
              <span>{ytReclaimedHours.toFixed(1)} HRS</span>
            </div>
            {sessions.some(s => s.platform === 'instagram') ? (
              <div className="flex justify-between items-center text-xs uppercase text-[#A1A1AA]">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-[#FAFAFA]/40"></div>
                  INSTAGRAM
                </div>
                <span>{igReclaimedHours.toFixed(1)} HRS</span>
              </div>
            ) : (
             <p className="text-[10px] uppercase text-[#3F3F46] mt-1 italic">
                UPLOAD INSTAGRAM FOR FULL PICTURE
              </p>
            )}
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
                  style={{ width: `${Math.min(progressToNext, 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] uppercase text-[#3F3F46]">
                <span>{totalReclaimedHours.toFixed(1)} HRS</span>
                <span>{upcomingMilestone.hours} HRS</span>
              </div>
              <p className="mt-2 text-sm font-bold uppercase text-[#A1A1AA] tracking-tighter">
                {(hoursToGo).toFixed(1)} HRS TO GO
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
            START LOGGING SESSIONS TO SEE YOUR TIME RECLAIM
          </h3>
          <p className="text-xs text-[#A1A1AA] mt-2 max-w-xs mx-auto leading-relaxed">
            Every session you log under your {dailyLimit}-minute daily limit adds to your total.
          </p>
        </div>
      ) : (
        <>
          <div className="flex justify-between items-center mt-12 pt-6 border-t border-[#3F3F46] mb-4">
            <h3 className="text-sm font-bold uppercase tracking-tighter text-[#FAFAFA]">
              WHAT THAT TIME COULD BECOME
            </h3>
            {!hasSpecificGoals && (
              <span 
                className="text-[10px] uppercase tracking-widest text-[#DFE104] cursor-pointer hover:underline"
                onClick={() => navigate('/onboarding')}
              >
                UPDATE YOUR GOALS →
              </span>
            )}
          </div>

          {!hasSpecificGoals && (
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
            {getAlternatives(totalReclaimedMinutes).map((alt, i) => {
              const IconComp = alt.icon;
              return (
                <motion.div 
                  key={i}
                  whileTap={{ scale: 0.97 }}
                  className="border-2 border-[#3F3F46] p-4 md:p-5 flex flex-col hover:border-[#DFE104]/40 hover:bg-[#27272A]/30 transition-all cursor-default"
                >
                  <IconComp size={20} color="#DFE104" className="mb-3" />
                  <span style={{ fontSize: 'clamp(1.8rem, 4vw, 3rem)' }} className="font-bold uppercase tracking-tighter leading-none text-[#FAFAFA]">
                    {alt.value}
                  </span>
                  <span className="text-xs font-bold uppercase tracking-tighter text-[#A1A1AA] mt-2">
                    {alt.label}
                  </span>
                  <span className="text-[10px] text-[#3F3F46] uppercase tracking-wider mt-1">
                    {alt.sub}
                  </span>
                </motion.div>
              );
            })}
          </div>

          <div className="mt-8 pt-6 border-t border-[#3F3F46]">
            <h3 className="text-sm font-bold uppercase tracking-tighter text-[#FAFAFA] mb-4">
              RECLAIMED BY WEEK
            </h3>
            {weeklyReclaimedData.length > 0 ? (
              <div style={{ height: typeof window !== 'undefined' && window.innerWidth < 768 ? 140 : 160 }}>
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                  <BarChart data={weeklyReclaimedData} barSize={28} margin={{ top: 16, right: 8, left: -20, bottom: 0 }}>
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
                      cursor={{fill: '#27272A', opacity: 0.4}}
                      contentStyle={{ background: '#27272A', border: '1px solid #3F3F46', borderRadius: 0, fontFamily: 'Space Grotesk', fontSize: 12, color: '#FAFAFA' }}
                      formatter={(val) => [`${Math.round(val)} MIN RECLAIMED`, 'Time']}
                      labelStyle={{ color: '#A1A1AA', marginBottom: 4 }}
                    />
                    <Bar dataKey="reclaimed">
                      {weeklyReclaimedData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.reclaimed > 0 ? '#DFE104' : '#27272A'} />
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

      <div className="flex items-center gap-2 mt-8 pt-4 border-t border-[#3F3F46]">
        <InfinityIcon size={13} color="#3F3F46" className="flex-shrink-0" />
        <p className="text-[10px] uppercase tracking-wider text-[#3F3F46] leading-relaxed">
          THIS TOTAL NEVER RESETS — BAD WEEKS ADD ONE DATA POINT, THEY DON'T ERASE WHAT YOU'VE BUILT.
        </p>
      </div>
    </motion.div>
  );
}
