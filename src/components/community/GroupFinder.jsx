import React, { useState } from 'react';
import { Users, Search, TrendingDown, CheckCircle, Moon, Sun, Zap, Meh, Timer, Target, Calendar, Coffee, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const iconMap = {
  moon: Moon,
  sun: Sun,
  zap: Zap,
  meh: Meh,
  timer: Timer,
  target: Target,
  calendar: Calendar,
  coffee: Coffee,
};

function getIcon(iconName) {
  if (!iconName) return Meh;
  // Try exact match, then capitalized, then fallback
  return iconMap[iconName] || iconMap[iconName.toLowerCase()] || Meh;
}

export default function GroupFinder({
  groups = [],
  totalMembers = 0,
  recommendations = [],
  isLoadingGroups = false,
  onJoinGroup,
  isJoining = false,
}) {
  const [joiningId, setJoiningId] = useState(null);
  const [searchFilter, setSearchFilter] = useState('');
  const [joined, setJoined] = useState(false);
  const [assignedName, setAssignedName] = useState('');
  const [joinError, setJoinError] = useState(null);

  const filteredGroups = groups.filter(g =>
    g.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
    g.description.toLowerCase().includes(searchFilter.toLowerCase())
  );

  const handleJoin = async (groupId) => {
    setJoiningId(groupId);
    setJoinError(null);

    try {
      const result = await onJoinGroup(groupId);
      setAssignedName(result?.membership?.anonymousName || 'YOUR NAME');
      setJoined(true);
      // The query invalidation in useCommunityData will flip hasMembership to true,
      // which unmounts GroupFinder. The success banner is brief but visible
      // due to the AnimatePresence exit animation.
    } catch (err) {
      const msg = err?.response?.data?.error || 'Failed to join group. Try again.';
      setJoinError(msg);
      setJoiningId(null);
    }
  };

  return (
    <div className="space-y-8">

      {/* SECTION 1: PERSONALIZED RECOMMENDATIONS */}
      {recommendations.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          viewport={{ once: true }}
          className="border-2 border-[#DFE104]/20 p-6 md:p-8 mb-4 bg-[#09090B]"
        >
          <div className="flex items-center gap-3 mb-6">
            <Sparkles size={16} color="#DFE104" />
            <div>
              <p className="text-xs uppercase tracking-widest text-[#DFE104] mb-0.5">
                RECOMMENDED FOR YOU
              </p>
              <h2 className="text-base font-bold uppercase tracking-tighter text-[#FAFAFA]">
                BASED ON YOUR SCROLLING PATTERNS
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {recommendations.map((rec, idx) => {
              const IconComp = getIcon(rec.icon);

              return (
                <div
                  key={rec.groupId}
                  className="border border-[#DFE104]/20 p-5 bg-[#DFE104]/[0.02] hover:bg-[#DFE104]/[0.05] transition-colors"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 border border-[#DFE104]/30 flex items-center justify-center">
                      <IconComp size={14} color="#DFE104" />
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-tighter text-[#FAFAFA] leading-tight">
                        {rec.groupName}
                      </p>
                      <p className="text-[10px] uppercase text-[#3F3F46]">
                        {rec.memberCount}/{rec.maxMembers} MEMBERS
                      </p>
                    </div>
                  </div>

                  <p className="text-xs text-[#A1A1AA] leading-relaxed mb-3">
                    {rec.reason}
                  </p>

                  <div className="flex items-center gap-1 mb-3 flex-wrap">
                    {rec.matchedSignals?.map(signal => (
                      <span
                        key={signal}
                        className="text-[9px] uppercase tracking-widest text-[#DFE104]/60 border border-[#DFE104]/15 px-1.5 py-0.5"
                      >
                        {signal.replace('_', ' ')}
                      </span>
                    ))}
                  </div>

                  <button
                    disabled={joiningId === rec.groupId || isJoining}
                    onClick={() => handleJoin(rec.groupId)}
                    className={`w-full h-10 text-xs uppercase tracking-tighter transition-all ${
                      joiningId === rec.groupId
                        ? 'bg-[#27272A] text-[#3F3F46] cursor-not-allowed'
                        : 'bg-[#DFE104] text-black font-bold hover:scale-105'
                    }`}
                  >
                    {joiningId === rec.groupId ? 'JOINING...' : `#${idx + 1} MATCH — JOIN`}
                  </button>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* SECTION 2: ALL OPEN GROUPS */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        viewport={{ once: true }}
      >
        <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-tighter text-[#FAFAFA]">
              OPEN GROUPS
            </h2>
            <p className="text-xs text-[#3F3F46] uppercase tracking-wider mt-0.5">
              JOIN ANY GROUP BELOW — NO MATCHING REQUIRED
            </p>
          </div>
          <div className="text-[10px] uppercase text-[#A1A1AA]">
            {totalMembers} MEMBERS ACROSS ALL GROUPS
          </div>
        </div>

        <div className="mb-6 relative">
          <Search size={14} color="#3F3F46" className="absolute left-0 bottom-3" />
          <input
            type="text"
            placeholder="FILTER GROUPS..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="bg-transparent border-b-2 border-[#3F3F46] focus:border-[#DFE104] text-[#FAFAFA] text-sm w-full outline-none transition-colors placeholder:text-[#3F3F46] pb-2 pl-6"
          />
        </div>

        {joinError && (
          <div className="mb-4 p-3 border border-red-900/30 bg-red-900/5 text-center">
            <p className="text-xs text-red-400 uppercase tracking-wider">{joinError}</p>
          </div>
        )}

        {isLoadingGroups && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="border-2 border-[#3F3F46] p-6 animate-pulse bg-[#09090B]">
                <div className="h-4 w-32 bg-[#27272A] mb-3" />
                <div className="h-3 w-full bg-[#27272A] mb-2" />
                <div className="h-3 w-3/4 bg-[#27272A] mb-4" />
                <div className="h-10 w-full bg-[#27272A]" />
              </div>
            ))}
          </div>
        )}

        {!isLoadingGroups && filteredGroups.length === 0 && (
          <div className="text-center py-12">
            <Search size={20} color="#3F3F46" className="mx-auto mb-3" />
            <p className="text-sm uppercase tracking-tighter text-[#3F3F46]">
              {searchFilter ? `NO GROUPS MATCH '${searchFilter}'` : 'NO GROUPS AVAILABLE'}
            </p>
            {searchFilter && (
              <p className="text-xs text-[#27272A] mt-1">
                Try a different search term.
              </p>
            )}
          </div>
        )}

        {!isLoadingGroups && filteredGroups.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredGroups.map(group => {
              const IconComp = getIcon(group.icon);
              const isImproving = group.weeklyAvgImprovement < 0;

              return (
                <motion.div
                  key={group.id}
                  whileTap={{ scale: 0.99 }}
                  className="border-2 border-[#3F3F46] p-5 md:p-6 group flex flex-col justify-between bg-[#09090B] hover:border-[#FAFAFA]/30 hover:bg-[#27272A]/20 transition-all cursor-pointer rounded-none"
                >
                  <div>
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 border-2 border-[#3F3F46] flex items-center justify-center bg-[#27272A]/50 shrink-0">
                          <IconComp size={16} color="#DFE104" />
                        </div>
                        <h3 className="text-base font-bold uppercase tracking-tighter text-[#FAFAFA] leading-tight">
                          {group.name}
                        </h3>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <div className="border border-[#3F3F46] px-2 py-0.5 text-[10px] uppercase text-[#A1A1AA]">
                          {group.memberCount}/{group.maxMembers}
                        </div>
                        {group.isJoinable && (
                          <div className="border border-[#DFE104]/30 px-2 py-0.5 text-[10px] uppercase text-[#DFE104]">
                            OPEN
                          </div>
                        )}
                        {!group.isJoinable && (
                          <div className="border border-[#3F3F46] px-2 py-0.5 text-[10px] uppercase text-[#3F3F46]">
                            FULL
                          </div>
                        )}
                      </div>
                    </div>

                    <p className="text-xs text-[#A1A1AA] leading-relaxed mb-4">
                      {group.description}
                    </p>
                  </div>

                  <div>
                    <div className="border-t border-[#3F3F46] pt-4 mt-auto">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <TrendingDown size={12} color="#DFE104" />
                          <span className="text-[10px] uppercase text-[#3F3F46]">
                            AVG THIS WEEK:
                          </span>
                        </div>
                        <div className={`text-sm font-bold uppercase tracking-tighter ${isImproving ? 'text-[#DFE104]' : 'text-[#A1A1AA]'}`}>
                          {group.weeklyAvgImprovement === 0
                            ? 'NO DATA'
                            : `${Math.abs(group.weeklyAvgImprovement)} MIN ${isImproving ? 'LESS' : 'MORE'}`
                          }
                        </div>
                      </div>
                    </div>

                    <button
                      disabled={!group.isJoinable || joiningId === group.id || isJoining}
                      onClick={() => handleJoin(group.id)}
                      className={`mt-4 w-full h-12 text-sm uppercase tracking-tighter rounded-none transition-all ${
                        !group.isJoinable
                          ? 'bg-[#27272A] text-[#3F3F46] cursor-not-allowed'
                          : joiningId === group.id
                            ? 'bg-[#27272A] text-[#3F3F46] cursor-not-allowed'
                            : 'bg-[#DFE104] text-black font-bold hover:scale-105'
                      }`}
                    >
                      {!group.isJoinable
                        ? 'GROUP FULL'
                        : joiningId === group.id
                          ? 'JOINING...'
                          : 'JOIN GROUP'
                      }
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* JOINED SUCCESS FLASH */}
      <AnimatePresence>
        {joined && (
          <motion.div
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-[#DFE104] px-6 py-4 flex items-center justify-between"
          >
            <div className="flex items-center gap-3 flex-wrap">
              <CheckCircle size={16} color="black" className="shrink-0" />
              <p className="text-sm font-bold uppercase tracking-tighter text-black">
                YOU JOINED — YOU ARE NOW '{assignedName}' IN THIS GROUP
              </p>
            </div>
            <button
              onClick={() => setJoined(false)}
              className="border border-black/30 px-4 py-1.5 text-xs uppercase font-bold text-black hover:bg-black/10 transition-colors"
            >
              CONTINUE
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
