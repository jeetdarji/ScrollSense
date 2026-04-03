import React from 'react';
import { Lock } from 'lucide-react';

export default function YouTubeConnectPrompt({ featureName, featureId }) {
  return (
    <div className="flex flex-col items-center text-center py-10 px-4">
      <div className="text-[5rem] font-bold text-[#27272A] leading-none mb-2" aria-hidden="true">
        {featureId}
      </div>
      <h3 className="text-base font-bold uppercase tracking-tighter text-[#FAFAFA] mb-2">
        CONNECT YOUTUBE TO UNLOCK {featureName}
      </h3>
      <p className="text-sm text-[#A1A1AA] max-w-xs leading-relaxed mb-6">
        Connect your YouTube account once. Your content breakdown updates automatically in the background.
      </p>
      <button className="bg-[#DFE104] text-black font-bold uppercase tracking-tighter h-12 px-8 rounded-none hover:scale-105 transition-all">
        CONNECT YOUTUBE — FREE
      </button>
      <div className="flex items-center gap-1.5 mt-3 justify-center">
        <Lock size={11} color="#3F3F46" />
        <span className="text-xs text-[#3F3F46] uppercase tracking-wider">
          YouTube data only. Never Gmail, Drive, or Photos.
        </span>
      </div>
    </div>
  );
}