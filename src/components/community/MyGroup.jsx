import React, { useState } from 'react';
import { Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function MyGroup({
  group,
  membership,
  onLeaveGroup,
  onRequestNewGroup,
  isLeaving = false,
  isRequestingNewGroup = false,
}) {
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [leaveError, setLeaveError] = useState(null);

  const handleLeave = async () => {
    setLeaveError(null);
    try {
      await onLeaveGroup();
    } catch (err) {
      setLeaveError(err?.response?.data?.error || 'Failed to leave group. Try again.');
    }
  };

  const handleRequestNew = async () => {
    setLeaveError(null);
    try {
      await onRequestNewGroup();
    } catch (err) {
      setLeaveError(err?.response?.data?.error || 'Failed to request new group. Try again.');
    }
  };

  const formatDate = (isoString) => {
    if (!isoString) return 'UNKNOWN';
    const d = new Date(isoString);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase();
  };

  if (!group || !membership) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      viewport={{ once: true }}
      className="border-2 border-[#3F3F46] p-6 md:p-8 mb-6 bg-[#09090B]"
    >
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div className="flex-1">
          <p className="text-xs uppercase tracking-widest text-[#DFE104] mb-1">
            YOUR GROUP
          </p>
          <h1 className="text-2xl md:text-3xl font-bold uppercase tracking-tighter text-[#FAFAFA] leading-[0.9]">
            {group.name}
          </h1>
          <div className="mt-2 border border-[#3F3F46] px-3 py-1 inline-flex items-center gap-2">
            <Calendar size={11} color="#A1A1AA" />
            <span className="text-[10px] uppercase tracking-widest text-[#A1A1AA]">
              WEEK {membership.weekOfMembership} OF MEMBERSHIP
            </span>
          </div>
        </div>

        <div className="border-2 border-[#DFE104]/30 bg-[#DFE104]/5 p-4 text-center w-full md:w-auto min-w-[140px]">
          <p className="text-[10px] uppercase tracking-widest text-[#A1A1AA] mb-1">
            YOU ARE
          </p>
          <p className="text-lg font-bold uppercase tracking-tighter text-[#DFE104] whitespace-nowrap">
            {membership.anonymousName}
          </p>
          <p className="text-[10px] uppercase text-[#3F3F46] mt-1">
            IN THIS GROUP
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-[#3F3F46]">
        <div>
          <p className="text-[10px] uppercase text-[#A1A1AA] mb-1">MEMBERS</p>
          <p className="text-xl font-bold uppercase text-[#FAFAFA]">{group.memberCount}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase text-[#A1A1AA] mb-1">GROUP TYPE</p>
          <p className="text-sm font-bold uppercase tracking-tighter text-[#FAFAFA]">
            OPEN GROUP
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase text-[#A1A1AA] mb-1">JOINED</p>
          <p className="text-xl font-bold uppercase text-[#FAFAFA]">
            {formatDate(membership.joinedAt)}
          </p>
        </div>
      </div>

      <p className="mt-4 text-sm text-[#A1A1AA] leading-relaxed">
        {group.description}
      </p>

      <div className="mt-6 pt-4 border-t border-[#3F3F46] flex items-center justify-between flex-wrap gap-4">
        <p className="text-xs uppercase tracking-widest text-[#3F3F46]">
          NOT THE RIGHT GROUP?
        </p>
        <div className="flex gap-3 flex-wrap">
          <button
            onClick={handleRequestNew}
            disabled={isRequestingNewGroup}
            className="border border-[#3F3F46] px-4 py-2 text-xs uppercase tracking-tighter text-[#A1A1AA] hover:border-[#FAFAFA]/30 hover:text-[#FAFAFA] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isRequestingNewGroup ? 'FINDING GROUP...' : 'REQUEST NEW GROUP'}
          </button>
          <button
            onClick={() => setShowLeaveConfirm(true)}
            className="border border-[#3F3F46] px-4 py-2 text-xs uppercase tracking-tighter text-[#3F3F46] hover:border-red-900/50 hover:text-red-400 transition-all"
          >
            LEAVE GROUP
          </button>
        </div>
      </div>

      {leaveError && (
        <div className="mt-3 p-3 border border-red-900/30 bg-red-900/5">
          <p className="text-xs text-red-400 uppercase tracking-wider">{leaveError}</p>
        </div>
      )}

      <AnimatePresence>
        {showLeaveConfirm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-[#27272A]/40 border border-[#3F3F46] p-4 mt-4">
              <h3 className="text-sm font-bold uppercase tracking-tighter text-[#FAFAFA] mb-2">
                ARE YOU SURE?
              </h3>
              <p className="text-xs text-[#A1A1AA] leading-relaxed mb-4">
                Your anonymous name '{membership.anonymousName}' will be retired.
                Your past weekly numbers remain in the group's history.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleLeave}
                  disabled={isLeaving}
                  className="border-2 border-red-900/50 text-red-400 px-4 py-2 text-xs uppercase tracking-tighter hover:bg-red-900/20 transition-all disabled:opacity-50"
                >
                  {isLeaving ? 'LEAVING...' : 'LEAVE GROUP'}
                </button>
                <button
                  onClick={() => setShowLeaveConfirm(false)}
                  className="text-xs uppercase text-[#3F3F46] hover:text-[#A1A1AA] cursor-pointer px-4 py-2 transition-colors"
                >
                  CANCEL
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
