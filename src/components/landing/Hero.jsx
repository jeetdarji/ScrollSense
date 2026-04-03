import React from 'react';
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowDown } from 'lucide-react';

const Hero = () => {
  const { scrollY } = useScroll();
  const shouldReduceMotion = useReducedMotion();
  
  const scale = useTransform(scrollY, [0, 500], [1, 1.15]);
  const opacity = useTransform(scrollY, [0, 300], [1, 0]);

  const animationProps = shouldReduceMotion ? {} : {
    style: { scale, opacity }
  };

  return (
    <section className="min-h-screen bg-[#09090B] pt-32 pb-16 overflow-hidden relative flex flex-col justify-center">
      <div className="max-w-[95vw] mx-auto px-4 md:px-8 w-full relative z-10 flex-1 flex flex-col justify-center">
        
        <div className="relative z-10 w-full lg:max-w-[55%]">
        {/* Eyebrow */}
        <motion.div 
          className="flex items-center mb-4"
          initial={shouldReduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="w-[3px] h-4 bg-[#DFE104] mr-3" />
          <span className="text-xs md:text-sm uppercase tracking-widest text-[#A1A1AA]">
            TAKE BACK CONTROL OF YOUR FEED
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h1 
          className="font-bold uppercase tracking-tighter text-[#FAFAFA] flex flex-col"
          style={{ 
            fontSize: 'clamp(3.5rem, 7.5vw, 8.5rem)',
            lineHeight: '0.85',
            letterSpacing: '-0.03em',
            ...(shouldReduceMotion ? {} : { scale, opacity })
          }}
        >
          <motion.span 
            className="block"
            initial={shouldReduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            KNOW WHAT
          </motion.span>
          <motion.span 
            className="block"
            initial={shouldReduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15 }}
          >
            YOU <span className="text-[#DFE104]">SCROLL</span><span className="text-[#FAFAFA]">.</span>
          </motion.span>
        </motion.h1>

        {/* Subheadline */}
        <motion.p 
          className="text-lg md:text-xl text-[#A1A1AA] font-medium max-w-xl leading-relaxed mt-6"
          initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.4 }}
        >
          ScrollSense shows you exactly what you're consuming across YouTube and Instagram, 
          why you opened the app, and whether any of it is moving your life forward — 
          without blocking a single video.
        </motion.p>

        {/* CTAs */}
        <motion.div 
          className="mt-10 flex gap-4 flex-wrap"
          initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.6 }}
        >
          <Link 
            to="/signup"
            className="flex items-center justify-center bg-[#DFE104] text-black font-bold h-14 px-8 rounded-none text-sm uppercase tracking-tighter hover:scale-105 active:scale-95 transition-all duration-200 whitespace-nowrap focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#DFE104]"
          >
            START FOR FREE — CONNECT YOUTUBE
          </Link>
          <a 
            href="#how-it-works"
            className="flex items-center justify-center border-2 border-[#3F3F46] bg-transparent text-[#FAFAFA] h-14 px-8 rounded-none text-sm uppercase tracking-tighter hover:bg-[#FAFAFA] hover:text-black transition-colors duration-200 whitespace-nowrap focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#DFE104]"
          >
            SEE HOW IT WORKS
          </a>
        </motion.div>

        {/* Micro trust */}
        <motion.p 
          className="mt-6 text-sm text-[#A1A1AA]"
          initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.8 }}
        >
          No credit card. No extension. Works in 30 seconds.
        </motion.p>
        </div>

        {/* Decorative Number — overflow-hidden prevents awkward clipping */}
        <motion.div 
          className="hidden lg:flex absolute right-0 top-1/4 flex-col items-end pointer-events-none overflow-hidden"
          aria-hidden="true"
          initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1 }}
        >
          <span className="text-[18rem] font-bold text-[#27272A] leading-none pr-[-2rem]">141</span>
          <span className="text-xs uppercase tracking-widest text-[#3F3F46] mt-2 max-w-[200px] text-right">
            MINUTES ON SOCIAL MEDIA DAILY<br/>GLOBAL AVERAGE, 2025
          </span>
        </motion.div>

      </div>

      {/* Scroll indicator — respects prefers-reduced-motion */}
      <div className="absolute bottom-8 left-[2.5vw] md:flex flex-col items-start gap-2 hidden">
        <span className="text-xs uppercase tracking-widest text-[#3F3F46]">SCROLL TO EXPLORE</span>
        <ArrowDown 
          className={`text-[#DFE104] ${shouldReduceMotion ? '' : 'animate-bounce'}`} 
          size={20} 
        />
      </div>
    </section>
  );
};

export default Hero;
