import React, { useState, useEffect } from 'react';
import { BarChart2, EyeOff, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';

function getWeekId(date) {
  const start = new Date(date.getFullYear(), 0, 1);
  const week = Math.ceil(((date - start) / 86400000 + start.getDay() + 1) / 7);
  return `${date.getFullYear()}-W${String(week).padStart(2, '0')}`;
}

function getCurrentWeekId() {
  return getWeekId(new Date());
}

function getPreviousWeekId(currentWeekId) {
  const [yearStr, weekStr] = currentWeekId.split('-W');
  let year = parseInt(yearStr, 10);
  let week = parseInt(weekStr, 10);
  
  if (week === 1) {
    year -= 1;
    week = 52; // simplification
  } else {
    week -= 1;
  }
  return `${year}-W${String(week).padStart(2, '0')}`;
}

export default function WeeklySubmission({ group, weeklySub }) {
  const [sessions, setSessions] = useState([]);
  const [state, setState] = useState('pending'); // no_data, pending, submitted
  
  const currentWeekId = getCurrentWeekId();

  // Load actual session data
  useEffect(() => {
    try {
      const storedSessions = JSON.parse(localStorage.getItem('scrollsense_sessions') || '[]');
      setSessions(storedSessions);
    } catch (e) {
      setSessions([]);
    }
  }, []);

  useEffect(() => {
    const alreadySubmitted = weeklySub?.weekId === currentWeekId && weeklySub?.submitted === true;
    const hasEnoughData = sessions.length >= 3;
    
    // For V1 preview, we can mock sessions if there are none to show the UI
    // But since the prompt specifies real session logic:
    if (alreadySubmitted) {
      setState('submitted');
    } else if (hasEnoughData) {
      setState('pending');
    } else {
      // Temporarily use 'pending' instead of 'no_data' if user doesn't have 3 sessions,
      // actually let's stick to the prompt exactly. 
      setState('no_data');
    }
  }, [sessions, weeklySub, currentWeekId]);

  // Bypass for testing/mock mode: if sessions < 3, pretend we have some data
  const effectiveSessions = sessions.length < 3 ? [
    { timestamp: new Date().toISOString(), durationMinutes: 120 },
    { timestamp: new Date(Date.now() - 86400000).toISOString(), durationMinutes: 100 },
    { timestamp: new Date(Date.now() - 86400000 * 7).toISOString(), durationMinutes: 300 }
  ] : sessions;

  // recalculate based on prompt
  const hasEnoughData = sessions.length >= 3;
  const displayState = (weeklySub?.weekId === currentWeekId && weeklySub?.submitted === true) 
    ? 'submitted' 
    : (hasEnoughData ? 'pending' : 'no_data');

  const thisWeekSessions = effectiveSessions.filter(s => getWeekId(new Date(s.timestamp)) === currentWeekId);
  const lastWeekSessions = effectiveSessions.filter(s => getWeekId(new Date(s.timestamp)) === getPreviousWeekId(currentWeekId));

  const thisWeekTotal = thisWeekSessions.reduce((s, sess) => s + sess.durationMinutes, 0);
  const lastWeekTotal = lastWeekSessions.reduce((s, sess) => s + sess.durationMinutes, 0);
  
  const improvement = lastWeekTotal - thisWeekTotal;
  const improvPct = lastWeekTotal > 0 ? Math.round((improvement / lastWeekTotal) * 100) : 0;

  const handleSubmit = () => {
    const submission = {
      weekId: currentWeekId,
      submitted: true,
      minutesThisWeek: thisWeekTotal,
      minutesLastWeek: lastWeekTotal,
      improvementMinutes: improvement,
      improvementPct: improvPct,
      submittedAt: new Date().toISOString(),
    };
    localStorage.setItem('scrollsense_weekly_sub', JSON.stringify(submission));
    
    // force re-render by updating window location or local state
    window.location.reload();
  };

  const formatDate = (isoStr) => {
    if (!isoStr) return '';
    return new Date(isoStr).toLocaleString('en-US', {
      month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
    }).toUpperCase();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      viewport={{ once: true }}
      className="border-2 border-[#3F3F46] p-6 md:p-8 mb-6 bg-[#09090B]"
    >
      <div className="flex justify-between items-start mb-6 flex-wrap gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-[#DFE104] mb-1">
            WEEKLY SUBMISSION
          </p>
          <h2 className="text-xl md:text-2xl font-bold uppercase tracking-tighter text-[#FAFAFA] leading-[0.9]">
            SHARE YOUR NUMBER THIS WEEK
          </h2>
        </div>
        <div className="border border-[#3F3F46] px-3 py-1">
          <p className="text-xs uppercase tracking-widest text-[#3F3F46]">
            WEEK {currentWeekId}
          </p>
        </div>
      </div>

      {displayState === 'no_data' && (
        <div className="py-8 text-center">
          <BarChart2 size={20} color="#3F3F46" className="mx-auto mb-3" />
          <h3 className="text-sm font-bold uppercase tracking-tighter text-[#FAFAFA] mb-2">
            LOG 3 SESSIONS TO SUBMIT THIS WEEK
          </h3>
          
          <div className="max-w-xs mx-auto mt-4">
            <div className="w-full h-[4px] bg-[#27272A]">
              <div 
                className="h-[4px] bg-[#DFE104] transition-all duration-700"
                style={{ width: `${Math.min((sessions.length / 3) * 100, 100)}%` }}
              ></div>
            </div>
            <p className="text-xs uppercase tracking-widest text-[#3F3F46] mt-2">
              {sessions.length} / 3 SESSIONS
            </p>
          </div>
          
          <p className="text-xs text-[#3F3F46] mt-3">
            Go log sessions from the dashboard.
          </p>
        </div>
      )}

      {displayState === 'pending' && (
        <div className="py-6 text-center">
          <p className="text-xs uppercase tracking-widest text-[#A1A1AA] mb-4">
            YOUR NUMBER THIS WEEK IS
          </p>

          <div className="mb-4">
            {improvement > 0 && (
              <>
                <h1 
                  style={{ fontSize: 'clamp(3rem, 8vw, 6rem)' }} 
                  className="font-bold uppercase tracking-tighter leading-none text-[#DFE104]"
                >
                  -{improvement} MIN
                </h1>
                <p className="text-xs uppercase tracking-widest text-[#DFE104] mt-3">
                  {improvPct}% LESS SCROLLING THAN LAST WEEK
                </p>
              </>
            )}
            {improvement < 0 && (
              <>
                <h1 
                  style={{ fontSize: 'clamp(3rem, 8vw, 6rem)' }} 
                  className="font-bold uppercase tracking-tighter leading-none text-[#A1A1AA]"
                >
                  +{Math.abs(improvement)} MIN
                </h1>
                <p className="text-xs uppercase tracking-widest text-[#A1A1AA] mt-3">
                  {Math.abs(improvPct)}% MORE THAN LAST WEEK
                </p>
              </>
            )}
            {improvement === 0 && (
              <>
                <h1 
                  style={{ fontSize: 'clamp(3rem, 8vw, 6rem)' }} 
                  className="font-bold uppercase tracking-tighter leading-none text-[#3F3F46]"
                >
                  NO CHANGE
                </h1>
                <p className="text-xs uppercase tracking-widest text-[#3F3F46] mt-3">
                  SAME AS LAST WEEK
                </p>
              </>
            )}
          </div>

          <div className="flex justify-center gap-8 mt-4 flex-wrap">
            <div className="flex flex-col items-center">
              <span className="text-sm font-bold uppercase text-[#FAFAFA]">{thisWeekTotal} MIN</span>
              <span className="text-[10px] uppercase text-[#3F3F46]">THIS WEEK</span>
            </div>
            <div className="hidden sm:block h-8 w-[1px] bg-[#3F3F46]"></div>
            <div className="flex flex-col items-center">
              <span className="text-sm font-bold uppercase text-[#A1A1AA]">{lastWeekTotal} MIN</span>
              <span className="text-[10px] uppercase text-[#3F3F46]">LAST WEEK</span>
            </div>
          </div>

          <div className="mt-4 mb-6 flex items-center justify-center gap-2">
            <EyeOff size={11} color="#3F3F46" />
            <p className="text-[10px] uppercase tracking-wider text-[#3F3F46]">
              YOUR GROUP WILL SEE: '{group?.myAnonymousName || 'YOU'}' — {improvement > 0 ? `${improvement} MIN LESS` : `${Math.abs(improvement)} MIN MORE`}
            </p>
          </div>

          <button
            onClick={handleSubmit}
            className="w-full bg-[#DFE104] text-black font-bold h-14 uppercase tracking-tighter text-sm rounded-none hover:scale-105 active:scale-95 transition-all"
          >
            SHARE WITH GROUP — ANONYMOUSLY
          </button>
        </div>
      )}

      {displayState === 'submitted' && weeklySub && (
        <div className="py-8 text-center">
          <CheckCircle size={24} color="#DFE104" className="mx-auto mb-4" />
          <h3 className="text-base font-bold uppercase tracking-tighter text-[#FAFAFA] mb-2">
            THIS WEEK'S NUMBER SHARED
          </h3>
          <p className="text-sm text-[#A1A1AA]">
            {group?.myAnonymousName || 'You'} shared: {weeklySub.improvementMinutes > 0 ? `-${weeklySub.improvementMinutes} MIN` : `+${Math.abs(weeklySub.improvementMinutes)} MIN`}
          </p>
          <p className="text-[10px] uppercase text-[#3F3F46] mt-2">
            SUBMITTED {formatDate(weeklySub.submittedAt)}
          </p>
          <p className="text-xs uppercase tracking-widest text-[#3F3F46] mt-4">
            NEXT SUBMISSION OPENS MONDAY
          </p>
        </div>
      )}
    </motion.div>
  );
}
