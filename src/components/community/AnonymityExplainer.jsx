import React from 'react';
import { Shield, EyeOff, BarChart2, LogOut, Lock } from 'lucide-react';
import { motion } from 'framer-motion';

export default function AnonymityExplainer() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      viewport={{ once: true }}
      className="border-2 border-[#3F3F46] p-6 md:p-8 mb-6 bg-[#09090B]"
    >
      <div className="flex items-center gap-3 mb-6">
        <Shield size={18} color="#DFE104" />
        <h2 className="text-base font-bold uppercase tracking-tighter text-[#FAFAFA]">
          HOW ANONYMITY WORKS HERE
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <EyeOff size={16} color="#A1A1AA" className="mb-3" />
          <h3 className="text-xs font-bold uppercase tracking-tighter text-[#FAFAFA] mb-2">
            YOUR IDENTITY
          </h3>
          <p className="text-xs text-[#A1A1AA] leading-relaxed">
            You are assigned a random two-word name like 'Quiet Fox' when you join a group. No one in the group knows who you are.
          </p>
        </div>

        <div>
          <BarChart2 size={16} color="#A1A1AA" className="mb-3" />
          <h3 className="text-xs font-bold uppercase tracking-tighter text-[#FAFAFA] mb-2">
            WHAT OTHERS SEE
          </h3>
          <p className="text-xs text-[#A1A1AA] leading-relaxed">
            Your anonymous name and one number — how much your scroll time changed this week. Nothing else. No content. No patterns. No history.
          </p>
        </div>

        <div>
          <LogOut size={16} color="#A1A1AA" className="mb-3" />
          <h3 className="text-xs font-bold uppercase tracking-tighter text-[#FAFAFA] mb-2">
            LEAVING A GROUP
          </h3>
          <p className="text-xs text-[#A1A1AA] leading-relaxed">
            You can leave or request a new group anytime with no friction. When you leave, your anonymous name is retired — it cannot be traced back.
          </p>
        </div>
      </div>

      <div className="border-t border-[#3F3F46] pt-4 mt-6 flex items-start sm:items-center gap-2">
        <Lock size={11} color="#3F3F46" className="mt-0.5 sm:mt-0 flex-shrink-0" />
        <p className="text-[10px] uppercase tracking-wider text-[#3F3F46]">
          SCROLLSENSE STORES ONLY YOUR ANONYMOUS NAME AND WEEKLY IMPROVEMENT NUMBER — NEVER YOUR REAL IDENTITY IN THE GROUP CONTEXT.
        </p>
      </div>
    </motion.div>
  );
}
