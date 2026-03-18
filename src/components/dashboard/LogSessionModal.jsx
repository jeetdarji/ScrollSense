import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Play, Camera, Layers, CheckCircle } from 'lucide-react';
import axios from 'axios';

const PLATFORMS = [
  { id: 'youtube', label: 'YOUTUBE', icon: Play },
  { id: 'instagram', label: 'INSTAGRAM', icon: Camera },
  { id: 'both', label: 'BOTH', icon: Layers },
];

const MOODS = [
  { rating: 5, emoji: '😄', label: 'GREAT' },
  { rating: 4, emoji: '😊', label: 'GOOD' },
  { rating: 3, emoji: '😐', label: 'NEUTRAL' },
  { rating: 2, emoji: '😕', label: 'MEH' },
  { rating: 1, emoji: '😞', label: 'WORSE' },
];

const DURATIONS = [
  { value: 15, label: '15 MIN' },
  { value: 30, label: '30 MIN' },
  { value: 45, label: '45 MIN' },
  { value: 60, label: '1 HOUR' },
  { value: 90, label: '1.5 HRS' },
  { value: 120, label: '2+ HRS' },
];

export const LogSessionModal = ({ isOpen, onClose }) => {
  const [duration, setDuration] = useState(null);
  const [customDuration, setCustomDuration] = useState('');
  const [platform, setPlatform] = useState(null);
  const [mood, setMood] = useState(null);
  
  const [showValidation, setShowValidation] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Reset state when opened
  useEffect(() => {
    if (isOpen) {
      setDuration(null);
      setCustomDuration('');
      setPlatform(null);
      setMood(null);
      setShowValidation(false);
      setSaveSuccess(false);
    }
  }, [isOpen]);

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleCustomDurationChange = (e) => {
    setDuration(null); // clears quick tap selection
    setCustomDuration(e.target.value);
  };

  const handleDurationTap = (val) => {
    setDuration(val);
    setCustomDuration('');
  };

  const handleSave = () => {
    const finalDuration = duration || parseInt(customDuration, 10);

    if (!finalDuration || !mood) {
      setShowValidation(true);
      return;
    }

    const sessionData = {
      id: Date.now().toString(),
      durationMinutes: finalDuration,
      moodRating: mood,
      platform: platform || 'unknown',
      timestamp: new Date().toISOString(),
    };

    try {
      const stored = JSON.parse(localStorage.getItem('scrollsense_sessions') || '[]');
      stored.push(sessionData);
      localStorage.setItem('scrollsense_sessions', JSON.stringify(stored));
      // Dispatch a generic storage event if other components need it
      window.dispatchEvent(new Event('storage'));
    } catch (e) {
      console.error(e);
    }

    axios.post('/api/sessions/log', sessionData).catch(() => {});

    setSaveSuccess(true);
    setTimeout(() => {
      onClose();
    }, 500);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div 
        onClick={handleBackdropClick}
        className="fixed inset-0 bg-black/70 z-[200] flex justify-center items-end md:items-center"
      >
        <motion.div
          initial={isMobile ? { y: '100%' } : { opacity: 0, y: 10 }}
          animate={isMobile ? { y: 0 } : { opacity: 1, y: 0 }}
          exit={isMobile ? { y: '100%' } : { opacity: 0, y: 10 }}
          transition={{ duration: isMobile ? 0.3 : 0.25, ease: 'easeOut' }}
          className={`bg-[#09090B] border-[#3F3F46] w-full 
            ${isMobile ? 'border-t-2 max-h-[90vh] pb-[env(safe-area-inset-bottom)] pb-safe rounded-t-none' : 'max-w-md border-2 rounded-none'}`}
        >
          {isMobile && (
            <div className="w-10 h-1 bg-[#3F3F46] mx-auto mt-3 mb-4 rounded-none" />
          )}

          <div className="px-6 pt-4 md:pt-6 pb-4 border-b border-[#3F3F46] flex justify-between items-center">
            <span className="text-base font-bold uppercase tracking-tighter text-[#FAFAFA]">
              LOG SESSION
            </span>
            <button 
              onClick={onClose}
              className="text-[#A1A1AA] hover:text-[#FAFAFA] cursor-pointer p-1 bg-transparent border-none appearance-none"
            >
              <X size={18} />
            </button>
          </div>

          <div className="px-6 py-6 flex flex-col gap-8 max-h-[70vh] overflow-y-auto">
            {/* Q1: HOW LONG */}
            <div>
              <div className="text-xs uppercase tracking-widest text-[#A1A1AA] mb-4">
                HOW LONG WERE YOU SCROLLING?
              </div>
              <div className="grid grid-cols-3 gap-2">
                {DURATIONS.map(({ value, label }) => (
                  <motion.button
                    key={value}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => handleDurationTap(value)}
                    className={`border-2 py-3 text-center cursor-pointer transition-all duration-200 rounded-none bg-transparent ${
                      duration === value 
                        ? 'border-[#DFE104] bg-[#27272A] text-[#DFE104]' 
                        : 'border-[#3F3F46] text-[#A1A1AA]'
                    } text-sm font-bold uppercase tracking-tighter`}
                  >
                    {label}
                  </motion.button>
                ))}
              </div>
              <div className="mt-3 flex items-center gap-3">
                <span className="text-xs uppercase tracking-widest text-[#3F3F46]">EXACT:</span>
                <input 
                  type="number" 
                  min="1" 
                  max="480"
                  value={customDuration}
                  onChange={handleCustomDurationChange}
                  placeholder="--"
                  className="bg-transparent border-b-2 border-[#3F3F46] focus:border-[#DFE104] text-[#FAFAFA] text-base font-bold w-20 pb-1 outline-none text-center rounded-none"
                />
                <span className="text-xs uppercase text-[#3F3F46]">MIN</span>
              </div>
            </div>

            {/* Q2: WHICH PLATFORM */}
            <div>
              <div className="text-xs uppercase tracking-widest text-[#A1A1AA] mb-4">
                WHICH PLATFORM?
              </div>
              <div className="flex flex-wrap gap-2">
                {PLATFORMS.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => setPlatform(id)}
                    className={`border-2 px-4 py-2.5 flex items-center gap-2 text-sm font-bold uppercase tracking-tighter rounded-none cursor-pointer transition-all ${
                      platform === id
                        ? 'border-[#DFE104] bg-[#27272A] text-[#FAFAFA]'
                        : 'border-[#3F3F46] text-[#A1A1AA] hover:border-[#FAFAFA]/30 bg-transparent'
                    }`}
                  >
                    <Icon size={14} />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Q3: HOW DO YOU FEEL */}
            <div>
              <div className="text-xs uppercase tracking-widest text-[#A1A1AA] mb-4">
                HOW DO YOU FEEL NOW?
              </div>
              <div className="flex justify-between">
                {MOODS.map(({ rating, emoji, label }) => (
                  <button
                    key={rating}
                    onClick={() => setMood(rating)}
                    className={`flex-1 flex flex-col items-center gap-2 cursor-pointer py-3 border-b-2 transition-all bg-transparent ${
                      mood === rating ? 'border-[#DFE104]' : 'border-[#3F3F46]'
                    } min-h-[56px] appearance-none`}
                  >
                    <span style={{ fontSize: '24px' }}>{emoji}</span>
                    <span className={`text-[10px] uppercase tracking-widest mt-1 ${
                      mood === rating ? 'text-[#DFE104]' : 'text-[#3F3F46]'
                    }`}>
                      {label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="px-6 pb-6 pt-4 border-t border-[#3F3F46]">
            {saveSuccess ? (
              <div className="flex items-center justify-center gap-2 h-14 bg-[#27272A] rounded-none">
                <CheckCircle size={20} className="text-[#DFE104]" />
                <span className="text-sm font-bold uppercase text-[#DFE104] tracking-tighter">SESSION SAVED</span>
              </div>
            ) : (
              <>
                <AnimatePresence>
                  {showValidation && (
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 5 }}
                      className="text-xs uppercase tracking-widest text-[#A1A1AA] text-center mb-2"
                    >
                      SELECT A DURATION AND MOOD TO SAVE
                    </motion.div>
                  )}
                </AnimatePresence>
                <button
                  onClick={handleSave}
                  className={`w-full font-bold h-14 uppercase tracking-tighter rounded-none transition-all flex items-center justify-center border-2 ${
                    (!duration && !customDuration) || !mood 
                      ? 'bg-[#27272A] text-[#3F3F46] border-[#3F3F46]' 
                      : 'bg-[#DFE104] text-black border-[#DFE104] hover:scale-105 cursor-pointer'
                  }`}
                >
                  SAVE SESSION
                </button>
              </>
            )}
            {!saveSuccess && (
              <button
                onClick={onClose}
                className="text-xs uppercase tracking-widest text-[#3F3F46] hover:text-[#A1A1AA] cursor-pointer text-center mt-3 block w-full bg-transparent border-none appearance-none"
              >
                CANCEL
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
