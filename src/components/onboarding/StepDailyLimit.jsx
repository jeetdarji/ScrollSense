import React from 'react';
import { formatMinutes } from '../../utils/formatTime';

export default function StepDailyLimit({ data, updateData }) {
  const currentLimit = data.dailyLimitMinutes || 90;
  const globalAvg = 141;
  const diff = globalAvg - currentLimit;

  return (
    <div className="flex flex-col items-center pt-4">
      
      <div className="w-full text-center mb-8">
        <div className="text-[clamp(3rem,8vw,6rem)] font-bold uppercase tracking-tighter text-[#DFE104] leading-none tabular-nums">
          {formatMinutes(currentLimit)}
        </div>
        <div className="text-sm text-[#A1A1AA] uppercase tracking-widest mt-2">
          PER DAY ACROSS ALL PLATFORMS
        </div>
      </div>

      <div className="w-full max-w-xl mx-auto mb-8 relative">
        <input
          type="range"
          min="15"
          max="300"
          step="15"
          value={currentLimit}
          onChange={(e) => updateData('dailyLimitMinutes', parseInt(e.target.value, 10))}
          className="w-full h-1 bg-[#27272A] rounded-none appearance-none cursor-pointer accent-[#DFE104]"
          aria-label="Daily limit slider in minutes"
          style={{
            background: `linear-gradient(to right, #DFE104 0%, #DFE104 ${(currentLimit - 15) / (300 - 15) * 100}%, #27272A ${(currentLimit - 15) / (300 - 15) * 100}%, #27272A 100%)`
          }}
        />
        <style dangerouslySetInnerHTML={{__html: `
          input[type=range]::-webkit-slider-thumb {
            -webkit-appearance: none;
            height: 24px;
            width: 24px;
            border-radius: 50%;
            background: #DFE104;
            border: 2px solid #09090B;
            cursor: pointer;
            margin-top: -10px;
          }
          input[type=range]::-moz-range-thumb {
            height: 24px;
            width: 24px;
            border-radius: 50%;
            background: #DFE104;
            border: 2px solid #09090B;
            cursor: pointer;
          }
        `}} />
      </div>

      <div className="flex justify-between w-full max-w-xl mx-auto mt-2 text-xs text-[#3F3F46] uppercase">
        <span>15 MIN</span>
        <span>1 HR</span>
        <span>2 HRS</span>
        <span>5 HRS</span>
      </div>

      <div className="grid grid-cols-2 gap-4 w-full max-w-xl mx-auto mt-12">
        <div className="border-2 border-[#3F3F46] p-5 flex flex-col items-start bg-[#09090B]">
          <div className="text-[3rem] font-bold text-[#27272A] leading-none mb-1 tabular-nums" aria-hidden="true">
            {globalAvg}
          </div>
          <div className="text-xs uppercase tracking-widest text-[#A1A1AA]">
            MINUTES PER DAY
          </div>
          <div className="text-xs text-[#3F3F46] mt-1">
            Global social media average, 2025
          </div>
        </div>

        <div className="border-2 border-[#DFE104] p-5 flex flex-col items-start bg-[#27272A]">
          <div className="text-[3rem] font-bold text-[#DFE104] leading-none mb-1 tabular-nums">
            {currentLimit}
          </div>
          <div className="text-xs uppercase tracking-widest text-[#A1A1AA]">
            MINUTES PER DAY
          </div>
          <div className={`text-xs mt-1 ${diff >= 0 ? 'text-[#A1A1AA]' : 'text-[#3F3F46]'}`}>
            {diff >= 0 
              ? `${diff} min less than average` 
              : 'above average — you can always adjust later'
            }
          </div>
        </div>
      </div>

      <div className="mt-8 text-center text-xs text-[#3F3F46] uppercase tracking-wider">
        You can change this anytime in settings. This is just your starting point.
      </div>
    </div>
  );
}
