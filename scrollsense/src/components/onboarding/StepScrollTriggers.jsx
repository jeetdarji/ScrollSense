import React from 'react';
import { motion } from 'framer-motion';
import { Moon, Meh, Zap, Timer, Sun, Pause, UserX, Coffee, Check } from 'lucide-react';

export default function StepScrollTriggers({ data, updateData }) {
  const triggersList = [
    { id: 'late_night', icon: Moon, title: 'LATE AT NIGHT', desc: 'After 10pm when I should be sleeping' },
    { id: 'boredom', icon: Meh, title: "WHEN I'M BORED", desc: 'Nothing specific to do, opening apps out of habit' },
    { id: 'stressed', icon: Zap, title: "WHEN I'M STRESSED", desc: 'Using scroll as an escape from anxiety or pressure' },
    { id: 'procrastinating', icon: Timer, title: 'WHEN PROCRASTINATING', desc: 'Avoiding something I know I should be doing' },
    { id: 'morning', icon: Sun, title: 'FIRST THING IN THE MORNING', desc: 'Opening apps before I even get out of bed' },
    { id: 'between_tasks', icon: Pause, title: 'BETWEEN TASKS', desc: "As a 'quick break' that stretches into much longer" },
    { id: 'lonely', icon: UserX, title: 'WHEN LONELY OR BORED SOCIALLY', desc: 'As a substitute for social connection' },
    { id: 'eating', icon: Coffee, title: 'WHILE EATING OR RESTING', desc: 'Meal-time scroll that becomes a full session' }
  ];

  const toggleTrigger = (id) => {
    let newTriggers = [...data.scrollTriggers];
    if (newTriggers.includes(id)) {
      newTriggers = newTriggers.filter(t => t !== id);
    } else {
      if (newTriggers.length < 6) {
        newTriggers.push(id);
      }
    }
    updateData('scrollTriggers', newTriggers);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {triggersList.map((trigger) => {
        const IconList = trigger.icon;
        const isSelected = data.scrollTriggers.includes(trigger.id);
        
        return (
          <motion.div
            key={trigger.id}
            whileTap={{ scale: 0.98 }}
            onClick={() => toggleTrigger(trigger.id)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggleTrigger(trigger.id);
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
                {trigger.title}
              </h3>
              <p className="text-sm text-[#A1A1AA]">
                {trigger.desc}
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
  );
}
