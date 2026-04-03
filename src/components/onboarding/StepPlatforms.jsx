import React from 'react';
import { motion } from 'framer-motion';
import { Youtube, Instagram, Check } from 'lucide-react';

export default function StepPlatforms({ data, updateData }) {
  const togglePlatform = (platform) => {
    let newPlatforms = [...data.platforms];
    
    if (platform === 'both') {
      if (newPlatforms.includes('both')) {
        newPlatforms = [];
      } else {
        newPlatforms = ['both', 'youtube', 'instagram'];
      }
    } else {
      if (newPlatforms.includes(platform)) {
        newPlatforms = newPlatforms.filter(p => p !== platform && p !== 'both');
      } else {
        newPlatforms.push(platform);
        if (newPlatforms.includes('youtube') && newPlatforms.includes('instagram')) {
          newPlatforms.push('both');
        }
      }
    }
    
    updateData('platforms', newPlatforms);
  };

  const isSelected = (id) => data.platforms.includes(id);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {[
        { id: 'youtube', label: 'YOUTUBE', code: 'YT', desc: 'Watch history, subscriptions, categories', icon: <Youtube size={24} /> },
        { id: 'instagram', label: 'INSTAGRAM', code: 'IG', desc: 'Reels watched, topics, scroll patterns', icon: <Instagram size={24} /> },
        { id: 'both', label: 'BOTH', code: '+', desc: 'Cross-platform insights unlocked', icon: null }
      ].map((opt) => (
        <motion.div
          key={opt.id}
          whileTap={{ scale: 0.97 }}
          onClick={() => togglePlatform(opt.id)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              togglePlatform(opt.id);
            }
          }}
          className={`relative p-5 border-2 rounded-none cursor-pointer transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#DFE104] focus:ring-offset-2 focus:ring-offset-[#09090B] ${
            isSelected(opt.id)
              ? 'border-[#DFE104] bg-[#27272A]'
              : 'border-[#3F3F46] bg-[#09090B] hover:border-[#FAFAFA]/30 hover:bg-[#27272A]/50'
          }`}
        >
          {isSelected(opt.id) && (
            <div className="absolute top-4 right-4">
              <Check size={16} className="text-[#DFE104]" />
            </div>
          )}
          
          <div className="text-[4rem] font-bold text-[#27272A] leading-none mb-4" aria-hidden="true">
            {opt.code}
          </div>
          
          <div className="flex items-center gap-2 mb-2">
            {opt.icon && <span className="text-[#FAFAFA]">{opt.icon}</span>}
            <h3 className="text-lg font-bold uppercase tracking-tighter text-[#FAFAFA]">
              {opt.label}
            </h3>
          </div>
          
          <p className="text-sm text-[#A1A1AA]">
            {opt.desc}
          </p>
        </motion.div>
      ))}
    </div>
  );
}
