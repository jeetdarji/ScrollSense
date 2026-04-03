import React from 'react';
import { EyeOff, TrendingDown, TrendingUp } from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, ReferenceLine, Tooltip, ResponsiveContainer 
} from 'recharts';
import { motion } from 'framer-motion';

const MOCK_GROUP_TREND = [
  { week: 'W1', avgImprovement: 0 },
  { week: 'W2', avgImprovement: -5 },
  { week: 'W3', avgImprovement: -8 },
  { week: 'W4', avgImprovement: -12 },
];

export default function GroupFeed({ group, feed }) {
  const submittedMembers = feed.filter(m => m.submitted);
  const submittedCount = submittedMembers.length;
  
  const groupAvgImprovement = submittedCount > 0 
    ? Math.round(submittedMembers.reduce((s, m) => s + m.improvementMinutes, 0) / submittedCount)
    : 0;

  const improving = submittedMembers.filter(m => m.improvementMinutes > 0).length;

  const best = submittedMembers.reduce(
    (a, b) => b.improvementMinutes > a.improvementMinutes ? b : a,
    { improvementMinutes: 0 }
  );

  const sortedFeed = [...feed].sort((a, b) => {
    if (!a.submitted) return 1;
    if (!b.submitted) return -1;
    return b.improvementMinutes - a.improvementMinutes;
  });

  const maxImprovement = submittedCount > 0 
    ? Math.max(...submittedMembers.map(m => Math.abs(m.improvementMinutes)))
    : 0;

  const lastWeek = MOCK_GROUP_TREND[MOCK_GROUP_TREND.length - 1];
  const isGroupImproving = lastWeek.avgImprovement < MOCK_GROUP_TREND[0].avgImprovement;
  const minDomain = Math.min(...MOCK_GROUP_TREND.map(d => d.avgImprovement)) - 10;
  const maxDomain = Math.max(...MOCK_GROUP_TREND.map(d => d.avgImprovement)) + 10;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      viewport={{ once: true }}
      className="border-2 border-[#3F3F46] p-6 md:p-8 mb-6 bg-[#09090B]"
    >
      <div className="flex justify-between items-start mb-6 flex-wrap gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-[#DFE104] mb-1">
            THIS WEEK'S GROUP
          </p>
          <h2 className="text-xl md:text-2xl font-bold uppercase tracking-tighter text-[#FAFAFA] leading-[0.9]">
            HOW THE GROUP IS DOING
          </h2>
        </div>
        <div className="border border-[#3F3F46] px-3 py-1">
          <p className="text-xs uppercase tracking-widest text-[#A1A1AA]">
            {submittedCount} OF {feed.length} SUBMITTED
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 md:gap-4 mb-8">
        <div>
          <p className="text-[10px] uppercase text-[#A1A1AA] mb-1">GROUP AVERAGE</p>
          {groupAvgImprovement > 0 ? (
            <p className="text-lg md:text-xl font-bold uppercase text-[#DFE104] whitespace-nowrap">
              -{groupAvgImprovement} MIN
            </p>
          ) : (
            <p className="text-lg md:text-xl font-bold uppercase text-[#A1A1AA] whitespace-nowrap">
              +{Math.abs(groupAvgImprovement)} MIN
            </p>
          )}
          <p className="text-[10px] uppercase text-[#3F3F46] mt-1">THIS WEEK</p>
        </div>
        <div>
          <p className="text-[10px] uppercase text-[#A1A1AA] mb-1">IMPROVING</p>
          <p className="text-lg md:text-xl font-bold uppercase text-[#FAFAFA] whitespace-nowrap">
            {improving} OF {submittedCount}
          </p>
          <p className="text-[10px] uppercase text-[#3F3F46] mt-1">MEMBERS THIS WEEK</p>
        </div>
        <div>
          <p className="text-[10px] uppercase text-[#A1A1AA] mb-1">BEST THIS WEEK</p>
          {best.improvementMinutes > 0 ? (
            <p className="text-lg md:text-xl font-bold uppercase text-[#DFE104] whitespace-nowrap">
              -{best.improvementMinutes} MIN
            </p>
          ) : (
            <p className="text-lg md:text-xl font-bold text-[#3F3F46]">--</p>
          )}
          <p className="text-[10px] uppercase text-[#3F3F46] mt-1">
            {best.isMe ? "THAT'S YOU 🎯" : "GROUP MEMBER"}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-0">
        <p className="text-xs uppercase tracking-widest text-[#A1A1AA] mb-4">
          INDIVIDUAL NUMBERS
        </p>

        {sortedFeed.map((member, idx) => {
          const barWidth = maxImprovement > 0 && member.submitted
            ? (Math.abs(member.improvementMinutes) / maxImprovement) * 100
            : 0;
            
          return (
            <div 
              key={idx} 
              className={`flex items-center gap-4 py-4 border-b border-[#3F3F46] last:border-0 ${member.isMe ? 'bg-[#DFE104]/5 border-[#DFE104]/20 px-4 -mx-4' : ''}`}
            >
              <div className="w-[120px] shrink-0">
                <p className={`text-sm font-bold uppercase tracking-tighter ${member.isMe ? 'text-[#DFE104]' : 'text-[#FAFAFA]'}`}>
                  {member.anonymousName}
                  {member.isMe && <span className="text-[10px] text-[#DFE104] ml-2">(YOU)</span>}
                </p>
              </div>

              <div className="hidden md:flex flex-1 mx-4 h-[4px] bg-[#27272A]">
                {member.submitted && member.improvementMinutes !== 0 && (
                  <div 
                    className={`h-[4px] transition-all duration-700 ${member.improvementMinutes > 0 ? 'bg-[#DFE104]' : 'bg-[#3F3F46]'}`}
                    style={{ width: `${barWidth}%` }}
                  ></div>
                )}
              </div>

              <div className="flex-1 md:flex-none text-right">
                {!member.submitted ? (
                  <div className="inline-block border border-[#27272A] px-3 py-1">
                    <span className="text-xs uppercase text-[#3F3F46]">PENDING</span>
                  </div>
                ) : (
                  <>
                    {member.improvementMinutes > 0 && (
                      <div>
                        <p className="text-sm font-bold uppercase text-[#DFE104]">
                          -{member.improvementMinutes} MIN
                        </p>
                        <p className="text-[10px] text-[#DFE104] mt-0.5">
                          {member.improvementPct}%
                        </p>
                      </div>
                    )}
                    {member.improvementMinutes < 0 && (
                      <p className="text-sm font-bold uppercase text-[#A1A1AA]">
                        +{Math.abs(member.improvementMinutes)} MIN
                      </p>
                    )}
                    {member.improvementMinutes === 0 && (
                      <p className="text-sm uppercase text-[#3F3F46]">
                        NO CHANGE
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-8 pt-6 border-t border-[#3F3F46]">
        <p className="text-xs uppercase tracking-widest text-[#A1A1AA] mb-4">
          GROUP TREND — ARE WE COLLECTIVELY IMPROVING?
        </p>

        <div className="h-[120px] md:h-[140px] w-full mt-4">
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
            <LineChart data={MOCK_GROUP_TREND} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid stroke="#27272A" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="week" tick={{ fill: '#A1A1AA', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis 
                tickFormatter={(v) => v + 'm'} 
                domain={[minDomain, maxDomain]} 
                tick={{ fill: '#A1A1AA', fontSize: 10 }} 
                axisLine={false} 
                tickLine={false}
              />
              <ReferenceLine y={0} stroke="#3F3F46" strokeDasharray="4 4" label={{ value: 'BASELINE', fill: '#3F3F46', fontSize: 9, position: 'right', fontFamily: 'Space Grotesk' }} />
              <Tooltip 
                formatter={(value) => [`${value}min avg improvement`, 'Group']}
                contentStyle={{ backgroundColor: '#09090B', border: '1px solid #3F3F46', borderRadius: '0', fontSize: '12px' }}
                itemStyle={{ color: '#DFE104', fontFamily: 'Space Grotesk' }}
                labelStyle={{ color: '#A1A1AA', fontFamily: 'Space Grotesk' }}
              />
              <Line 
                type="monotone" 
                dataKey="avgImprovement" 
                stroke="#DFE104" 
                strokeWidth={2}
                dot={{ fill: '#DFE104', r: 3, strokeWidth: 0 }}
                activeDot={{ r: 5, fill: '#DFE104', stroke: '#09090B', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-3 flex items-center gap-2">
          {isGroupImproving ? (
            <>
              <TrendingDown size={13} color="#DFE104" />
              <p className="text-xs uppercase tracking-widest text-[#DFE104]">
                THE GROUP IS IMPROVING — KEEP GOING
              </p>
            </>
          ) : (
            <>
              <TrendingUp size={13} color="#A1A1AA" />
              <p className="text-xs uppercase tracking-widest text-[#A1A1AA]">
                THE GROUP HAD A TOUGH WEEK — SO DID OTHERS
              </p>
            </>
          )}
        </div>
      </div>

      <div className="mt-6 flex items-start sm:items-center gap-2">
        <EyeOff size={11} color="#3F3F46" className="mt-0.5 sm:mt-0 flex-shrink-0" />
        <p className="text-[10px] uppercase tracking-wider text-[#3F3F46]">
          YOU ONLY SEE ANONYMOUS NAMES AND NUMBERS — NOTHING ELSE ABOUT THESE PEOPLE.
        </p>
      </div>
    </motion.div>
  );
}
