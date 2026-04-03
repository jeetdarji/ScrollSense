import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PenLine, Timer, Play, Camera, CheckCircle, Lightbulb } from 'lucide-react';
import { useLocalStorage } from '../../hooks/useLocalStorage';

const MOODS = [
  { rating: 5, emoji: '😄', label: 'GREAT' },
  { rating: 4, emoji: '😊', label: 'GOOD' },
  { rating: 3, emoji: '😐', label: 'NEUTRAL' },
  { rating: 2, emoji: '😕', label: 'MEH' },
  { rating: 1, emoji: '😞', label: 'WORSE' }
];

export default function SessionLogger({ prefilledData, onCompletePrefill }) {
  const [state, setState] = useState('idle'); // 'idle', 'logging', 'complete'
  
  const [platform, setPlatform] = useState(null);
  const [duration, setDuration] = useState(30);
  const [mood, setMood] = useState(null);

  const [history, setHistory] = useLocalStorage('scrollsense_sessions', []);

  // Today's stats
  const todayDate = new Date().toDateString();
  const todaySessions = history.filter(h => new Date(h.timestamp).toDateString() === todayDate);
  const todayTotal = todaySessions.reduce((sum, h) => sum + (h.durationMinutes || 0), 0);

  // External trigger for timer
  useEffect(() => {
    if (prefilledData && state === 'idle') {
      setState('logging');
      setDuration(Math.max(5, prefilledData.duration || 5)); // ensure at least 5
      if (prefilledData.mood) setMood(prefilledData.mood);
      // optionally guess platform if we had intention data, but we can just leave null
      if (onCompletePrefill) onCompletePrefill();
    }
  }, [prefilledData, state, onCompletePrefill]);

  const handleLog = () => {
    if (!platform || !mood) return;

    const newEntry = {
      id: Date.now().toString(),
      durationMinutes: duration,
      moodRating: mood,
      platform,
      timestamp: new Date().toISOString()
    };

    setHistory([...history, newEntry]);
    setState('complete');
    
    setTimeout(() => {
      setState('idle');
      setPlatform(null);
      setDuration(30);
      setMood(null);
    }, 5000);
  };

  // Generate Insight
  const getInsight = () => {
    if (history.length < 7) return null;
    
    // Simple insight algorithm: find average mood for sessions > X minutes
    const long = history.filter(h => h.durationMinutes > 45);
    if (long.length >= 3) {
      const worse = long.filter(h => h.moodRating <= 2).length;
      const pct = Math.round((worse / long.length) * 100);
      if (pct > 50) {
        return `Sessions over 45 min leave you feeling worse ${pct}% of the time.`;
      }
    }
    
    return "You're consistently logging sessions. This helps surface patterns.";
  };
  const insightText = getInsight();

  // Handle manual/timer start
  const timerDataAvailable = prefilledData !== undefined && prefilledData !== null; 
  // We actually need to know if the timer stopped recently but since we just take props, 
  // we'll highlight FROM TIMER if prefilledData was passed in within last update, 
  // actually prefill is immediate, so the button acts as an alternative if we had it.
  // The design calls for checking if timer data is available. Let's assume we maintain a minimal
  // local record or just use the prefill prop.
  
  const getMoodColor = (r) => {
    if (r >= 4) return 'bg-[#DFE104]';
    if (r === 3) return 'bg-[#A1A1AA]';
    return 'bg-[#3F3F46]';
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
          <div className="text-xs uppercase tracking-widest text-[#DFE104] mb-1">SESSION LOGGER</div>
          <h2 className="text-xl md:text-2xl font-bold uppercase tracking-tighter text-[#FAFAFA] leading-[0.9]">
            HOW WAS YOUR SESSION?
          </h2>
        </div>
        <div className="border border-[#3F3F46] px-2 py-0.5 text-xs uppercase tracking-widest text-[#3F3F46]">
          F5
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        <AnimatePresence mode="wait">
          {state === 'idle' && (
            <motion.div
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
            >
              <div className="grid grid-cols-2 gap-3 mb-6">
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => {
                    setPlatform(null); setDuration(30); setMood(null); setState('logging');
                  }}
                  className="border-2 border-[#3F3F46] p-4 text-center cursor-pointer hover:border-[#DFE104]/50 hover:bg-[#27272A]/30 transition-all"
                >
                  <PenLine size={20} className="text-[#A1A1AA] mb-2 mx-auto" />
                  <div className="text-sm font-bold uppercase tracking-tighter text-[#FAFAFA]">LOG MANUALLY</div>
                  <div className="text-xs text-[#A1A1AA] mt-1 font-medium">Just finished scrolling?</div>
                </motion.button>

                <motion.button
                  whileTap={timerDataAvailable ? { scale: 0.97 } : {}}
                  className={`border-2 p-4 text-center ${
                    timerDataAvailable 
                      ? 'border-[#DFE104] bg-[#27272A] cursor-pointer' 
                      : 'border-[#3F3F46] opacity-50 cursor-not-allowed'
                  }`}
                  onClick={() => {
                    if (timerDataAvailable && prefilledData) {
                       setDuration(Math.max(5, prefilledData.duration || 5));
                       setState('logging');
                    }
                  }}
                >
                  <Timer size={20} className={`mb-2 mx-auto ${timerDataAvailable ? 'text-[#DFE104]' : 'text-[#A1A1AA]'}`} />
                  <div className="text-sm font-bold uppercase tracking-tighter text-[#FAFAFA]">FROM TIMER</div>
                  <div className={`text-xs mt-1 font-medium ${timerDataAvailable ? 'text-[#DFE104]' : 'text-[#3F3F46]'}`}>
                    {timerDataAvailable ? `Last session: ${prefilledData.duration} min` : "Stop a timer session first"}
                  </div>
                </motion.button>
              </div>

              {/* Today's Summary */}
              <div className="mt-2">
                <div className="text-xs uppercase tracking-widest text-[#A1A1AA] mb-3 font-medium">TODAY</div>
                
                {todaySessions.length > 0 ? (
                  <>
                    <div className="w-full h-[6px] flex gap-1 mb-2">
                      {todaySessions.map((s, i) => (
                        <div 
                          key={i} 
                          className={`h-full ${getMoodColor(s.moodRating)}`}
                          style={{ flexGrow: s.durationMinutes || 1 }}
                        />
                      ))}
                    </div>
                    <div className="text-xs uppercase tracking-widest text-[#A1A1AA] font-medium">
                      TOTAL TODAY: {todayTotal} MIN
                    </div>
                  </>
                ) : (
                  <div className="text-sm text-[#3F3F46] text-center py-4 font-medium">
                    No sessions logged today.
                  </div>
                )}
              </div>

              {/* Insight */}
              {insightText && (
                <div className="mt-4 border-l-4 border-[#DFE104] pl-4 py-2 bg-[#27272A]/30">
                  <div className="text-xs text-[#A1A1AA] leading-relaxed font-medium">
                    <Lightbulb size={14} className="text-[#DFE104] inline mr-2" />
                    {insightText}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {state === 'logging' && (
            <motion.div
              key="logging"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
            >
              {/* Platform */}
              <div className="mb-6">
                <div className="text-xs uppercase tracking-widest text-[#A1A1AA] mb-3 font-medium">WHICH PLATFORM?</div>
                <div className="flex gap-3">
                  <button 
                    onClick={() => setPlatform('youtube')}
                    className={`flex-1 flex items-center justify-center gap-2 border-2 p-3 text-sm uppercase tracking-wider font-medium transition-all ${
                      platform === 'youtube' ? 'border-[#DFE104] bg-[#27272A] text-[#FAFAFA]' : 'border-[#3F3F46] text-[#A1A1AA] hover:border-[#FAFAFA]/30 hover:text-[#FAFAFA]'
                    }`}
                  >
                    <Play size={14} /> YOUTUBE
                  </button>
                  <button 
                    onClick={() => setPlatform('instagram')}
                    className={`flex-1 flex items-center justify-center gap-2 border-2 p-3 text-sm uppercase tracking-wider font-medium transition-all ${
                      platform === 'instagram' ? 'border-[#DFE104] bg-[#27272A] text-[#FAFAFA]' : 'border-[#3F3F46] text-[#A1A1AA] hover:border-[#FAFAFA]/30 hover:text-[#FAFAFA]'
                    }`}
                  >
                    <Camera size={14} /> INSTAGRAM
                  </button>
                </div>
              </div>

              {/* Duration */}
              <div className="mb-6">
                <div className="flex justify-between mb-3">
                  <div className="text-xs uppercase tracking-widest text-[#A1A1AA] font-medium">HOW LONG WAS THE SESSION?</div>
                  <div className="text-xs font-bold uppercase text-[#DFE104]">{duration} MIN</div>
                </div>
                <input 
                  type="range" 
                  min="5" max="240" step="5" 
                  value={duration}
                  onChange={(e) => setDuration(parseInt(e.target.value, 10))}
                  className="w-full accent-[#DFE104]"
                />
                <div className="flex justify-between mt-1 text-[10px] uppercase text-[#3F3F46] font-medium">
                  <span>5 MIN</span>
                  <span>30 MIN</span>
                  <span>1 HR</span>
                  <span>2 HR+</span>
                </div>
              </div>

              {/* Mood */}
              <div className="mb-6">
                <div className="text-xs uppercase tracking-widest text-[#A1A1AA] mb-4 mt-6 font-medium">HOW DO YOU FEEL NOW?</div>
                <div className="flex justify-between gap-2">
                  {MOODS.map(m => {
                    const isSelected = mood === m.rating;
                    return (
                      <div 
                        key={m.rating}
                        onClick={() => setMood(m.rating)}
                        className={`flex flex-col items-center gap-2 cursor-pointer flex-1 border-b-2 pb-2 transition-all ${
                          isSelected ? 'border-[#DFE104]' : 'border-[#3F3F46] hover:border-[#A1A1AA]'
                        }`}
                      >
                        <div className="text-2xl min-w-[44px] min-h-[44px] flex items-center justify-center">{m.emoji}</div>
                        <div className={`text-[10px] uppercase tracking-widest font-medium ${isSelected ? 'text-[#FAFAFA]' : 'text-[#3F3F46]'}`}>
                          {m.label}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="mt-8 flex gap-3">
                <button
                  onClick={() => { setState('idle'); setPlatform(null); setDuration(30); setMood(null); }}
                  className="flex-1 border-2 border-[#3F3F46] bg-transparent text-[#FAFAFA] font-bold uppercase tracking-tighter h-12 hover:bg-[#FAFAFA] hover:text-black transition-colors"
                >
                  CANCEL
                </button>
                <button
                  onClick={handleLog}
                  disabled={!platform || !mood}
                  className={`flex-[2] h-12 font-bold uppercase tracking-tighter transition-all ${
                    platform && mood
                      ? 'bg-[#DFE104] text-black hover:scale-[1.02] active:scale-95'
                      : 'bg-[#27272A] text-[#3F3F46] cursor-not-allowed'
                  }`}
                >
                  SAVE SESSION
                </button>
              </div>
            </motion.div>
          )}

          {state === 'complete' && (
            <motion.div
              key="complete"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="text-center py-4 flex flex-col justify-center h-full"
            >
              <CheckCircle size={28} className="text-[#DFE104] mx-auto mb-3" />
              
              {mood >= 4 && (
                <>
                  <div className="font-bold uppercase tracking-tighter text-lg text-[#DFE104]">GOOD SESSION.</div>
                  <div className="text-sm mt-1 text-[#A1A1AA] font-medium">Glad it was worth it.</div>
                </>
              )}
              {mood === 3 && (
                <>
                  <div className="font-bold uppercase tracking-tighter text-lg text-[#FAFAFA]">SESSION LOGGED.</div>
                  <div className="text-sm mt-1 text-[#A1A1AA] font-medium">Neutral is fine — you know how you spent it.</div>
                </>
              )}
              {mood <= 2 && (
                <>
                  <div className="font-bold uppercase tracking-tighter text-lg text-[#FAFAFA]">SESSION LOGGED.</div>
                  <div className="text-sm mt-1 text-[#A1A1AA] font-medium">Worth knowing. That data will help you spot patterns.</div>
                </>
              )}

              {history.length === 1 && (
                <div className="border-2 border-[#DFE104] p-4 mt-6 text-left">
                  <div className="text-xs uppercase tracking-widest text-[#DFE104] mb-1 font-medium">FIRST SESSION LOGGED</div>
                  <div className="text-xs text-[#A1A1AA] font-medium">
                    After 7 sessions, ScrollSense will show you personal insights about your mood and duration patterns.
                  </div>
                </div>
              )}

              <button 
                onClick={() => { setState('idle'); setPlatform(null); setDuration(30); setMood(null); }}
                className="text-xs uppercase tracking-widest text-[#3F3F46] hover:text-[#A1A1AA] mt-8 cursor-pointer font-medium transition-colors"
              >
                LOG ANOTHER SESSION
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
