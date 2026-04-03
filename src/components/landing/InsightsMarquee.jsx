import React from 'react';
import _Marquee from 'react-fast-marquee';
import { useReducedMotion } from 'framer-motion';

// Robust unwrap for Vite ESM / CJS interop
let Marquee = _Marquee;
if (Marquee && typeof Marquee !== 'function' && typeof Marquee.type !== 'function' && typeof Marquee.render !== 'function' && !(Marquee.$$typeof)) {
  if (Marquee.default) Marquee = Marquee.default;
  if (Marquee.default) Marquee = Marquee.default;
}

const ROW_1 = [
  {
    quote: "The average person spends 2 hours and 21 minutes on social media every day — that's nearly 35 full days every year.",
    source: "DATAREPORTAL / STATISTA, 2025"
  },
  {
    quote: "Only 12% of users consistently act on the 'time well spent' insights their platforms already show them.",
    source: "SOCIAL MEDIA SCREEN TIME REPORT, 2025"
  },
  {
    quote: "People tend to underestimate how many times they visit social media each day — heavy users and young people provide the most inaccurate estimates.",
    source: "PMC / UNIVERSITY OF NORWAY STUDY"
  },
  {
    quote: "Limiting social media to under 90 minutes per day significantly reduced cortisol levels in a 2025 meta-study.",
    source: "SOCIAL MEDIA & HEALTH RESEARCH, 2025"
  },
  {
    quote: "Gen Z individuals average approximately 9 hours per day across all screens — the equivalent of a full-time job.",
    source: "DEMAND SAGE / SKILLADEMIA, 2025"
  }
];

const ROW_2 = [
  {
    quote: "Around one third of social media use can be linked to self-control challenges and habit formation — not conscious choice.",
    source: "BAKER CENTER FOR CHILDREN AND FAMILIES"
  },
  {
    quote: "What people do on social media, and when they do it, matters more than how long they spend there.",
    source: "SCIENTIFIC REPORTS, 2025"
  },
  {
    quote: "Teens who spent more than 3 hours per day on social media faced nearly double the risk of mental health challenges.",
    source: "U.S. HEALTH STUDY / PEW RESEARCH, 2024"
  },
  {
    quote: "The shift to short-form video between 2023 and 2025 added nearly 30 minutes of additional screen time per week globally.",
    source: "DATAREPORTAL DEEP DIVE, 2025"
  },
  {
    quote: "Almost half of all teenagers say they are online 'almost constantly' — up from 24% just a decade ago.",
    source: "PEW RESEARCH CENTER, 2024"
  }
];

const InsightCard = ({ quote, source }) => (
  <div className="min-w-[380px] md:min-w-[460px] border-2 border-[#3F3F46] p-6 bg-[#09090B] mr-8 flex flex-col justify-between">
    <p className="text-base md:text-lg text-[#FAFAFA] leading-relaxed whitespace-normal italic">
      "{quote}"
    </p>
    <div className="mt-4 pt-4 border-t border-[#3F3F46]">
      <span className="text-xs uppercase tracking-widest text-[#A1A1AA]">
        — {source}
      </span>
    </div>
  </div>
);

const InsightsMarquee = () => {
  const shouldReduceMotion = useReducedMotion();

  const renderRow = (data, isReduced) => (
    <div className={`flex ${isReduced ? 'overflow-x-auto px-[2.5vw] pb-4' : 'items-stretch'}`}>
      {data.map((item, i) => <InsightCard key={i} {...item} />)}
    </div>
  );

  return (
    <section className="bg-[#09090B] py-24 md:py-32 border-t border-[#3F3F46] overflow-hidden">
      
      <div className="text-center mb-8 px-[2.5vw]">
        <span className="text-xs uppercase tracking-widest text-[#A1A1AA]">WHAT THE DATA SAYS</span>
      </div>

      <div className="w-full">
        {shouldReduceMotion ? (
          <>
            {renderRow(ROW_1, true)}
            <div className="mt-6">
              {renderRow(ROW_2, true)}
            </div>
          </>
        ) : (
          <>
            <Marquee speed={40} direction="left" gradient={false} pauseOnHover={true}>
              {renderRow(ROW_1, false)}
            </Marquee>
            <div className="mt-6">
              <Marquee speed={30} direction="right" gradient={false} pauseOnHover={true}>
                {renderRow(ROW_2, false)}
              </Marquee>
            </div>
          </>
        )}
      </div>

    </section>
  );
};

export default InsightsMarquee;
