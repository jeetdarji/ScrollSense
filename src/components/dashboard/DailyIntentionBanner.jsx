import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDashboardStore } from '../../store/dashboardStore';
import { Meh, Zap, Search, Play, BookOpen, CheckCircle, X, Lock } from 'lucide-react';
import axios from 'axios';

const INTENTIONS = [
  { id: 'boredom', icon: Meh, label: 'BOREDOM' },
  { id: 'stress', icon: Zap, label: 'STRESS / ESCAPE' },
  { id: 'specific', icon: Search, label: 'LOOKING FOR SOMETHING' },
  { id: 'entertainment', icon: Play, label: 'PLANNED ENTERTAINMENT' },
  { id: 'learning', icon: BookOpen, label: 'WANT TO LEARN' },
];

export const DailyIntentionBanner = () => {
  const { todayIntention, setTodayIntention, dismissIntentionBanner, clearIntentionIfStale } = useDashboardStore();

  useEffect(() => {
    clearIntentionIfStale();
  }, [clearIntentionIfStale]);

  const handleSelect = async (optionId) => {
    setTodayIntention(optionId);
    
    // Save to local storage for frontend stats
    try {
      const stored = JSON.parse(localStorage.getItem('scrollsense_intentions') || '[]');
      stored.push({
        id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
        intentionCategory: optionId,
        timestamp: new Date().toISOString(),
        type: 'daily'
      });
      localStorage.setItem('scrollsense_intentions', JSON.stringify(stored));
    } catch (e) {
      console.error("Local storage fail", e);
    }
    
    // Fire API non-blocking
    axios.post('/api/sessions/intention', { intentionCategory: optionId, type: 'daily' }).catch(() => {});
  };

  if (todayIntention.dismissed) {
    return null; // STATE C - HIDDEN
  }

  return (
    <AnimatePresence mode="wait">
      {todayIntention.value === '' ? (
        // STATE A - QUESTION
        <motion.div
          key="question"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="w-full bg-[#27272A] border-2 border-[#3F3F46] p-5 md:p-6 mb-6 rounded-none"
        >
          <div className="flex justify-between items-start mb-5">
            <div className="flex flex-col">
              <span className="text-xs uppercase tracking-widest text-[#DFE104] mb-1">
                DAILY CHECK-IN
              </span>
              <span className="text-lg md:text-xl font-bold uppercase tracking-tighter text-[#FAFAFA] leading-[0.9]">
                WHAT'S YOUR INTENTION FOR SOCIAL MEDIA TODAY?
              </span>
            </div>
            <span className="text-[10px] uppercase tracking-widest text-[#3F3F46]">
              ONCE A DAY
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            {INTENTIONS.map(({ id, icon: Icon, label }) => (
              <motion.button
                key={id}
                whileTap={{ scale: 0.97 }}
                onClick={() => handleSelect(id)}
                className="border-2 border-[#3F3F46] hover:border-[#FAFAFA]/30 px-4 py-2.5 flex items-center gap-2 cursor-pointer transition-all duration-200 rounded-none text-sm font-bold uppercase tracking-tighter text-[#A1A1AA] hover:text-[#FAFAFA] bg-transparent"
              >
                <Icon size={16} />
                {label}
              </motion.button>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-[#3F3F46] flex items-center gap-2">
            <Lock size={11} className="text-[#3F3F46]" />
            <span className="text-[10px] uppercase tracking-widest text-[#3F3F46]">
              THIS STAYS PRIVATE — USED ONLY FOR YOUR PATTERN ANALYSIS
            </span>
          </div>
        </motion.div>
      ) : (
        // STATE B - CONFIRMED
        <motion.div
          key="confirmed"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0, overflow: 'hidden' }}
          transition={{ duration: 0.25 }}
          className="flex items-center justify-between bg-[#27272A]/50 border border-[#3F3F46]/50 px-4 py-3 mb-6 rounded-none"
        >
          <div className="flex items-center gap-3">
            <CheckCircle size={14} className="text-[#DFE104] shrink-0" />
            <span className="text-xs uppercase tracking-widest text-[#A1A1AA] mr-2 hidden sm:inline-block">
              TODAY'S INTENTION:
            </span>
            <div className="bg-[#27272A] border border-[#DFE104]/30 px-3 py-1 text-xs font-bold uppercase tracking-tighter text-[#DFE104] rounded-none">
              {INTENTIONS.find(i => i.id === todayIntention.value)?.label || todayIntention.value}
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => useDashboardStore.getState().resetTodayIntention()}
              className="text-[10px] uppercase tracking-widest text-[#3F3F46] hover:text-[#A1A1AA] cursor-pointer bg-transparent border-none appearance-none p-0"
            >
              CHANGE
            </button>
            <button
              onClick={dismissIntentionBanner}
              className="p-1 cursor-pointer bg-transparent border-none appearance-none flex items-center justify-center text-[#3F3F46] hover:text-[#A1A1AA]"
              title="Dismiss"
            >
              <X size={14} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
