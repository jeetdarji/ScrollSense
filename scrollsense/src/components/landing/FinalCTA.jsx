import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

const FinalCTA = () => {
  return (
    <section className="bg-[#DFE104] py-24 md:py-32 relative overflow-hidden w-full border-t border-[#DFE104]">
      <div className="max-w-[95vw] mx-auto px-4 md:px-8 relative z-10">
        
        <div className="mb-4">
          <span className="text-xs uppercase tracking-widest text-[#000000]/60 font-medium">
            START TODAY — IT'S FREE
          </span>
        </div>

        <motion.h2 
          className="font-bold uppercase tracking-tighter leading-[0.85] text-[#000000] flex flex-col"
          style={{ fontSize: 'clamp(3.5rem, 11vw, 12rem)' }}
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
        >
          <span>STOP GUESSING.</span>
          <span>START KNOWING.</span>
        </motion.h2>

        <p className="mt-6 text-xl md:text-2xl text-[#000000]/70 max-w-2xl leading-relaxed font-medium">
          Connect your YouTube account in 30 seconds. No credit card. No extension. 
          No hard blocks. Just honest data about your scroll habits — and a path to 
          spending less time on the content getting in the way of what you actually want to do.
        </p>

        <div className="mt-10 flex gap-4 flex-wrap">
          <Link 
            to="/signup"
            className="flex items-center justify-center bg-[#000000] text-[#DFE104] font-bold h-16 px-10 rounded-none text-base uppercase tracking-tighter hover:bg-[#09090B] hover:scale-105 transition-all duration-200 focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
          >
            START FOR FREE — CONNECT YOUTUBE
          </Link>
          <a 
            href="#demo"
            className="flex items-center justify-center border-2 border-black/50 bg-transparent text-black font-bold h-16 px-10 rounded-none text-base uppercase tracking-tighter hover:bg-black/10 transition-colors duration-200 focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
          >
            SEE A LIVE DEMO
          </a>
        </div>

        <div className="mt-10 flex gap-8 flex-wrap items-center">
          <span className="text-sm text-[#000000]/60 uppercase tracking-wider font-bold">2,400+ PEOPLE CONNECTED</span>
          <span className="text-sm text-[#000000]/60 uppercase tracking-wider font-bold hidden md:inline">·</span>
          <span className="text-sm text-[#000000]/60 uppercase tracking-wider font-bold">18 HRS RECLAIMED ON AVERAGE</span>
          <span className="text-sm text-[#000000]/60 uppercase tracking-wider font-bold hidden lg:inline">·</span>
          <span className="text-sm text-[#000000]/60 uppercase tracking-wider font-bold">ZERO VIDEO TITLES STORED</span>
        </div>

      </div>

      {/* Decorative massive text watermark */}
      <div 
        className="absolute bottom-0 right-0 text-[20rem] text-black/5 leading-none pointer-events-none font-bold uppercase tracking-tighter"
        aria-hidden="true"
        style={{ transform: 'translateY(15%)' }}
      >
        SCROLL
      </div>
    </section>
  );
};

export default FinalCTA;
