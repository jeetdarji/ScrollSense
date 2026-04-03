import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

export default function StepWelcome({ goNext }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-transparent px-4 text-center pb-20">
      <div className="absolute top-8 text-base font-bold uppercase tracking-tighter text-[#FAFAFA]">
        SCROLLSENSE
      </div>

      <h1 className="text-[clamp(3rem,8vw,7rem)] font-bold uppercase tracking-tighter leading-[0.85] text-[#FAFAFA]">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          LET'S BUILD
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut", delay: 0.15 }}
        >
          YOUR <span className="text-[#DFE104]">MIRROR.</span>
        </motion.div>
      </h1>

      <motion.p 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="mt-6 text-base md:text-lg text-[#A1A1AA] max-w-md leading-relaxed"
      >
        This takes about 3 minutes. Your answers become the personal lens ScrollSense uses to understand your content. The more honest you are, the more accurate your insights.
      </motion.p>

      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.5 }}
        className="mt-4 text-xs uppercase tracking-widest text-[#3F3F46]"
      >
        3 MINUTES · 8 QUESTIONS · NEVER REPEATED
      </motion.div>

      <motion.button
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.6 }}
        onClick={goNext}
        className="mt-10 bg-[#DFE104] text-black h-14 px-12 rounded-none font-bold uppercase tracking-tighter hover:scale-105 active:scale-95 transition-all focus:outline-none focus:ring-2 focus:ring-[#DFE104] focus:ring-offset-2 focus:ring-offset-[#09090B]"
      >
        LET'S START
      </motion.button>

      <div className="absolute bottom-8 left-0 right-0 flex justify-center">
        <span className="text-xs uppercase tracking-widest text-[#3F3F46]">
          Already set up?{' '}
          <Link to="/dashboard" className="hover:text-[#A1A1AA] underline focus:outline-none">
            GO TO DASHBOARD
          </Link>
        </span>
      </div>
    </div>
  );
}
