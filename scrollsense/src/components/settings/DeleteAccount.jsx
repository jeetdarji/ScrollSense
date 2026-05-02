import React, { useState } from 'react';
import { Trash2, User, Activity, Zap, BarChart2, Users, Camera, Play, Settings, AlertTriangle, Loader2, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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

const DeleteAccount = ({ deleteAccount, isDeletingAccount }) => {
  const [deleteState, setDeleteState] = useState('idle'); // 'idle' | 'confirming'
  const [typed, setTyped] = useState('');

  const handleConfirmDelete = () => {
    if (typed === 'DELETE' && !isDeletingAccount) {
      deleteAccount();
    }
  };

  if (isDeletingAccount) {
    return (
      <div className="py-12 text-center w-full flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="w-12 h-12 text-[#DFE104] animate-spin mb-6" />
        <div className="text-xl font-bold text-[#FAFAFA] tracking-tighter uppercase mb-2">
          PURGING DATABASE RECORDS...
        </div>
        <div className="text-xs uppercase tracking-widest text-[#A1A1AA]">
          THIS MAY TAKE A FEW MOMENTS
        </div>
        <div className="text-[10px] uppercase text-[#3F3F46] mt-6">
          DO NOT CLOSE THIS TAB
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
              This permanently deletes everything ScrollSense has about you. No backups. No 'deactivation'. 
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
                onClick={handleConfirmDelete}
                disabled={typed !== 'DELETE'}
                className={`flex-1 h-12 font-bold uppercase tracking-tighter text-sm rounded-none transition-all flex justify-center items-center gap-2 ${
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