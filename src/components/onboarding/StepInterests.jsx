import React, { useState } from 'react';
import { formatMinutes } from '../../utils/formatTime';

export default function StepInterests({ data, updateData }) {
  const [customInput, setCustomInput] = useState('');
  
  const presets = [
    'Cricket', 'Football', 'Music', 'Gaming', 'Fitness', 
    'Cooking', 'Travel', 'Books', 'Movies & TV', 'Finance',
    'Art & Design', 'Photography', 'Anime', 'Science', 
    'Fashion', 'News & Politics'
  ];

  const handleToggle = (label) => {
    let newInterests = [...data.interests];
    const existingIndex = newInterests.findIndex(i => i.label.toLowerCase() === label.toLowerCase());
    
    if (existingIndex >= 0) {
      newInterests.splice(existingIndex, 1);
    } else {
      if (newInterests.length < 20) {
        newInterests.push({ id: label.toLowerCase().replace(/\s+/g, '_'), label, dailyMinutes: 30 });
      }
    }
    updateData('interests', newInterests);
  };

  const handleCustomSubmit = (e) => {
    e.preventDefault();
    const val = customInput.trim();
    if (val) {
      handleToggle(val);
      setCustomInput('');
    }
  };

  const updateBudget = (id, minutes) => {
    const newInterests = data.interests.map(i => 
      i.id === id ? { ...i, dailyMinutes: parseInt(minutes, 10) } : i
    );
    updateData('interests', newInterests);
  };

  return (
    <div className="flex flex-col">
      <div className="mb-4 text-xs uppercase tracking-widest text-[#A1A1AA]">
        SELECT YOUR INTERESTS (pick as many as apply)
      </div>
      
      <div className="flex flex-wrap gap-2 mb-3">
        {presets.map(item => {
          const isSelected = data.interests.some(i => i.label.toLowerCase() === item.toLowerCase());
          return (
            <button
              key={item}
              onClick={() => handleToggle(item)}
              className={`border-2 px-4 py-2 text-sm uppercase tracking-wider font-medium cursor-pointer transition-all focus:outline-none focus:ring-2 focus:ring-[#DFE104] ${
                isSelected 
                  ? 'border-[#DFE104] bg-[#27272A] text-[#FAFAFA]' 
                  : 'border-[#3F3F46] bg-transparent text-[#A1A1AA] hover:border-[#FAFAFA]/40'
              }`}
            >
              {item}
            </button>
          );
        })}
      </div>

      <form onSubmit={handleCustomSubmit} className="mt-3 flex items-center">
        <input
          type="text"
          placeholder="Add your own..."
          className="border-b-2 border-[#3F3F46] bg-transparent text-sm text-[#FAFAFA] focus:border-[#DFE104] outline-none pb-1 w-40 placeholder:text-[#3F3F46]"
          value={customInput}
          onChange={(e) => setCustomInput(e.target.value)}
        />
        <button 
          type="submit"
          className="text-[#DFE104] font-bold text-xl ml-2 px-2 focus:outline-none"
          aria-label="Add custom interest"
        >
          +
        </button>
      </form>

      <div className="mt-12">
        <div className="mb-4 text-xs uppercase tracking-widest text-[#A1A1AA]">
          SET YOUR DAILY TIME BUDGET
        </div>

        {data.interests.length === 0 ? (
          <div className="text-sm text-[#3F3F46] text-center py-8">
            Select at least one interest above to set your daily budgets.
          </div>
        ) : (
          <div className="flex flex-col">
            {data.interests.map(interest => (
              <div key={interest.id} className="flex items-center gap-4 py-4 border-b border-[#3F3F46] last:border-0">
                <div className="text-sm font-bold uppercase tracking-tighter text-[#FAFAFA] min-w-[100px] truncate">
                  {interest.label}
                </div>
                
                <input
                  type="range"
                  min="5"
                  max="120"
                  step="5"
                  value={interest.dailyMinutes}
                  onChange={(e) => updateBudget(interest.id, e.target.value)}
                  className="flex-1 accent-[#DFE104] h-1 bg-[#27272A] rounded-none appearance-none cursor-pointer"
                  aria-label={`Daily budget for ${interest.label}`}
                />
                
                <div className="text-sm font-bold uppercase text-[#DFE104] min-w-[80px] text-right tabular-nums">
                  {formatMinutes(interest.dailyMinutes)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
