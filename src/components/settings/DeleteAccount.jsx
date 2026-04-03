import React, { useState, useEffect } from 'react';
import { Trash2, User, Activity, Zap, BarChart2, Users, Camera, Play, Settings, Check, AlertTriangle, CheckCircle, Circle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

const DELETION_LIST = [
  { icon: User, label: 'Your account and profile' },
  { icon: Activity, label: 'All session logs and mood ratings' },
  { icon: Zap, label: 'All intention and craving logs' },
  { icon: BarChart2, label: 'Weekly behavior summaries' },
  { icon: Users, label: 'Community group membership' },
  { icon: Camera, label: 'Instagram processed data' },
  { icon: Play, label: 'YouTube classification data' },
  { icon: Settings, label: 'All preferences and goals' },
];

const DeleteAccount = () => {
  const [deleteState, setDeleteState] = useState('idle'); // 'idle' | 'confirming' | 'deleting' | 'deleted'
  const [countdown, setCountdown] = useState(60);
  const [typed, setTyped] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    let timer;
    if (deleteState === 'deleting') {
      timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            // Clear all localStorage scrollsense data
            const keysToKeep = [];
            Object.keys(localStorage)
              .filter(k => k.startsWith('scrollsense_'))
              .forEach(k => localStorage.removeItem(k));
            setDeleteState('deleted');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [deleteState]);

  if (deleteState === 'deleted') {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center text-center py-12 w-full">
        <CheckCircle className="w-[32px] h-[32px] text-[#DFE104] mb-6" />
        <h2 
          className="font-bold uppercase tracking-tighter leading-none text-[#FAFAFA] mb-4 m-0"
          style={{ fontSize: 'clamp(3rem,8vw,6rem)' }}
        >
          ALL DONE.
        </h2>
        <p className="text-sm text-[#A1A1AA] max-w-xs leading-relaxed mb-8 mx-auto">
          Everything ScrollSense had about you has been permanently deleted. No backups. No traces.
        </p>

        <div className="border-l-4 border-[#DFE104] pl-4 py-3 text-left max-w-xs mb-8 mx-auto w-full">
          <p className="text-xs text-[#A1A1AA] leading-relaxed m-0">
            Thank you for trying ScrollSense. We hope it helped — even a little. You're always welcome back if you change your mind.
          </p>
        </div>

        <div className="flex flex-col gap-3 w-full max-w-xs mx-auto">
          <button 
            onClick={() => navigate('/signup')}
            className="w-full bg-[#DFE104] text-black font-bold h-12 uppercase tracking-tighter text-sm rounded-none hover:bg-white transition-colors"
          >
            CREATE A FRESH ACCOUNT
          </button>
          <button 
            onClick={() => navigate('/')}
            className="w-full border-2 border-[#3F3F46] bg-transparent text-[#FAFAFA] h-12 uppercase tracking-tighter text-sm rounded-none hover:border-[#FAFAFA]/30 transition-colors"
          >
            GO TO HOMEPAGE
          </button>
        </div>

        <div className="mt-8 text-xs text-[#3F3F46] uppercase tracking-wider">
          Your YouTube and Instagram accounts are completely unaffected.
        </div>
      </div>
    );
  }

  if (deleteState === 'deleting') {
    const checklistItems = [
      { label: "Session logs", at: 53 },
      { label: "Behavior data", at: 46 },
      { label: "Patterns", at: 39 },
      { label: "Instagram data", at: 32 },
      { label: "YouTube data", at: 25 },
      { label: "Account settings", at: 18 }
    ];

    return (
      <div className="py-12 text-center w-full">
        <div 
          className="font-bold text-[#FAFAFA] leading-none mb-2"
          style={{ fontSize: 'clamp(4rem,10vw,7rem)' }}
        >
          {countdown}
        </div>
        <div className="text-xs uppercase tracking-widest text-[#3F3F46] mt-2">
          SECONDS REMAINING
        </div>

        <div className="w-full h-[4px] bg-[#27272A] mt-8 mb-4">
          <div 
            className="bg-red-500 h-[4px] transition-all duration-1000 ease-linear"
            style={{ width: `${((60 - countdown) / 60) * 100}%` }}
          />
        </div>

        <div className="text-xs uppercase tracking-widest text-[#A1A1AA]">
          PERMANENTLY DELETING YOUR DATA...
        </div>
        <div className="text-[10px] uppercase text-[#3F3F46] mt-2">
          DO NOT CLOSE THIS TAB
        </div>

        <div className="mt-8 flex flex-col gap-2 max-w-xs mx-auto text-left">
          {checklistItems.map((item, index) => {
            const completed = countdown <= item.at;
            return (
              <div key={index} className="flex items-center gap-3 text-xs uppercase text-[#A1A1AA]">
                {completed ? (
                  <CheckCircle className="w-3 h-3 text-[#DFE104]" />
                ) : (
                  <Circle className="w-3 h-3 text-[#27272A]" />
                )}
                {item.label}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="border-2 border-[#3F3F46] bg-[#09090B] p-6 rounded-none w-full relative overflow-hidden">
      <AnimatePresence mode="wait">
        {deleteState === 'idle' && (
          <motion.div
            key="idle"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex items-center gap-3 mb-6">
              <Trash2 className="w-[18px] h-[18px] text-[#A1A1AA]" />
              <h2 className="text-base font-bold uppercase tracking-tighter text-[#FAFAFA] m-0">
                DELETE ALL YOUR DATA
              </h2>
            </div>

            <p className="text-sm text-[#A1A1AA] leading-relaxed mb-6">
              This permanently deletes everything ScrollSense has about you. No backups. No 'deactivation'. Gone in 60 seconds.
            </p>

            <div className="mb-6">
              <div className="text-[10px] uppercase text-[#A1A1AA] mb-3">
                WHAT WILL BE PERMANENTLY DELETED
              </div>
              <div className="flex flex-col gap-0 border-t border-[#3F3F46]">
                {DELETION_LIST.map((item, index) => {
                  const Icon = item.icon;
                  return (
                    <div key={index} className="flex items-center gap-3 py-2 border-b border-[#3F3F46]">
                      <Icon className="w-[13px] h-[13px] text-[#A1A1AA]" />
                      <span className="text-xs text-[#A1A1AA] uppercase tracking-wider">{item.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mb-8">
              <div className="text-[10px] uppercase text-[#A1A1AA] mb-3">
                WHAT IS NOT AFFECTED
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex items-start gap-3">
                  <Check className="w-[13px] h-[13px] text-[#DFE104] mt-[3px]" />
                  <span className="text-xs text-[#A1A1AA]">Your Instagram and YouTube accounts — ScrollSense only deletes its own data</span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-[13px] h-[13px] text-[#DFE104] mt-[3px]" />
                  <span className="text-xs text-[#A1A1AA]">You can create a new ScrollSense account anytime</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setDeleteState('confirming')}
              className="w-full h-12 border-2 border-red-900/50 bg-transparent text-red-400 font-bold uppercase tracking-tighter text-sm rounded-none hover:bg-red-900/20 transition-all"
            >
              DELETE ALL MY DATA PERMANENTLY
            </button>
          </motion.div>
        )}

        {deleteState === 'confirming' && (
          <motion.div
            key="confirming"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col items-center text-center py-4"
          >
            <AlertTriangle className="w-5 h-5 text-[#A1A1AA] mb-4" />
            <h2 className="text-base font-bold uppercase tracking-tighter text-[#FAFAFA] m-0 mb-2">
              ARE YOU ABSOLUTELY SURE?
            </h2>
            <p className="text-xs text-[#A1A1AA] uppercase tracking-wider mb-6">
              This cannot be undone. Type DELETE below to confirm.
            </p>

            <input
              type="text"
              placeholder="TYPE DELETE"
              value={typed}
              onChange={(e) => setTyped(e.target.value.toUpperCase())}
              className="w-full bg-transparent border-b-2 border-[#3F3F46] focus:border-red-500 text-[#FAFAFA] text-lg font-bold uppercase tracking-widest pb-2 outline-none text-center placeholder-[#3F3F46] transition-colors"
            />

            <div className="flex w-full gap-3 mt-8">
              <button
                onClick={() => {
                  setDeleteState('idle');
                  setTyped('');
                }}
                className="flex-1 h-12 border-2 border-[#3F3F46] bg-transparent text-[#FAFAFA] font-bold uppercase tracking-tighter text-sm rounded-none hover:border-[#FAFAFA]/30 transition-all"
              >
                CANCEL — KEEP MY DATA
              </button>
              <button
                onClick={() => {
                  if (typed === 'DELETE') {
                    setDeleteState('deleting');
                  }
                }}
                disabled={typed !== 'DELETE'}
                className={`flex-1 h-12 font-bold uppercase tracking-tighter text-sm rounded-none transition-all ${
                  typed === 'DELETE' 
                    ? 'bg-red-900/80 text-red-200 hover:bg-red-900 cursor-pointer' 
                    : 'bg-red-900/30 text-red-200/30 cursor-not-allowed border-none'
                }`}
              >
                CONFIRM DELETE
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DeleteAccount;