import React, { useState } from 'react';
import { User, Activity, TrendingDown, Camera, ShieldOff, Copy, Info } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import dayjs from 'dayjs';

const readStorage = (key) => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : null;
  } catch {
    return null;
  }
};

const DataVault = ({ settings, dataVault, isLoadingDataVault }) => {
  const [viewMode, setViewMode] = useState('simple');
  const [copiedToClipboard, setCopiedToClipboard] = useState(false);

  // Still read local storage just for building the combined raw data view counts
  const localNotes = readStorage('scrollsense_notes') || [];
  const localCravings = readStorage('scrollsense_cravings') || [];

  // Use the server data vault if it exists, otherwise provide safe fallback shape
  const vault = dataVault || {
    account: { joinedAt: 'Not set', dailyLimitMinutes: 90, careerPath: 'Not set', goalsCount: 0, interestsCount: 0, email: 'Not set' },
    behavior: { sessionsLogged: 0, intentionsLogged: 0, cravingsReflected: 0, averageSessionMinutes: 0, averageMoodRating: 0 },
    patterns: { peakHour: 'Not enough data', mostCommonPlatform: 'Not enough data' },
    instagram: null,
    notStored: [
      'Video titles or reel content',
      'Specific URLs of videos watched',
      'Instagram DMs or messages',
      'Your real name or profile photo',
      'Gmail, Drive, or Google Photos',
      'Location data',
      'Device information',
      'Financial data',
      'Health data'
    ]
  };

  const combinedRawData = {
    server: vault,
    local: {
      notesCount: localNotes.length,
      cravingsDescriptionsCount: localCravings.length
    }
  };

  const copyData = () => {
    navigator.clipboard.writeText(JSON.stringify(combinedRawData, null, 2));
    setCopiedToClipboard(true);
    setTimeout(() => setCopiedToClipboard(false), 2000);
  };

  const colorizeJson = (jsonObj) => {
    let str = JSON.stringify(jsonObj, null, 2);
    str = str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return str
      .replace(/"([^"]+)":/g, '<span style="color:#A1A1AA">"$1":</span>')
      .replace(/: "([^"]*)"/g, ': <span style="color:#DFE104">"$1"</span>')
      .replace(/: (\d+\.?\d*)/g, ': <span style="color:#FAFAFA">$1</span>')
      .replace(/: (true)/g, ': <span style="color:#DFE104">$1</span>')
      .replace(/: (false|null)/g, ': <span style="color:#3F3F46">$1</span>');
  };

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* HEADER WITH VIEW TOGGLE */}
      <div className="flex items-start justify-between flex-wrap gap-4 mb-2">
        <div>
          <h2 className="text-base font-bold uppercase tracking-tighter text-[#FAFAFA] m-0">
            DATA VAULT
          </h2>
          <div className="text-xs text-[#3F3F46] uppercase tracking-wider mt-1">
            EVERYTHING SCROLLSENSE KNOWS ABOUT YOU
          </div>
        </div>
        
        <div className="flex border-2 border-[#3F3F46] bg-[#09090B]">
          <button
            onClick={() => setViewMode('simple')}
            className={`px-4 py-2 text-xs uppercase tracking-wider font-bold transition-all ${
              viewMode === 'simple' ? 'bg-[#DFE104] text-black' : 'bg-transparent text-[#A1A1AA]'
            }`}
          >
            SIMPLE VIEW
          </button>
          <button
            onClick={() => setViewMode('raw')}
            className={`px-4 py-2 text-xs uppercase tracking-wider font-bold transition-all ${
              viewMode === 'raw' ? 'bg-[#DFE104] text-black' : 'bg-transparent text-[#A1A1AA]'
            }`}
          >
            RAW DATA
          </button>
        </div>
      </div>

      <div className="text-[10px] uppercase tracking-wider text-[#3F3F46] mb-2 cursor-pointer hover:text-[#A1A1AA] transition-colors inline-block w-fit">
        DESIGNED TO SHOW SKEPTICAL FRIENDS ↗
      </div>

      {/* Loading Skeleton */}
      {isLoadingDataVault && (
        <div className="flex flex-col gap-4 animate-pulse pt-4">
          <div className="h-48 bg-[#27272A]/40 border-2 border-[#3F3F46] w-full"></div>
          <div className="h-48 bg-[#27272A]/40 border-2 border-[#3F3F46] w-full"></div>
        </div>
      )}

      {/* VIEWS */}
      {!isLoadingDataVault && (
        <div className="relative">
          <AnimatePresence mode="wait">
            {viewMode === 'simple' && (
              <motion.div
                key="simple"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col gap-4"
              >
                {/* Category 1: Account */}
                <div className="border-2 border-[#3F3F46] bg-[#09090B] p-5 rounded-none">
                  <div className="flex items-center gap-2 mb-4">
                    <User className="w-[14px] h-[14px] text-[#DFE104]" />
                    <h3 className="text-xs font-bold uppercase text-[#FAFAFA] m-0">YOUR ACCOUNT</h3>
                  </div>
                  <div className="flex flex-col gap-0">
                    <div className="flex justify-between items-center py-3 border-b border-[#3F3F46]">
                      <span className="text-xs uppercase tracking-wider text-[#A1A1AA]">JOINED</span>
                      <span className="text-xs font-bold uppercase text-[#FAFAFA]">
                        {vault.account.joinedAt !== 'Not set' ? dayjs(vault.account.joinedAt).format('MMM D, YYYY') : 'Not set'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-3 border-b border-[#3F3F46]">
                      <span className="text-xs uppercase tracking-wider text-[#A1A1AA]">DAILY LIMIT</span>
                      <span className="text-xs font-bold uppercase text-[#FAFAFA]">{vault.account.dailyLimitMinutes} MIN</span>
                    </div>
                    <div className="flex justify-between items-center py-3 border-b border-[#3F3F46]">
                      <span className="text-xs uppercase tracking-wider text-[#A1A1AA]">FOCUS AREA</span>
                      <span className="text-xs font-bold uppercase text-[#FAFAFA]">{vault.account.careerPath}</span>
                    </div>
                    <div className="flex justify-between items-center py-3 border-b border-[#3F3F46]">
                      <span className="text-xs uppercase tracking-wider text-[#A1A1AA]">GOALS SET</span>
                      <span className="text-xs font-bold uppercase text-[#FAFAFA]">{vault.account.goalsCount} GOALS</span>
                    </div>
                    <div className="flex justify-between items-center py-3">
                      <span className="text-xs uppercase tracking-wider text-[#A1A1AA]">INTERESTS SET</span>
                      <span className="text-xs font-bold uppercase text-[#FAFAFA]">{vault.account.interestsCount} INTERESTS</span>
                    </div>
                  </div>
                </div>

                {/* Category 2: Behavior */}
                <div className="border-2 border-[#3F3F46] bg-[#09090B] p-5 rounded-none">
                  <div className="flex items-center gap-2 mb-4">
                    <Activity className="w-[14px] h-[14px] text-[#DFE104]" />
                    <h3 className="text-xs font-bold uppercase text-[#FAFAFA] m-0">YOUR BEHAVIOR DATA</h3>
                  </div>
                  <div className="flex flex-col gap-0">
                    <div className="flex justify-between items-center py-3 border-b border-[#3F3F46]">
                      <span className="text-xs uppercase tracking-wider text-[#A1A1AA]">SESSIONS LOGGED</span>
                      <span className="text-xs font-bold uppercase text-[#FAFAFA]">{vault.behavior.sessionsLogged}</span>
                    </div>
                    <div className="flex justify-between items-center py-3 border-b border-[#3F3F46]">
                      <span className="text-xs uppercase tracking-wider text-[#A1A1AA]">INTENTIONS LOGGED</span>
                      <span className="text-xs font-bold uppercase text-[#FAFAFA]">{vault.behavior.intentionsLogged}</span>
                    </div>
                    <div className="flex justify-between items-center py-3 border-b border-[#3F3F46]">
                      <span className="text-xs uppercase tracking-wider text-[#A1A1AA]">CRAVING REFLECTIONS</span>
                      <span className="text-xs font-bold uppercase text-[#FAFAFA]">{vault.behavior.cravingsReflected}</span>
                    </div>
                    <div className="flex justify-between items-center py-3 border-b border-[#3F3F46]">
                      <span className="text-xs uppercase tracking-wider text-[#A1A1AA]">AVG SESSION</span>
                      <span className="text-xs font-bold uppercase text-[#FAFAFA]">{vault.behavior.averageSessionMinutes} MIN</span>
                    </div>
                    <div className="flex justify-between items-center py-3">
                      <span className="text-xs uppercase tracking-wider text-[#A1A1AA]">AVG MOOD</span>
                      <span className="text-xs font-bold uppercase text-[#FAFAFA]">{vault.behavior.averageMoodRating} / 5</span>
                    </div>
                  </div>
                </div>

                {/* Category 3: Patterns */}
                <div className="border-2 border-[#3F3F46] bg-[#09090B] p-5 rounded-none">
                  <div className="flex items-center gap-2 mb-4">
                    <TrendingDown className="w-[14px] h-[14px] text-[#DFE104]" />
                    <h3 className="text-xs font-bold uppercase text-[#FAFAFA] m-0">DETECTED PATTERNS</h3>
                  </div>
                  <div className="flex flex-col gap-0">
                    <div className="flex justify-between items-center py-3 border-b border-[#3F3F46]">
                      <span className="text-xs uppercase tracking-wider text-[#A1A1AA]">PEAK SCROLL HOUR</span>
                      <span className="text-xs font-bold uppercase text-[#FAFAFA]">{vault.patterns.peakHour}</span>
                    </div>
                    <div className="flex justify-between items-center py-3">
                      <span className="text-xs uppercase tracking-wider text-[#A1A1AA]">MOST USED PLATFORM</span>
                      <span className="text-xs font-bold uppercase text-[#FAFAFA]">{vault.patterns.mostCommonPlatform}</span>
                    </div>
                  </div>
                </div>

                {/* Category 4: Instagram */}
                <div className="border-2 border-[#3F3F46] bg-[#09090B] p-5 rounded-none">
                  <div className="flex items-center gap-2 mb-4">
                    <Camera className="w-[14px] h-[14px] text-[#DFE104]" />
                    <h3 className="text-xs font-bold uppercase text-[#FAFAFA] m-0">INSTAGRAM SNAPSHOT</h3>
                  </div>
                  <div className="flex flex-col gap-0">
                    {vault.instagram ? (
                      <>
                        <div className="flex justify-between items-center py-3 border-b border-[#3F3F46]">
                          <span className="text-xs uppercase tracking-wider text-[#A1A1AA]">TOPICS PROFILED</span>
                          <span className="text-xs font-bold uppercase text-[#FAFAFA]">{vault.instagram.topicsCount}</span>
                        </div>
                        <div className="flex justify-between items-center py-3 border-b border-[#3F3F46]">
                          <span className="text-xs uppercase tracking-wider text-[#A1A1AA]">REEL URLS STORED</span>
                          <span className="text-xs font-bold uppercase text-[#DFE104]">NO — DISCARDED IMMEDIATELY</span>
                        </div>
                        <div className="flex justify-between items-center py-3">
                          <span className="text-xs uppercase tracking-wider text-[#A1A1AA]">RAW CONTENT STORED</span>
                          <span className="text-xs font-bold uppercase text-[#DFE104]">NO — NEVER</span>
                        </div>
                      </>
                    ) : (
                      <div className="flex justify-between items-center py-3">
                        <span className="text-xs uppercase tracking-wider text-[#A1A1AA]">STATUS</span>
                        <span className="text-xs font-bold uppercase text-[#3F3F46]">NOT UPLOADED</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Category 5: What We DON'T Have */}
                <div className="border-2 border-[#27272A] bg-[#09090B] p-5 rounded-none">
                  <div className="flex items-center gap-2 mb-4">
                    <ShieldOff className="w-[14px] h-[14px] text-[#A1A1AA]" />
                    <h3 className="text-xs font-bold uppercase text-[#FAFAFA] m-0">WHAT WE DO NOT HAVE</h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {vault.notStored.map((item, index) => (
                      <span key={index} className="border border-[#27272A] px-3 py-1.5 flex items-center text-[10px] uppercase text-[#3F3F46]">
                        <span className="text-[10px] text-[#3F3F46] font-sans mr-1.5">✕</span> {item}
                      </span>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {viewMode === 'raw' && (
              <motion.div
                key="raw"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xs uppercase text-[#A1A1AA]">RAW DATABASE RECORD</span>
                  <button
                    onClick={copyData}
                    className={`border px-4 py-1.5 text-xs uppercase tracking-tighter cursor-pointer flex items-center font-bold ${
                      copiedToClipboard ? 'border-[#DFE104] text-[#DFE104]' : 'border-[#3F3F46] text-[#A1A1AA]'
                    } bg-transparent hover:border-[#FAFAFA]/30 transition-colors`}
                  >
                    <Copy className="w-3 h-3 inline mr-1.5" />
                    {copiedToClipboard ? "COPIED!" : "COPY JSON"}
                  </button>
                </div>

                <div className="bg-[#09090B] border-2 border-[#27272A] p-5 font-mono text-[11px] sm:text-xs leading-relaxed overflow-x-auto max-h-[500px] overflow-y-auto w-full">
                  <pre dangerouslySetInnerHTML={{ __html: colorizeJson(combinedRawData) }} className="m-0" />
                </div>

                <div className="flex items-center gap-2 mt-3">
                  <Info className="w-[11px] h-[11px] text-[#3F3F46] flex-shrink-0" />
                  <span className="text-[10px] uppercase text-[#3F3F46]">
                    THIS IS EVERYTHING. THERE IS NO HIDDEN DATA BEYOND WHAT YOU SEE HERE.
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};

export default DataVault;