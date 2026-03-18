import React, { useEffect, useRef } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';

export default function OnboardingLayout({ 
  currentStep, 
  children, 
  goBack, 
  goNext, 
  isValid, 
  validationMessage,
  showValidationMessage
}) {
  const stepTitles = {
    1: "WHICH PLATFORMS DO YOU USE?",
    2: "HOW MUCH DO YOU KNOW ABOUT YOUR SCROLL HABITS?",
    3: "WHAT'S YOUR MAIN FOCUS AREA?",
    4: "WHAT DO YOU WANT TO ACHIEVE WITH SCROLLSENSE?",
    5: "WHAT ARE YOUR GENUINE INTERESTS?",
    6: "WHEN DO YOU SCROLL MOST?",
    7: "WHAT'S YOUR COMFORTABLE DAILY LIMIT?"
  };

  const stepSubtexts = {
    1: "We'll tailor your experience to the platforms you actually scroll on.",
    2: "Be honest — this is just to calibrate your starting point. No judgment.",
    3: "This shapes what counts as 'relevant' content in your feed analysis. Pick the closest match or write your own.",
    4: "Pick everything that resonates. Your goals shape your weekly digest and the alternatives we suggest when triggers hit.",
    5: "Content in these categories is valid for you — it won't be flagged as random scrolling. Set a daily time budget for each interest so you can enjoy it without it running away.",
    6: "Knowing your trigger situations helps ScrollSense warn you before a doom-scroll session starts. Pick everything that sounds familiar.",
    7: "This is not a hard block — it's your personal threshold. When you reach it, ScrollSense will ask how you're feeling. You're always in control."
  };

  const headerRef = useRef(null);

  useEffect(() => {
    if (headerRef.current) {
      headerRef.current.focus();
    }
  }, [currentStep]);

  return (
    <div className="min-h-screen bg-[#09090B] flex flex-col relative text-[#FAFAFA] font-sans selection:bg-[#DFE104] selection:text-black">
      <div className="fixed top-0 left-0 right-0 h-14 z-50 bg-[#09090B] flex items-center justify-between px-4 border-b border-[#3F3F46]">
        <a href="/" className="font-bold uppercase tracking-tighter text-sm text-[#FAFAFA]">SCROLLSENSE</a>
        <div className="text-xs uppercase tracking-widest text-[#A1A1AA]" aria-live="polite">
          STEP {currentStep} OF 7
        </div>
      </div>

      <div className="fixed top-14 left-0 right-0 h-[2px] bg-[#27272A] z-50">
        <div 
          className="h-full bg-[#DFE104] transition-all duration-500 ease-out"
          style={{ width: `${(currentStep / 7) * 100}%` }}
        />
      </div>

      <main className="flex-1 overflow-y-auto mt-[58px] mb-[72px]">
        <div className="max-w-2xl mx-auto w-full px-4 py-12 md:py-16">
          <div className="text-xs uppercase tracking-widest text-[#3F3F46] mb-4">
            0{currentStep}
          </div>
          
          <h1 
            ref={headerRef}
            tabIndex={-1}
            className="text-3xl md:text-4xl lg:text-5xl font-bold uppercase tracking-tighter leading-[0.9] text-[#FAFAFA] mb-3 focus:outline-none"
          >
            {stepTitles[currentStep]}
          </h1>
          
          <p className="text-base md:text-lg text-[#A1A1AA] leading-relaxed mb-8 md:mb-10">
            {stepSubtexts[currentStep]}
          </p>

          {children}
        </div>
      </main>

      <div className="fixed bottom-0 left-0 right-0 h-[72px] bg-[#09090B] border-t border-[#3F3F46] z-50">
        <div className="max-w-2xl mx-auto px-4 h-full flex items-center justify-between">
          <div className="flex-1">
            {currentStep > 1 && (
              <button 
                onClick={goBack}
                className="text-[#A1A1AA] text-sm uppercase tracking-widest flex items-center gap-2 hover:text-[#FAFAFA] transition-colors focus:outline-none focus-visible:text-[#DFE104]"
              >
                <ArrowLeft size={16} /> BACK
              </button>
            )}
          </div>
          
          <div className="flex-1 flex justify-center w-full min-w-max">
            {showValidationMessage && !isValid && (
              <span className="text-xs uppercase tracking-widest text-[#A1A1AA] text-center whitespace-nowrap">
                {validationMessage || "SELECT AT LEAST ONE OPTION TO CONTINUE"}
              </span>
            )}
          </div>
          
          <div className="flex-1 flex justify-end">
            <button 
              onClick={goNext}
              className={`flex items-center gap-2 h-12 px-6 rounded-none text-sm uppercase tracking-tighter transition-all focus:outline-none focus:ring-2 focus:ring-[#DFE104] focus:ring-offset-2 focus:ring-offset-[#09090B] ${
                isValid 
                  ? 'bg-[#DFE104] text-black font-bold hover:scale-105 active:scale-95' 
                  : 'bg-[#27272A] text-[#3F3F46] cursor-not-allowed'
              }`}
            >
              CONTINUE <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
