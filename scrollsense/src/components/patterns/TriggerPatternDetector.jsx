import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { BarChart, Bar, XAxis, YAxis, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { Database, Sparkles, TrendingDown, TrendingUp, Minus } from 'lucide-react'

export default function TriggerPatternDetector({ data, isLoading }) {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Has Instagram Data?
  if (isLoading || !data) {
    return (
      <div className="border-2 border-[#3F3F46] bg-[#09090B] p-6 text-center text-[#A1A1AA]">
        <Sparkles className="mx-auto mb-2 animate-pulse" size={24} />
        Loading Patterns...
      </div>
    )
  }

  const {
    hasEnoughData,
    dataSource,
    weeksTracked,
    daysTracked,
    hourlyHeatmap,
    weekdayHeatmap,
    peakHour,
    peakHourLabel,
    peakDay,
    intentionDurations,
    patterns,
    progressToFullPatterns,
    youtubeOnlyPatterns,
    comparisonToLastWeek,
    dataWindowLabel,
    previewData
  } = data || {}

  // "3 of 7 days tracked — patterns unlock Sunday"
  const daysLogged = progressToFullPatterns?.daysLogged || 0
  const isSyncing = dataSource === 'syncing'

  const dataState = !hasEnoughData
    ? (isSyncing ? 'syncing' : 'insufficient')
    : (daysLogged < 7 ? 'preview' : (daysLogged < 21 ? 'building' : 'full'))
  const progressPercent = dataState === 'full' ? 100 : dataState === 'building' ? Math.min((daysLogged / 21) * 100, 100) : Math.min((daysLogged / 7) * 100, 100)

  const sources = []
  if (dataSource === 'youtube_only' || dataSource === 'sessions_and_youtube') sources.push('YOUTUBE')
  if (dataSource === 'syncing') sources.push('YOUTUBE SYNCING')
  if (daysLogged > 0) sources.push(`${daysLogged} DAYS LOGGED`)
  if (sources.length === 0) sources.push('AWAITING DATA')

  // Prepare chart data
  const chartHourly = (hourlyHeatmap || []).map(h => ({
    label: h.label,
    hour: h.hour,
    total: h.minutesScrolled || 0
  }))

  const maxH = Math.max(...chartHourly.map(h => h.total), 1)

  const chartWeekly = (weekdayHeatmap || []).map(d => ({
    label: d.day.substring(0, 3).charAt(0).toUpperCase() + d.day.substring(1, 3).toLowerCase(),
    total: d.minutesScrolled || 0,
    dayIndex: d.dayIndex
  }))

  const maxDay = Math.max(...chartWeekly.map(d => d.total), 1)

  // Use YouTube preview data if the main data doesn't have sessions, but we have youtubeOnlyPatterns available
  const pHourLabel = dataState === 'preview' && youtubeOnlyPatterns?.available ? youtubeOnlyPatterns.mostActiveTimeLabel : peakHourLabel
  const pDayLabel = dataState === 'preview' && youtubeOnlyPatterns?.available ? youtubeOnlyPatterns.peakDay : peakDay

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
          {dataWindowLabel && (
            <div className="mt-1 text-[10px] uppercase tracking-widest text-[#3F3F46]">{dataWindowLabel}</div>
          )}
          <div className="mt-2 text-xs text-[#A1A1AA] max-w-xl leading-relaxed">
            {dataState === 'insufficient' ? (
              <span className="text-[#3F3F46]">Connect YouTube to see your patterns from Day 1.</span>
            ) : dataState === 'syncing' ? (
              <span className="text-[#A1A1AA]">YouTube connected — your data is syncing. Patterns will appear shortly.</span>
            ) : dataState === 'preview' ? (
              <span className="text-[#A1A1AA]">Based on your YouTube history, here's what we already know.</span>
            ) : (
              <span className="text-[#A1A1AA]">Derived from your actual daily logging and platform data.</span>
            )}
          </div>
          <div className="mt-3">
            {dataState === 'insufficient' && <span className="bg-[#27272A] border border-[#3F3F46] px-3 py-1 text-[10px] uppercase tracking-widest text-[#A1A1AA]">NO DATA — CONNECT YOUTUBE</span>}
            {dataState === 'syncing' && <span className="bg-[#27272A] border border-[#3F3F46] px-3 py-1 text-[10px] uppercase tracking-widest text-[#A1A1AA] animate-pulse">SYNCING YOUTUBE DATA...</span>}
            {dataState === 'preview' && <span className="bg-[#27272A] border border-[#3F3F46] px-3 py-1 text-[10px] uppercase tracking-widest text-[#A1A1AA]">
              PATTERN PREVIEW — YOUTUBE HISTORY
            </span>}
            {dataState === 'building' && <span className="bg-[#DFE104]/10 border border-[#DFE104]/30 px-3 py-1 text-[10px] uppercase tracking-widest text-[#DFE104]">PATTERNS BUILDING — {daysLogged} DAYS</span>}
            {dataState === 'full' && <span className="bg-[#DFE104]/10 border border-[#DFE104]/30 px-3 py-1 text-[10px] uppercase tracking-widest text-[#DFE104]">FULL PATTERN DATA ACTIVE</span>}
          </div>
        </div>
        <div className="border border-[#3F3F46] px-2 py-0.5 text-xs uppercase tracking-widest text-[#3F3F46]">F7</div>
      </div>

      {/* PROGRESS INDICATOR */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-2 flex-wrap gap-2">
          <div className="text-xs uppercase tracking-widest text-[#DFE104] font-bold">
            {daysLogged < 7 
               ? `${daysLogged} OF 7 DAYS TRACKED — PATTERNS UNLOCK SUNDAY` 
               : daysLogged < 21 
                 ? `PATTERNS ENRICHING — ${21 - daysLogged} MORE DAYS FOR FULL ANALYSIS` 
                 : 'FULL PATTERN ANALYSIS ACTIVE'
            }
          </div>
        </div>
        <div className="w-full h-[4px] bg-[#27272A]">
          <div className="bg-[#DFE104] h-[4px] transition-all duration-700" style={{ width: `${progressPercent}%` }} />
        </div>
        <div className="mt-2 flex flex-wrap justify-between items-center gap-2">
          <div className="flex flex-col items-center gap-1">
            <div className={`w-2 h-2 ${daysLogged >= 7 ? 'bg-[#DFE104]' : 'bg-[#27272A] border border-[#3F3F46]'}`} />
            <span className={`text-[10px] uppercase ${daysLogged >= 7 ? 'text-[#DFE104]' : 'text-[#3F3F46]'}`}>7 DAYS</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <div className={`w-2 h-2 ${daysLogged >= 14 ? 'bg-[#DFE104]' : 'bg-[#27272A] border border-[#3F3F46]'}`} />
            <span className={`text-[10px] uppercase ${daysLogged >= 14 ? 'text-[#DFE104]' : 'text-[#3F3F46]'}`}>14 DAYS</span>
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
      </div>

      {/* SECTION 1 - TIME OF DAY HEATMAP */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-sm font-bold uppercase tracking-tighter text-[#FAFAFA]">PEAK SCROLL HOURS</h3>
        </div>

        <div className="h-[180px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartHourly} barSize={16} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <XAxis 
                dataKey="label" 
                tickFormatter={val => ['12AM', '6AM', '12PM', '6PM', '10PM'].includes(val) ? val : ''} 
                tick={{ fill: '#A1A1AA', fontSize: 10, fontFamily: 'Space Grotesk' }}
                axisLine={false} tickLine={false}
              />
              <YAxis hide />
              <Tooltip contentStyle={{ background: '#27272A', border: '1px solid #3F3F46', borderRadius: 0, fontFamily: 'Space Grotesk', fontSize: 12 }} />
              <Bar dataKey="total">
                {chartHourly.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.total === 0 ? '#27272A' : `rgba(223, 225, 4, ${0.2 + (entry.total / maxH) * 0.8})`} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="border-l-4 border-[#DFE104] pl-4 py-2 bg-[#27272A]/30 pr-4 mt-4">
          <div className="text-sm font-bold uppercase tracking-tighter text-[#FAFAFA]">
            {pHourLabel ? `YOUR HEAVIEST SCROLL TIME: ${pHourLabel}` : 'NO CLEAR PEAK YET'}
          </div>
          {pHourLabel && (
            <div className="text-xs text-[#A1A1AA] mt-1">
              Your dominant pattern is highlighted above — associated with your daily rhythm.
            </div>
          )}
        </div>

        {/* WEEK-OVER-WEEK COMPARISON */}
        {comparisonToLastWeek && comparisonToLastWeek.direction !== 'no_data' && (
          <div className="flex items-center gap-3 mt-4 border border-[#3F3F46] p-3">
            {comparisonToLastWeek.direction === 'down' ? (
              <TrendingDown size={16} className="text-[#22C55E] shrink-0" />
            ) : comparisonToLastWeek.direction === 'up' ? (
              <TrendingUp size={16} className="text-[#EF4444] shrink-0" />
            ) : (
              <Minus size={16} className="text-[#A1A1AA] shrink-0" />
            )}
            <div className="text-xs text-[#A1A1AA] uppercase tracking-wider">
              {comparisonToLastWeek.direction === 'down'
                ? `${comparisonToLastWeek.percentChange}% LESS THAN LAST WEEK (${Math.abs(comparisonToLastWeek.minutesDelta)} MIN)`
                : comparisonToLastWeek.direction === 'up'
                  ? `${comparisonToLastWeek.percentChange}% MORE THAN LAST WEEK (+${comparisonToLastWeek.minutesDelta} MIN)`
                  : 'SAME AS LAST WEEK'}
              {comparisonToLastWeek.peakHourShifted && ' · PEAK HOUR SHIFTED'}
            </div>
          </div>
        )}
      </div>

      {/* SECTION 2 - DAY OF WEEK HEATMAP */}
      <div className="mt-8">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-sm font-bold uppercase tracking-tighter text-[#FAFAFA]">HEAVIEST SCROLL DAYS</h3>
        </div>

        <div className="grid grid-cols-7 gap-2 min-h-[100px]">
          {chartWeekly.map((d, i) => {
            const isHeaviest = d.total === maxDay && d.total > 0
            const totalHeight = Math.max(8, Math.round((d.total / maxDay) * 80))
            
            return (
              <div key={i} className="flex flex-col items-center justify-end gap-2 min-w-0">
                <div className={`text-[10px] uppercase tracking-widest ${isHeaviest ? 'text-[#DFE104] font-bold' : 'text-[#3F3F46]'}`}>{d.label}</div>
                <div className="w-full flex-1 flex flex-col justify-end">
                  <div className={`w-full ${isHeaviest ? 'bg-[#DFE104]' : d.total > 0 ? 'bg-[#DFE104]/60' : 'bg-[#27272A]'}`} style={{ height: `${totalHeight}px` }} />
                </div>
              </div>
            )
          })}
        </div>

        {pDayLabel && maxDay > 0 && (
          <div className="flex items-center gap-3 mt-4">
            <div className="text-2xl font-bold uppercase tracking-tighter text-[#DFE104]">{pDayLabel}</div>
            <div className="h-8 w-[1px] bg-[#3F3F46]" />
            <div className="flex-1 flex flex-col justify-center">
              <div className="text-xs text-[#A1A1AA] uppercase tracking-wider leading-tight">
                {pDayLabel} is your heaviest scroll day.
              </div>
            </div>
          </div>
        )}
      </div>

      {/* SECTION 3 - ADVANCED PATTERNS */}
      {dataState === 'preview' ? (
        <div className="border-2 border-[#27272A] p-6 mt-8 opacity-60">
          <h3 className="text-sm font-bold uppercase tracking-tighter text-[#3F3F46] mb-2">TRIGGER INTENTIONS</h3>
          <p className="text-xs text-[#3F3F46] leading-relaxed">Unlocks after 7 days logged. Correlates your scrolling duration with stress and boredom triggers.</p>
          <div className="text-[10px] uppercase tracking-widest text-[#3F3F46] mt-3">LOG {Math.max(0, 7 - daysLogged)} MORE DAYS TO UNLOCK</div>
        </div>
      ) : (
        <div className="mt-8">
          <div className="mb-4">
            <h3 className="text-sm font-bold uppercase text-[#FAFAFA]">BEHAVIORAL INSIGHTS</h3>
            <div className="text-xs text-[#3F3F46] uppercase tracking-wider mt-1">WHAT YOUR DATA SAYS</div>
          </div>
          <div className="flex flex-col gap-4">
             {patterns && patterns.length > 0 ? patterns.map((pat, i) => (
                <div key={i} className="bg-[#27272A] border-l-2 border-[#DFE104] p-4">
                  <p className="text-sm text-[#FAFAFA] leading-relaxed">
                    {pat}
                  </p>
                </div>
             )) : (
               <div className="text-xs text-[#A1A1AA]">More logs needed to identify advanced behavioral insights.</div>
             )}
          </div>
        </div>
      )}

      {/* PREVIEW STATE COPY */}
      {dataState !== 'full' && (
        <div className="border-t border-[#3F3F46] pt-6 mt-6">
          <div className="text-xs uppercase tracking-widest text-[#A1A1AA] mb-1">PATTERNS ARE BUILDING</div>
          <p className="text-xs text-[#3F3F46] leading-relaxed">
            The more sessions you log, the more accurate these patterns become. Current data incorporates your synced watch history.
          </p>
        </div>
      )}
    </motion.div>
  )
}
