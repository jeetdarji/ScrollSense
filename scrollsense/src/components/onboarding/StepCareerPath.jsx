import React from 'react';
import { motion } from 'framer-motion';

export default function StepCareerPath({ data, updateData }) {
  const presets = [
    { id: 'software_dev', label: 'SOFTWARE DEVELOPMENT', desc: 'Coding, engineering, tech' },
    { id: 'design', label: 'DESIGN & CREATIVE', desc: 'UI/UX, graphic, product' },
    { id: 'business', label: 'BUSINESS & FINANCE', desc: 'Management, entrepreneurship' },
    { id: 'content', label: 'CONTENT & MEDIA', desc: 'Writing, video, social media' },
    { id: 'science', label: 'SCIENCE & RESEARCH', desc: 'Academic, lab, technical' },
    { id: 'other', label: 'SOMETHING ELSE', desc: "I'll describe it below" }
  ];

  const handlePresetSelect = (id, label) => {
    updateData('careerPathPreset', id);
    if (id !== 'other') {
      updateData('careerPath', label);
    } else {
      updateData('careerPath', '');
      document.getElementById('custom-career-input')?.focus();
    }
  };

  const handleCustomInputChange = (e) => {
    updateData('careerPathPreset', '');
    updateData('careerPath', e.target.value);
  };

  return (
    <div className="flex flex-col">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {presets.map((preset) => (
          <motion.div
            key={preset.id}
            whileTap={{ scale: 0.97 }}
            onClick={() => handlePresetSelect(preset.id, preset.label)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handlePresetSelect(preset.id, preset.label);
              }
            }}
            className={`p-4 border-2 rounded-none cursor-pointer transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#DFE104] focus:ring-offset-2 focus:ring-offset-[#09090B] ${
              data.careerPathPreset === preset.id
                ? 'border-[#DFE104] bg-[#27272A]'
                : 'border-[#3F3F46] bg-[#09090B] hover:border-[#FAFAFA]/30 hover:bg-[#27272A]/50'
            }`}
          >
            <h3 className="text-sm font-bold uppercase tracking-tighter text-[#FAFAFA] mb-1">
              {preset.label}
            </h3>
            <p className="text-xs text-[#A1A1AA]">
              {preset.desc}
            </p>
          </motion.div>
        ))}
      </div>

      <div className="mt-8">
        <label htmlFor="custom-career-input" className="block text-xs uppercase tracking-widest text-[#A1A1AA] mb-3">
          OR DESCRIBE YOUR FOCUS IN YOUR OWN WORDS
        </label>
        <input
          id="custom-career-input"
          type="text"
          placeholder="e.g. Machine learning engineer, freelance illustrator..."
          className="bg-transparent border-b-2 border-[#3F3F46] focus:border-[#DFE104] text-[#FAFAFA] text-lg font-medium w-full pb-3 outline-none transition-colors duration-200 placeholder:text-[#3F3F46]"
          value={data.careerPath}
          onChange={handleCustomInputChange}
        />
        <p className="mt-2 text-xs text-[#3F3F46]">
          This stays private — it's only used to classify your content.
        </p>
      </div>
    </div>
  );
}
