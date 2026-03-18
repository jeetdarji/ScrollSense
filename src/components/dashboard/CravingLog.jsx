import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Meh, Zap, Repeat, UserX, Shield, Minus, TrendingDown, Lock, CheckCircle, MessageSquare, Eye, PenLine, X } from 'lucide-react';
import { useLocalStorage } from '../../hooks/useLocalStorage';

const TRIGGERS = [
  { id: 'boredom', icon: Meh, label: 'BOREDOM' },
  { id: 'anxiety', icon: Zap, label: 'ANXIETY' },
  { id: 'habit', icon: Repeat, label: 'HABIT' },
  { id: 'loneliness', icon: UserX, label: 'LONELINESS' }
];

const OUTCOMES = [
  { id: 'resisted', icon: Shield, title: 'RESISTED', desc: "Felt the urge, didn't open the app", color: '#DFE104' },
  { id: 'partial', icon: Minus, title: 'PARTIALLY SCROLLED', desc: 'Opened the app but closed it quickly', color: '#A1A1AA' },
  { id: 'gave_in', icon: TrendingDown, title: 'GAVE IN', desc: 'Ended up having a full scroll session', color: '#3F3F46' }
];

export default function CravingLog() {
  const [state, setState] = useState('idle'); // 'idle', 'logging', 'complete'
  const [trigger, setTrigger] = useState(null);
  const [outcome, setOutcome] = useState(null);
  const [cravingDescription, setCravingDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const [history, setHistory] = useLocalStorage('scrollsense_cravings', []);
  const [privateNotes, setPrivateNotes] = useLocalStorage('scrollsense_craving_notes', {});

  const handleLog = () => {
    if (!trigger || !outcome) return;

    const entryId = Date.now().toString();
    const newEntry = {
      id: entryId,
      trigger,
      outcome,
      cravingDescription: cravingDescription.trim(),
      timestamp: new Date().toISOString()
    };

    setHistory([...history, newEntry]);

    fetch('/api/cravings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        trigger,
        outcome,
        cravingDescription: cravingDescription.trim(),
        timestamp: newEntry.timestamp
      })
    }).catch(() => {});

    if (notes.trim()) {
      setPrivateNotes({ ...privateNotes, [entryId]: notes.trim() });
    }

    setState('complete');
    
    // Auto reset
    setTimeout(() => {
      setState('idle');
      setTrigger(null);
      setOutcome(null);
      setCravingDescription('');
      setNotes('');
    }, 4000);
  };

  const renderOutcomeBadge = (outcomeId) => {
    switch(outcomeId) {
      case 'resisted':
        return <span className="text-[10px] uppercase tracking-widest text-[#DFE104] border border-[#DFE104]/30 px-2 py-0.5">RESISTED</span>;
      case 'partial':
        return <span className="text-[10px] uppercase tracking-widest text-[#A1A1AA] border border-[#A1A1AA]/30 px-2 py-0.5">PARTIAL</span>;
      case 'gave_in':
        return <span className="text-[10px] uppercase tracking-widest text-[#3F3F46] border border-[#3F3F46]/30 px-2 py-0.5">GAVE IN</span>;
      default:
        return null;
    }
  };

  const getOutcomeColor = (outcomeId) => {
    switch(outcomeId) {
      case 'resisted': return 'bg-[#DFE104]';
      case 'partial': return 'bg-[#A1A1AA]';
      case 'gave_in': return 'bg-[#3F3F46]';
      default: return 'bg-transparent';
    }
  };

  const getTimeAgo = (timestamp) => {
    const min = Math.floor((new Date() - new Date(timestamp)) / 60000);
    if (min < 60) return `${min || 1} min ago`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr} hr ago`;
    return `${Math.floor(hr / 24)} days ago`;
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
          <div className="text-xs uppercase tracking-widest text-[#DFE104] mb-1">CRAVING LOG</div>
          <h2 className="text-xl md:text-2xl font-bold uppercase tracking-tighter text-[#FAFAFA] leading-[0.9]">
            REFLECT ON A CRAVING
          </h2>
        </div>
        <div className="border border-[#3F3F46] px-2 py-0.5 text-xs uppercase tracking-widest text-[#3F3F46]">
          F4
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
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={() => setState('logging')}
                className="w-full border-2 border-[#3F3F46] p-6 text-center hover:border-[#DFE104]/50 hover:bg-[#27272A]/30 transition-all duration-200 cursor-pointer"
              >
                <Plus size={24} className="text-[#DFE104] mb-2 mx-auto" />
                <div className="text-base font-bold uppercase tracking-tighter text-[#FAFAFA]">LOG A CRAVING</div>
                <div className="text-xs text-[#A1A1AA] mt-1 font-medium">Remember a moment today when you felt the urge to scroll.</div>
              </motion.button>

              <button
                onClick={() => setIsHistoryOpen(true)}
                className="w-full mt-4 border border-dashed border-[#3F3F46] py-3 text-xs font-bold uppercase tracking-widest text-[#A1A1AA] hover:text-[#FAFAFA] hover:border-[#A1A1AA] transition-all duration-200 cursor-pointer bg-transparent"
              >
                VIEW HISTORY ({history.length})
              </button>
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
              {/* Trigger */}
              <div className="text-xs uppercase tracking-widest text-[#A1A1AA] mb-4 font-medium">WHAT TRIGGERED THE URGE TO SCROLL?</div>
              <div className="grid grid-cols-2 md:flex md:flex-wrap gap-2">
                {TRIGGERS.map((t) => {
                  const Icon = t.icon;
                  const isSelected = trigger === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setTrigger(t.id)}
                      className={`border-2 p-3 flex flex-1 items-center justify-center md:justify-start gap-2 text-sm uppercase tracking-wider font-medium transition-all duration-200 ${
                        isSelected 
                          ? 'border-[#DFE104] bg-[#27272A] text-[#FAFAFA]' 
                          : 'border-[#3F3F46] text-[#A1A1AA] hover:border-[#FAFAFA]/30 hover:text-[#FAFAFA]'
                      }`}
                    >
                      <Icon size={16} />
                      {t.label}
                    </button>
                  );
                })}
              </div>

              {/* Outcome */}
              <div className="mt-6">
                <div className="text-xs uppercase tracking-widest text-[#A1A1AA] mb-4 font-medium">WHAT DID YOU DO?</div>
                <div className="flex flex-col gap-2">
                  {OUTCOMES.map((o) => {
                    const Icon = o.icon;
                    const isSelected = outcome === o.id;
                    return (
                      <button
                        key={o.id}
                        onClick={() => setOutcome(o.id)}
                        className={`border-2 p-4 flex items-center gap-3 text-left transition-all duration-200 ${
                          isSelected
                            ? 'border-[#DFE104] bg-[#27272A]'
                            : 'border-[#3F3F46] hover:border-[#FAFAFA]/30'
                        }`}
                      >
                        <Icon size={18} className={isSelected ? 'text-[#DFE104]' : 'text-[#3F3F46]'} />
                        <div>
                          <div className="font-bold uppercase tracking-tighter text-sm text-[#FAFAFA]">{o.title}</div>
                          <div className="text-xs text-[#A1A1AA] font-medium">{o.desc}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Description */}
              <div className="mt-6">
                <div className="flex items-center gap-2 mb-2">
                  <PenLine size={12} className="text-[#A1A1AA]" />
                  <div className="text-xs uppercase tracking-widest text-[#A1A1AA] font-medium">DESCRIBE IT (OPTIONAL)</div>
                </div>
                <textarea
                  value={cravingDescription}
                  onChange={(e) => setCravingDescription(e.target.value)}
                  maxLength={400}
                  placeholder="What were you craving exactly? What were you hoping to feel?"
                  style={{ minHeight: '72px' }}
                  className="bg-transparent border-2 border-[#3F3F46] focus:border-[#DFE104] transition-colors duration-200 text-sm text-[#FAFAFA] placeholder:text-[#3F3F46] outline-none w-full p-3 resize-none"
                />
                <div className="text-right text-[10px] text-[#3F3F46] mt-1 font-medium">{cravingDescription.length}/400</div>
                <div className="flex items-center gap-1.5 mt-1">
                  <Eye size={10} className="text-[#3F3F46]" />
                  <div className="text-[10px] text-[#3F3F46] uppercase tracking-wider">May be reviewed to improve ScrollSense — never shared publicly.</div>
                </div>
              </div>

              <div className="mt-8 flex gap-3">
                <button
                  onClick={() => {
                    setState('idle');
                    setTrigger(null);
                    setOutcome(null);
                    setCravingDescription('');
                    setNotes('');
                  }}
                  className="flex-1 border-2 border-[#3F3F46] bg-transparent text-[#FAFAFA] font-bold uppercase tracking-tighter h-12 hover:bg-[#FAFAFA] hover:text-black transition-colors"
                >
                  CANCEL
                </button>
                <button
                  onClick={handleLog}
                  disabled={!trigger || !outcome}
                  className={`flex-1 h-12 font-bold uppercase tracking-tighter transition-all ${
                    trigger && outcome
                      ? 'bg-[#DFE104] text-black hover:scale-[1.02] active:scale-95'
                      : 'bg-[#27272A] text-[#3F3F46] cursor-not-allowed'
                  }`}
                >
                  LOG IT
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
              
              {outcome === 'resisted' && (
                <>
                  <div className="font-bold uppercase tracking-tighter text-lg text-[#DFE104]">CRAVING RESISTED.</div>
                  <div className="text-sm mt-1 text-[#A1A1AA] font-medium">That awareness is the whole point.</div>
                </>
              )}
              {outcome === 'partial' && (
                <>
                  <div className="font-bold uppercase tracking-tighter text-lg text-[#FAFAFA]">LOGGED.</div>
                  <div className="text-sm mt-1 text-[#A1A1AA] font-medium">Noticing is the first step.</div>
                </>
              )}
              {outcome === 'gave_in' && (
                <>
                  <div className="font-bold uppercase tracking-tighter text-lg text-[#FAFAFA]">LOGGED.</div>
                  <div className="text-sm mt-1 text-[#A1A1AA] font-medium">No judgment — data is data.</div>
                </>
              )}

              <button 
                onClick={() => { setState('idle'); setTrigger(null); setOutcome(null); setNotes(''); }}
                className="text-xs uppercase tracking-widest text-[#3F3F46] hover:text-[#A1A1AA] mt-8 cursor-pointer font-medium transition-colors"
              >
                LOG ANOTHER
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* History Modal */}
      <AnimatePresence>
        {isHistoryOpen && (
          <div 
            onClick={(e) => { if(e.target === e.currentTarget) setIsHistoryOpen(false) }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] flex justify-center items-center p-4 md:p-6"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2 }}
              className="bg-[#09090B] border-2 border-[#3F3F46] w-full max-w-lg max-h-[80vh] flex flex-col rounded-none shadow-2xl"
            >
              <div className="flex justify-between items-center border-b border-[#3F3F46] px-6 py-4 bg-[#09090B] sticky top-0 z-10">
                <div className="text-base font-bold uppercase tracking-tighter text-[#FAFAFA]">REFLECTION HISTORY</div>
                <button
                  onClick={() => setIsHistoryOpen(false)}
                  className="text-[#A1A1AA] hover:text-[#FAFAFA] cursor-pointer p-1 bg-transparent border-none"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6" style={{ overscrollBehavior: 'contain' }}>
                {history.length > 0 ? (
                  <div className="flex flex-col gap-4">
                    {[...history].reverse().map((entry) => (
                      <div key={entry.id} className="flex items-start gap-4 pb-4 border-b border-[#3F3F46]/50 last:border-0 last:pb-0">
                        <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1.5 ${getOutcomeColor(entry.outcome)}`} />
                        <div className="flex-1">
                          <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
                            <div className="text-sm font-bold uppercase tracking-tighter text-[#FAFAFA]">{entry.trigger}</div>
                            {renderOutcomeBadge(entry.outcome)}
                          </div>
                          <div className="text-xs text-[#3F3F46] font-medium mb-2">{getTimeAgo(entry.timestamp)}</div>
                          
                          {entry.cravingDescription && (
                            <div className="text-sm text-[#A1A1AA] bg-[#27272A]/30 p-3 border border-[#3F3F46]/50 rounded-none mb-2 break-words">
                              {entry.cravingDescription}
                            </div>
                          )}
                          {privateNotes[entry.id] && (
                            <div className="text-sm text-[#3F3F46] flex items-start gap-2 bg-transparent p-0 break-words mt-2">
                              <Lock size={12} className="shrink-0 mt-0.5" />
                              <span className="italic">{privateNotes[entry.id]}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-[#A1A1AA] text-center py-10 font-medium">
                    No reflections yet. Come back here after you've had an urge to scroll — even if you gave in.
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
