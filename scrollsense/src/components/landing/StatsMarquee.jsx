import React from 'react';
import _Marquee from 'react-fast-marquee';
import { useReducedMotion } from 'framer-motion';

// Robust unwrap for Vite ESM / CJS interop
let Marquee = _Marquee;
if (Marquee && typeof Marquee !== 'function' && typeof Marquee.type !== 'function' && typeof Marquee.render !== 'function' && !(Marquee.$$typeof)) {
  if (Marquee.default) Marquee = Marquee.default;
  if (Marquee.default) Marquee = Marquee.default;
}

const STATS = [
  "2 HRS 21 MIN AVERAGE DAILY SOCIAL MEDIA USE",
  "ONLY 12% ACT ON PLATFORM SCREEN TIME WARNINGS",
  "1 IN 3 SOCIAL MEDIA SESSIONS DRIVEN BY HABIT NOT CHOICE",
  "LIMITING SCROLL TO 90 MIN/DAY REDUCES STRESS HORMONES",
];

const Content = () => (
  <div className="flex items-center">
    {STATS.map((stat, i) => (
      <React.Fragment key={i}>
        <span className="text-black font-bold uppercase tracking-tighter text-sm md:text-base mr-16">
          {stat}
        </span>
        <span className="text-black/40 mr-16" aria-hidden="true">/</span>
      </React.Fragment>
    ))}
  </div>
);

const StatsMarquee = () => {
  const shouldReduceMotion = useReducedMotion();

  return (
    <section 
      className="w-full bg-[#DFE104] py-6 overflow-hidden"
      aria-label="Key statistics about scrolling habits"
    >
      {shouldReduceMotion ? (
        <div className="flex overflow-x-auto whitespace-nowrap px-[2.5vw]">
          <Content />
        </div>
      ) : (
        <Marquee
          speed={80}
          gradient={false}
          direction="left"
          autoFill={true}
        >
          <Content />
        </Marquee>
      )}
    </section>
  );
};

export default StatsMarquee;
