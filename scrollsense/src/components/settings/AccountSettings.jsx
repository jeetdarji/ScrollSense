import React, { useState, useEffect } from 'react';
import { Clock, Target, Heart, Plus, X, Loader2 } from 'lucide-react';

const DEFAULT_GOALS = [
  "Read 2 books a month",
  "Build a side project",
  "Learn a new language",
  "Exercise 4x a week",
  "Sleep 8 hours a night",
  "Reduce screen time"
];

const PRESET_INTERESTS = [
  "Technology", "Design", "Fitness", "History", "Science", "Art", "Music", "Business", "Gaming"
];

const AccountSettings = ({ settings, saveAccountSettings, isSavingAccount }) => {
  // Use local state tracking for inputs, initializing from server props safely
  const [limitValue, setLimitValue] = useState(settings?.dailyLimitMinutes || 90);
  const [goals, setGoals] = useState(settings?.goals || []);
  const [interests, setInterests] = useState(settings?.interests || []);
  const [saveSuccessMap, setSaveSuccessMap] = useState({});

  useEffect(() => {
    if (settings) {
      setLimitValue(settings.dailyLimitMinutes || 90);
      setGoals(settings.goals || []);
      setInterests(settings.interests || []);
    }
  }, [settings]);

  const saveSettings = async (key, value) => {
    try {
      // Sync back to local storage for backward compatibility with old components
      const currentOnboarding = JSON.parse(localStorage.getItem('scrollsense_onboarding') || '{}');
      localStorage.setItem('scrollsense_onboarding', JSON.stringify({ ...currentOnboarding, [key]: value }));
      
      await saveAccountSettings({ [key]: value });

      // Show temporary success feedback
      setSaveSuccessMap(prev => ({ ...prev, [key]: true }));
      setTimeout(() => setSaveSuccessMap(prev => ({ ...prev, [key]: false })), 2000);
    } catch (error) {
      console.error(`Failed to save ${key}:`, error);
    }
  };

  const handleSaveLimit = () => {
    saveSettings('dailyLimitMinutes', limitValue);
  };

  const addGoal = (goal) => {
    if (!goals.includes(goal)) {
      const newGoals = [...goals, goal];
      setGoals(newGoals);
      saveSettings('goals', newGoals);
    }
  };

  const removeGoal = (goal) => {
    const newGoals = goals.filter(g => g !== goal);
    setGoals(newGoals);
    saveSettings('goals', newGoals);
  };

  const addInterest = (interestName) => {
    if (!interests.find(i => i.label === interestName)) {
      const id = interestName.toLowerCase().replace(/\s+/g, '_');
      const newInterests = [...interests, { id, label: interestName, dailyMinutes: 30 }];
      setInterests(newInterests);
      saveSettings('interests', newInterests);
    }
  };

  const updateInterestBudget = (id, dailyMinutes) => {
    const newInterests = interests.map(i => i.id === id ? { ...i, dailyMinutes } : i);
    setInterests(newInterests);
  };
  
  const handleInterestBudgetRelease = (id, dailyMinutes) => {
    const newInterests = interests.map(i => i.id === id ? { ...i, dailyMinutes } : i);
    saveSettings('interests', newInterests);
  };

  const removeInterest = (id) => {
    const newInterests = interests.filter(i => i.id !== id);
    setInterests(newInterests);
    saveSettings('interests', newInterests);
  };

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* DAILY LIMIT */}
      <div className="border-2 border-[#3F3F46] bg-[#09090B] p-5 rounded-none">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-[14px] h-[14px] text-[#FAFAFA]" />
          <h3 className="text-xs font-bold uppercase text-[#FAFAFA] m-0">DAILY SCROLL LIMIT</h3>
        </div>

        <div className="text-center py-4">
          <div className="text-[clamp(3rem,8vw,4rem)] font-bold text-[#DFE104] leading-none mb-1">
            {limitValue} MIN
          </div>
          <div className="text-xs uppercase text-[#3F3F46] font-bold tracking-wider">
            PER DAY
          </div>
        </div>

        <input
          type="range"
          min="15"
          max="300"
          step="15"
          value={limitValue}
          onChange={(e) => setLimitValue(parseInt(e.target.value))}
          className="w-full h-2 bg-[#27272A] appearance-none cursor-pointer accent-[#DFE104] outline-none"
        />
        
        <div className="flex justify-between text-[10px] uppercase text-[#3F3F46] mt-2 font-bold tracking-wider">
          <span>15 MIN</span>
          <span>1 HR</span>
          <span>2 HRS</span>
          <span>5 HRS</span>
        </div>

        <button
          onClick={handleSaveLimit}
          disabled={isSavingAccount}
          className="w-full mt-6 bg-[#DFE104] text-black font-bold h-12 uppercase tracking-tighter text-sm rounded-none hover:bg-white transition-colors flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {isSavingAccount && !saveSuccessMap.dailyLimitMinutes ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {saveSuccessMap.dailyLimitMinutes ? "LIMIT SAVED!" : "SAVE LIMIT"}
        </button>
      </div>

      {/* GOALS */}
      <div className="border-2 border-[#3F3F46] bg-[#09090B] p-5 rounded-none">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Target className="w-[14px] h-[14px] text-[#FAFAFA]" />
            <h3 className="text-xs font-bold uppercase text-[#FAFAFA] m-0">YOUR GOALS</h3>
          </div>
          {saveSuccessMap.goals && <span className="text-[10px] uppercase text-[#DFE104] font-bold">SAVED</span>}
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
          {goals.map(goal => (
            <div key={goal} className="border border-[#DFE104] bg-[#DFE104]/10 px-3 py-1.5 flex items-center gap-2">
              <span className="text-xs uppercase font-bold text-[#FAFAFA]">{goal}</span>
              <button onClick={() => removeGoal(goal)} className="text-[#DFE104] hover:text-white">
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
          {goals.length === 0 && (
            <span className="text-xs text-[#A1A1AA] italic">No goals set yet.</span>
          )}
        </div>

        <div className="text-[10px] uppercase text-[#A1A1AA] mb-3 font-bold tracking-widest">
          ADD A NEW GOAL:
        </div>
        <div className="flex flex-wrap gap-2">
          {DEFAULT_GOALS.filter(g => !goals.includes(g)).map(goal => (
            <button
              key={goal}
              onClick={() => addGoal(goal)}
              className="border border-[#3F3F46] px-3 py-1.5 text-[10px] uppercase text-[#A1A1AA] hover:border-[#FAFAFA] hover:text-[#FAFAFA] transition-all flex items-center gap-1 bg-transparent"
            >
              <Plus className="w-3 h-3" /> {goal}
            </button>
          ))}
        </div>
      </div>

      {/* INTERESTS */}
      <div className="border-2 border-[#3F3F46] bg-[#09090B] p-5 rounded-none">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Heart className="w-[14px] h-[14px] text-[#FAFAFA]" />
            <h3 className="text-xs font-bold uppercase text-[#FAFAFA] m-0">YOUR INTERESTS & BUDGETS</h3>
          </div>
          {saveSuccessMap.interests && <span className="text-[10px] uppercase text-[#DFE104] font-bold">SAVED</span>}
        </div>

        <div className="flex flex-col gap-5 mb-6">
          {interests.map(interest => (
            <div key={interest.id} className="flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold uppercase text-[#FAFAFA]">{interest.label}</span>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono text-[#DFE104]">{interest.dailyMinutes} MIN</span>
                  <button onClick={() => removeInterest(interest.id)} className="text-[#3F3F46] hover:text-red-400">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </div>
              <input
                type="range"
                min="5"
                max="120"
                step="5"
                value={interest.dailyMinutes}
                onChange={(e) => updateInterestBudget(interest.id, parseInt(e.target.value))}
                onMouseUp={(e) => handleInterestBudgetRelease(interest.id, parseInt(e.target.value))}
                onTouchEnd={(e) => handleInterestBudgetRelease(interest.id, parseInt(e.target.value))}
                className="w-full h-1 bg-[#27272A] appearance-none cursor-pointer accent-[#DFE104] outline-none"
              />
            </div>
          ))}
          {interests.length === 0 && (
            <span className="text-xs text-[#A1A1AA] italic">No interests selected.</span>
          )}
        </div>

        <div className="text-[10px] uppercase text-[#A1A1AA] mb-3 font-bold tracking-widest border-t border-[#3F3F46] pt-4">
          ADD MORE INTERESTS:
        </div>
        <div className="flex flex-wrap gap-2">
          {PRESET_INTERESTS.filter(i => !interests.find(existing => existing.label === i)).map(interest => (
            <button
              key={interest}
              onClick={() => addInterest(interest)}
              className="border border-[#3F3F46] px-3 py-1.5 text-[10px] uppercase text-[#A1A1AA] hover:border-[#FAFAFA] hover:text-[#FAFAFA] transition-all flex items-center gap-1 bg-transparent"
            >
              <Plus className="w-3 h-3" /> {interest}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AccountSettings;