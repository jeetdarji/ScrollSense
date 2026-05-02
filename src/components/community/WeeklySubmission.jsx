import React, { useState } from 'react';
import { BarChart2, EyeOff, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';

export default function WeeklySubmission({
  currentWeek,
  membership,
  onSubmitWeek,
  isSubmitting = false,
}) {
  const [submitError, setSubmitError] = useState(null);
  const [justSubmitted, setJustSubmitted] = useState(false);

  if (!currentWeek || !membership) return null;

  const {
    isoWeek,
    hasSubmitted,
    pendingDelta,
    sessionsThisWeek,
    sessionsRequired,
    canSubmit,
  } = currentWeek;

  const anonymousName = membership.anonymousName;

  // Determine display state
  let displayState = 'no_data';
  if (hasSubmitted || justSubmitted) {
    displayState = 'submitted';
  } else if (canSubmit && pendingDelta !== null) {
    displayState = 'pending';
  }

  // Delta display values (negative = improvement)
  const isImprovement = pendingDelta !== null && pendingDelta < 0;
  const isWorse = pendingDelta !== null && pendingDelta > 0;
  const absMinutes = Math.abs(pendingDelta || 0);

  const handleSubmit = async () => {
    setSubmitError(null);
    try {
      await onSubmitWeek();
      setJustSubmitted(true);
    } catch (err) {
      const msg = err?.response?.data?.error || 'Failed to submit. Try again.';
      setSubmitError(msg);
    }
  };

  // Find the user's submission in the list for the 'submitted' state
  const userSubmission = currentWeek.submissions?.find(s => s.isYou);

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

      {/* State: Not enough sessions */}
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

          {pendingDelta === null && (
            <p className="text-xs text-[#3F3F46] mt-3">
              Go log sessions from the dashboard.
            </p>
          )}

          {pendingDelta !== null && sessionsThisWeek < sessionsRequired && (
            <p className="text-xs text-[#A1A1AA] mt-3">
              We have your delta ready ({pendingDelta < 0 ? `${pendingDelta}` : `+${pendingDelta}`} min) — just need {sessionsRequired - sessionsThisWeek} more session{sessionsRequired - sessionsThisWeek > 1 ? 's' : ''}.
            </p>
          )}
        </div>
      )}

      {/* State: Ready to submit */}
      {displayState === 'pending' && (
        <div className="py-6 text-center">
          <p className="text-xs uppercase tracking-widest text-[#A1A1AA] mb-4">
            YOUR NUMBER THIS WEEK IS
          </p>

          <div className="mb-4">
            {isImprovement && (
              <>
                <h1
                  style={{ fontSize: 'clamp(3rem, 8vw, 6rem)' }}
                  className="font-bold uppercase tracking-tighter leading-none text-[#DFE104]"
                >
                  {pendingDelta} MIN
                </h1>
                <p className="text-xs uppercase tracking-widest text-[#DFE104] mt-3">
                  LESS SCROLLING THAN LAST WEEK
                </p>
              </>
            )}
            {isWorse && (
              <>
                <h1
                  style={{ fontSize: 'clamp(3rem, 8vw, 6rem)' }}
                  className="font-bold uppercase tracking-tighter leading-none text-[#A1A1AA]"
                >
                  +{absMinutes} MIN
                </h1>
                <p className="text-xs uppercase tracking-widest text-[#A1A1AA] mt-3">
                  MORE THAN LAST WEEK
                </p>
              </>
            )}
            {pendingDelta === 0 && (
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
              YOUR GROUP WILL SEE: '{anonymousName}' — {pendingDelta < 0 ? `${Math.abs(pendingDelta)} MIN LESS` : pendingDelta > 0 ? `${pendingDelta} MIN MORE` : 'NO CHANGE'}
            </p>
          </div>

          {submitError && (
            <div className="mb-4 p-3 border border-red-900/30 bg-red-900/5 text-center">
              <p className="text-xs text-red-400 uppercase tracking-wider">{submitError}</p>
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full bg-[#DFE104] text-black font-bold h-14 uppercase tracking-tighter text-sm rounded-none hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100"
          >
            {isSubmitting ? 'SUBMITTING...' : 'SHARE WITH GROUP — ANONYMOUSLY'}
          </button>
        </div>
      )}

      {/* State: Already submitted */}
      {displayState === 'submitted' && (
        <div className="py-8 text-center">
          <CheckCircle size={24} color="#DFE104" className="mx-auto mb-4" />
          <h3 className="text-base font-bold uppercase tracking-tighter text-[#FAFAFA] mb-2">
            THIS WEEK'S NUMBER SHARED
          </h3>
          {userSubmission && (
            <p className="text-sm text-[#A1A1AA]">
              {anonymousName} shared: {userSubmission.deltaMinutes < 0 ? `${userSubmission.deltaMinutes} MIN` : `+${userSubmission.deltaMinutes} MIN`}
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
