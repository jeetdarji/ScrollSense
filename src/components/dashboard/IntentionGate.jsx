import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Meh, Zap, Search, Play, BookOpen, ChevronRight, CheckCircle } from 'lucide-react';
import { useLocalStorage } from '../../hooks/useLocalStorage';

const INTENTIONS = [
  { id: 'boredom', icon: Meh, title: 'BOREDOM', desc: 'Nothing to do, opening out of habit' },
  { id: 'stress', icon: Zap, title: 'STRESS OR ESCAPE', desc: 'Using scroll to avoid something' },
  { id: 'specific', icon: Search, title: 'LOOKING FOR SOMETHING', desc: 'I have a specific video or topic in mind' },
  { id: 'entertainment', icon: Play, title: 'PLANNED ENTERTAINMENT', desc: 'I intentionally set aside time for this' },
  { id: 'learning', icon: BookOpen, title: 'WANT TO LEARN', desc: 'Looking for educational or skill content' }
];

export default function IntentionGate() {
  const [state, setState] = useState('idle'); // 'idle', 'selecting', 'logged'
  const [selectedIntention, setSelectedIntention] = useState(null);
  const [countdown, setCountdown] = useState(8);
  const [history, setHistory] = useLocalStorage('scrollsense_intentions', []);

  // Filter history for this week to compute stats
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thisWeekHistory = history.filter(h => new Date(h.timestamp) >= oneWeekAgo);

  const stats = React.useMemo(() => {
    if (thisWeekHistory.length === 0) return null;
    const counts = {};
    thisWeekHistory.forEach(h => {
      counts[h.intentionCategory] = (counts[h.intentionCategory] || 0) + 1;
    });
    let mostCommon = '';
    let maxCount = 0;
    for (const [key, val] of Object.entries(counts)) {
      if (val > maxCount) {
        maxCount = val;
        mostCommon = key;
      }
    }
    const intentionObj = INTENTIONS.find(i => i.id === mostCommon);
    return {
      mostCommonTitle: intentionObj ? intentionObj.title : mostCommon,
      totalCount: thisWeekHistory.length
    };
  }, [thisWeekHistory]);

  const handleSelect = (id) => {
    const newEntry = {
      id: Date.now().toString(),
      intentionCategory: id,
      timestamp: new Date().toISOString()
    };
    setHistory([...history, newEntry]);
    setSelectedIntention(INTENTIONS.find(i => i.id === id));
    setState('logged');
    setCountdown(8);
    // Fire and forget APi simulation here if needed
  };

  useEffect(() => {
    let timer;
    if (state === 'logged' && countdown > 0) {
      timer = setTimeout(() => setCountdown(c => c - 1), 1000);
    } else if (state === 'logged' && countdown === 0) {
      setState('idle');
      setSelectedIntention(null);
    }
    return () => clearTimeout(timer);
  }, [state, countdown]);

  const getInsightText = (id) => {
    switch (id) {
      case 'boredom': return "Heads up — boredom sessions typically run 2.3× longer. Your session timer is active.";
      case 'stress': return "Stress scrolling often doesn't reduce stress. Consider setting a 15-minute limit.";
      case 'specific': return "Great — you know what you're looking for. Set a timer so you stay on track.";
      case 'entertainment': return "Enjoy it — this is intentional time well spent.";
      case 'learning': return "Learning mode. Your session will be marked as career-relevant.";
      default: return "";
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      viewport={{ once: true }}
      className="border-2 border-[#3F3F46] bg-[#09090B] p-4 md:p-8 h-full flex flex-col"
    >
      <div className="flex justify-between items-start mb-6">
        <div>
          <div className="text-xs uppercase tracking-widest text-[#DFE104] mb-1">INTENTION GATE</div>
          <h2 className="text-xl md:text-2xl font-bold uppercase tracking-tighter text-[#FAFAFA] leading-[0.9]">
            WHY ARE YOU OPENING THE APP?
          </h2>
        </div>
        <div className="border border-[#3F3F46] px-2 py-0.5 text-xs uppercase tracking-widest text-[#3F3F46]">
          F2
        </div>
      </div>

      <div className="flex-1 flex flex-col justify-center">
        <AnimatePresence mode="wait">
          {state === 'idle' && (
            <motion.div
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="text-center py-8"
            >
              <div className="text-[6rem] font-bold text-[#27272A] leading-none mb-4 select-none" aria-hidden="true">?</div>
              <p className="text-base text-[#A1A1AA] mb-2 font-medium">Starting a scroll session?</p>
              <p className="text-sm text-[#3F3F46] mb-8 font-medium">Log your intention before you open YouTube or Instagram.</p>
              
              <button 
                onClick={() => setState('selecting')}
                className="w-full bg-[#DFE104] text-black font-bold uppercase tracking-tighter h-12 px-6 hover:scale-[1.02] active:scale-95 transition-all duration-200"
              >
                LOG INTENTION NOW
              </button>

              {stats && (
                <div className="flex gap-4 justify-center mt-8 pt-6 border-t border-[#3F3F46]">
                  <div className="text-left">
                    <div className="text-xs uppercase tracking-widest text-[#A1A1AA]">MOST COMMON</div>
                    <div className="text-lg font-bold uppercase text-[#FAFAFA] tracking-tighter">{stats.mostCommonTitle}</div>
                  </div>
                  <div className="w-[2px] bg-[#3F3F46]"></div>
                  <div className="text-left">
                    <div className="text-xs uppercase tracking-widest text-[#A1A1AA]">THIS WEEK</div>
                    <div className="text-lg font-bold uppercase text-[#DFE104] tracking-tighter">{stats.totalCount} SESSIONS</div>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {state === 'selecting' && (
            <motion.div
              key="selecting"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
            >
              <div className="text-xs uppercase tracking-widest text-[#3F3F46] mb-6">BE HONEST — THIS STAYS PRIVATE</div>
              <div className="flex flex-col gap-3">
                {INTENTIONS.map((intention) => {
                  const Icon = intention.icon;
                  return (
                    <motion.button
                      key={intention.id}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleSelect(intention.id)}
                      className="border-2 border-[#3F3F46] p-4 flex items-center gap-4 cursor-pointer hover:border-[#FAFAFA]/30 hover:bg-[#27272A]/50 transition-all duration-200 text-left"
                    >
                      <Icon size={20} className="text-[#A1A1AA] flex-shrink-0" />
                      <div className="flex-1">
                        <div className="text-sm font-bold uppercase tracking-tighter text-[#FAFAFA]">{intention.title}</div>
                        <div className="text-xs text-[#A1A1AA] mt-0.5">{intention.desc}</div>
                      </div>
                      <ChevronRight size={16} className="text-[#3F3F46] flex-shrink-0" />
                    </motion.button>
                  );
                })}
              </div>
              <div className="mt-6 text-center">
                <button 
                  onClick={() => setState('idle')}
                  className="text-xs uppercase tracking-widest text-[#3F3F46] hover:text-[#A1A1AA] transition-colors"
                >
                  CANCEL
                </button>
              </div>
            </motion.div>
          )}

          {state === 'logged' && selectedIntention && (
            <motion.div
              key="logged"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="text-center py-6 flex flex-col justify-center h-full"
            >
              <CheckCircle size={32} className="text-[#DFE104] mx-auto mb-4" />
              <div className="text-lg font-bold uppercase tracking-tighter text-[#FAFAFA] mb-1">INTENTION LOGGED</div>
              
              <div className="mt-4">
                <div className="text-xs text-[#A1A1AA] mb-2 font-medium">You're opening the app because:</div>
                <div className="text-2xl font-bold uppercase tracking-tighter text-[#DFE104]">{selectedIntention.title}</div>
              </div>

              <div className="mt-6 border-l-4 border-[#DFE104] pl-4 bg-[#27272A]/40 py-3 pr-4 text-left">
                <p className="text-xs text-[#A1A1AA] leading-relaxed font-medium">
                  {getInsightText(selectedIntention.id)}
                </p>
              </div>

              <div className="mt-8">
                <div className="text-xs text-[#3F3F46] uppercase tracking-widest mb-2 font-medium">
                  Resetting in {countdown}s
                </div>
                <div className="w-full h-[2px] bg-[#27272A] relative overflow-hidden">
                  <motion.div 
                    initial={{ width: '100%' }}
                    animate={{ width: '0%' }}
                    transition={{ duration: 8, ease: "linear" }}
                    className="absolute left-0 top-0 h-full bg-[#3F3F46]"
                  />
                </div>
              </div>

              <div className="mt-6">
                <button 
                  onClick={() => { setState('idle'); setSelectedIntention(null); }}
                  className="text-xs uppercase tracking-widest text-[#3F3F46] hover:text-[#A1A1AA] transition-colors"
                >
                  LOG ANOTHER
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
