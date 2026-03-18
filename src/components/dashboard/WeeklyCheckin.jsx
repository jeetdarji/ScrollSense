import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Clock, Target, TrendingDown, Lightbulb, Zap, CheckCircle, Lock } from 'lucide-react';
import { useYouTubeData } from '../../hooks/useYouTubeData';
import clsx from 'clsx';

const formatMinutes = (mins) => {
  if (!mins) return '0M';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}H ${m}M` : `${m}M`;
};

export default function WeeklyCheckin({ className }) {
  const { checkin } = useYouTubeData();
  const [isEmailOn, setIsEmailOn] = useState(false);
  const [showEmailInput, setShowEmailInput] = useState(false);

  const renderColdStart = () => {
    const pct = Math.min((checkin.sessionsLogged / 3) * 100, 100);
    return (
      <div className="py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="text-xs uppercase tracking-widest text-[#A1A1AA] mb-1">
              FIRST CHECK-IN AFTER 3 SESSIONS
            </div>
            <div className="text-lg font-bold uppercase tracking-tighter text-[#FAFAFA]">
              {checkin.sessionsLogged} OF 3 SESSIONS LOGGED
            </div>
          </div>
          <div className="flex items-baseline">
            <span className="text-[3rem] font-bold text-[#DFE104] leading-none">{checkin.sessionsLogged}</span>
            <span className="text-[2rem] text-[#3F3F46] mx-1">/</span>
            <span className="text-[3rem] font-bold text-[#27272A] leading-none">3</span>
          </div>
        </div>

        <div className="w-full h-[6px] bg-[#27272A] mb-6 rounded-none overflow-hidden relative">
          <div className="bg-[#DFE104] h-[6px] transition-all duration-700 absolute left-0 top-0" style={{ width: `${pct}%` }} />
        </div>

        <div className="flex justify-between mt-2 mb-8 relative">
          {[1, 2, 3].map((n) => {
            const completed = checkin.sessionsLogged >= n;
            return (
              <div key={n} className="flex flex-col items-center">
                <div className={clsx("w-2 h-2 rounded-none", completed ? "bg-[#DFE104]" : "bg-[#27272A] border border-[#3F3F46]")} />
                <div className={clsx("mt-2 text-[10px] uppercase tracking-widest", completed ? "text-[#DFE104]" : "text-[#3F3F46]")}>
                  SESSION {n}
                </div>
              </div>
            );
          })}
        </div>

        <div>
          <div className="text-xs uppercase tracking-widest text-[#A1A1AA] mb-4">WHAT YOUR CHECK-IN WILL SHOW</div>
          <div className="grid grid-cols-2 gap-3">
            {[ 
              { icon: Clock, text: "Total scroll time" },
              { icon: Target, text: "Goal relevance %" },
              { icon: TrendingDown, text: "Improvement vs before" },
              { icon: Lightbulb, text: "One AI insight" }
            ].map((item, i) => (
              <div key={i} className="border border-[#27272A] p-3 flex items-center gap-3">
                <item.icon size={14} color="#3F3F46" className="flex-shrink-0" />
                <span className="text-xs uppercase tracking-wider text-[#3F3F46] leading-tight">{item.text}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 text-center">
          <span className="text-xs text-[#3F3F46] uppercase tracking-widest cursor-pointer hover:text-[#A1A1AA] transition-colors">
            Log your next session to get closer →
          </span>
        </div>
      </div>
    );
  };

  const renderAvailable = () => {
    let triggerText = "YOUR WEEKLY CHECK-IN";
    if (checkin.triggerReason === 'sessions') triggerText = `GENERATED AFTER ${checkin.sessionsLogged} SESSIONS LOGGED`;
    if (checkin.triggerReason === 'days') triggerText = "GENERATED AFTER 3 DAYS OF DATA";

    return (
      <>
        <div className="flex items-center gap-2 mb-6">
          <Zap size={12} color="#DFE104" />
          <span className="text-xs uppercase tracking-widest text-[#A1A1AA]">{triggerText}</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="flex flex-col border-b border-[#3F3F46] pb-4 md:border-b-0 md:border-r last:border-0 md:pr-4">
            <span className="text-[10px] uppercase tracking-widest text-[#A1A1AA] mb-1">TOTAL SCROLL TIME</span>
            <span className="text-2xl font-bold uppercase text-[#FAFAFA]">{formatMinutes(checkin.totalScrollMinutes)}</span>
          </div>
          <div className="flex flex-col border-b border-[#3F3F46] pb-4 md:border-b-0 md:border-r last:border-0 md:px-4">
            <span className="text-[10px] uppercase tracking-widest text-[#A1A1AA] mb-1">GOAL RELEVANT</span>
            <span className="text-2xl font-bold uppercase text-[#DFE104]">{checkin.goalPercent}%</span>
          </div>
          <div className="flex flex-col border-b border-[#3F3F46] pb-4 md:border-b-0 md:border-r last:border-0 md:px-4">
            <span className="text-[10px] uppercase tracking-widest text-[#A1A1AA] mb-1">VS PREVIOUS</span>
            {checkin.improvementMinutes > 0 ? (
              <span className="text-2xl font-bold uppercase text-[#DFE104]">-{checkin.improvementMinutes} MIN</span>
            ) : checkin.improvementMinutes < 0 ? (
              <span className="text-2xl font-bold uppercase text-red-500">+{Math.abs(checkin.improvementMinutes)} MIN</span>
            ) : (
              <span className="text-2xl font-bold uppercase text-[#3F3F46]">FIRST DATA</span>
            )}
            <span className="text-[10px] uppercase text-[#3F3F46] mt-1">
              {checkin.isFirstCheckin || checkin.improvementMinutes === 0 ? "BASELINE SET" : "FEWER MINUTES = BETTER"}
            </span>
          </div>
          <div className="flex flex-col border-[#3F3F46] pb-4 md:border-b-0 last:border-0 md:pl-4">
            <span className="text-[10px] uppercase tracking-widest text-[#A1A1AA] mb-1">RECLAIMED</span>
            <span className="text-2xl font-bold uppercase text-[#DFE104]">{formatMinutes(checkin.timeReclaimedMinutes)}</span>
          </div>
        </div>

        <div className="mb-6">
          <div className="text-xs uppercase text-[#A1A1AA] mb-3">PLATFORM SPLIT</div>
          <div className="flex w-full h-[10px]">
            <div className="bg-[#DFE104]" style={{ width: `${checkin.platformBreakdown.youtube}%` }} />
            <div className="bg-[#3F3F46]" style={{ width: `${checkin.platformBreakdown.instagram}%` }} />
          </div>
          <div className="flex justify-between mt-2">
            <span className="text-xs uppercase text-[#DFE104]">YOUTUBE {checkin.platformBreakdown.youtube}%</span>
            <span className="text-xs uppercase text-[#A1A1AA]">INSTAGRAM {checkin.platformBreakdown.instagram}%</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="border border-[#3F3F46] p-4">
            <div className="text-[10px] uppercase tracking-widest text-[#A1A1AA] mb-1">BIGGEST TRIGGER</div>
            <div className="text-lg font-bold uppercase tracking-tighter text-[#FAFAFA]">{checkin.mostCommonTrigger}</div>
          </div>
          <div className="border border-[#3F3F46] p-4">
            <div className="text-[10px] uppercase tracking-widest text-[#A1A1AA] mb-1">HEAVIEST DAY</div>
            <div className="text-lg font-bold uppercase tracking-tighter text-[#FAFAFA]">{checkin.heaviestScrollDay}</div>
          </div>
        </div>

        <div className="mb-6">
          <div className="text-xs uppercase tracking-widest text-[#A1A1AA] mb-2">INTEREST BUDGETS</div>
          <div className="text-sm text-[#A1A1AA] leading-relaxed">{checkin.interestBudgetStatus}</div>
        </div>

        <div className="border-l-4 border-[#DFE104] pl-5 py-4 bg-[#27272A]/30 pr-4">
          <div className="flex items-center gap-2 mb-2">
            <Lightbulb size={13} color="#DFE104" />
            <span className="text-xs uppercase tracking-widest text-[#DFE104] font-bold">AI INSIGHT</span>
          </div>
          <p className="text-sm md:text-base text-[#FAFAFA] leading-relaxed">{checkin.aiInsight}</p>
          <div className="mt-3 flex items-center gap-1.5">
            <Lock size={10} color="#3F3F46" />
            <span className="text-[10px] text-[#3F3F46] uppercase tracking-wider">Based on your behavioral data only · GPT-4o mini</span>
          </div>
        </div>

        <div className="border-t border-[#3F3F46] pt-4 mt-6">
          {!isEmailOn ? (
            <>
              <div className="flex justify-between items-center h-6">
                <span className="text-xs uppercase tracking-widest text-[#3F3F46]">GET CHECK-INS IN YOUR INBOX</span>
                {!showEmailInput && (
                  <span 
                    className="text-xs uppercase text-[#DFE104] cursor-pointer hover:underline"
                    onClick={() => setShowEmailInput(true)}
                  >
                    ENABLE →
                  </span>
                )}
              </div>
              <motion.div 
                initial={false}
                animate={{ height: showEmailInput ? 'auto' : 0, opacity: showEmailInput ? 1 : 0 }}
                className="overflow-hidden"
              >
                <div className="mt-3 flex gap-3 items-end">
                  <input 
                    type="email" 
                    placeholder="your@email.com" 
                    className="border-b-2 border-[#3F3F46] focus:border-[#DFE104] bg-transparent text-[#FAFAFA] text-sm outline-none pb-1 flex-1 transition-colors"
                  />
                  <button 
                    onClick={() => { setIsEmailOn(true); setShowEmailInput(false); }}
                    className="bg-[#DFE104] text-black font-bold h-10 px-4 text-xs uppercase tracking-tighter rounded-none"
                  >
                    SAVE
                  </button>
                </div>
              </motion.div>
            </>
          ) : (
            <div className="flex items-center h-6">
              <CheckCircle size={12} color="#DFE104" className="mr-2" />
              <span className="text-xs uppercase text-[#DFE104]">SENDING TO YOUR EMAIL</span>
              <span className="text-xs uppercase text-[#3F3F46] hover:text-[#A1A1AA] cursor-pointer ml-2 transition-colors" onClick={() => setIsEmailOn(false)}>
                · DISABLE
              </span>
            </div>
          )}
        </div>
      </>
    );
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} viewport={{ once: true }} className={clsx("border-2 border-[#3F3F46] bg-[#09090B] p-6 md:p-8", className)}>
      <div className="flex justify-between items-start flex-wrap gap-4 mb-6">
        <div>
          <div className="text-xs uppercase tracking-widest text-[#DFE104] mb-1">YOUR CHECK-IN</div>
          <h2 className="text-xl md:text-2xl font-bold uppercase tracking-tighter text-[#FAFAFA] leading-[0.9]">
            HOW YOUR WEEK LOOKED
          </h2>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto mt-2 md:mt-0">
          <div className="border border-[#3F3F46] px-2 py-0.5 text-xs uppercase tracking-widest text-[#3F3F46]">F10</div>
          
          <div className="flex items-center gap-2">
            <Mail size={13} color="#3F3F46" />
            <div 
              onClick={() => {
                if (isEmailOn) {
                  setIsEmailOn(false);
                } else {
                  setShowEmailInput(true);
                }
              }}
              className="w-8 h-4 relative cursor-pointer border"
              style={{ backgroundColor: isEmailOn ? 'rgba(223,225,4,0.2)' : '#27272A', borderColor: isEmailOn ? 'rgba(223,225,4,0.5)' : '#3F3F46' }}
            >
              <motion.div 
                className="w-3 h-3 absolute top-0.5"
                style={{ backgroundColor: isEmailOn ? '#DFE104' : '#3F3F46' }}
                animate={{ left: isEmailOn ? '17px' : '2px' }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              />
            </div>
            <span className="text-[10px] uppercase tracking-widest text-[#3F3F46]">EMAIL</span>
          </div>
        </div>
      </div>

      {checkin.available ? renderAvailable() : renderColdStart()}
    </motion.div>
  );
}