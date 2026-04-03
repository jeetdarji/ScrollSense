import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import OnboardingLayout from '../components/onboarding/OnboardingLayout';
import StepWelcome from '../components/onboarding/StepWelcome';
import StepPlatforms from '../components/onboarding/StepPlatforms';
import StepAwareness from '../components/onboarding/StepAwareness';
import StepCareerPath from '../components/onboarding/StepCareerPath';
import StepGoals from '../components/onboarding/StepGoals';
import StepInterests from '../components/onboarding/StepInterests';
import StepScrollTriggers from '../components/onboarding/StepScrollTriggers';
import StepDailyLimit from '../components/onboarding/StepDailyLimit';
import StepComplete from '../components/onboarding/StepComplete';
import useAuthStore from '../store/authStore';

const stepVariants = {
  initial: (direction) => ({ opacity: 0, x: direction > 0 ? 40 : -40 }),
  animate: { opacity: 1, x: 0 },
  exit: (direction) => ({ opacity: 0, x: direction > 0 ? -40 : 40 })
};

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [showValidationMessage, setShowValidationMessage] = useState(false);
  
  const [onboardingData, setOnboardingData] = useState({
    platforms: [],
    awarenessLevel: '',
    careerPath: '',
    careerPathPreset: '',
    goals: [],
    customGoal: '',
    interests: [],
    scrollTriggers: [],
    dailyLimitMinutes: 90
  });

  const isOnboarded = localStorage.getItem('scrollsense_onboarded') === 'true' || user?.onboardingComplete;

  useEffect(() => {
    if (isOnboarded) {
      navigate('/dashboard', { replace: true });
    }
  }, [navigate, isOnboarded]);

  const updateData = (field, value) => {
    setOnboardingData(prev => ({ ...prev, [field]: value }));
    setShowValidationMessage(false);
  };

  const isCurrentStepValid = () => {
    switch (currentStep) {
      case 1: return onboardingData.platforms.length > 0;
      case 2: return onboardingData.awarenessLevel !== '';
      case 3: return onboardingData.careerPath.length >= 3 || onboardingData.careerPathPreset !== '';
      case 4: return onboardingData.goals.length >= 1;
      case 5: return onboardingData.interests.length >= 1;
      case 6: return onboardingData.scrollTriggers.length >= 1;
      case 7: return onboardingData.dailyLimitMinutes >= 15;
      default: return true;
    }
  };

  const getValidationMessage = () => {
    if (currentStep === 3) return "SELECT A PRESET OR ENTER AT LEAST 3 CHARACTERS";
    return "SELECT AT LEAST ONE OPTION TO CONTINUE";
  };

  const goNext = () => {
    if (currentStep > 0 && currentStep < 8 && !isCurrentStepValid()) {
      setShowValidationMessage(true);
      return;
    }
    setDirection(1);
    setCurrentStep(prev => prev + 1);
    setShowValidationMessage(false);
  };

  const goBack = () => {
    setDirection(-1);
    setCurrentStep(prev => prev - 1);
    setShowValidationMessage(false);
  };

  if (isOnboarded) {
    return null; // Prevent showing welcome page while redirecting
  }

  const renderCurrentStep = () => {
    const props = { data: onboardingData, updateData, goNext };
    
    switch (currentStep) {
      case 0: return <StepWelcome {...props} />;
      case 1: return <StepPlatforms {...props} />;
      case 2: return <StepAwareness {...props} />;
      case 3: return <StepCareerPath {...props} />;
      case 4: return <StepGoals {...props} />;
      case 5: return <StepInterests {...props} />;
      case 6: return <StepScrollTriggers {...props} />;
      case 7: return <StepDailyLimit {...props} />;
      case 8: return <StepComplete data={onboardingData} />;
      default: return null;
    }
  };

  if (currentStep === 0 || currentStep === 8) {
    return (
      <div className="relative min-h-screen bg-[#09090B] text-[#FAFAFA] font-sans selection:bg-[#DFE104] selection:text-black">
        <div className="pointer-events-none fixed inset-0 z-0 h-full w-full opacity-[0.03]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }} />
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentStep}
            custom={direction}
            variants={stepVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="relative z-10"
          >
            {renderCurrentStep()}
          </motion.div>
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-[#09090B]">
      <div className="pointer-events-none fixed inset-0 z-0 h-full w-full opacity-[0.03]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }} />
      <div className="relative z-10">
        <OnboardingLayout 
          currentStep={currentStep}
          goBack={goBack}
          goNext={goNext}
          isValid={isCurrentStepValid()}
          validationMessage={getValidationMessage()}
          showValidationMessage={showValidationMessage}
        >
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={currentStep}
              custom={direction}
              variants={stepVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.3, ease: 'easeInOut' }}
            >
              {renderCurrentStep()}
            </motion.div>
          </AnimatePresence>
        </OnboardingLayout>
      </div>
    </div>
  );
}
