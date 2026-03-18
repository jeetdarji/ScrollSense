import React from 'react';
import { motion } from 'framer-motion';
import { Check, X, Shield, Trash2, Eye } from 'lucide-react';

const STORED = [
  "Category percentages (career / interest / junk)",
  "Session timestamps and durations",
  "Mood ratings (emoji — 1 through 5)",
  "Intention categories (boredom, stress, planned)",
  "Your declared goals and interest budgets",
  "Weekly behavioral trend aggregates"
];

const NOT_STORED = [
  "Video titles, thumbnails, or URLs",
  "Search queries or browsing history",
  "Instagram DMs, followers, or posts",
  "Gmail, Drive, Photos, or Calendar data",
  "Your name, photo, or profile information",
  "Any content from outside YouTube watch history"
];

const Privacy = () => {
  return (
    <section id="privacy" className="bg-[#09090B] py-32 border-t border-[#3F3F46]">
      <div className="max-w-[95vw] mx-auto">
        
        <div className="mb-4">
          <span className="text-xs uppercase tracking-widest text-[#DFE104]">PRIVACY FIRST</span>
        </div>

        <motion.h2 
          className="text-5xl md:text-7xl font-bold uppercase tracking-tighter leading-[0.85] text-[#FAFAFA] mb-6 flex flex-col"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <span>WE SEE YOUR PATTERNS.</span>
          <span>NEVER YOUR CONTENT.</span>
        </motion.h2>

        <motion.p 
          className="text-xl text-[#A1A1AA] leading-relaxed max-w-2xl mb-16"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          ScrollSense was designed from day one with one rule: your content stays yours.
        </motion.p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* What We Store */}
          <div className="border-2 border-[#3F3F46] p-8">
            <h3 className="text-lg font-bold uppercase tracking-tighter text-[#FAFAFA] mb-6">
              WHAT WE STORE
            </h3>
            <ul className="flex flex-col">
              {STORED.map((item, i) => (
                <li key={i} className="text-base text-[#A1A1AA] flex items-start gap-3 py-3 border-b border-[#3F3F46] last:border-b-0">
                  <Check className="text-[#DFE104] shrink-0 mt-0.5" size={20} />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* What We Never Store */}
          <div className="border-2 border-[#3F3F46] p-8">
            <h3 className="text-lg font-bold uppercase tracking-tighter text-[#FAFAFA] mb-6">
              WHAT WE NEVER STORE
            </h3>
            <ul className="flex flex-col">
              {NOT_STORED.map((item, i) => (
                <li key={i} className="text-base text-[#A1A1AA] flex items-start gap-3 py-3 border-b border-[#3F3F46] last:border-b-0">
                  <X className="text-[#A1A1AA] shrink-0 mt-0.5" size={20} />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

        </div>

        {/* Trust Badges */}
        <div className="mt-12 flex flex-wrap gap-4">
          <div className="border border-[#3F3F46] px-6 py-3 rounded-none flex items-center gap-3">
            <Shield className="text-[#DFE104]" size={16} />
            <span className="text-sm uppercase tracking-wider text-[#A1A1AA] font-medium">CLIENT-SIDE PROCESSING</span>
          </div>
          <div className="border border-[#3F3F46] px-6 py-3 rounded-none flex items-center gap-3">
            <Trash2 className="text-[#DFE104]" size={16} />
            <span className="text-sm uppercase tracking-wider text-[#A1A1AA] font-medium">60-SECOND FULL DELETE</span>
          </div>
          <div className="border border-[#3F3F46] px-6 py-3 rounded-none flex items-center gap-3">
            <Eye className="text-[#DFE104]" size={16} />
            <span className="text-sm uppercase tracking-wider text-[#A1A1AA] font-medium">DATA VAULT — SEE EVERYTHING WE KNOW</span>
          </div>
        </div>

      </div>
    </section>
  );
};

export default Privacy;
