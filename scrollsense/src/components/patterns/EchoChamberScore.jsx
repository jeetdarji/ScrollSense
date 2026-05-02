import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { PieChart, Plus, Info, ChevronDown, Sparkles, TrendingDown, TrendingUp, Minus } from 'lucide-react'

export default function EchoChamberScore({ data, isLoading }) {
  const navigate = useNavigate()
  const [isExpanded, setIsExpanded] = useState(false)
  const [scoreCount, setScoreCount] = useState(0)
  const [hoveredChannel, setHoveredChannel] = useState(null)

  const {
    hasData,
    score = 0,
    scoreLabel: backendScoreLabel,
    scoreDescription: backendScoreDescription,
    totalChannelsTracked = 0,
    topChannelConcentration = 0,
    categoryBreakdown = [],
    channelList = [],
    weeklyTrend,
    dataWindowLabel,
    message
  } = data || {}

  const displayScore = score

  useEffect(() => {
    if (!hasData || displayScore === 0) {
      setScoreCount(0)
      return
    }
    const duration = 1200 // ms
    const frameRate = 1000 / 60
    const totalFrames = Math.round(duration / frameRate)
    let frame = 0
    const interval = setInterval(() => {
      frame++
      const progress = frame / totalFrames
      // easeOutExpo
      const current = Math.round(displayScore * (1 - Math.pow(1 - progress, 3)))
      if (frame === totalFrames) {
        setScoreCount(displayScore)
        clearInterval(interval)
      } else {
        setScoreCount(current)
      }
    }, frameRate)
    return () => clearInterval(interval)
  }, [displayScore, hasData])

  if (isLoading || !data) {
    return (
      <div className="border-2 border-[#3F3F46] bg-[#09090B] p-6 text-center text-[#A1A1AA]">
        <Sparkles className="mx-auto mb-2 animate-pulse" size={24} />
        Loading Feed Diversity...
      </div>
    )
  }

  const scoreLabel = backendScoreLabel || 'CALCULATING'
  const scoreSub = backendScoreDescription || ''
  const scoreColor = displayScore >= 51 ? '#DFE104' : '#A1A1AA'

  const topChannels = channelList.slice(0, 5).map(c => ({
    name: c.channelName,
    category: c.category,
    count: c.count,
    pct: Math.round(c.percentOfTotal)
  }))

  // Top 10 channels used for the expanded Channel Network bubble view
  const networkChannels = channelList.slice(0, 10).map(c => ({
    name: c.channelName,
    category: c.category,
    count: c.count,
    pct: Math.round(c.percentOfTotal)
  }))

  const goalPercent = categoryBreakdown.find(c => c.category === 'goal')?.percent || 0
  const needsGoalBoost = goalPercent < 20
  const topChannelPercent = topChannels[0]?.pct || 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      viewport={{ once: true }}
      className="border-2 border-[#3F3F46] bg-[#09090B] p-6 md:p-8"
    >
      {/* HEADER */}
      <div className="flex justify-between items-start flex-wrap gap-4 mb-8">
        <div>
          <div className="text-xs uppercase tracking-widest text-[#DFE104] mb-1">CONTENT DIVERSITY</div>
          <h2 className="text-2xl md:text-4xl font-bold uppercase tracking-tighter leading-[0.85] text-[#FAFAFA]">HOW VARIED IS YOUR FEED?</h2>
          {dataWindowLabel && (
            <div className="mt-1 text-[10px] uppercase tracking-widest text-[#3F3F46]">{dataWindowLabel}</div>
          )}
        </div>
        <div className="border border-[#3F3F46] px-2 py-0.5 text-xs uppercase tracking-widest text-[#3F3F46]">F8</div>
      </div>

      {!hasData ? (
        <div className="border-2 border-[#3F3F46] p-6 text-center">
          <div className="text-[4rem] font-bold text-[#27272A] leading-none select-none">?</div>
          <p className="text-sm font-bold uppercase tracking-tighter text-[#FAFAFA] mt-4">{message || "Connect YouTube to see your diversity score."}</p>
          <button 
             onClick={() => navigate('/settings')}
             className="border-2 border-[#DFE104] text-[#DFE104] px-6 py-2 text-xs uppercase tracking-tighter mt-4 rounded-none hover:bg-[#DFE104] hover:text-black transition-all font-bold"
          >
             GO TO SETTINGS
          </button>
        </div>
      ) : (
        <>
          {/* SCORE HERO */}
          <div className="flex flex-col md:flex-row md:items-end gap-6 mb-8">
            <div className="flex-1">
              <div className="flex items-end">
                <div className="font-bold uppercase tracking-tighter leading-none" style={{ fontSize: 'clamp(5rem, 12vw, 9rem)', color: displayScore >= 51 ? '#DFE104' : '#FAFAFA' }}>
                  {scoreCount}
                </div>
                <div className="text-2xl font-bold text-[#3F3F46] mb-3">/100</div>
              </div>
              <div className="mt-2">
                <div className="text-lg font-bold uppercase tracking-tighter" style={{ color: scoreColor }}>{scoreLabel}</div>
                <div className="text-xs text-[#A1A1AA] mt-1 leading-relaxed max-w-xs">{scoreSub}</div>
                <div className="text-[10px] uppercase tracking-wider text-[#3F3F46] mt-2">
                  YOUTUBE DIVERSITY SCORE
                </div>
              </div>
            </div>

            <div className="border-2 border-[#3F3F46] p-5 md:min-w-[200px] w-full md:w-auto">
              <div className="text-xs uppercase tracking-widest text-[#A1A1AA] mb-4">DATA SOURCES</div>
              
              <div className="flex justify-between items-center py-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-[#DFE104]" />
                  <span className="text-xs uppercase tracking-tighter text-[#FAFAFA]">YOUTUBE</span>
                </div>
                <div className="text-xs uppercase text-[#A1A1AA]">{totalChannelsTracked} CHANNELS</div>
              </div>

              {/* WEEKLY TREND */}
              {weeklyTrend && weeklyTrend.direction !== 'no_data' && (
                <div className="flex items-center gap-2 pt-3 mt-3 border-t border-[#3F3F46]">
                  {weeklyTrend.direction === 'up' ? (
                    <TrendingUp size={14} className="text-[#22C55E] shrink-0" />
                  ) : weeklyTrend.direction === 'down' ? (
                    <TrendingDown size={14} className="text-[#EF4444] shrink-0" />
                  ) : (
                    <Minus size={14} className="text-[#A1A1AA] shrink-0" />
                  )}
                  <span className="text-[10px] uppercase tracking-wider text-[#A1A1AA]">
                    {weeklyTrend.direction === 'up'
                      ? `+${weeklyTrend.delta} PTS VS LAST WEEK`
                      : weeklyTrend.direction === 'down'
                        ? `-${weeklyTrend.delta} PTS VS LAST WEEK`
                        : 'SAME AS LAST WEEK'}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* CONCENTRATION INSIGHT */}
          <div className="border-l-4 border-[#A1A1AA] pl-4 py-3 bg-[#27272A]/30 pr-4 mb-8">
            <div className="flex items-center gap-2 mb-2">
              <PieChart size={13} className="text-[#A1A1AA]" />
              <span className="text-xs uppercase tracking-widest text-[#A1A1AA] font-bold">YOUR TOP CHANNELS</span>
            </div>
            <div className="text-sm text-[#FAFAFA] font-medium">{Math.round(topChannelConcentration)}% OF YOUR WATCH TIME COMES FROM JUST 3 CHANNELS</div>
            <div className="text-xs text-[#A1A1AA] mt-1">
              Out of {totalChannelsTracked} total channels tracked
            </div>
          </div>

          {/* SECTION 1 - TOPIC CATEGORY BREAKDOWN */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-bold uppercase tracking-tighter text-[#FAFAFA]">CONTENT CATEGORY BREAKDOWN</h3>
            </div>

            <div className="flex flex-col gap-4">
              {categoryBreakdown.map((cat, i) => (
                <div key={i} className="flex flex-col gap-1">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-bold uppercase tracking-tighter text-[#FAFAFA]">{cat.category}</span>
                    <span className={`text-sm font-bold uppercase ${cat.category === 'goal' ? 'text-[#DFE104]' : cat.category === 'interest' ? 'text-[#A1A1AA]' : 'text-[#3F3F46]'}`}>{cat.percent}%</span>
                  </div>
                  <div className="w-full h-[6px] bg-[#27272A]">
                    <div 
                      className={`h-[6px] transition-all duration-700 ${cat.category === 'goal' ? 'bg-[#DFE104]' : cat.category === 'interest' ? 'bg-[#FAFAFA]/50' : 'bg-[#3F3F46]'}`} 
                      style={{ width: `${cat.percent}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* SECTION 2 - TOP CHANNELS LIST */}
          <div className="mt-8">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-bold uppercase tracking-tighter text-[#FAFAFA]">YOUR TOP CHANNELS THIS WEEK</h3>
            </div>

            <div className="flex flex-col">
              {topChannels.map((ch, i) => (
                <div key={i} className="flex flex-wrap items-center gap-4 py-4 border-b border-[#3F3F46] last:border-0 relative">
                  <div className="text-[1.5rem] md:text-[2rem] font-bold text-[#27272A] leading-none aria-hidden min-w-[2rem]">{i + 1}</div>
                  <div className="flex-1 flex flex-col min-w-[120px] max-w-[250px]">
                    <div className="text-sm font-bold uppercase tracking-tighter text-[#FAFAFA] truncate">{ch.name}</div>
                    <div className={`text-[10px] uppercase tracking-widest mt-0.5 ${ch.category === 'goal' ? 'text-[#DFE104]' : ch.category === 'interest' ? 'text-[#A1A1AA]' : 'text-[#3F3F46]'}`}>{ch.category === 'none' ? 'OTHER' : ch.category}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold uppercase text-[#FAFAFA]">{ch.pct}% <span className="text-[10px] text-[#A1A1AA] hidden sm:inline">OF WATCH TIME</span></div>
                    <div className="text-[10px] uppercase text-[#3F3F46] mt-0.5">{ch.count} VIDEOS</div>
                  </div>
                  <div className="w-full h-[2px] bg-[#27272A] mt-3 md:absolute md:bottom-0 md:left-[3.5rem] md:w-[calc(100%-3.5rem)] md:mt-0">
                    <div className="bg-[#DFE104] h-[2px]" style={{ width: `${ch.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* SECTION 3 - GROWTH SUGGESTIONS */}
          <div className="mt-8">
            <div className="mb-4">
              <h3 className="text-sm font-bold uppercase tracking-tighter text-[#FAFAFA]">WAYS TO BROADEN YOUR FEED</h3>
              <div className="text-xs text-[#3F3F46] uppercase tracking-wider mt-1">Based on your stated goals and current watch patterns</div>
            </div>

            <div className="flex flex-col gap-3">
              <div className="border-2 border-[#3F3F46] p-4 flex items-start gap-4 hover:border-[#FAFAFA]/20 hover:bg-[#27272A]/30 transition-all duration-200 group">
                <Plus size={16} className="text-[#DFE104] flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="text-sm font-bold uppercase tracking-tighter text-[#FAFAFA]">ADD ONE NEW CREATOR IN YOUR GOAL AREA</div>
                  <div className="text-xs text-[#A1A1AA] mt-1 leading-relaxed">Your top channel covers {topChannelPercent}% of your time. A second source adds perspective.</div>
                </div>
              </div>

              {needsGoalBoost && (
                <div className="border-2 border-[#3F3F46] p-4 flex items-start gap-4 hover:border-[#FAFAFA]/20 hover:bg-[#27272A]/30 transition-all duration-200 group">
                  <Plus size={16} className="text-[#DFE104] flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <div className="text-sm font-bold uppercase tracking-tighter text-[#FAFAFA]">WATCH ONE GOAL-RELEVANT VIDEO TODAY</div>
                    <div className="text-xs text-[#A1A1AA] mt-1 leading-relaxed">Your goal-relevant content is currently at {goalPercent}%. One deliberate video shifts this meaningfully.</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* SECTION 4 - NETWORK GRAPH (OPTIONAL, COLLAPSED) */}
          <div className="border-t border-[#3F3F46] pt-6 mt-6">
            <div 
              className="flex justify-between items-center cursor-pointer select-none"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              <div className="flex items-center gap-3">
                <span className="text-xs uppercase tracking-widest text-[#3F3F46]">CHANNEL NETWORK — ADVANCED VIEW</span>
                <span className="border border-[#3F3F46] px-2 py-0.5 text-[10px] uppercase text-[#3F3F46]">BETA</span>
              </div>
              <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.3 }}>
                <ChevronDown size={16} className="text-[#3F3F46]" />
              </motion.div>
            </div>

            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <div className="pt-4">
                    <div className="flex items-start gap-2 mb-5">
                      <Info size={12} className="text-[#3F3F46] flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-[#3F3F46] leading-relaxed max-w-2xl">
                        Bubble size = share of total watch time. Hover a bubble for details.
                      </p>
                    </div>

                    {/* Bubble concentration chart */}
                    <div className="flex flex-wrap items-end justify-center gap-3 p-5 bg-[#09090B] border border-[#3F3F46]/40 min-h-[180px]">
                      {networkChannels.length === 0 ? (
                        <div className="text-xs text-[#3F3F46] uppercase tracking-wider self-center">No channel data yet</div>
                      ) : networkChannels.map((ch, i) => {
                        // Scale bubble diameter: 100% → 180px, 5% → 52px min
                        const size = Math.max(52, Math.min(180, Math.round(ch.pct * 3.6)))
                        const bgColor = ch.category === 'goal'
                          ? '#DFE104'
                          : ch.category === 'interest'
                          ? 'rgba(250,250,250,0.12)'
                          : '#1C1C1F'
                        const borderColor = ch.category === 'goal'
                          ? '#DFE104'
                          : ch.category === 'interest'
                          ? 'rgba(250,250,250,0.25)'
                          : '#3F3F46'
                        const textColor = ch.category === 'goal' ? '#09090B' : '#FAFAFA'
                        const isHovered = hoveredChannel === i

                        return (
                          <div
                            key={i}
                            className="relative flex-shrink-0 flex items-center justify-center cursor-pointer transition-all duration-200"
                            style={{
                              width: `${size}px`,
                              height: `${size}px`,
                              borderRadius: '50%',
                              backgroundColor: bgColor,
                              border: `2px solid ${borderColor}`,
                              opacity: hoveredChannel !== null && !isHovered ? 0.45 : 1,
                              transform: isHovered ? 'scale(1.08)' : 'scale(1)',
                            }}
                            onMouseEnter={() => setHoveredChannel(i)}
                            onMouseLeave={() => setHoveredChannel(null)}
                          >
                            <div className="text-center px-2 overflow-hidden select-none">
                              {size >= 70 && (
                                <div
                                  className="text-[9px] font-bold uppercase tracking-tighter leading-tight block"
                                  style={{ color: textColor, maxWidth: `${size - 16}px`, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}
                                >
                                  {ch.name.length > 13 ? ch.name.slice(0, 11) + '…' : ch.name}
                                </div>
                              )}
                              <div className="text-[11px] font-bold leading-tight" style={{ color: textColor }}>
                                {ch.pct}%
                              </div>
                            </div>

                            {/* Hover tooltip */}
                            {isHovered && (
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-20 bg-[#18181B] border border-[#3F3F46] p-2 text-left pointer-events-none whitespace-nowrap">
                                <p className="text-xs font-bold text-[#FAFAFA] uppercase truncate max-w-[180px]">{ch.name}</p>
                                <p className="text-[10px] text-[#A1A1AA] mt-1">{ch.pct}% of watch time</p>
                                <p className="text-[10px] text-[#3F3F46] uppercase mt-0.5">{ch.count} VIDEOS · {ch.category}</p>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>

                    {/* Legend */}
                    <div className="flex flex-wrap gap-4 mt-4">
                      {[
                        { label: 'GOAL', bg: '#DFE104', border: '#DFE104' },
                        { label: 'INTEREST', bg: 'rgba(250,250,250,0.12)', border: 'rgba(250,250,250,0.25)' },
                        { label: 'JUNK', bg: '#1C1C1F', border: '#3F3F46' },
                      ].map(({ label, bg, border }) => (
                        <div key={label} className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: bg, border: `1.5px solid ${border}` }} />
                          <span className="text-[10px] text-[#A1A1AA] uppercase tracking-wider">{label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </>
      )}
    </motion.div>
  )
}
