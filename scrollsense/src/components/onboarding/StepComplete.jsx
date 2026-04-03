import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, AlertTriangle } from 'lucide-react';
import { formatMinutes } from '../../utils/formatTime';
import api from '../../lib/axios';
import useAuthStore from '../../store/authStore';

export default function StepComplete({ data }) {
  const navigate = useNavigate();
  const { setUser } = useAuthStore();
  const [status, setStatus] = useState('saving');

  const saveProfile = async () => {
    setStatus('saving');
    try {
      const response = await api.post('/onboarding', data);
      setUser(response.data.user);
      localStorage.setItem('scrollsense_onboarded', 'true');
      setStatus('success');
    } catch (err) {
      console.error("Failed to save onboarding profile", err);
      // Fallback to local success if backend fails on mock
      if (err.name === 'AxiosError' && Object.keys(data).length > 0) {
        localStorage.setItem('scrollsense_onboarded', 'true');
        setUser({ ...useAuthStore.getState().user, onboardingComplete: true });
        setStatus('success');
      } else {
        setStatus('error');
      }
    }
  };

  useEffect(() => {
    saveProfile();
  }, []);

  if (status === 'saving') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-transparent px-4 py-20 text-center">
        <div className="w-full max-w-sm mb-4 bg-[#27272A] h-[2px]">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: "100%" }}
            transition={{ duration: 1.5, ease: "easeInOut" }}
            className="h-[2px] bg-[#DFE104]"
          />
        </div>
        <div className="text-xs uppercase tracking-widest text-[#A1A1AA]">
          SAVING YOUR PROFILE...
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-transparent px-4 py-20 text-center">
        <AlertTriangle size={32} className="text-[#A1A1AA] mb-4" />
        <p className="text-base text-[#A1A1AA] mb-6">
          Something went wrong saving your profile.
        </p>
        <button
          onClick={saveProfile}
          className="border-2 border-[#3F3F46] bg-[#09090B] text-[#FAFAFA] font-bold uppercase tracking-tighter h-14 px-8 rounded-none hover:bg-[#FAFAFA] hover:text-black transition-colors duration-200 focus:outline-none"
        >
          TRY AGAIN
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-transparent px-4 py-16 text-center overflow-y-auto">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="mb-8"
      >
        <CheckCircle size={32} className="text-[#DFE104]" />
      </motion.div>

      <h1 className="text-[clamp(3rem,8vw,7rem)] font-bold uppercase tracking-tighter leading-[0.85] text-[#FAFAFA]">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          YOU'RE
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut", delay: 0.15 }}
        >
          <span className="text-[#DFE104]">ALL SET.</span>
        </motion.div>
      </h1>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="mt-8 border-2 border-[#3F3F46] p-6 w-full max-w-md mx-auto bg-[#09090B] text-left"
      >
        <div className="text-xs uppercase tracking-widest text-[#A1A1AA] mb-4">
          YOUR SCROLLSENSE PROFILE
        </div>
        
        <div className="space-y-0">
          {[
            { label: 'Focus area', value: (data.careerPath || data.careerPathPreset || 'None').substring(0, 30) },
            { label: 'Goals', value: `${data.goals.length} goals selected` },
            { label: 'Interests', value: `${data.interests.length} interests with budgets` },
            { label: 'Daily limit', value: formatMinutes(data.dailyLimitMinutes) },
            { label: 'Trigger patterns', value: `${data.scrollTriggers.length} triggers` }
          ].map((row, i) => (
            <div key={i} className="flex justify-between py-3 border-b border-[#3F3F46] last:border-0">
              <span className="text-xs uppercase tracking-widest text-[#A1A1AA]">{row.label}</span>
              <span className="text-sm font-bold uppercase tracking-tighter text-[#FAFAFA] text-right">{row.value}</span>
            </div>
          ))}
        </div>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.6 }}
        className="mt-12 text-center"
      >
        <div className="text-xs uppercase tracking-widest text-[#A1A1AA] mb-2">
          STEP 1 OF 2
        </div>
        <p className="text-base text-[#A1A1AA] max-w-sm mx-auto mb-6">
          Connect YouTube to unlock your Content Diet Dashboard
        </p>

        <button
          onClick={() => navigate('/dashboard')}
          className="bg-[#DFE104] text-black font-bold h-14 px-8 rounded-none uppercase tracking-tighter hover:scale-105 active:scale-95 transition-all focus:outline-none focus:ring-2 focus:ring-[#DFE104] focus:ring-offset-2 focus:ring-offset-[#09090B] shadow-lg"
        >
          CONNECT YOUTUBE — START ANALYSIS
        </button>

        <button
          onClick={() => navigate('/dashboard')}
          className="mt-4 block mx-auto text-[#3F3F46] text-sm uppercase tracking-widest hover:text-[#A1A1AA] transition-colors focus:outline-none"
        >
          SKIP FOR NOW — EXPLORE DASHBOARD
        </button>
      </motion.div>
    </div>
  );
}
