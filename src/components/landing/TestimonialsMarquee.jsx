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
    quote: "I genuinely had no idea 91% of my watch history was completely unrelated to placement prep. That single number changed how I approach every session now.",
    name: "ARYAN MEHTA",
    role: "CSE FINAL YEAR, IIT DELHI"
  },
  {
    quote: "The trigger pattern detector told me I scroll hardest on Sunday evenings. I didn't believe it until I saw 6 weeks of data proving exactly that.",
    name: "PRIYA SHANKAR",
    role: "CS STUDENT, NIT TRICHY"
  },
  {
    quote: "I tried blocking apps three times. Always relapsed in a week. ScrollSense doesn't block anything — it just shows you the truth. That's what actually worked.",
    name: "ROHAN VERMA",
    role: "SDE INTERN, BANGALORE"
  },
  {
    quote: "My career relevance score was 6% when I started. After setting my goals in ScrollSense, it's at 34%. I'm watching the same amount — just different content.",
    name: "SNEHA KULKARNI",
    role: "CS STUDENT, BITS PILANI"
  }
];

const ROW_2 = [
  {
    quote: "The Time Refund Tracker is the most motivating thing I've used. '18 hours reclaimed = 126 LeetCode problems' hit different. Actually hit different.",
    name: "KARAN NAIR",
    role: "PLACEMENT SEASON, VIT VELLORE"
  },
  {
    quote: "What I appreciate most is that it never guilt-trips you. It just shows numbers and lets you decide. That trust makes all the difference.",
    name: "DIVYA REDDY",
    role: "SDE-1 AT BANGALORE STARTUP"
  },
  {
    quote: "The cross-platform map revealed I was spending 2.3 hours on Instagram after finishing YouTube. I thought I was taking a break. I was just switching apps.",
    name: "ADITYA SHARMA",
    role: "FINAL YEAR, DTU"
  },
  {
    quote: "My placement prep improved so much just from knowing. Not blocking. Just knowing exactly what was happening. Visibility is the intervention.",
    name: "MEERA IYER",
    role: "CAMPUS PLACEMENT WINNER, MUMBAI"
  }
];

const TestimonialCard = ({ quote, name, role }) => (
  <div className="min-w-[360px] md:min-w-[440px] border-2 border-[#3F3F46] p-6 bg-[#09090B] mr-8 flex flex-col justify-between">
    <p className="text-base md:text-lg text-[#FAFAFA] leading-relaxed whitespace-normal font-medium">
      "{quote}"
    </p>
    <div className="mt-4 pt-4 border-t border-[#3F3F46] flex flex-col md:flex-row md:items-center justify-between gap-2">
      <span className="text-sm font-bold uppercase tracking-wider text-[#FAFAFA]">
        {name}
      </span>
      <span className="text-xs text-[#A1A1AA] uppercase tracking-widest md:ml-auto">
        {role}
      </span>
    </div>
  </div>
);

const TestimonialsMarquee = () => {
  const shouldReduceMotion = useReducedMotion();

  const renderRow = (data, isReduced) => (
    <div className={`flex ${isReduced ? 'overflow-x-auto px-[2.5vw] pb-4' : 'items-stretch'}`}>
      {data.map((item, i) => <TestimonialCard key={i} {...item} />)}
    </div>
  );

  return (
    <section className="bg-[#09090B] py-20 border-t border-[#3F3F46] overflow-hidden">
      
      <div className="text-center mb-8 px-[2.5vw]">
        <span className="text-xs uppercase tracking-widest text-[#A1A1AA]">EARLY ACCESS USERS</span>
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

export default TestimonialsMarquee;
