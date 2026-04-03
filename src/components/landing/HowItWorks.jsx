import React from 'react';
import { motion } from 'framer-motion';

const STEPS = [
  {
    num: "01",
    label: "STEP 1",
    title: "CONNECT IN 30 SECONDS",
    desc: "Sign up with your Google account. YouTube watch history, channel data, and subscription list fetch instantly via OAuth. Your Content Diet Dashboard is live before you finish reading this page. No extension. No credit card.",
    time: "TAKES 30 SECONDS"
  },
  {
    num: "02",
    label: "STEP 2",
    title: "SET YOUR GOALS",
    desc: "Tell ScrollSense what you care about, the skills you're building, and your genuine interests with daily time budgets. This takes 3 minutes. Content that aligns with your goals counts. Everything else is measured against what you said you wanted.",
    time: "TAKES 3 MINUTES"
  },
  {
    num: "03",
    label: "STEP 3",
    title: "SEE THE TRUTH",
    desc: "Your Content Diet Dashboard, Goal Relevance Score, and Trigger Pattern Detector activate immediately. Upload your Instagram data export for full cross-platform insights. The complete picture is yours within 24 hours.",
    time: "FULL INSIGHTS IN 24 HRS"
  }
];

const HowItWorks = () => {
  return (
    <section id="how-it-works" className="bg-[#09090B] py-24 md:py-32 border-t border-[#3F3F46]">
      <div className="max-w-[95vw] mx-auto px-4 md:px-8">
        
        <div className="mb-4">
          <span className="text-xs uppercase tracking-widest text-[#DFE104]">HOW IT WORKS</span>
        </div>

        <motion.h2 
          className="text-5xl md:text-7xl font-bold uppercase tracking-tighter leading-[0.85] text-[#FAFAFA] mb-16"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          UP AND RUNNING IN THREE STEPS.
        </motion.h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-[#3F3F46] border border-[#3F3F46]">
          {STEPS.map((step, idx) => (
            <motion.div 
              key={step.num}
              className="bg-[#09090B] p-8 md:p-12 flex flex-col h-full"
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: idx * 0.15 }}
            >
              <div 
                className="text-[8rem] font-bold leading-none text-[#27272A]"
                aria-hidden="true"
              >
                {step.num}
              </div>
              
              <div className="text-xs uppercase tracking-widest text-[#DFE104] mt-[-1.5rem] relative z-10">
                {step.label}
              </div>
              
              <h3 className="text-2xl md:text-3xl font-bold uppercase tracking-tighter text-[#FAFAFA] mt-2 relative z-10">
                {step.title}
              </h3>
              
              <p className="text-base md:text-lg text-[#A1A1AA] leading-relaxed mt-4 flex-grow relative z-10">
                {step.desc}
              </p>
              
              <div className="text-xs uppercase tracking-widest text-[#3F3F46] mt-8 relative z-10 font-bold border-t border-[#3F3F46] pt-4">
                {step.time}
              </div>
            </motion.div>
          ))}
        </div>

      </div>
    </section>
  );
};

export default HowItWorks;
