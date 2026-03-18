import React, { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const LogSessionButton = ({ onOpen, variant }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const [todaySessionCount, setTodaySessionCount] = useState(0);

  useEffect(() => {
    if (variant === 'fab') {
      const hasVisited = localStorage.getItem('scrollsense_fab_visited');
      if (!hasVisited) {
        setShowTooltip(true);
        localStorage.setItem('scrollsense_fab_visited', 'true');
        const timer = setTimeout(() => setShowTooltip(false), 4000);
        return () => clearTimeout(timer);
      }
    } else {
      // Desktop variant
      const countSessions = () => {
        try {
          const sessions = JSON.parse(localStorage.getItem('scrollsense_sessions') || '[]');
          const today = new Date().toISOString().split('T')[0];
          const count = sessions.filter(s => s.timestamp.startsWith(today)).length;
          setTodaySessionCount(count);
        } catch (e) {
          setTodaySessionCount(0);
        }
      };
      countSessions();
      // Simple event listener in case it changes
      window.addEventListener('storage', countSessions);
      return () => window.removeEventListener('storage', countSessions);
    }
  }, [variant]);

  if (variant === 'fab') {
    return (
      <div className="fixed bottom-6 right-6 z-40 md:hidden">
        <motion.button
          onClick={onOpen}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="w-16 h-16 bg-[#DFE104] rounded-none flex items-center justify-center cursor-pointer border-2 border-[#DFE104]"
        >
          <Plus size={24} className="text-[#000000]" />
        </motion.button>
        <AnimatePresence>
          {showTooltip && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute right-[calc(100%+8px)] top-1/2 -translate-y-1/2 bg-[#27272A] border border-[#3F3F46] px-3 py-2 whitespace-nowrap text-xs uppercase tracking-widest text-[#FAFAFA] flex items-center"
            >
              LOG A SESSION
              <div className="absolute top-1/2 -right-[5px] -translate-y-1/2 w-0 h-0 border-t-[5px] border-t-transparent border-b-[5px] border-b-transparent border-l-[5px] border-l-[#3F3F46]" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // Desktop Card Variant
  return (
    <div className="hidden md:flex border-2 border-[#3F3F46] bg-[#09090B] p-6 lg:p-8 flex-col justify-between min-h-[200px]">
      <div>
        <div className="text-xs uppercase tracking-widest text-[#DFE104] mb-1">
          SESSION LOGGER
        </div>
        <h2 className="text-xl md:text-2xl font-bold uppercase tracking-tighter text-[#FAFAFA] leading-[0.9]">
          JUST FINISHED SCROLLING?
        </h2>
        <p className="text-sm text-[#A1A1AA] mt-2">
          Log it in under 15 seconds.
        </p>
      </div>
      <div className="mt-auto pt-6">
        <button
          onClick={onOpen}
          className="w-full bg-[#DFE104] text-black font-bold h-14 uppercase tracking-tighter rounded-none hover:scale-105 transition-all flex items-center justify-center gap-2 border-2 border-[#DFE104]"
        >
          <Plus size={16} />
          LOG A SESSION
        </button>
        <div className="text-xs uppercase tracking-widest text-[#3F3F46] text-center mt-4">
          {todaySessionCount} SESSIONS LOGGED TODAY
        </div>
      </div>
    </div>
  );
};
