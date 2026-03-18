import React from 'react';
import { motion } from 'framer-motion';
import { TrendingDown, Target, Briefcase, BarChart2, Smile, Clock, Check } from 'lucide-react';

export default function StepGoals({ data, updateData }) {
  const goalsList = [
    { id: 'reduce_total', icon: TrendingDown, title: 'REDUCE TOTAL SCROLL TIME', desc: 'Spend fewer hours on social media overall' },
    { id: 'intentional', icon: Target, title: 'SCROLL MORE INTENTIONALLY', desc: 'Only open apps when I actually want to, not from habit' },
    { id: 'career_content', icon: Briefcase, title: 'WATCH MORE RELEVANT CONTENT', desc: 'Shift my feed toward content that actually helps me' },
    { id: 'understand_patterns', icon: BarChart2, title: 'UNDERSTAND MY PATTERNS', desc: 'See when, why, and what I scroll — just the data' },
    { id: 'better_mood', icon: Smile, title: 'FEEL BETTER AFTER SCROLLING', desc: 'Stop ending sessions feeling worse than when I started' },
    { id: 'reclaim_time', icon: Clock, title: 'RECLAIM TIME FOR WHAT MATTERS', desc: 'Turn scroll hours into something I actually care about' }
  ];

  const toggleGoal = (id) => {
    let newGoals = [...data.goals];
    if (newGoals.includes(id)) {
      newGoals = newGoals.filter(g => g !== id);
    } else {
      if (newGoals.length < 5) {
        newGoals.push(id);
      }
    }
    updateData('goals', newGoals);
  };

  return (
    <div className="flex flex-col">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {goalsList.map((goal) => {
          const IconList = goal.icon;
          const isSelected = data.goals.includes(goal.id);
          
          return (
            <motion.div
              key={goal.id}
              whileTap={{ scale: 0.98 }}
              onClick={() => toggleGoal(goal.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  toggleGoal(goal.id);
                }
              }}
              className={`relative p-5 border-2 rounded-none cursor-pointer flex gap-4 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#DFE104] focus:ring-offset-2 focus:ring-offset-[#09090B] ${
                isSelected
                  ? 'border-[#DFE104] bg-[#27272A]'
                  : 'border-[#3F3F46] bg-[#09090B] hover:border-[#FAFAFA]/30 hover:bg-[#27272A]/50'
              }`}
            >
              <div className="pt-1">
                <IconList size={20} className={isSelected ? 'text-[#DFE104]' : 'text-[#3F3F46]'} aria-hidden="true" />
              </div>
              
              <div className="flex-1 pr-6">
                <h3 className="text-base font-bold uppercase tracking-tighter text-[#FAFAFA] mb-1">
                  {goal.title}
                </h3>
                <p className="text-sm text-[#A1A1AA]">
                  {goal.desc}
                </p>
              </div>

              {isSelected && (
                <div className="absolute top-4 right-4">
                  <Check size={16} className="text-[#DFE104]" />
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      <div className="mt-8">
        <label htmlFor="custom-goal" className="block text-xs uppercase tracking-widest text-[#A1A1AA] mb-3">
          ANYTHING ELSE? (OPTIONAL)
        </label>
        <input
          id="custom-goal"
          type="text"
          placeholder="Add your own goal..."
          maxLength={100}
          className="bg-transparent border-b-2 border-[#3F3F46] focus:border-[#DFE104] text-[#FAFAFA] text-lg font-medium w-full pb-3 outline-none transition-colors duration-200 placeholder:text-[#3F3F46]"
          value={data.customGoal || ''}
          onChange={(e) => updateData('customGoal', e.target.value)}
        />
      </div>
    </div>
  );
}
