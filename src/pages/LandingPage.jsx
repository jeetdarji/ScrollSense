import React, { Suspense } from 'react';

import Navbar from '../components/landing/Navbar';
import Hero from '../components/landing/Hero';
import StatsMarquee from '../components/landing/StatsMarquee';
import Problem from '../components/landing/Problem';
import Features from '../components/landing/Features';
import HowItWorks from '../components/landing/HowItWorks';
import Privacy from '../components/landing/Privacy';
import InsightsMarquee from '../components/landing/InsightsMarquee';
import FinalCTA from '../components/landing/FinalCTA';
import Footer from '../components/landing/Footer';

const Comparison = React.lazy(() => import('../components/landing/Comparison'));

const NoiseOverlay = () => (
  <svg 
    style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      opacity: 0.03,
      pointerEvents: 'none',
      zIndex: 50
    }}
    aria-hidden="true"
  >
    <filter id="noise">
      <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="4" stitchTiles="stitch"/>
      <feColorMatrix type="saturate" values="0"/>
    </filter>
    <rect width="100%" height="100%" filter="url(#noise)"/>
  </svg>
);

export default function LandingPage() {
  return (
    <div className="bg-background min-h-screen text-foreground relative selection:bg-accent selection:text-accent-foreground">
      <NoiseOverlay />
      
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[60] focus:px-4 focus:py-2 focus:bg-accent focus:text-accent-foreground focus:outline-none placeholder-shown:">
        Skip to main content
      </a>

      <Navbar />
      
      <main id="main-content">
        <Hero />
        <StatsMarquee />
        <Problem />
        <Features />
        <HowItWorks />
        <Privacy />
        <InsightsMarquee />
        <Suspense fallback={<div className="py-32 text-center text-muted-foreground">Loading Comparison...</div>}>
          <Comparison />
        </Suspense>
        <FinalCTA />
      </main>

      <Footer />
    </div>
  );
}