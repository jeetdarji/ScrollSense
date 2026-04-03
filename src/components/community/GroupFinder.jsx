import React, { useState } from 'react';
import { Users, Search, TrendingDown, CheckCircle, Moon, Sun, Zap, Meh, Timer, Target, Calendar, Coffee } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const iconMap = {
  Moon, Sun, Zap, Meh, Timer, Target, Calendar, Coffee
};

export default function GroupFinder({ openGroups, anonymousNames }) {
  const [joinLoading, setJoinLoading] = useState(null);
  const [searchFilter, setSearchFilter] = useState('');
  const [joined, setJoined] = useState(false);
  const [assignedName, setAssignedName] = useState('');

  const filteredGroups = openGroups.filter(g =>
    g.displayName.toLowerCase().includes(searchFilter.toLowerCase()) ||
    g.description.toLowerCase().includes(searchFilter.toLowerCase())
  );

  const totalMembers = openGroups.reduce((s, g) => s + g.memberCount, 0);

  const handleNotifyRequest = () => {
    localStorage.setItem('scrollsense_wants_matched_group', 'true');
    alert('You will be notified when a matched group is ready.');
  };

  const handleJoin = (group) => {
    setJoinLoading(group.id);
    
    setTimeout(() => {
      const name = anonymousNames[Math.floor(Math.random() * anonymousNames.length)];
      const myGroup = {
        ...group,
        myAnonymousName: name,
        joinedAt: new Date().toISOString(),
        weekNumber: 1,
        memberCount: group.memberCount + 1,
      };
      
      localStorage.setItem('scrollsense_my_group', JSON.stringify(myGroup));
      setAssignedName(name);
      setJoinLoading(null);
      setJoined(true);
      
      // Delay reload slightly to let user see flash optionally, or just reload
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    }, 1000);
  };

  return (
    <div className="space-y-8">
      {/* SECTION 1: MATCHED GROUP STATUS */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        viewport={{ once: true }}
        className="border-2 border-[#3F3F46] p-5 mb-8 flex items-center justify-between flex-wrap gap-4 bg-[#09090B]"
      >
        <div className="flex-1 min-w-[200px]">
          <p className="text-xs uppercase tracking-widest text-[#A1A1AA] mb-1">
            PATTERN-MATCHED GROUPS
          </p>
          <h2 className="text-base font-bold uppercase tracking-tighter text-[#FAFAFA]">
            GROUPS MATCHED TO YOUR TRIGGER PATTERN
          </h2>
          <p className="mt-2 text-xs text-[#3F3F46] leading-relaxed max-w-sm">
            When enough users with your trigger pattern exist, ScrollSense will automatically form a small group matched specifically to your patterns.
          </p>
        </div>

        <div className="border border-[#27272A] p-4 min-w-[180px] w-full md:w-auto bg-[#09090B]">
          <Users size={14} color="#3F3F46" className="mb-2" />
          <p className="text-[10px] uppercase tracking-widest text-[#3F3F46] mb-1">
            MATCHED GROUP
          </p>
          <p className="text-sm font-bold uppercase tracking-tighter text-[#3F3F46]">
            FORMING SOON
          </p>
          <p className="text-[10px] text-[#27272A] uppercase mt-1">
            Join an open group now while we find your pattern match.
          </p>
          <button 
            onClick={handleNotifyRequest}
            className="mt-3 w-full border border-[#3F3F46] px-4 py-2 text-center cursor-pointer hover:border-[#FAFAFA]/20 transition-all text-[10px] uppercase tracking-widest text-[#3F3F46]"
          >
            NOTIFY ME WHEN READY
          </button>
        </div>
      </motion.div>

      {/* SECTION 2: OPEN GROUPS BROWSER */}
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

        {filteredGroups.length === 0 ? (
          <div className="text-center py-12">
            <Search size={20} color="#3F3F46" className="mx-auto mb-3" />
            <p className="text-sm uppercase tracking-tighter text-[#3F3F46]">
              NO GROUPS MATCH '{searchFilter}'
            </p>
            <p className="text-xs text-[#27272A] mt-1">
              Try a different search term.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredGroups.map(group => {
              const IconComp = iconMap[group.icon] || Meh;
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
                          {group.displayName}
                        </h3>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <div className="border border-[#3F3F46] px-2 py-0.5 text-[10px] uppercase text-[#A1A1AA]">
                          {group.memberCount} MEMBERS
                        </div>
                        {group.type === 'open' && (
                          <div className="border border-[#DFE104]/30 px-2 py-0.5 text-[10px] uppercase text-[#DFE104]">
                            OPEN
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
                          {Math.abs(group.weeklyAvgImprovement)} MIN {isImproving ? 'LESS' : 'MORE'}
                        </div>
                      </div>
                      <p className="mt-1 text-[10px] uppercase text-[#27272A]">
                        Group average improvement this week
                      </p>
                    </div>

                    <button
                      disabled={joinLoading === group.id}
                      onClick={() => handleJoin(group)}
                      className={`mt-4 w-full h-12 text-sm uppercase tracking-tighter rounded-none transition-all ${
                        joinLoading === group.id
                          ? 'bg-[#27272A] text-[#3F3F46] cursor-not-allowed'
                          : 'bg-[#DFE104] text-black font-bold hover:scale-105'
                      }`}
                    >
                      {joinLoading === group.id ? 'JOINING...' : 'JOIN GROUP'}
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
              onClick={() => { setJoined(false); window.location.reload(); }}
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
