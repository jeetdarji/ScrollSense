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

const DataVault = () => {
  const [viewMode, setViewMode] = useState('simple');
  const [copiedToClipboard, setCopiedToClipboard] = useState(false);

  const sessions = readStorage('scrollsense_sessions') || [];
  const onboarding = readStorage('scrollsense_onboarding') || {};
  const intentions = readStorage('scrollsense_intentions') || [];
  const cravings = readStorage('scrollsense_cravings') || [];
  const instagramProcessed = readStorage('scrollsense_instagram_processed');

  const userData = {
    account: {
      joinedAt: onboarding?.createdAt || 'Not set',
      dailyLimitMinutes: onboarding?.dailyLimitMinutes || 90,
      careerPath: onboarding?.careerPath || 'Not set',
      goalsCount: (onboarding?.goals || []).length,
      interestsCount: (onboarding?.interests || []).length,
    },
    behavior: {
      sessionsLogged: sessions.length,
      intentionsLogged: intentions.length,
      cravingsReflected: cravings.length,
      averageSessionMinutes: sessions.length > 0
        ? Math.round(sessions.reduce((s, sess) => s + (sess.durationMinutes || 0), 0) / sessions.length)
        : 0,
      averageMoodRating: sessions.length > 0
        ? (sessions.reduce((s, sess) => s + (sess.moodRating || 0), 0) / sessions.length).toFixed(1)
        : 'No data',
    },
    patterns: {
      peakHour: (() => {
        if (!sessions.length) return 'Not enough data';
        const hours = sessions.map(s => new Date(s.timestamp).getHours());
        const counts = Array(24).fill(0);
        hours.forEach(h => counts[h]++);
        const peak = counts.indexOf(Math.max(...counts));
        return peak < 12 ? `${peak === 0 ? 12 : peak} AM` : `${peak === 12 ? 12 : peak - 12} PM`;
      })(),
      mostCommonPlatform: (() => {
        if (!sessions.length) return 'Not enough data';
        const ig = sessions.filter(s => s.platform === 'instagram').length;
        const yt = sessions.filter(s => s.platform === 'youtube').length;
        return ig > yt ? 'Instagram' : 'YouTube';
      })(),
    },
    instagram: instagramProcessed ? {
      reelsAnalyzed: instagramProcessed.totalVideos || 0,
      uniqueCreators: instagramProcessed.echoChamberData?.uniqueCreators || 0,
      dateRange: instagramProcessed.dateRange || 'Unknown',
      rawContentStored: false,
      reelUrlsStored: false,
    } : null,
    notStored: [
      'Video titles or reel content',
      'Specific URLs of videos watched',
      'Instagram DMs or messages',
      'Your real name or profile photo',
      'Gmail, Drive, or Google Photos',
      'Location data',
      'Device information',
      'Financial data',
      'Health data',
    ]
  };

  const copyData = () => {
    navigator.clipboard.writeText(JSON.stringify(userData, null, 2));
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

      {/* VIEWS */}
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
                      {userData.account.joinedAt !== 'Not set' ? dayjs(userData.account.joinedAt).format('MMM D, YYYY') : 'Not set'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-[#3F3F46]">
                    <span className="text-xs uppercase tracking-wider text-[#A1A1AA]">DAILY LIMIT</span>
                    <span className="text-xs font-bold uppercase text-[#FAFAFA]">{userData.account.dailyLimitMinutes} MIN</span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-[#3F3F46]">
                    <span className="text-xs uppercase tracking-wider text-[#A1A1AA]">FOCUS AREA</span>
                    <span className="text-xs font-bold uppercase text-[#FAFAFA]">{userData.account.careerPath}</span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-[#3F3F46]">
                    <span className="text-xs uppercase tracking-wider text-[#A1A1AA]">GOALS SET</span>
                    <span className="text-xs font-bold uppercase text-[#FAFAFA]">{userData.account.goalsCount} GOALS</span>
                  </div>
                  <div className="flex justify-between items-center py-3">
                    <span className="text-xs uppercase tracking-wider text-[#A1A1AA]">INTERESTS SET</span>
                    <span className="text-xs font-bold uppercase text-[#FAFAFA]">{userData.account.interestsCount} INTERESTS</span>
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
                    <span className="text-xs font-bold uppercase text-[#FAFAFA]">{userData.behavior.sessionsLogged}</span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-[#3F3F46]">
                    <span className="text-xs uppercase tracking-wider text-[#A1A1AA]">INTENTIONS LOGGED</span>
                    <span className="text-xs font-bold uppercase text-[#FAFAFA]">{userData.behavior.intentionsLogged}</span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-[#3F3F46]">
                    <span className="text-xs uppercase tracking-wider text-[#A1A1AA]">CRAVING REFLECTIONS</span>
                    <span className="text-xs font-bold uppercase text-[#FAFAFA]">{userData.behavior.cravingsReflected}</span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-[#3F3F46]">
                    <span className="text-xs uppercase tracking-wider text-[#A1A1AA]">AVG SESSION</span>
                    <span className="text-xs font-bold uppercase text-[#FAFAFA]">{userData.behavior.averageSessionMinutes} MIN</span>
                  </div>
                  <div className="flex justify-between items-center py-3">
                    <span className="text-xs uppercase tracking-wider text-[#A1A1AA]">AVG MOOD</span>
                    <span className="text-xs font-bold uppercase text-[#FAFAFA]">{userData.behavior.averageMoodRating} / 5</span>
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
                    <span className="text-xs font-bold uppercase text-[#FAFAFA]">{userData.patterns.peakHour}</span>
                  </div>
                  <div className="flex justify-between items-center py-3">
                    <span className="text-xs uppercase tracking-wider text-[#A1A1AA]">MOST USED PLATFORM</span>
                    <span className="text-xs font-bold uppercase text-[#FAFAFA]">{userData.patterns.mostCommonPlatform}</span>
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
                  {userData.instagram ? (
                    <>
                      <div className="flex justify-between items-center py-3 border-b border-[#3F3F46]">
                        <span className="text-xs uppercase tracking-wider text-[#A1A1AA]">REELS ANALYZED</span>
                        <span className="text-xs font-bold uppercase text-[#FAFAFA]">{userData.instagram.reelsAnalyzed}</span>
                      </div>
                      <div className="flex justify-between items-center py-3 border-b border-[#3F3F46]">
                        <span className="text-xs uppercase tracking-wider text-[#A1A1AA]">UNIQUE CREATORS</span>
                        <span className="text-xs font-bold uppercase text-[#FAFAFA]">{userData.instagram.uniqueCreators}</span>
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
                  {userData.notStored.map((item, index) => (
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
                <pre dangerouslySetInnerHTML={{ __html: colorizeJson(userData) }} className="m-0" />
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
    </div>
  );
};

export default DataVault;