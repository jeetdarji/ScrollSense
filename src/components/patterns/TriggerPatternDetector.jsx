import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { BarChart, Bar, XAxis, YAxis, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { Database, PlusCircle } from 'lucide-react'

const MOCK_YOUTUBE_DATA = {
  timestamps: Array.from({ length: 200 }, (_, i) => {
    // Generate realistic timestamps: skew towards late nights and Sundays
    const now = Date.now()
    const daysAgo = Math.floor(Math.random() * 28)
    const rand = Math.random()
    let hour
    if (rand < 0.4) hour = 22 + Math.random() * 3 // 10pm - 1am
    else if (rand < 0.7) hour = 18 + Math.random() * 4 // 6pm - 10pm
    else if (rand < 0.85) hour = 7 + Math.random() * 2 // 7am - 9am
    else hour = Math.random() * 24 // random
    return now - (daysAgo * 86400000) - (hour * 3600000)
  }),
  weeksOfData: 4,
  totalVideos: 203,
}

const MOCK_SESSIONS = [
  { id: '1', durationMinutes: 45, moodRating: 2, platform: 'youtube', timestamp: Date.now() - 86400000 },
  { id: '2', durationMinutes: 20, moodRating: 4, platform: 'instagram', timestamp: Date.now() - 172800000 },
  { id: '3', durationMinutes: 90, moodRating: 1, platform: 'youtube', timestamp: Date.now() - 259200000 },
  { id: '4', durationMinutes: 30, moodRating: 3, platform: 'instagram', timestamp: Date.now() - 345600000 },
  { id: '5', durationMinutes: 15, moodRating: 5, platform: 'youtube', timestamp: Date.now() - 432000000 },
]

export default function TriggerPatternDetector() {
  const navigate = useNavigate()
  const [youtubeData, setYoutubeData] = useState(null)
  const [instagramData, setInstagramData] = useState(null)
  const [sessions, setSessions] = useState([])
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  const [platformFilter, setPlatformFilter] = useState('ALL')

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

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

    try {
      const sess = localStorage.getItem('scrollsense_sessions')
      setSessions(sess ? JSON.parse(sess) : MOCK_SESSIONS)
    } catch {
      setSessions(MOCK_SESSIONS)
    }
  }, [])

  const sessionCount = sessions.length
  const uniqueDays = new Set(sessions.map(s => new Date(s.timestamp).toDateString())).size

  const dataState = 
    sessionCount < 7 ? 'preview' :
    sessionCount < 21 ? 'building' : 'full'

  const instagramProcessed = (() => {
    try {
      const s = localStorage.getItem('scrollsense_instagram_processed')
      return s ? JSON.parse(s) : null
    } catch { return null }
  })()

  const hasInstagram = instagramProcessed !== null

  // Instagram session start timestamps from inferred sessions
  const instagramTimestamps = instagramProcessed
    ?.inferredSessions?.map(s => s.start) || []

  // YouTube timestamps from processed data
  const youtubeTimestamps = youtubeData?.timestamps || []

  // Session log timestamps (user-reported, both platforms)
  const sessionTimestamps = sessions.map(s => s.timestamp)

  // COMBINED — all three sources merged
  const allTimestamps = [
    ...youtubeTimestamps,
    ...instagramTimestamps,
    ...sessionTimestamps,
  ]

  // Per-platform counts for display
  const youtubeTsCount = youtubeTimestamps.length
  const instagramTsCount = instagramTimestamps.length
  const sessionTsCount = sessionTimestamps.length

  // YouTube hourly
  const hourlyYT = Array.from({length:24}, (_, h) => ({
    hour: h,
    youtube: youtubeTimestamps.filter(
      ts => new Date(ts).getHours() === h
    ).length,
  }))

  // Instagram hourly
  const hourlyIG = Array.from({length:24}, (_, h) => ({
    hour: h,
    instagram: instagramTimestamps.filter(
      ts => new Date(ts).getHours() === h
    ).length,
  }))

  // Merged for chart — combine into single array
  const hourlyMerged = Array.from({length:24}, (_, h) => {
    const label = h === 0 ? '12 AM' : h < 12 ? `${h} AM` :
                  h === 12 ? '12 PM' : `${h-12} PM`
    return {
      hour: h,
      label,
      youtube: hourlyYT[h].youtube,
      instagram: hourlyIG[h].instagram,
      total: hourlyYT[h].youtube + hourlyIG[h].instagram,
    }
  })

  // Day of week — same split
  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
  const weeklyMerged = Array.from({length:7}, (_, d) => ({
    day: d,
    label: days[d],
    youtube: youtubeTimestamps.filter(
      ts => new Date(ts).getDay() === d
    ).length,
    instagram: instagramTimestamps.filter(
      ts => new Date(ts).getDay() === d
    ).length,
    total: youtubeTimestamps.filter(
             ts => new Date(ts).getDay() === d
           ).length +
           instagramTimestamps.filter(
             ts => new Date(ts).getDay() === d
           ).length,
  }))

  const sources = []
  if (youtubeTsCount > 0) sources.push(`YOUTUBE: ${youtubeTsCount} VIDEOS`)
  if (instagramTsCount > 0) sources.push(`INSTAGRAM: ${instagramTsCount} REELS`)
  if (sessionTsCount > 0) sources.push(`${sessionTsCount} SESSION LOGS`)

  const periods = [
    { label: 'MORNING 6–12', count: hourlyMerged.filter(h => h.hour >= 6 && h.hour < 12).reduce((s, h) => s + h.total, 0) },
    { label: 'AFTERNOON 12–6', count: hourlyMerged.filter(h => h.hour >= 12 && h.hour < 18).reduce((s, h) => s + h.total, 0) },
    { label: 'EVENING 6–10', count: hourlyMerged.filter(h => h.hour >= 18 && h.hour < 22).reduce((s, h) => s + h.total, 0) },
    { label: 'LATE NIGHT 10–6', count: hourlyMerged.filter(h => h.hour >= 22 || h.hour < 6).reduce((s, h) => s + h.total, 0) },
  ]

  const peakHour = hourlyMerged.reduce((a, b) => a.total > b.total ? a : b, { total: -1, label: '', hour: 0 })
  const maxH = Math.max(...hourlyMerged.map(h => h.total), 1)
  const maxPeriod = Math.max(...periods.map(p => p.count), 1)

  const heaviestDay = weeklyMerged.reduce((a, b) => a.total > b.total ? a : b, { total: -1, label: '', day: 0 })
  const maxDay = Math.max(...weeklyMerged.map(d => d.total), 1)

  const buckets = [
    { label: '<15M', max: 15, min: 0 },
    { label: '15-30', max: 30, min: 15 },
    { label: '30-45', max: 45, min: 30 },
    { label: '45-60', max: 60, min: 45 },
    { label: '60-90', max: 90, min: 60 },
    { label: '90M+', max: 999, min: 90 },
  ]

  const filteredSessions = platformFilter === 'ALL' 
    ? sessions 
    : sessions.filter(s => 
        s.platform === platformFilter.toLowerCase() ||
        (platformFilter === 'BOTH' && s.platform === 'both')
      )

  const moodData = buckets.map(bucket => {
    const inBucket = filteredSessions.filter(s => s.durationMinutes <= bucket.max && s.durationMinutes > bucket.min)
    const avgMood = inBucket.length ? inBucket.reduce((s, i) => s + i.moodRating, 0) / inBucket.length : null
    return { label: bucket.label, avgMood: avgMood !== null ? Math.round(avgMood * 10) / 10 : null, count: inBucket.length }
  }).filter(d => d.avgMood !== null)

  const dropPoint = moodData.find(d => d.avgMood < 3)

  const heaviestDayAvg = sessions.length ? sessions.filter(s => new Date(s.timestamp).getDay() === heaviestDay.day).reduce((acc, curr, _, arr) => acc + curr.durationMinutes / arr.length, 0) : 0
  const overallAvg = sessions.length ? sessions.reduce((s, i) => s + i.durationMinutes, 0) / sessions.length : 1
  const multiplier = Math.round((heaviestDayAvg / overallAvg) * 10) / 10 || 1

  const progressPercent = dataState === 'full' ? 100 : dataState === 'building' ? Math.min((sessionCount / 21) * 100, 100) : Math.min((sessionCount / 7) * 100, 100)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      viewport={{ once: true }}
      className="border-2 border-[#3F3F46] bg-[#09090B] p-6 md:p-8"
    >
      {/* HEADER */}
      <div className="flex justify-between items-start flex-wrap gap-4 mb-6">
        <div>
          <div className="text-xs uppercase tracking-widest text-[#DFE104] mb-1">TRIGGER PATTERN DETECTOR</div>
          <h2 className="text-2xl md:text-4xl font-bold uppercase tracking-tighter leading-[0.85] text-[#FAFAFA]">WHEN DO YOU SCROLL MOST?</h2>
          <div className="mt-2">
            {dataState === 'preview' && <span className="bg-[#27272A] border border-[#3F3F46] px-3 py-1 text-[10px] uppercase tracking-widest text-[#A1A1AA]">
              {hasInstagram ? 'PATTERN PREVIEW — YOUTUBE + INSTAGRAM' : 'PATTERN PREVIEW — YOUTUBE HISTORY · ADD INSTAGRAM'}
            </span>}
            {dataState === 'building' && <span className="bg-[#DFE104]/10 border border-[#DFE104]/30 px-3 py-1 text-[10px] uppercase tracking-widest text-[#DFE104]">PATTERNS BUILDING — {sessionCount} SESSIONS</span>}
            {dataState === 'full' && <span className="bg-[#DFE104]/10 border border-[#DFE104]/30 px-3 py-1 text-[10px] uppercase tracking-widest text-[#DFE104]">FULL PATTERN DATA ACTIVE</span>}
          </div>
        </div>
        <div className="border border-[#3F3F46] px-2 py-0.5 text-xs uppercase tracking-widest text-[#3F3F46]">F7</div>
      </div>

      {/* PROGRESS INDICATOR */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-2 flex-wrap gap-2">
          <div className="text-xs uppercase tracking-widest text-[#A1A1AA]">
            {dataState === 'preview' && 'UNLOCK FULL PATTERNS — LOG 7 SESSIONS'}
            {dataState === 'building' && `PATTERNS ENRICHING — ${Math.max(0, 21 - sessionCount)} MORE SESSIONS FOR FULL ANALYSIS`}
            {dataState === 'full' && 'FULL PATTERN ANALYSIS ACTIVE'}
          </div>
          <div className={`text-xs uppercase tracking-widest ${dataState === 'full' ? 'text-[#DFE104]' : 'text-[#3F3F46]'}`}>
            {sessionCount} / {dataState === 'full' ? '21+' : dataState === 'building' ? '21' : '7'} SESSIONS
          </div>
        </div>
        <div className="w-full h-[4px] bg-[#27272A]">
          <div className="bg-[#DFE104] h-[4px] transition-all duration-700" style={{ width: `${progressPercent}%` }} />
        </div>
        <div className="mt-2 flex flex-wrap justify-between items-center gap-2">
          <div className="flex flex-col items-center gap-1">
            <div className={`w-2 h-2 ${sessionCount >= 7 ? 'bg-[#DFE104]' : 'bg-[#27272A] border border-[#3F3F46]'}`} />
            <span className={`text-[10px] uppercase ${sessionCount >= 7 ? 'text-[#DFE104]' : 'text-[#3F3F46]'}`}>7 SESSIONS</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <div className={`w-2 h-2 ${uniqueDays >= 14 ? 'bg-[#DFE104]' : 'bg-[#27272A] border border-[#3F3F46]'}`} />
            <span className={`text-[10px] uppercase ${uniqueDays >= 14 ? 'text-[#DFE104]' : 'text-[#3F3F46]'}`}>14 DAYS</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <div className={`w-2 h-2 ${dataState === 'full' ? 'bg-[#DFE104]' : 'bg-[#27272A] border border-[#3F3F46]'}`} />
            <span className={`text-[10px] uppercase ${dataState === 'full' ? 'text-[#DFE104]' : 'text-[#3F3F46]'}`}>FULL PATTERNS</span>
          </div>
        </div>
      </div>

      <div className="mb-6">
        <div className="flex items-center gap-2">
          <Database size={11} className="text-[#3F3F46]" />
          <span className="text-[10px] uppercase tracking-wider text-[#3F3F46]">ANALYZING: {sources.join(' · ')}</span>
        </div>
        {!hasInstagram && (
          <div 
            className="flex items-center gap-1.5 mt-2 cursor-pointer group w-fit" 
            onClick={() => navigate('/settings')}
          >
            <PlusCircle size={10} className="text-[#3F3F46] group-hover:text-[#FAFAFA] transition-colors" />
            <span className="text-[10px] uppercase tracking-wider text-[#3F3F46] group-hover:text-[#FAFAFA] transition-colors">
              ADD INSTAGRAM EXPORT FOR REEL PATTERNS →
            </span>
          </div>
        )}
      </div>

      {/* SECTION 1 - TIME OF DAY HEATMAP */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-sm font-bold uppercase tracking-tighter text-[#FAFAFA]">PEAK SCROLL HOURS</h3>
          {hasInstagram ? (
            <span className="border border-[#DFE104]/40 px-2 py-0.5 text-[10px] text-[#DFE104]">
              YOUTUBE + INSTAGRAM
            </span>
          ) : (
            <span 
              onClick={() => navigate('/settings')}
              className="border border-[#3F3F46] px-2 py-0.5 text-[10px] text-[#3F3F46] cursor-pointer hover:border-[#FAFAFA]/20 transition-all"
            >
              YOUTUBE ONLY · ADD INSTAGRAM
            </span>
          )}
        </div>

        {isMobile ? (
          <div className="h-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={periods} margin={{ top: 0, right: 0, left: 10, bottom: 0 }}>
                <YAxis type="category" dataKey="label" width={100} tick={{ fill: '#A1A1AA', fontSize: 10, fontFamily: 'Space Grotesk' }} axisLine={false} tickLine={false} />
                <XAxis type="number" hide />
                <Tooltip contentStyle={{ background: '#27272A', border: '1px solid #3F3F46', borderRadius: 0, fontFamily: 'Space Grotesk', fontSize: 12 }} />
                <Bar dataKey="count" fill="#DFE104">
                  {periods.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={`rgba(223, 225, 4, ${0.3 + (entry.count / maxPeriod) * 0.7})`} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourlyMerged} barSize={16} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <XAxis 
                  dataKey="label" 
                  tickFormatter={val => ['12 AM', '6 AM', '12 PM', '6 PM', '10 PM'].includes(val) ? val : ''} 
                  tick={{ fill: '#A1A1AA', fontSize: 10, fontFamily: 'Space Grotesk' }}
                  axisLine={false} tickLine={false}
                />
                <YAxis hide />
                <Tooltip contentStyle={{ background: '#27272A', border: '1px solid #3F3F46', borderRadius: 0, fontFamily: 'Space Grotesk', fontSize: 12 }} />
                {hasInstagram ? (
                  <>
                    <Bar dataKey="youtube" stackId="a" name="YouTube" fill="#DFE104" />
                    <Bar dataKey="instagram" stackId="a" name="Instagram" fill="rgba(250,250,250,0.35)" />
                  </>
                ) : (
                  <Bar dataKey="total">
                    {hourlyMerged.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.total === 0 ? '#27272A' : `rgba(223, 225, 4, ${0.2 + (entry.total / maxH) * 0.8})`} />
                    ))}
                  </Bar>
                )}
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
        {hasInstagram && !isMobile && (
          <div className="flex gap-6 mt-3 justify-start items-center">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 bg-[#DFE104]" />
              <span className="text-[10px] uppercase text-[#A1A1AA]">YOUTUBE</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 bg-[#FAFAFA]/35" />
              <span className="text-[10px] uppercase text-[#A1A1AA]">INSTAGRAM REELS</span>
            </div>
          </div>
        )}

        <div className="border-l-4 border-[#DFE104] pl-4 py-2 bg-[#27272A]/30 pr-4 mt-4">
          <div className="text-sm font-bold uppercase tracking-tighter text-[#FAFAFA]">
            YOUR HEAVIEST SCROLL TIME: {peakHour.label}
          </div>
          {hasInstagram && peakHour.total > 0 && (() => {
            const peakDominant = peakHour.youtube > peakHour.instagram ? 'YouTube' : 'Instagram'
            const peakDominantPct = Math.round(Math.max(peakHour.youtube, peakHour.instagram) / peakHour.total * 100)
            return (
              <div className="text-xs text-[#A1A1AA] mt-1">
                {peakDominantPct}% of your {peakHour.label} activity is on {peakDominant}.
              </div>
            )
          })()}
          {!hasInstagram && (
            <div className="text-xs text-[#A1A1AA] mt-1">
              {(peakHour.hour >= 22 || peakHour.hour <= 1) ? "Late night scrolling is your dominant pattern — associated with stress and disrupted sleep in behavioral research."
              : (peakHour.hour >= 6 && peakHour.hour <= 9) ? "Morning scrolling detected — sessions before 9am tend to set a reactive tone for the rest of the day."
              : (peakHour.hour >= 12 && peakHour.hour <= 14) ? "Lunch break scrolling is your peak — typically the most intentional scroll time of the day."
              : `Your peak hours are ${peakHour.label} — this is when your scroll sessions are longest.`}
            </div>
          )}
        </div>
      </div>

      {/* SECTION 2 - DAY OF WEEK HEATMAP */}
      <div className="mt-8">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-sm font-bold uppercase tracking-tighter text-[#FAFAFA]">HEAVIEST SCROLL DAYS</h3>
          {hasInstagram ? (
            <span className="border border-[#DFE104]/40 px-2 py-0.5 text-[10px] text-[#DFE104]">
              YOUTUBE + INSTAGRAM
            </span>
          ) : (
            <span 
              onClick={() => navigate('/settings')}
              className="border border-[#3F3F46] px-2 py-0.5 text-[10px] text-[#3F3F46] cursor-pointer hover:border-[#FAFAFA]/20 transition-all"
            >
              YOUTUBE ONLY · ADD INSTAGRAM
            </span>
          )}
        </div>

        <div className="grid grid-cols-7 gap-2 min-h-[100px]">
          {weeklyMerged.map((d, i) => {
            const isHeaviest = d.total === heaviestDay.total && d.total > 0
            const totalHeight = Math.max(8, Math.round((d.total / maxDay) * 80))
            
            return (
              <div key={i} className="flex flex-col items-center justify-end gap-2 min-w-0">
                <div className={`text-[10px] uppercase tracking-widest ${isHeaviest ? 'text-[#DFE104] font-bold' : 'text-[#3F3F46]'}`}>{d.label}</div>
                <div className="w-full flex-1 flex flex-col justify-end">
                  {hasInstagram ? (
                    <div className="w-full flex flex-col-reverse justify-start" style={{ height: `${totalHeight}px` }}>
                      {d.total > 0 && (() => {
                        const ytHeight = Math.max(0, Math.round((d.youtube / d.total) * totalHeight))
                        const igHeight = Math.max(0, totalHeight - ytHeight)
                        return (
                          <>
                            <div className={`w-full ${isHeaviest ? 'bg-[#DFE104]' : 'bg-[#DFE104]/60'}`} style={{ height: `${ytHeight}px` }} />
                            <div className="w-full bg-[#FAFAFA]/35" style={{ height: `${igHeight}px` }} />
                          </>
                        )
                      })()}
                      {d.total === 0 && <div className="w-full h-full bg-[#27272A]" />}
                    </div>
                  ) : (
                    <div className={`w-full ${isHeaviest ? 'bg-[#DFE104]' : d.total > 0 ? 'bg-[#DFE104]/60' : 'bg-[#27272A]'}`} style={{ height: `${totalHeight}px` }} />
                  )}
                </div>
                <div className={`text-[10px] ${d.total > 0 ? 'text-[#A1A1AA]' : 'text-[#3F3F46]'}`}>{d.total}</div>
              </div>
            )
          })}
        </div>

        {hasInstagram && (
          <div className="flex gap-4 mt-2 justify-end">
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 bg-[#DFE104]" />
              <span className="text-[9px] text-[#3F3F46]">YT</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 bg-[#FAFAFA]/35" />
              <span className="text-[9px] text-[#3F3F46]">IG</span>
            </div>
          </div>
        )}

        {heaviestDay.total > 0 && (
          <div className="flex items-center gap-3 mt-4">
            <div className="text-2xl font-bold uppercase tracking-tighter text-[#DFE104]">{heaviestDay.label}</div>
            <div className="h-8 w-[1px] bg-[#3F3F46]" />
            <div className="flex-1 flex flex-col justify-center">
              <div className="text-xs text-[#A1A1AA] uppercase tracking-wider leading-tight">
                {heaviestDay.label} is your heaviest scroll day — {heaviestDay.total} videos watched
              </div>
              {hasInstagram && (() => {
                const igPct = Math.round((heaviestDay.instagram / heaviestDay.total) * 100) || 0
                const ytPct = 100 - igPct
                return (
                  <div className="text-[10px] uppercase tracking-wider text-[#3F3F46] mt-1">
                    {ytPct}% YouTube · {igPct}% Instagram on {heaviestDay.label}
                  </div>
                )
              })()}
            </div>
          </div>
        )}
      </div>

      {/* SECTION 3 - MOOD CORRELATION */}
      {dataState === 'preview' ? (
        <div className="border-2 border-[#27272A] p-6 mt-8 opacity-60">
          <h3 className="text-sm font-bold uppercase tracking-tighter text-[#3F3F46] mb-2">MOOD VS DURATION CORRELATION</h3>
          <p className="text-xs text-[#3F3F46] leading-relaxed">Unlocks after 7 sessions logged. Shows how session length correlates with how you feel afterwards.</p>
          <div className="text-[10px] uppercase tracking-widest text-[#3F3F46] mt-3">LOG {Math.max(0, 7 - sessionCount)} MORE SESSIONS TO UNLOCK</div>
        </div>
      ) : (
        <div className="mt-8">
          <h3 className="text-sm font-bold uppercase tracking-tighter text-[#FAFAFA] mb-4">HOW LONG VS HOW YOU FEEL</h3>
          {sessions.some(s => s.platform === 'instagram' || s.platform === 'both') && (
            <div className="flex gap-2 mb-4">
              {['ALL', 'YOUTUBE', 'INSTAGRAM'].map(p => (
                <div 
                  key={p}
                  onClick={() => setPlatformFilter(p)}
                  className={`px-3 py-1 text-[10px] uppercase tracking-widest cursor-pointer transition-all ${
                    platformFilter === p 
                      ? 'border-2 border-[#DFE104] bg-[#DFE104]/10 text-[#DFE104]' 
                      : 'border border-[#3F3F46] text-[#3F3F46]'
                  }`}
                >
                  {p}
                </div>
              ))}
            </div>
          )}
          {moodData.length > 0 ? (
            <>
              <div className="h-[160px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={moodData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                    <XAxis dataKey="label" tick={{ fill: '#A1A1AA', fontSize: 10, fontFamily: 'Space Grotesk' }} axisLine={false} tickLine={false} />
                    <YAxis domain={[1, 5]} tickCount={5} tickFormatter={v => ['😞', '😕', '😐', '😊', '😄'][v - 1] || v} tick={{ fontSize: 14 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: '#27272A', border: '1px solid #3F3F46', borderRadius: 0, fontFamily: 'Space Grotesk', fontSize: 12 }} />
                    <Bar dataKey="avgMood" barSize={32}>
                      {moodData.map((d, i) => (
                        <Cell key={`cell-${i}`} fill={d.avgMood >= 4 ? '#DFE104' : d.avgMood >= 3 ? '#A1A1AA' : '#3F3F46'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="border-l-4 border-[#DFE104] pl-4 py-2 bg-[#27272A]/30 mt-4 pr-4">
                <p className="text-xs text-[#A1A1AA]">
                  {dropPoint ? `Sessions over ${dropPoint.label} tend to leave you feeling below neutral.` : "Your mood stays positive across session lengths — your scrolling is well-controlled."}
                </p>
              </div>
            </>
          ) : (
             <div className="text-xs text-[#A1A1AA]">Not enough session data to determine mood correlation yet.</div>
          )}
        </div>
      )}

      {/* SECTION 4 - WEEKLY PATTERN HIGHLIGHT */}
      {dataState !== 'full' ? (
        <div className="border-2 border-[#27272A] p-6 mt-8 opacity-60">
          <h3 className="text-sm font-bold uppercase tracking-tighter text-[#3F3F46] mb-2">THIS WEEK'S PATTERN</h3>
          <p className="text-xs text-[#3F3F46] leading-relaxed">Unlocks after 21 sessions logged. Exposes weekly advanced insights.</p>
        </div>
      ) : (
        <div className="mt-8">
          <div className="mb-4">
            <h3 className="text-sm font-bold uppercase text-[#FAFAFA]">THIS WEEK'S PATTERN</h3>
            <div className="text-xs text-[#3F3F46] uppercase tracking-wider mt-1">ONE INSIGHT AT A TIME — LESS OVERWHELMING</div>
          </div>
          <div className="bg-[#27272A] border-2 border-[#DFE104] p-6">
            <div className="text-[10px] uppercase tracking-widest text-[#DFE104] border border-[#DFE104]/30 px-2 py-0.5 inline-block mb-3">TIME PATTERN</div>
            <h4 className="text-xl font-bold uppercase tracking-tighter text-[#FAFAFA] mb-2">{heaviestDay.label} IS YOUR DANGER ZONE</h4>
            <p className="text-sm text-[#A1A1AA] leading-relaxed">
              You've scrolled for an average of {Math.round(heaviestDayAvg)} minutes on {heaviestDay.label}s — {multiplier}× your daily average.
            </p>
            <div className="flex flex-col md:flex-row md:items-center gap-4 mt-4 pt-4 border-t border-[#3F3F46]">
              <div>
                <div className="text-2xl font-bold text-[#DFE104]">{multiplier}×</div>
                <div className="text-[10px] uppercase text-[#A1A1AA]">ABOVE AVERAGE</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-[#FAFAFA]">{Math.round(heaviestDayAvg)} MIN</div>
                <div className="text-[10px] uppercase text-[#A1A1AA]">AVG {heaviestDay.label} SESSION</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PREVIEW STATE COPY */}
      {dataState !== 'full' && (
        <div className="border-t border-[#3F3F46] pt-6 mt-6">
          <div className="text-xs uppercase tracking-widest text-[#A1A1AA] mb-1">PATTERNS ARE BUILDING</div>
          <p className="text-xs text-[#3F3F46] leading-relaxed">
            The more sessions you log, the more accurate these patterns become. Current data is from your YouTube watch history.
          </p>
        </div>
      )}
    </motion.div>
  )
}
