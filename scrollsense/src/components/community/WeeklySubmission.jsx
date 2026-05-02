import React from 'react';
import { BarChart2, EyeOff, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { useCommunityData } from '../../hooks/useCommunityData';

export default function WeeklySubmission({ data }) {
  const { currentWeek, group, membership } = data || {};
  const { submitWeek } = useCommunityData();

  if (!currentWeek || !group || !membership) return null;

  const {
    isoWeek,
    hasSubmitted,
    pendingDelta,
    sessionsThisWeek,
    sessionsRequired,
    canSubmit,
    submissions
  } = currentWeek;

  // Find the user's own submission (if submitted)
  const weeklySub = hasSubmitted
    ? (submissions || []).find(s => s.isYou)
    : null;

  const formatDate = (isoString) => {
    if (!isoString) return 'RECENTLY';
    const d = new Date(isoString);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase();
  };

  const handleSubmit = async () => {
    try {
      await submitWeek();
    } catch (e) {
      console.error(e);
      alert('Failed to submit weekly stats.');
    }
  };

  const displayState = hasSubmitted ? 'submitted' : (canSubmit ? 'pending' : 'no_data');
  const improvement = pendingDelta !== null ? pendingDelta : 0;
  const isBaseline = pendingDelta === null;

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
            WEEK {isoWeek}
          </p>
        </div>
      </div>

      {displayState === 'no_data' && (
        <div className="py-8 text-center">
          <BarChart2 size={20} color="#3F3F46" className="mx-auto mb-3" />
          <h3 className="text-sm font-bold uppercase tracking-tighter text-[#FAFAFA] mb-2">
            LOG {sessionsRequired} SESSIONS TO SUBMIT THIS WEEK
          </h3>
          
          <div className="max-w-xs mx-auto mt-4">
            <div className="w-full h-[4px] bg-[#27272A]">
              <div 
                className="h-[4px] bg-[#DFE104] transition-all duration-700"
                style={{ width: `${Math.min((sessionsThisWeek / sessionsRequired) * 100, 100)}%` }}
              ></div>
            </div>
            <p className="text-xs uppercase tracking-widest text-[#3F3F46] mt-2">
              {sessionsThisWeek} / {sessionsRequired} SESSIONS
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
            {isBaseline ? 'YOUR BASELINE WEEK' : 'YOUR NUMBER THIS WEEK IS'}
          </p>

          <div className="mb-4">
            {isBaseline && (
              <>
                <h1 
                  style={{ fontSize: 'clamp(3rem, 8vw, 6rem)' }} 
                  className="font-bold uppercase tracking-tighter leading-none text-[#A1A1AA]"
                >
                  BASELINE
                </h1>
                <p className="text-xs uppercase tracking-widest text-[#A1A1AA] mt-3">
                  THIS WILL SET YOUR STARTING POINT
                </p>
              </>
            )}
            {!isBaseline && improvement < 0 && (
              <>
                <h1 
                  style={{ fontSize: 'clamp(3rem, 8vw, 6rem)' }} 
                  className="font-bold uppercase tracking-tighter leading-none text-[#DFE104]"
                >
                  {improvement} MIN
                </h1>
                <p className="text-xs uppercase tracking-widest text-[#DFE104] mt-3">
                  LESS SCROLLING THAN LAST WEEK
                </p>
              </>
            )}
            {!isBaseline && improvement > 0 && (
              <>
                <h1 
                  style={{ fontSize: 'clamp(3rem, 8vw, 6rem)' }} 
                  className="font-bold uppercase tracking-tighter leading-none text-[#A1A1AA]"
                >
                  +{improvement} MIN
                </h1>
                <p className="text-xs uppercase tracking-widest text-[#A1A1AA] mt-3">
                  MORE THAN LAST WEEK
                </p>
              </>
            )}
            {!isBaseline && improvement === 0 && (
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

          <div className="mt-4 mb-6 flex items-center justify-center gap-2">
            <EyeOff size={11} color="#3F3F46" />
            <p className="text-[10px] uppercase tracking-wider text-[#3F3F46]">
              YOUR GROUP WILL SEE: '{membership.anonymousName}' — {isBaseline ? 'BASELINE' : (improvement < 0 ? `${Math.abs(improvement)} MIN LESS` : `${improvement} MIN MORE`)}
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

      {displayState === 'submitted' && (
        <div className="py-8 text-center">
          <CheckCircle size={24} color="#DFE104" className="mx-auto mb-4" />
          <h3 className="text-base font-bold uppercase tracking-tighter text-[#FAFAFA] mb-2">
            THIS WEEK'S NUMBER SHARED
          </h3>
          {weeklySub ? (
            <p className="text-sm text-[#A1A1AA]">
              {membership.anonymousName} shared: {weeklySub.deltaMinutes < 0 ? `${weeklySub.deltaMinutes} MIN` : `+${weeklySub.deltaMinutes} MIN`}
            </p>
          ) : (
            <p className="text-sm text-[#A1A1AA]">
              Your number has been shared with the group.
            </p>
          )}
          <p className="text-xs uppercase tracking-widest text-[#3F3F46] mt-4">
            NEXT SUBMISSION OPENS MONDAY
          </p>
        </div>
      )}
    </motion.div>
  );
}
