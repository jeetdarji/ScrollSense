import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Camera, X, Upload, File as FileIcon, CheckCircle, Info, Lock, Sparkles, Trash2 } from 'lucide-react'
import api from '../../lib/axios'
import { useQueryClient } from '@tanstack/react-query'

const formatDateLabel = (dateStr) => {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }).toUpperCase()
}

/**
 * Parse videos_watched.json client-side into an aggregated summary.
 * Returns { videosWatchedCount, dailyActivity, peakHourFromTimestamps, topics, dateRange }
 */
const buildAggregatedPayload = (videosWatched, yourTopics, adsViewed) => {
  const extractArray = (data) => {
    if (Array.isArray(data)) return data;
    if (data && typeof data === 'object') {
      for (const key of Object.keys(data)) {
        if (Array.isArray(data[key])) return data[key];
      }
    }
    return [];
  };

  const videos = extractArray(videosWatched);
  const ads = extractArray(adsViewed);
  const allMedia = [...videos, ...ads];

  const topicsRaw = extractArray(yourTopics);
  const topics = topicsRaw.map(t => t?.string_map_data?.Name?.value || t?.string_list_data?.[0]?.value || t?.name || t).filter(Boolean);

  const dailyMap = {}
  const hourCounts = Array.from({ length: 24 }, () => 0)
  const dayCounts = {}
  let minDate = null
  let maxDate = null

  for (const v of allMedia) {
    // Instagram exports use string_map_data.Time.timestamp (seconds) or title + href
    let ts = null;
    if (v?.string_map_data?.Author?.timestamp) {
      ts = v.string_map_data.Author.timestamp;
      if (ts < 100000000000) ts *= 1000;
    } else if (v?.string_map_data?.Time?.timestamp) {
      ts = v.string_map_data.Time.timestamp;
      if (ts < 100000000000) ts *= 1000;
    } else if (v?.string_list_data?.[0]?.timestamp) {
      ts = v.string_list_data[0].timestamp;
      if (ts < 100000000000) ts *= 1000;
    } else if (v?.timestamp) {
      ts = v.timestamp;
      if (ts < 100000000000) ts *= 1000;
    }

    if (!ts) continue;
    const date = new Date(ts);
    const dayKey = date.toISOString().slice(0, 10) // YYYY-MM-DD
    const hour = date.getUTCHours()
    const dayOfWeek = date.getUTCDay()

    if (!dailyMap[dayKey]) dailyMap[dayKey] = { date: dayKey, reelCount: 0, peakHour: null, hourMap: {} }
    dailyMap[dayKey].reelCount += 1
    dailyMap[dayKey].hourMap[hour] = (dailyMap[dayKey].hourMap[hour] || 0) + 1
    hourCounts[hour] += 1
    dayCounts[dayOfWeek] = (dayCounts[dayOfWeek] || 0) + 1

    if (!minDate || date < minDate) minDate = date
    if (!maxDate || date > maxDate) maxDate = date
  }

  // Compute per-day estimated minutes (1 min per Reel) and peak hour
  const dailyActivity = Object.values(dailyMap).map(d => {
    // Find peak hour for this day
    let maxH = -1, peakH = null
    for (const [h, c] of Object.entries(d.hourMap)) {
      if (c > maxH) { maxH = c; peakH = parseInt(h) }
    }
    return {
      date: d.date,
      reelCount: d.reelCount,
      estimatedMinutes: d.reelCount * 1, // 1 min per Reel (conservative estimate)
      peakHour: peakH,
    }
  }).sort((a, b) => a.date.localeCompare(b.date))

  const peakHour = hourCounts.indexOf(Math.max(...hourCounts))

  // Find peak day of week
  let peakDay = null, maxDC = -1
  for (const [d, c] of Object.entries(dayCounts)) {
    if (c > maxDC) { maxDC = c; peakDay = parseInt(d) }
  }

  // Build interest distribution by matching Instagram topics against user's declared interests
  // This avoids sending raw data to Gemini — pure string matching, free and instant.
  let interestDistribution = {}
  try {
    const stored = JSON.parse(localStorage.getItem('scrollsense_onboarding') || '{}')
    const userInterests = (stored.interests || []).map(i => i.label?.toLowerCase()).filter(Boolean)
    if (userInterests.length > 0 && topics.length > 0) {
      const matchedTopics = {}
      topics.forEach(topic => {
        const topicLower = topic.toLowerCase()
        for (const interest of userInterests) {
          if (topicLower.includes(interest) || interest.includes(topicLower)) {
            matchedTopics[interest] = (matchedTopics[interest] || 0) + 1
            break
          }
        }
      })
      const totalMatched = Object.values(matchedTopics).reduce((s, v) => s + v, 0) || 1
      const totalMinutes = dailyActivity.reduce((s, d) => s + d.estimatedMinutes, 0)
      // Distribute total IG minutes across matched interests proportionally
      Object.entries(matchedTopics).forEach(([interest, count]) => {
        interestDistribution[interest] = Math.round((count / totalMatched) * totalMinutes)
      })
    }
  } catch (e) { /* localStorage unavailable */ }

  return {
    videosWatchedCount: videos.length,
    dailyActivity,
    peakHourFromTimestamps: peakHour,
    peakDayFromTimestamps: peakDay,
    topics: topics.slice(0, 100),
    interestDistribution,
    dateRange: {
      start: minDate ? minDate.toISOString().slice(0, 10) : null,
      end: maxDate ? maxDate.toISOString().slice(0, 10) : null,
    }
  }
}

export default function CrossPlatformMap({ crossPlatformData, instagramUploaded, isLoading: isLoadingProp }) {
  const fileInputRef = useRef(null)
  const queryClient = useQueryClient()

  // Derive state from props
  const cpData = crossPlatformData || {}
  const dailyTimelineRaw = cpData.dailyTimeline || []
  const historicTimeline = cpData.historicDailyTimeline || []
  const platformSplit = cpData.platformSplit || {}
  const hasInstagram = !!instagramUploaded
  const isYtLoading = isLoadingProp

  // Build YouTube & Instagram totals from cross-platform data
  const ytTotalMinutes = dailyTimelineRaw.reduce((s, d) => s + (d.youtubeMinutes || 0), 0)
  const currentWeekIgTotal = dailyTimelineRaw.reduce((s, d) => s + (d.instagramMinutes || 0), 0)

  // Decouple timeline: if Instagram is selected but has 0 minutes this week, show historic snapshot!
  const hasYouTubeData = ytTotalMinutes > 0

  const [showUploadGuide, setShowUploadGuide] = useState(!hasInstagram)
  const [activeView, setActiveView] = useState('combined')
  const [fileMap, setFileMap] = useState({})
  const [isProcessing, setIsProcessing] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [uploadError, setUploadError] = useState(null)
  
  const handleClearInstagramData = async () => {
    if (!window.confirm("Are you sure you want to completely remove your historic Instagram data?")) return
    setIsDeleting(true)
    try {
      await api.delete('/patterns/instagram')
      // Clear up localStorage flags
      localStorage.removeItem('scrollsense_instagram_processed')
      localStorage.removeItem('scrollsense_instagram_topics')
      
      const keysToInvalidate = [
        ['youtube-dashboard'],
        ['patterns-cross-platform'],
        ['echoChamber'],
        ['triggerPatterns'],
        ['habitNudge'],
        ['progress-time-refund'],
        ['progress-trends'],
        ['digest-checkin'],
        ['digest-status'],
      ]
      keysToInvalidate.forEach(key => queryClient.invalidateQueries({ queryKey: key }))
      
      setShowUploadGuide(true)
      setActiveView('youtube')
    } catch (err) {
      console.error('Delete failed', err)
      setUploadError(err?.response?.data?.error || 'Failed to remove data. Please try again.')
    } finally {
      setIsDeleting(false)
    }
  }

  const isShowingHistoricIgSnapshot = activeView === 'instagram' && hasInstagram && currentWeekIgTotal === 0 && historicTimeline.length > 0;
  const igTotalMinutes = isShowingHistoricIgSnapshot ? cpData.historicInstagramMinutes || currentWeekIgTotal : currentWeekIgTotal;
  const dailyTimeline = isShowingHistoricIgSnapshot ? historicTimeline : dailyTimelineRaw;

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files)
    processSelectedFiles(files)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    const files = Array.from(e.dataTransfer.files)
    processSelectedFiles(files)
  }

  const processSelectedFiles = (files) => {
    files.forEach(file => {
      const reader = new FileReader()
      reader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target.result)
          setFileMap(prev => ({ ...prev, [file.name]: parsed }))
        } catch (err) {
          console.error("Failed to parse", file.name)
        }
      }
      reader.readAsText(file)
    })
  }

  const removeFile = (name) => {
    setFileMap(prev => {
      const copy = { ...prev }
      delete copy[name]
      return copy
    })
  }

  const handleProcessFiles = async () => {
    setIsProcessing(true)
    setUploadError(null)
    try {
      const videosWatched = fileMap['videos_watched.json']
      const yourTopics = fileMap['your_topics.json']
      const adsViewed = fileMap['ads_viewed.json']

      const extractArray = (data) => {
        if (Array.isArray(data)) return data;
        if (data && typeof data === 'object') {
          for (const key of Object.keys(data)) {
            if (Array.isArray(data[key])) return data[key];
          }
        }
        return [];
      };

      if (!videosWatched || extractArray(videosWatched).length === 0) {
        setUploadError('videos_watched.json is required but was not found or is empty.')
        setIsProcessing(false)
        return
      }

      // Build aggregated payload client-side — no raw files sent to server
      const payload = buildAggregatedPayload(videosWatched, yourTopics, adsViewed)

      // Store topics in localStorage for InterestBudgetTracker display
      if (payload.topics && payload.topics.length > 0) {
        localStorage.setItem('scrollsense_instagram_topics', JSON.stringify(payload.topics))
      }
      localStorage.setItem('scrollsense_instagram_processed', 'true')

      await api.post('/patterns/instagram-upload', payload)

      // After successful upload, invalidate ALL data-dependent queries so every
      // page refreshes with combined YouTube + Instagram metrics.
      const keysToInvalidate = [
        ['youtube-dashboard'],
        ['patterns-cross-platform'],
        ['echoChamber'],
        ['triggerPatterns'],
        ['habitNudge'],
        ['progress-time-refund'],
        ['progress-trends'],
        ['digest-checkin'],
        ['digest-status'],
      ]
      keysToInvalidate.forEach(key => queryClient.invalidateQueries({ queryKey: key }))

      setShowUploadGuide(false)
      setFileMap({})
    } catch (err) {
      console.error('Upload failed', err)
      setUploadError(err?.response?.data?.error || 'Upload failed. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }

  // Build chart data from cross-platform daily timeline
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const weeklyChartData = days.map((dayName, dayIndex) => {
    const dayEntries = dailyTimeline.filter(d => {
      const date = new Date(d.date + 'T00:00:00Z')
      return date.getUTCDay() === dayIndex
    })
    const youtube = dayEntries.reduce((s, d) => s + (d.youtubeMinutes || 0), 0)
    const instagram = dayEntries.reduce((s, d) => s + (d.instagramMinutes || 0), 0)
    return { day: dayName, youtube, instagram }
  })

  let mostIGDay = weeklyChartData[0] || { day: 'Sun', instagram: 0, youtube: 0 }
  let mostYTDay = weeklyChartData[0] || { day: 'Sun', instagram: 0, youtube: 0 }
  weeklyChartData.forEach(d => {
    if ((d.instagram - d.youtube) > (mostIGDay.instagram - mostIGDay.youtube)) mostIGDay = d
    if ((d.youtube - d.instagram) > (mostYTDay.youtube - mostYTDay.instagram)) mostYTDay = d
  })

  const barChartH = typeof window !== 'undefined' && window.innerWidth < 768 ? 150 : 180

  // Platform split from backend
  const ytPct = platformSplit.youtubePercent || 0
  const igPct = platformSplit.instagramPercent || 0

  const renderTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#27272A] border border-[#3F3F46] p-2 font-['Space_Grotesk'] text-xs uppercase tracking-wider rounded-none">
          <p className="text-[#FAFAFA] font-bold mb-1">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }}>
              {entry.name}: {entry.value}
            </p>
          ))}
          {payload.length > 1 && (
            <p className="text-[#A1A1AA] mt-1 pt-1 border-t border-[#3F3F46]">
              Total: {payload[0].value + payload[1].value}
            </p>
          )}
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
      className="border-2 border-[#3F3F46] bg-[#09090B] p-6 md:p-8 rounded-none w-full"
    >
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-start flex-wrap gap-4 mb-6">
        <div>
          <div className="text-xs uppercase tracking-widest text-[#DFE104] mb-1">
            CROSS-PLATFORM SNAPSHOT
          </div>
          <h2 className="text-2xl md:text-4xl font-bold uppercase tracking-tighter leading-[0.85] text-[#FAFAFA]">
            {isShowingHistoricIgSnapshot ? 'YOUR INSTAGRAM SNAPSHOT' : 'WHERE AND WHEN YOU SCROLL'}
          </h2>
          <div className="border border-[#3F3F46] px-3 py-1 inline-flex items-center gap-2 mt-2">
            <Camera size={11} className="text-[#A1A1AA]" />
            <span className="text-[10px] uppercase tracking-widest text-[#A1A1AA]">
              {isShowingHistoricIgSnapshot
                ? 'LIFETIME INSTAGRAM RECORD'
                : cpData.dataWindowLabel
                  ? cpData.dataWindowLabel
                  : hasYouTubeData
                    ? 'YOUTUBE: THIS WEEK'
                    : 'SNAPSHOT NOT YET UPLOADED'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="border border-[#3F3F46] px-2 py-1 text-[10px] font-bold text-[#A1A1AA]">F11</div>
          {hasInstagram && (
            <button
              onClick={() => setShowUploadGuide(true)}
              className="text-[10px] uppercase tracking-widest text-[#3F3F46] hover:text-[#A1A1AA] transition-colors"
            >
              RE-UPLOAD TO REFRESH →
            </button>
          )}
        </div>
      </div>

      {/* UPLOAD GUIDE PANEL */}
      <AnimatePresence>
        {showUploadGuide && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mb-8"
          >
            <div className="bg-[#27272A]/40 border-2 border-[#3F3F46] p-4 md:p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-base font-bold uppercase tracking-tighter text-[#FAFAFA]">
                    HOW TO GET YOUR INSTAGRAM DATA
                  </h3>
                  <p className="text-xs text-[#A1A1AA] mt-1 leading-relaxed">
                    Instagram takes 6–10 hours to prepare your export. Here's exactly how to request it.
                  </p>
                </div>
                {hasInstagram && (
                  <button onClick={() => setShowUploadGuide(false)}>
                    <X size={16} className="text-[#3F3F46] hover:text-[#FAFAFA] transition-colors" />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border border-[#3F3F46] p-4 flex gap-4 items-start">
                  <span className="text-[2.5rem] font-bold text-[#27272A] leading-none flex-shrink-0" aria-hidden>1</span>
                  <div>
                    <h4 className="text-sm font-bold uppercase tracking-tighter text-[#FAFAFA] mb-1">REQUEST THE EXPORT</h4>
                    <p className="text-xs text-[#A1A1AA] leading-relaxed">
                      Open Instagram → Profile → Menu (☰) → Settings → Account Centre → Your information and permissions → Download your information → Download or transfer information.
                    </p>
                    <p className="text-xs text-[#3F3F46] mt-2 leading-relaxed">
                      Select your account → Choose 'All available information' → Select 'Download to device' → Choose JSON format → Select 'Last year'.
                    </p>
                  </div>
                </div>

                <div className="border border-[#3F3F46] p-4 flex gap-4 items-start">
                  <span className="text-[2.5rem] font-bold text-[#27272A] leading-none flex-shrink-0" aria-hidden>2</span>
                  <div>
                    <h4 className="text-sm font-bold uppercase tracking-tighter text-[#FAFAFA] mb-1">WAIT 6–10 HOURS</h4>
                    <p className="text-xs text-[#A1A1AA] leading-relaxed">
                      Instagram will email you when your export is ready. This is normal — it takes time for large accounts.
                    </p>
                    <p className="text-xs text-[#3F3F46] mt-2 leading-relaxed">
                      Set a reminder below so you don't forget to come back and upload it.
                    </p>
                  </div>
                </div>

                <div className="border border-[#3F3F46] p-4 flex gap-4 items-start">
                  <span className="text-[2.5rem] font-bold text-[#27272A] leading-none flex-shrink-0" aria-hidden>3</span>
                  <div className="w-full">
                    <h4 className="text-sm font-bold uppercase tracking-tighter text-[#FAFAFA] mb-1">FIND THE FILES</h4>
                    <p className="text-xs text-[#A1A1AA] leading-relaxed">
                      Unzip the downloaded file. Navigate to:
                    </p>
                    <div className="bg-[#09090B] p-2 mt-2 font-mono text-[10px] text-[#DFE104] break-all">
                      your_instagram_activity/logged_information/videos_watched.json <span className="text-[#3F3F46]">← REQUIRED</span><br />
                      ads_information/ads_and_topics/your_topics.json <span className="text-[#3F3F46]">← RECOMMENDED</span><br />
                      ads_information/ads_and_topics/ads_viewed.json <span className="text-[#3F3F46]">← OPTIONAL</span>
                    </div>
                  </div>
                </div>

                <div className="border border-[#3F3F46] p-4 flex gap-4 items-start">
                  <span className="text-[2.5rem] font-bold text-[#27272A] leading-none flex-shrink-0" aria-hidden>4</span>
                  <div className="w-full relative">
                    <h4 className="text-sm font-bold uppercase tracking-tighter text-[#FAFAFA] mb-1">UPLOAD HERE</h4>
                    <p className="text-xs text-[#A1A1AA] leading-relaxed mb-3">
                      Secure, one-time processing helps build your historical snapshot. Your raw files are discarded after processing.
                    </p>

                    <div
                      className="border-2 border-dashed border-[#3F3F46] p-4 md:p-6 text-center hover:border-[#DFE104]/40 transition-all cursor-pointer"
                      onDragOver={e => e.preventDefault()}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload size={20} className="text-[#3F3F46] mx-auto mb-2" />
                      <div className="text-xs uppercase tracking-widest text-[#3F3F46]">
                        DROP FILES HERE OR CLICK TO SELECT
                      </div>
                      <div className="text-[10px] text-[#A1A1AA] mt-1">
                        videos_watched.json · your_topics.json · ads_viewed.json
                      </div>
                      <input
                        type="file"
                        multiple
                        accept=".json"
                        hidden
                        ref={fileInputRef}
                        onChange={handleFileSelect}
                      />
                    </div>

                    {Object.keys(fileMap).length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {Object.keys(fileMap).map(filename => (
                          <div key={filename} className="border border-[#DFE104]/30 px-3 py-1 flex items-center gap-2">
                            <FileIcon size={10} className="text-[#DFE104]" />
                            <span className="text-[10px] uppercase text-[#DFE104] truncate max-w-[120px]">{filename}</span>
                            <button onClick={(e) => { e.stopPropagation(); removeFile(filename); }}>
                              <X size={10} className="text-[#DFE104] hover:text-white" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* PROCESS BUTTON */}
              {Object.keys(fileMap).length > 0 && (
                <div className="mt-5">
                  {isProcessing ? (
                    <div className="h-14 border-2 border-[#DFE104] p-1 flex items-center relative overflow-hidden">
                      <motion.div
                        className="absolute top-0 left-0 bottom-0 bg-[#DFE104]/20"
                        initial={{ width: 0 }}
                        animate={{ width: "100%" }}
                        transition={{ duration: 1.5 }}
                      />
                      <div className="relative w-full flex flex-col items-center justify-center">
                        <span className="text-xs uppercase tracking-widest text-[#DFE104] font-bold">
                          SECURELY PROCESSING YOUR INSTAGRAM DATA...
                        </span>
                        <span className="text-[10px] text-[#A1A1AA] mt-0.5">
                          Files are discarded after processing.
                        </span>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={handleProcessFiles}
                      className="w-full bg-[#DFE104] text-black font-bold h-14 uppercase tracking-tighter rounded-none hover:scale-[1.02] transition-all"
                    >
                      PROCESS {Object.keys(fileMap).length} FILE(S) — ANALYZE MY INSTAGRAM DATA
                    </button>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* UPLOAD ERROR */}
      {uploadError && (
        <div className="border border-red-500/40 bg-red-500/10 px-4 py-3 mb-6 text-xs uppercase tracking-wider text-red-400">
          {uploadError}
        </div>
      )}

      {/* YOUTUBE LOADING STATE */}
      {isYtLoading && !hasInstagram && (
        <div className="border-2 border-[#3F3F46] p-6 text-center text-[#A1A1AA] mb-6">
          <Sparkles className="mx-auto mb-2 animate-pulse" size={20} />
          <p className="text-xs uppercase tracking-widest">Loading YouTube activity...</p>
        </div>
      )}

      {/* TEASER STATE — no Instagram yet, show YouTube-only data (or prompt to upload if no YT either) */}
      {!hasInstagram && !showUploadGuide && (
        <div className="mb-6">
          {hasYouTubeData ? (
            // YouTube exists: show YouTube-only charts + prompt to add Instagram
            <div>
              <div className="border border-[#DFE104]/20 bg-[#DFE104]/5 px-4 py-3 mb-6 flex items-start gap-3">
                <Info size={13} className="text-[#DFE104] flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-[#DFE104] mb-0.5">YOUTUBE ONLY — ADD INSTAGRAM FOR THE FULL PICTURE</p>
                  <p className="text-[10px] text-[#A1A1AA] leading-relaxed">Charts below show your YouTube activity. Upload your Instagram export to compare both platforms.</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-[6rem] font-bold text-[#27272A] leading-none select-none" aria-hidden>?</div>
              <h3 className="text-sm font-bold uppercase tracking-tighter text-[#FAFAFA] mt-2">
                UPLOAD YOUR INSTAGRAM EXPORT TO SEE THE FULL PICTURE
              </h3>
              <p className="text-xs text-[#A1A1AA] mt-2 max-w-xs mx-auto leading-relaxed">
                YouTube data alone shows only part of your scroll habits.
              </p>
            </div>
          )}
          <button
            onClick={() => setShowUploadGuide(true)}
            className="border-2 border-[#3F3F46] px-6 py-3 text-xs uppercase tracking-tighter text-[#FAFAFA] mt-2 rounded-none hover:border-[#FAFAFA]/30 transition-all font-bold min-h-[44px]"
          >
            SHOW ME HOW TO ADD INSTAGRAM →
          </button>
        </div>
      )}

      {/* DATA CHARTS — shown with YouTube data even without Instagram */}
      {(hasYouTubeData || hasInstagram) && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
        >
          {/* SECTION 1 — OVERVIEW */}
          <div className="flex flex-col md:flex-row border-2 border-[#3F3F46] mb-6 w-full md:w-fit font-bold rounded-none">
            {(hasInstagram ? ['combined', 'youtube', 'instagram'] : ['youtube']).map(view => (
              <button
                key={view}
                onClick={() => setActiveView(hasInstagram ? view : 'youtube')}
                className={`flex-1 md:flex-none px-4 py-2 text-xs uppercase tracking-wider transition-all duration-200 min-h-[44px] ${(hasInstagram ? activeView : 'youtube') === view ? 'bg-[#DFE104] text-black' : 'bg-transparent text-[#A1A1AA] hover:bg-[#27272A]/50'
                  }`}
              >
                {view}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="border border-[#3F3F46] bg-[#09090B] p-4">
              <div className="text-[10px] uppercase tracking-widest text-[#A1A1AA] mb-1">
                {activeView === 'instagram' && hasInstagram ? 'INSTAGRAM SCROLL TIME' : 'YOUTUBE SCROLL TIME'}
              </div>
              <div className="text-base md:text-2xl font-bold uppercase text-[#FAFAFA]">
                {activeView === 'instagram' && hasInstagram
                  ? `${Math.round(igTotalMinutes)}m`
                  : hasYouTubeData
                    ? `${Math.round(ytTotalMinutes)}m`
                    : '—'}
              </div>
              <div className="text-[10px] uppercase text-[#3F3F46] mt-1">
                {activeView === 'instagram' && hasInstagram
                  ? (isShowingHistoricIgSnapshot ? 'LIFETIME INSTAGRAM MINUTES' : 'INSTAGRAM MINUTES THIS WEEK')
                  : 'TOTAL YOUTUBE MINUTES'}
              </div>
            </div>

            <div className="border border-[#3F3F46] bg-[#09090B] p-4">
              <div className="text-[10px] uppercase tracking-widest text-[#A1A1AA] mb-1">
                DATA COVERS
              </div>
              <div className="text-base md:text-lg font-bold uppercase text-[#FAFAFA]">
                {isShowingHistoricIgSnapshot ? 'LIFETIME SNAPSHOT' : (cpData.dataWindowLabel || 'THIS WEEK')}
              </div>
              <div className="text-[10px] uppercase text-[#3F3F46] mt-1">
                {isShowingHistoricIgSnapshot ? 'HISTORIC INSTAGRAM RECORD' : (cpData.isSnapshot ? 'CROSS-PLATFORM SNAPSHOT' : 'YOUTUBE LIVE DATA')}
              </div>
            </div>

            <div className="border border-[#3F3F46] bg-[#09090B] p-4">
              <div className="text-[10px] uppercase tracking-widest text-[#A1A1AA] mb-1">
                PLATFORM SPLIT
              </div>
              {hasInstagram ? (
                <>
                  <div className="w-full h-[8px] flex mt-2">
                    <div className="bg-[#DFE104] h-full" style={{ width: `${ytPct}%` }} />
                    <div className="bg-[#FAFAFA]/35 h-full" style={{ width: `${igPct}%` }} />
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-[10px] text-[#DFE104] font-bold">YT {ytPct}%</span>
                    <span className="text-[10px] text-[#A1A1AA] font-bold">IG {igPct}%</span>
                  </div>
                </>
              ) : (
                <div className="text-xs text-[#3F3F46] uppercase tracking-wider mt-2">INSTAGRAM NOT YET UPLOADED</div>
              )}
            </div>
          </div>

          {/* SECTION 2 — DAILY TIMELINE */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-bold uppercase tracking-tighter text-[#FAFAFA]">
                DAILY ACTIVITY THIS WEEK
              </h3>
              <span className="text-[10px] uppercase text-[#3F3F46] hidden sm:block">MINUTES PER DAY</span>
            </div>

            <div style={{ height: barChartH }} className="w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyTimeline.map(d => ({
                  ...d,
                  label: new Date(d.date + 'T00:00:00Z').toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase(),
                  youtube: d.youtubeMinutes || 0,
                  instagram: d.instagramMinutes || 0,
                }))} margin={{ top: 4, right: 8, left: -20, bottom: 0 }} barSize={14} barCategoryGap="20%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272A" vertical={false} />
                  <XAxis
                    dataKey="label"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#A1A1AA', fontSize: 10, fontFamily: 'Space Grotesk' }}
                  />
                  <YAxis hide />
                  <Tooltip content={renderTooltip} cursor={{ fill: '#27272A', opacity: 0.4 }} />
                  {activeView !== 'instagram' && (
                    <Bar dataKey="youtube" fill="#DFE104" name="YouTube" isAnimationActive={false} />
                  )}
                  {hasInstagram && activeView !== 'youtube' && (
                    <Bar dataKey="instagram" fill="rgba(250,250,250,0.4)" name="Instagram" isAnimationActive={false} />
                  )}
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="flex gap-6 justify-start mt-3 flex-wrap">
              {activeView !== 'instagram' && (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-[#DFE104]" />
                  <span className="text-[10px] uppercase font-bold text-[#A1A1AA]">YOUTUBE</span>
                </div>
              )}
              {hasInstagram && activeView !== 'youtube' && (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-[#FAFAFA]/35" />
                  <span className="text-[10px] uppercase font-bold text-[#A1A1AA]">INSTAGRAM</span>
                </div>
              )}
            </div>

            {/* SWITCHING DAYS INSIGHT */}
            {cpData.switchingDays > 0 && activeView === 'combined' && (
              <div className="border-l-4 border-[#DFE104] pl-4 py-3 bg-[#27272A]/30 pr-4 mt-4">
                <div className="text-xs uppercase tracking-widest text-[#DFE104] font-bold mb-1">
                  PLATFORM SWITCHING DETECTED
                </div>
                <p className="text-xs text-[#A1A1AA] leading-relaxed">
                  You used both YouTube and Instagram on {cpData.switchingDays} day{cpData.switchingDays > 1 ? 's' : ''} this week.
                </p>
              </div>
            )}
          </div>

          {/* SECTION 3 — DAY OF WEEK COMPARISON */}
          <div>
            <div className="flex justify-between items-center mb-4 mt-8">
              <h3 className="text-sm font-bold uppercase tracking-tighter text-[#FAFAFA]">
                ACTIVITY BY DAY OF WEEK
              </h3>
            </div>

            <div style={{ height: barChartH }} className="w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyChartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }} barSize={14} barCategoryGap="20%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272A" vertical={false} />
                  <XAxis
                    dataKey="day"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#A1A1AA', fontSize: 10, fontFamily: 'Space Grotesk' }}
                  />
                  <YAxis hide />
                  <Tooltip content={renderTooltip} cursor={{ fill: '#27272A', opacity: 0.4 }} />
                  {activeView !== 'instagram' && (
                    <Bar dataKey="youtube" fill="#DFE104" name="YouTube" isAnimationActive={false} />
                  )}
                  {hasInstagram && activeView !== 'youtube' && (
                    <Bar dataKey="instagram" fill="rgba(250,250,250,0.4)" name="Instagram" isAnimationActive={false} />
                  )}
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="flex gap-3 flex-wrap mt-4">
              {hasYouTubeData && (
                <div className="bg-[#DFE104]/10 border border-[#DFE104]/30 px-4 py-2 font-bold">
                  <span className="text-[10px] uppercase tracking-widest text-[#DFE104]">
                    {mostYTDay.day} IS YOUR MOST YOUTUBE-HEAVY DAY
                  </span>
                </div>
              )}
              {hasInstagram && (
                <div className="bg-[#27272A] border border-[#3F3F46] px-4 py-2 font-bold">
                  <span className="text-[10px] uppercase tracking-widest text-[#A1A1AA]">
                    {mostIGDay.day} IS YOUR MOST INSTAGRAM-HEAVY DAY
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* DATA HONESTY FOOTER */}
          <div className="border-t border-[#3F3F46] pt-4 mt-6 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
              {hasInstagram && (
                <div className="flex items-start gap-2">
                  <Info size={11} className="text-[#3F3F46] flex-shrink-0 mt-0.5" />
                  <div className="text-[10px] text-[#3F3F46] leading-relaxed uppercase tracking-wider">
                    INSTAGRAM DATA IS A HISTORICAL SNAPSHOT. Re-upload your export anytime to refresh it with more recent data.
                  </div>
                </div>
              )}
              <div className="flex items-start gap-2">
                <Lock size={11} className="text-[#3F3F46] flex-shrink-0 mt-0.5" />
                <div className="text-[10px] text-[#3F3F46] leading-relaxed uppercase tracking-wider">
                  {hasInstagram
                    ? 'PRIVACY-FIRST. Only aggregated counts are sent to the server. Raw Instagram files never leave your browser.'
                    : 'YOUTUBE DATA: Live from your connected account. Updates automatically after each sync.'}
                </div>
              </div>
            </div>
            
            {hasInstagram && (
              <button
                onClick={handleClearInstagramData}
                disabled={isDeleting}
                className="flex items-center gap-2 border border-red-500/20 bg-red-500/5 px-4 py-2 hover:bg-red-500/10 transition-colors flex-shrink-0"
              >
                <Trash2 size={12} className="text-red-400" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-red-400">
                  {isDeleting ? "CLEARING..." : "CLEAR INSTAGRAM DATA"}
                </span>
              </button>
            )}
          </div>
        </motion.div>
      )}
    </motion.div>
  )
}