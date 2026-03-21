import React, { useState } from 'react';
import { Clock, Target, Heart, Plus, X } from 'lucide-react';
import { useLocalStorage } from '../../hooks/useLocalStorage';

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

const AccountSettings = () => {
  const [onboarding, setOnboarding] = useLocalStorage('scrollsense_onboarding', {
    dailyLimitMinutes: 90,
    goals: [],
    interests: []
  });

  const [limitValue, setLimitValue] = useState(onboarding.dailyLimitMinutes || 90);
  const [goals, setGoals] = useState(onboarding.goals || []);
  const [interests, setInterests] = useState(onboarding.interests || []);

  const saveSettings = (key, value) => {
    setOnboarding(prev => ({ ...prev, [key]: value }));
    // Simulate API call
    // axios.put('/api/user/settings', { [key]: value }).catch(console.error);
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
    if (!interests.find(i => i.name === interestName)) {
      const newInterests = [...interests, { name: interestName, budget: 30 }];
      setInterests(newInterests);
      saveSettings('interests', newInterests);
    }
  };

  const updateInterestBudget = (name, budget) => {
    const newInterests = interests.map(i => i.name === name ? { ...i, budget } : i);
    setInterests(newInterests);
    saveSettings('interests', newInterests);
  };

  const removeInterest = (name) => {
    const newInterests = interests.filter(i => i.name !== name);
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
          className="w-full mt-6 bg-[#DFE104] text-black font-bold h-12 uppercase tracking-tighter text-sm rounded-none hover:bg-white transition-colors"
        >
          SAVE LIMIT
        </button>
      </div>

      {/* GOALS */}
      <div className="border-2 border-[#3F3F46] bg-[#09090B] p-5 rounded-none">
        <div className="flex items-center gap-2 mb-4">
          <Target className="w-[14px] h-[14px] text-[#FAFAFA]" />
          <h3 className="text-xs font-bold uppercase text-[#FAFAFA] m-0">YOUR GOALS</h3>
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
        <div className="flex items-center gap-2 mb-4">
          <Heart className="w-[14px] h-[14px] text-[#FAFAFA]" />
          <h3 className="text-xs font-bold uppercase text-[#FAFAFA] m-0">YOUR INTERESTS & BUDGETS</h3>
        </div>

        <div className="flex flex-col gap-5 mb-6">
          {interests.map(interest => (
            <div key={interest.name} className="flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold uppercase text-[#FAFAFA]">{interest.name}</span>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono text-[#DFE104]">{interest.budget}%</span>
                  <button onClick={() => removeInterest(interest.name)} className="text-[#3F3F46] hover:text-red-400">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </div>
              <input
                type="range"
                min="5"
                max="100"
                step="5"
                value={interest.budget}
                onChange={(e) => updateInterestBudget(interest.name, parseInt(e.target.value))}
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
          {PRESET_INTERESTS.filter(i => !interests.find(existing => existing.name === i)).map(interest => (
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