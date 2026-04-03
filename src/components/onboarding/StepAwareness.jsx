import React from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

export default function StepAwareness({ data, updateData }) {
  const options = [
    { id: 'clueless', num: '01', title: 'COMPLETELY CLUELESS', desc: 'I have no idea how much I actually scroll. Probably more than I think.' },
    { id: 'vague', num: '02', title: 'VAGUELY AWARE', desc: "I know I scroll too much but I've never really looked at the data." },
    { id: 'aware', num: '03', title: 'PRETTY AWARE', desc: "I've checked my screen time before. I know the rough numbers." },
    { id: 'very_aware', num: '04', title: 'VERY AWARE AND FRUSTRATED', desc: "I know exactly how much I scroll and I'm here because I want to change it." }
  ];

  return (
    <div className="flex flex-col gap-3">
      {options.map((opt) => (
        <motion.div
          key={opt.id}
          whileTap={{ scale: 0.98 }}
          onClick={() => updateData('awarenessLevel', opt.id)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              updateData('awarenessLevel', opt.id);
            }
          }}
          className={`relative w-full flex items-start gap-4 p-5 border-2 rounded-none cursor-pointer transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#DFE104] focus:ring-offset-2 focus:ring-offset-[#09090B] ${
            data.awarenessLevel === opt.id
              ? 'border-[#DFE104] bg-[#27272A]'
              : 'border-[#3F3F46] bg-[#09090B] hover:border-[#FAFAFA]/30 hover:bg-[#27272A]/50'
          }`}
        >
          {data.awarenessLevel === opt.id && (
            <div className="absolute top-4 right-4">
              <Check size={16} className="text-[#DFE104]" />
            </div>
          )}
          
          <div className="text-[2.5rem] font-bold text-[#27272A] leading-none" aria-hidden="true">
            {opt.num}
          </div>
          
          <div className="flex-1 mt-1 pr-6">
            <h3 className="text-base font-bold uppercase tracking-tighter text-[#FAFAFA] mb-1">
              {opt.title}
            </h3>
            <p className="text-sm text-[#A1A1AA]">
              {opt.desc}
            </p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
