import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ScatterChart, Scatter, XAxis, YAxis, ZAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { PieChart, Plus, Info, ChevronDown } from 'lucide-react'

const MOCK_YOUTUBE_DATA = {
  topChannels: [
    { name: 'Channel A', category: 'goal', count: 85, pct: 42 },
    { name: 'Channel B', category: 'interest', count: 48, pct: 24 },
    { name: 'Channel C', category: 'junk', count: 31, pct: 15 },
    { name: 'Channel D', category: 'junk', count: 22, pct: 11 },
    { name: 'Channel E', category: 'interest', count: 16, pct: 8 },
  ],
  totalVideos: 202,
}

const MOCK_ECHO_DATA = {
  youtubeScore: 34,
  instagramScore: null,
  combinedScore: 34,
  totalChannels: 23,
  topicCategories: [
    { label: 'Tech & Coding', percent: 44, category: 'goal' },
    { label: 'Gaming', percent: 22, category: 'interest' },
    { label: 'Entertainment', percent: 18, category: 'junk' },
    { label: 'Fitness', percent: 10, category: 'interest' },
    { label: 'Other', percent: 6, category: 'junk' },
  ],
}

export default function EchoChamberScore() {
  const navigate = useNavigate()
  const [youtubeData, setYoutubeData] = useState(null)
  const [instagramData, setInstagramData] = useState(null)
  const [isExpanded, setIsExpanded] = useState(false)
  const [scoreCount, setScoreCount] = useState(0)

  useEffect(() => {
    try {
      const yt = localStorage.getItem('scrollsense_youtube_processed')
      setYoutubeData(yt ? JSON.parse(yt) : MOCK_YOUTUBE_DATA)
    } catch {
      setYoutubeData(MOCK_YOUTUBE_DATA)
    }

    try {
      const ig = localStorage.getItem('scrollsense_instagram_processed')
      setInstagramData(ig ? JSON.parse(ig) : null)
    } catch {
      setInstagramData(null)
    }
  }, [])

  // Step 1: Read Instagram data safely
  const instagramProcessed = (() => {
    try {
      const s = localStorage.getItem('scrollsense_instagram_processed')
      return s ? JSON.parse(s) : null
    } catch { return null }
  })()

  const hasInstagram = !!(
    instagramProcessed?.echoChamberData?.score !== undefined &&
    instagramProcessed?.echoChamberData?.score !== null
  )

  // Step 2: Calculate YouTube score defensively
  const ytChannels = youtubeData?.topChannels || MOCK_YOUTUBE_DATA.topChannels
  const ytTotal = youtubeData?.totalVideos || MOCK_YOUTUBE_DATA.totalVideos
  const ytUnique = ytChannels.length
  
  // Guard against division by zero
  const ytScore = ytTotal > 0 
    ? (() => {
        const top5Count = ytChannels
          .slice(0,5)
          .reduce((s,c) => s + (c.count || 0), 0)
        const top5Pct = (top5Count / ytTotal) * 100
        const base = (ytUnique / ytTotal) * 100
        return Math.min(100, Math.max(0, 
          Math.round(base - top5Pct * 0.5)
        ))
      })()
    : MOCK_ECHO_DATA.youtubeScore

  // Step 3: Get Instagram score safely
  const igScore = hasInstagram 
    ? instagramProcessed.echoChamberData.score 
    : null

  // Step 4: Final combined score — never NaN, never null
  const displayScore = hasInstagram && igScore !== null
    ? Math.round((ytScore + igScore) / 2)
    : ytScore

  // Step 5: Instagram stats for display
  const igUniqueCreators = instagramProcessed?.echoChamberData?.uniqueCreators || 0
  const igTotalVideos = instagramProcessed?.echoChamberData?.totalVideos || 0
  const igTopCreatorPct = instagramProcessed?.echoChamberData?.topCreatorPercent || 0

  const topChannelsData = ytChannels
  const ytUniqueChannels = ytUnique
  const ytTop5 = topChannelsData.slice(0, 5).reduce((s, c) => s + c.count, 0)
  const ytTop5Pct = ytTotal ? (ytTop5 / ytTotal) * 100 : 0

  const topChannelPercent = topChannelsData[0] ? Math.round((topChannelsData[0].count / (ytTotal || 1)) * 100) : 0
  const top5ChannelPercent = Math.round(ytTop5Pct)

  useEffect(() => {
    if (displayScore === 0) {
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
  }, [displayScore])

  let scoreLabel = "ROOM TO GROW"
  let scoreSub = ""
  let scoreColor = "#A1A1AA"

  if (displayScore <= 25) {
    scoreLabel = "CONCENTRATED FEED"
    scoreSub = "Your content comes from very few sources. Room for a lot of growth."
    scoreColor = "#A1A1AA"
  } else if (displayScore <= 50) {
    scoreLabel = "DEVELOPING DIVERSITY"
    scoreSub = "A handful of sources dominate. You're starting to branch out."
    scoreColor = "#A1A1AA"
  } else if (displayScore <= 75) {
    scoreLabel = "MODERATELY DIVERSE"
    scoreSub = "Good variety across different creators and topics."
    scoreColor = "#DFE104"
  } else {
    scoreLabel = "HIGHLY DIVERSE FEED"
    scoreSub = "Your content comes from a wide range of voices and perspectives."
    scoreColor = "#DFE104"
  }

  const topicCategories = MOCK_ECHO_DATA.topicCategories // Using mock topics. Real implementation would aggregate from both.
  const topChannels = topChannelsData.slice(0, 5).map(c => ({
    ...c,
    pct: Math.round((c.count / (ytTotal || 1)) * 100)
  }))

  const goalPercent = topicCategories.filter(c => c.category === 'goal').reduce((s, c) => s + c.percent, 0)
  const needsGoalBoost = goalPercent < 20

  const scatterData = topChannels.map((ch, i) => ({
    x: i * 15 + 10,
    y: ch.pct,
    z: ch.count,
    name: ch.name,
    category: ch.category,
  }))

  const maxPct = scatterData.length > 0 ? Math.max(...scatterData.map(d => d.y)) : 0

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-[#27272A] border border-[#3F3F46] p-2">
          <p className="text-xs font-bold text-[#FAFAFA]">{data.name}</p>
          <p className="text-[10px] text-[#A1A1AA] mt-1">{data.y}% of watch time</p>
          <p className="text-[10px] uppercase text-[#3F3F46] mt-0.5">{data.category}</p>
        </div>
      )
    }
    return null
  }

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
        </div>
        <div className="border border-[#3F3F46] px-2 py-0.5 text-xs uppercase tracking-widest text-[#3F3F46]">F8</div>
      </div>

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
            
            {hasInstagram ? (
              <div className="text-[10px] uppercase tracking-wider text-[#3F3F46] mt-2">
                COMBINED YOUTUBE + INSTAGRAM SCORE
              </div>
            ) : (
              <div 
                className="text-[10px] uppercase tracking-wider text-[#3F3F46] mt-2 cursor-pointer hover:text-[#FAFAFA] transition-colors"
                onClick={() => navigate('/settings')}
              >
                YOUTUBE ONLY · UPLOAD INSTAGRAM FOR COMBINED SCORE
              </div>
            )}
          </div>
        </div>

        <div className="border-2 border-[#3F3F46] p-5 md:min-w-[200px] w-full md:w-auto">
          <div className="text-xs uppercase tracking-widest text-[#A1A1AA] mb-4">DATA SOURCES</div>
          
          <div className="flex justify-between items-center py-2 border-b border-[#3F3F46]">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-[#DFE104]" />
              <span className="text-xs uppercase tracking-tighter text-[#FAFAFA]">YOUTUBE</span>
            </div>
            <div className="text-xs uppercase text-[#A1A1AA]">{ytUniqueChannels} CHANNELS</div>
          </div>

          <div className="flex justify-between items-center py-2">
            {hasInstagram ? (
              <>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-[#FAFAFA]/40" />
                  <span className="text-xs uppercase text-[#FAFAFA]">INSTAGRAM</span>
                </div>
                <div className="text-right">
                  <div className="text-xs uppercase text-[#A1A1AA]">{igUniqueCreators} CREATORS</div>
                  <div className="text-[10px] uppercase text-[#3F3F46] mt-1">{igTotalVideos} REELS ANALYZED</div>
                </div>
              </>
            ) : (
               <>
                 <div className="flex items-center gap-2">
                   <div className="w-2 h-2 bg-[#27272A] border border-[#3F3F46]" />
                   <span className="text-xs uppercase text-[#3F3F46]">INSTAGRAM</span>
                 </div>
                 <div className="text-xs uppercase text-[#3F3F46]">NOT UPLOADED</div>
               </>
            )}
          </div>
          {!hasInstagram && (
             <div 
               className="mt-2 text-[10px] uppercase tracking-widest text-[#3F3F46] border border-[#3F3F46] px-3 py-1.5 w-full text-center cursor-pointer hover:border-[#FAFAFA]/20 transition-all"
               onClick={() => navigate('/settings')}
             >
               UPLOAD INSTAGRAM EXPORT →
             </div>
          )}
        </div>
      </div>

      {/* CONCENTRATION INSIGHT */}
      <div className="border-l-4 border-[#A1A1AA] pl-4 py-3 bg-[#27272A]/30 pr-4 mb-8">
        <div className="flex items-center gap-2 mb-2">
          <PieChart size={13} className="text-[#A1A1AA]" />
          <span className="text-xs uppercase tracking-widest text-[#A1A1AA] font-bold">YOUR TOP {Math.min(ytUniqueChannels, 5)} CHANNELS</span>
        </div>
        <div className="text-sm text-[#FAFAFA] font-medium">{top5ChannelPercent}% OF YOUR WATCH TIME COMES FROM JUST {Math.min(ytUniqueChannels, 5)} CHANNELS</div>
        {hasInstagram && igTopCreatorPct > 0 && (
          <div className="text-xs text-[#A1A1AA] mt-2">
            INSTAGRAM: TOP CREATOR ACCOUNTS FOR {igTopCreatorPct}% OF YOUR REELS
          </div>
        )}
        <div className="text-xs text-[#A1A1AA] mt-1">
          {hasInstagram 
            ? `YouTube: ${ytUniqueChannels} channels · Instagram: ${igUniqueCreators} creators`
            : `Out of ${ytUniqueChannels} total channels watched`
          }
        </div>
      </div>

      {/* SECTION 1 - TOPIC CATEGORY BREAKDOWN */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-sm font-bold uppercase tracking-tighter text-[#FAFAFA]">CONTENT CATEGORY BREAKDOWN</h3>
          <span className="border border-[#3F3F46] px-2 py-0.5 text-[10px] text-[#A1A1AA]">
            YOUTUBE ONLY
          </span>
        </div>

        <div className="flex flex-col gap-4">
          {topicCategories.map((cat, i) => (
            <div key={i} className="flex flex-col gap-1">
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-bold uppercase tracking-tighter text-[#FAFAFA]">{cat.label}</span>
                <span className={`text-sm font-bold uppercase ${cat.category === 'goal' ? 'text-[#DFE104]' : cat.category === 'interest' ? 'text-[#A1A1AA]' : 'text-[#3F3F46]'}`}>{cat.percent}%</span>
              </div>
              <div className="w-full h-[6px] bg-[#27272A]">
                <div 
                  className={`h-[6px] transition-all duration-700 ${cat.category === 'goal' ? 'bg-[#DFE104]' : cat.category === 'interest' ? 'bg-[#FAFAFA]/50' : 'bg-[#3F3F46]'}`} 
                  style={{ width: `${cat.percent}%` }}
                />
              </div>
              <div className="text-[10px] text-[#3F3F46] uppercase tracking-wider">
                {cat.category === 'goal' ? 'ALIGNED WITH YOUR GOALS' : cat.category === 'interest' ? 'MATCHES DECLARED INTERESTS' : 'NO DIRECT GOAL CONNECTION'}
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-1.5 mt-4">
          <Info size={10} className="text-[#3F3F46]" />
          <span className="text-[10px] uppercase tracking-wider text-[#3F3F46]">
            CATEGORY BREAKDOWN IS YOUTUBE-ONLY — INSTAGRAM EXPORT DOES NOT INCLUDE VIDEO TITLES
          </span>
        </div>
      </div>

      {/* SECTION 2 - TOP CHANNELS LIST */}
      <div className="mt-8">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-sm font-bold uppercase tracking-tighter text-[#FAFAFA]">YOUR TOP CHANNELS THIS MONTH</h3>
        </div>

        <div className="flex flex-col">
          {topChannels.map((ch, i) => (
            <div key={i} className="flex flex-wrap items-center gap-4 py-4 border-b border-[#3F3F46] last:border-0 relative">
              <div className="text-[1.5rem] md:text-[2rem] font-bold text-[#27272A] leading-none aria-hidden min-w-[2rem]">{i + 1}</div>
              <div className="flex-1 flex flex-col min-w-[120px]">
                <div className="text-sm font-bold uppercase tracking-tighter text-[#FAFAFA] truncate">{ch.name}</div>
                <div className={`text-[10px] uppercase tracking-widest mt-0.5 ${ch.category === 'goal' ? 'text-[#DFE104]' : ch.category === 'interest' ? 'text-[#A1A1AA]' : 'text-[#3F3F46]'}`}>{ch.category}</div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold uppercase text-[#FAFAFA]">{ch.pct}% <span className="text-[10px] text-[#A1A1AA]">OF WATCH TIME</span></div>
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
              <div className="text-xs text-[#A1A1AA] mt-1 leading-relaxed">Your top channel covers {topChannelPercent}% of your goal-relevant content. A second source adds perspective and reduces single-creator dependency.</div>
            </div>
            <div className="text-[10px] uppercase tracking-widest text-[#3F3F46] group-hover:text-[#DFE104] cursor-pointer transition-colors ml-auto sm:whitespace-nowrap mt-1">EXPLORE &rarr;</div>
          </div>

          {needsGoalBoost && (
            <div className="border-2 border-[#3F3F46] p-4 flex items-start gap-4 hover:border-[#FAFAFA]/20 hover:bg-[#27272A]/30 transition-all duration-200 group">
              <Plus size={16} className="text-[#DFE104] flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="text-sm font-bold uppercase tracking-tighter text-[#FAFAFA]">WATCH ONE GOAL-RELEVANT VIDEO TODAY</div>
                <div className="text-xs text-[#A1A1AA] mt-1 leading-relaxed">Your goal-relevant content is currently at {goalPercent}%. Even one deliberate video per session shifts this meaningfully over time.</div>
              </div>
              <div className="text-[10px] uppercase tracking-widest text-[#3F3F46] group-hover:text-[#DFE104] cursor-pointer transition-colors ml-auto sm:whitespace-nowrap mt-1">EXPLORE &rarr;</div>
            </div>
          )}

          <div className="border-2 border-[#3F3F46] p-4 flex items-start gap-4 hover:border-[#FAFAFA]/20 hover:bg-[#27272A]/30 transition-all duration-200 group">
            <Plus size={16} className="text-[#DFE104] flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="text-sm font-bold uppercase tracking-tighter text-[#FAFAFA]">EXPLORE A TOPIC OUTSIDE YOUR TOP 3</div>
              <div className="text-xs text-[#A1A1AA] mt-1 leading-relaxed">Your top 3 categories account for most of your watch time. Occasional variety keeps your feed from narrowing further.</div>
            </div>
            <div className="text-[10px] uppercase tracking-widest text-[#3F3F46] group-hover:text-[#DFE104] cursor-pointer transition-colors ml-auto sm:whitespace-nowrap mt-1">EXPLORE &rarr;</div>
          </div>
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
                <div className="flex items-start gap-2 mb-4">
                  <Info size={12} className="text-[#3F3F46] flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-[#3F3F46] leading-relaxed max-w-2xl">
                    This graph shows channel relationships based on co-watching patterns. It does not use D3.js — rendered as a simplified bubble chart using Recharts ScatterChart.
                  </p>
                </div>

                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                      <XAxis type="number" dataKey="x" hide />
                      <YAxis 
                        type="number" 
                        dataKey="y" 
                        tickFormatter={(v) => v + '%'} 
                        domain={[0, maxPct + 10]} 
                        tick={{ fill: '#A1A1AA', fontSize: 11, fontFamily: 'Space Grotesk' }}
                        axisLine={false} tickLine={false}
                      />
                      <ZAxis type="number" dataKey="z" range={[40, 400]} />
                      <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3', stroke: '#3F3F46' }} />
                      <Scatter data={scatterData}>
                        {scatterData.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={entry.category === 'goal' ? '#DFE104' : entry.category === 'interest' ? 'rgba(250,250,250,0.5)' : '#3F3F46'} 
                          />
                        ))}
                      </Scatter>
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>

                <div className="flex flex-wrap gap-3 mt-3">
                  {scatterData.map((entry, index) => (
                    <div key={index} className="flex items-center gap-1.5">
                      <div 
                        className="w-1.5 h-1.5" 
                        style={{ background: entry.category === 'goal' ? '#DFE104' : entry.category === 'interest' ? 'rgba(250,250,250,0.5)' : '#3F3F46' }} 
                      />
                      <span className="text-[10px] text-[#A1A1AA] uppercase">{entry.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
