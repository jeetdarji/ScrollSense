import React from 'react';
import { motion } from 'framer-motion';

const PROBLEMS = [
  {
    num: "01",
    title: "ZERO VISIBILITY",
    desc: "You scroll for hours but have no record of what you actually watched or why."
  },
  {
    num: "02",
    title: "ALL TIME LOOKS THE SAME",
    desc: "No separation between intentional watching and zombie scrolling."
  },
  {
    num: "03",
    title: "FEED ≠ GOALS",
    desc: "Your content has zero connection to your actual goals or what you care about."
  },
  {
    num: "04",
    title: "INVISIBLE TRIGGERS",
    desc: "Late nights, stress, Sunday anxiety — your patterns repeat, unseen."
  }
];

const Problem = () => {
  return (
    <section className="bg-[#09090B] py-24 md:py-32 border-t border-[#3F3F46]">
      <div className="max-w-[95vw] mx-auto px-4 md:px-8">
        
        <div className="mb-4">
          <span className="text-xs uppercase tracking-widest text-[#DFE104]">THE PROBLEM</span>
        </div>

        <motion.h2 
          className="text-5xl md:text-7xl lg:text-8xl font-bold uppercase tracking-tighter leading-[0.85] text-[#FAFAFA]"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <span className="block">YOUR FEED IS</span>
          <span className="block">RUNNING YOUR LIFE.</span>
        </motion.h2>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-16">
          
          {/* Left Column */}
          <div>
            <p className="text-xl md:text-2xl text-[#A1A1AA] leading-relaxed max-w-xl font-medium">
              You open YouTube for 5 minutes. Forty-five minutes later you're three rabbit holes 
              deep — and you don't even remember how you got there. Sound familiar? The problem 
              isn't willpower. It's that you have zero visibility. No mirror. No data. Just a 
              vague feeling that you should have done something more meaningful instead.
            </p>

            <div className="mt-8 border-l-4 border-[#DFE104] pl-6 py-4 bg-[#27272A]/50">
              <p className="text-lg md:text-xl text-[#FAFAFA] font-medium leading-relaxed">
                The average person loses over 35 full days every year to social media — 
                most of it unintentional, most of it forgotten by the next morning.
              </p>
              <p className="text-xs text-[#3F3F46] mt-2 normal-case">Source: DataReportal / Statista 2025 — 141 min/day × 365 = 863 hrs = ~36 days</p>
            </div>
          </div>

          {/* Right Column */}
          <div className="flex flex-col">
            {PROBLEMS.map((problem, idx) => (
              <motion.div 
                key={problem.num}
                className="w-full border-b border-[#3F3F46] py-5 flex items-start first:pt-0"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.05 }}
              >
                <div 
                  className="text-[3rem] font-bold text-[#27272A] leading-none shrink-0"
                  aria-hidden="true"
                >
                  {problem.num}
                </div>
                <div className="ml-4 flex flex-col justify-center pt-1">
                  <h3 className="text-lg font-bold uppercase tracking-tighter text-[#FAFAFA]">
                    {problem.title}
                  </h3>
                  <p className="text-sm text-[#A1A1AA] leading-relaxed mt-1">
                    {problem.desc}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>

        </div>

      </div>
    </section>
  );
};

export default Problem;
