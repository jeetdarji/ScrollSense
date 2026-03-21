import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Camera, X, Upload, File as FileIcon, CheckCircle, Info, Lock } from 'lucide-react'

const MOCK_INSTAGRAM_DATA = {
  dateRange: { start: '2024-11-01', end: '2025-02-01' },
  totalVideos: 847,
  inferredSessions: [
    { start: Date.now() - 86400000 * 2 - 79200000, end: Date.now() - 86400000 * 2 - 75600000, durationMinutes: 60, eventCount: 42 },
    { start: Date.now() - 86400000 * 1 - 75600000, end: Date.now() - 86400000 * 1 - 72000000, durationMinutes: 60, eventCount: 38 },
    { start: Date.now() - 86400000 * 3 - 43200000, end: Date.now() - 86400000 * 3 - 41400000, durationMinutes: 30, eventCount: 19 },
    { start: Date.now() - 86400000 * 4 - 3600000, end: Date.now() - 86400000 * 4 - 0, durationMinutes: 60, eventCount: 51 },
    { start: Date.now() - 86400000 * 5 - 82800000, end: Date.now() - 86400000 * 5 - 79200000, durationMinutes: 60, eventCount: 44 },
  ],
  hourlyHeatmap: Array.from({ length: 24 }, (_, h) => ({
    hour: h,
    count: [2, 1, 0, 0, 0, 1, 3, 8, 12, 10, 8, 6, 14, 10, 8, 6, 10, 12, 18, 24, 31, 28, 22, 14][h] || 0,
    label: h < 12 ? (h === 0 ? '12 AM' : `${h} AM`) : (h === 12 ? '12 PM' : `${h - 12} PM`)
  })),
  dayOfWeekHeatmap: [
    { day: 0, count: 124, label: 'Sun' }, { day: 1, count: 98, label: 'Mon' },
    { day: 2, count: 87, label: 'Tue' }, { day: 3, count: 76, label: 'Wed' },
    { day: 4, count: 91, label: 'Thu' }, { day: 5, count: 134, label: 'Fri' },
    { day: 6, count: 237, label: 'Sat' },
  ],
}

const MOCK_YOUTUBE_DATA = {
  timestamps: [],
  totalVideos: 203,
  dateRange: { start: '2024-11-01', end: '2025-02-01' },
  hourlyHeatmap: Array.from({ length: 24 }, (_, h) => ({
    hour: h,
    count: [1, 0, 0, 0, 0, 2, 4, 10, 14, 12, 10, 8, 18, 14, 12, 10, 8, 6, 10, 8, 6, 4, 3, 2][h] || 0,
  })),
  dayOfWeekHeatmap: [
    { day: 0, count: 31, label: 'Sun' }, { day: 1, count: 35, label: 'Mon' },
    { day: 2, count: 29, label: 'Tue' }, { day: 3, count: 26, label: 'Wed' },
    { day: 4, count: 31, label: 'Thu' }, { day: 5, count: 24, label: 'Fri' },
    { day: 6, count: 29, label: 'Sat' },
  ],
}

const readStorage = (key) => {
  try {
    const s = localStorage.getItem(key)
    return s ? JSON.parse(s) : null
  } catch { return null }
}

const formatDateLabel = (dateStr) => {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }).toUpperCase()
}

// Inline dummy parsers to keep component self-contained for demo
const parseVideosWatched = (data) => Array.isArray(data) ? data : []
const parseYourTopics = (data) => Array.isArray(data) ? data : []
const parseAdsViewed = (data) => Array.isArray(data) ? data : []
const buildHourlyHeatmap = () => MOCK_INSTAGRAM_DATA.hourlyHeatmap
const buildDayOfWeekHeatmap = () => MOCK_INSTAGRAM_DATA.dayOfWeekHeatmap
const getEchoChamberScore = () => ({ uniqueCreators: 10, totalVideos: 100, score: 50 })
const inferSessionsFromTimestamps = () => MOCK_INSTAGRAM_DATA.inferredSessions

export default function CrossPlatformMap() {
  const fileInputRef = useRef(null)
  
  const [instagramData, setInstagramData] = useState(() => readStorage('scrollsense_instagram_processed'))
  const [youtubeData] = useState(() => readStorage('scrollsense_youtube_processed'))
  
  const hasInstagram = instagramData !== null
  
  const igData = instagramData || MOCK_INSTAGRAM_DATA
  const ytData = youtubeData || MOCK_YOUTUBE_DATA
  
  const [showUploadGuide, setShowUploadGuide] = useState(!hasInstagram)
  const [reminderSet, setReminderSet] = useState(() => !!readStorage('scrollsense_instagram_reminder'))
  const [reminderTime, setReminderTime] = useState('8 HOURS')
  const [activeView, setActiveView] = useState('combined')
  const [fileMap, setFileMap] = useState({})
  const [isProcessing, setIsProcessing] = useState(false)

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

  const handleSetReminder = () => {
    const hours = parseInt(reminderTime) || 8
    localStorage.setItem('scrollsense_instagram_reminder', JSON.stringify({
      setAt: new Date().toISOString(),
      remindAfterHours: hours,
      remindAt: new Date(Date.now() + hours * 3600000).toISOString()
    }))
    setReminderSet(true)
    if ('Notification' in window && Notification.permission !== 'granted') {
      Notification.requestPermission()
    }
  }

  const handleCancelReminder = () => {
    localStorage.removeItem('scrollsense_instagram_reminder')
    setReminderSet(false)
  }

  const handleProcessFiles = () => {
    setIsProcessing(true)
    
    setTimeout(() => {
      // Simulate processing
      const videos = fileMap['videos_watched.json'] ? parseVideosWatched(fileMap['videos_watched.json']) : []
      const topics = fileMap['your_topics.json'] ? parseYourTopics(fileMap['your_topics.json']) : []
      const ads = fileMap['ads_viewed.json'] ? parseAdsViewed(fileMap['ads_viewed.json']) : []
      
      const allTs = [Date.now() - 86400000, Date.now() - 172800000] // Dummy timestamps for mock
      
      const processed = {
        processedAt: new Date().toISOString(),
        totalVideos: videos.length || MOCK_INSTAGRAM_DATA.totalVideos,
        totalAds: ads.length,
        dateRange: MOCK_INSTAGRAM_DATA.dateRange,
        hourlyHeatmap: buildHourlyHeatmap(allTs),
        dayOfWeekHeatmap: buildDayOfWeekHeatmap(allTs),
        echoChamberData: getEchoChamberScore(videos),
        inferredSessions: inferSessionsFromTimestamps(allTs),
        sourceFiles: Object.keys(fileMap),
      }
      
      localStorage.setItem('scrollsense_instagram_processed', JSON.stringify(processed))
      if (topics.length > 0) {
        localStorage.setItem('scrollsense_instagram_topics', JSON.stringify(topics))
      }
      
      setInstagramData(processed)
      setIsProcessing(false)
      setShowUploadGuide(false)
    }, 1500)
  }

  const hourlyChartData = Array.from({ length: 24 }, (_, h) => {
    const ytHour = ytData.hourlyHeatmap.find(x => x.hour === h)
    const igHour = igData.hourlyHeatmap.find(x => x.hour === h)
    const label = h === 0 ? '12AM' : h < 12 ? `${h}AM` : h === 12 ? '12PM' : `${h - 12}PM`
    return {
      hour: h,
      label,
      youtube: ytHour?.count || 0,
      instagram: igHour?.count || 0,
      total: (ytHour?.count || 0) + (igHour?.count || 0),
    }
  })

  // Peak overlap
  const avgYT = hourlyChartData.reduce((s, h) => s + h.youtube, 0) / 24
  const avgIG = hourlyChartData.reduce((s, h) => s + h.instagram, 0) / 24
  const overlapHours = hourlyChartData.filter(h => h.youtube > avgYT && h.instagram > avgIG)

  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const weeklyChartData = Array.from({ length: 7 }, (_, d) => {
    const ytDay = ytData.dayOfWeekHeatmap.find(x => x.day === d)
    const igDay = igData.dayOfWeekHeatmap.find(x => x.day === d)
    return {
      day: days[d],
      youtube: ytDay?.count || 0,
      instagram: igDay?.count || 0,
    }
  })

  let mostIGDay = weeklyChartData[0]
  let mostYTDay = weeklyChartData[0]
  weeklyChartData.forEach(d => {
    if ((d.instagram - d.youtube) > (mostIGDay.instagram - mostIGDay.youtube)) mostIGDay = d
    if ((d.youtube - d.instagram) > (mostYTDay.youtube - mostYTDay.instagram)) mostYTDay = d
  })

  const chartH = typeof window !== 'undefined' && window.innerWidth < 768 ? 160 : 200
  const barChartH = typeof window !== 'undefined' && window.innerWidth < 768 ? 150 : 180

  const ytPct = Math.round((ytData.totalVideos / (ytData.totalVideos + igData.totalVideos)) * 100) || 0
  const igPct = 100 - ytPct

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
            WHERE AND WHEN YOU SCROLL
          </h2>
          <div className="border border-[#3F3F46] px-3 py-1 inline-flex items-center gap-2 mt-2">
            <Camera size={11} className="text-[#A1A1AA]" />
            <span className="text-[10px] uppercase tracking-widest text-[#A1A1AA]">
              {hasInstagram 
                ? `SNAPSHOT: ${formatDateLabel(igData.dateRange.start)} — ${formatDateLabel(igData.dateRange.end)}`
                : "SNAPSHOT NOT YET UPLOADED"}
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
                      your_instagram_activity/logged_information/videos_watched.json <span className="text-[#3F3F46]">← REQUIRED</span><br/>
                      ads_information/ads_and_topics/your_topics.json <span className="text-[#3F3F46]">← RECOMMENDED</span><br/>
                      ads_information/ads_and_topics/ads_viewed.json <span className="text-[#3F3F46]">← OPTIONAL</span>
                    </div>
                  </div>
                </div>

                <div className="border border-[#3F3F46] p-4 flex gap-4 items-start">
                  <span className="text-[2.5rem] font-bold text-[#27272A] leading-none flex-shrink-0" aria-hidden>4</span>
                  <div className="w-full relative">
                    <h4 className="text-sm font-bold uppercase tracking-tighter text-[#FAFAFA] mb-1">UPLOAD HERE</h4>
                    <p className="text-xs text-[#A1A1AA] leading-relaxed mb-3">
                      All processing happens in your browser — files are never sent to any server.
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

              {/* REMINDER SECTION */}
              <div className="border-t border-[#3F3F46] pt-5 mt-5">
                {!reminderSet ? (
                  <>
                    <div className="text-xs uppercase tracking-widest text-[#A1A1AA] mb-3">
                      SET A REMINDER FOR WHEN YOUR EXPORT IS READY
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                      <select 
                        value={reminderTime}
                        onChange={(e) => setReminderTime(e.target.value)}
                        className="bg-[#27272A] border border-[#3F3F46] px-3 py-2 text-xs uppercase text-[#FAFAFA] rounded-none outline-none focus:border-[#DFE104]"
                      >
                        <option value="6 HOURS">6 HOURS</option>
                        <option value="8 HOURS">8 HOURS</option>
                        <option value="10 HOURS">10 HOURS</option>
                        <option value="24 HOURS">TOMORROW</option>
                      </select>
                      <button 
                        onClick={handleSetReminder}
                        className="border-2 border-[#DFE104] bg-transparent text-[#DFE104] font-bold uppercase tracking-tighter px-6 py-2 text-xs rounded-none hover:bg-[#DFE104] hover:text-black transition-all h-[36px]"
                      >
                        REMIND ME
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center gap-3">
                    <CheckCircle size={14} className="text-[#DFE104]" />
                    <span className="text-xs uppercase tracking-widest text-[#DFE104]">
                      REMINDER SET — WE'LL NUDGE YOU IN {reminderTime}
                    </span>
                    <button 
                      onClick={handleCancelReminder}
                      className="text-[10px] uppercase text-[#3F3F46] hover:text-[#A1A1AA]"
                    >
                      · CANCEL
                    </button>
                  </div>
                )}
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
                          PROCESSING YOUR INSTAGRAM DATA...
                        </span>
                        <span className="text-[10px] text-[#A1A1AA] mt-0.5">
                          No data is being sent to any server.
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

      {/* TEASER STATE (NO DATA, NO GUIDE) */}
      {!hasInstagram && !showUploadGuide && (
        <div className="text-center py-12">
          <div className="text-[6rem] font-bold text-[#27272A] leading-none select-none" aria-hidden>?</div>
          <h3 className="text-sm font-bold uppercase tracking-tighter text-[#FAFAFA] mt-2">
            UPLOAD YOUR INSTAGRAM EXPORT TO SEE THE FULL PICTURE
          </h3>
          <p className="text-xs text-[#A1A1AA] mt-2 max-w-xs mx-auto leading-relaxed">
            YouTube data alone shows only part of your scroll habits.
          </p>
          <button 
            onClick={() => setShowUploadGuide(true)}
            className="border-2 border-[#3F3F46] px-6 py-3 text-xs uppercase tracking-tighter text-[#FAFAFA] mt-6 rounded-none hover:border-[#FAFAFA]/30 transition-all font-bold min-h-[44px]"
          >
            SHOW ME HOW →
          </button>
        </div>
      )}

      {/* DATA LOADED STATE - CHARTS */}
      {hasInstagram && (
        <motion.div 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
        >
          {/* SECTION 1 — OVERVIEW */}
          <div className="flex flex-col md:flex-row border-2 border-[#3F3F46] mb-6 w-full md:w-fit font-bold rounded-none">
            {['combined', 'youtube', 'instagram'].map(view => (
              <button
                key={view}
                onClick={() => setActiveView(view)}
                className={`flex-1 md:flex-none px-4 py-2 text-xs uppercase tracking-wider transition-all duration-200 min-h-[44px] ${
                  activeView === view ? 'bg-[#DFE104] text-black' : 'bg-transparent text-[#A1A1AA] hover:bg-[#27272A]/50'
                }`}
              >
                {view}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="border border-[#3F3F46] bg-[#09090B] p-4">
              <div className="text-[10px] uppercase tracking-widest text-[#A1A1AA] mb-1">
                TOTAL EVENTS TRACKED
              </div>
              <div className="text-base md:text-2xl font-bold uppercase text-[#FAFAFA]">
                {activeView === 'combined' ? (igData.totalVideos + ytData.totalVideos) :
                 activeView === 'youtube' ? ytData.totalVideos : igData.totalVideos}
              </div>
              <div className="text-[10px] uppercase text-[#3F3F46] mt-1">
                {activeView === 'combined' ? "ACROSS BOTH PLATFORMS" :
                 activeView === 'youtube' ? "YOUTUBE VIDEOS" : "INSTAGRAM REELS"}
              </div>
            </div>

            <div className="border border-[#3F3F46] bg-[#09090B] p-4">
              <div className="text-[10px] uppercase tracking-widest text-[#A1A1AA] mb-1">
                DATA COVERS
              </div>
              <div className="text-base md:text-lg font-bold uppercase text-[#FAFAFA]">
                {formatDateLabel(igData.dateRange.start)} — {formatDateLabel(igData.dateRange.end)}
              </div>
              <div className="text-[10px] uppercase text-[#3F3F46] mt-1">
                HISTORICAL SNAPSHOT
              </div>
            </div>

            <div className="border border-[#3F3F46] bg-[#09090B] p-4">
              <div className="text-[10px] uppercase tracking-widest text-[#A1A1AA] mb-1">
                PLATFORM SPLIT
              </div>
              <div className="w-full h-[8px] flex mt-2">
                <div className="bg-[#DFE104] h-full" style={{ width: `${ytPct}%` }} />
                <div className="bg-[#FAFAFA]/35 h-full" style={{ width: `${igPct}%` }} />
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-[10px] text-[#DFE104] font-bold">YT {ytPct}%</span>
                <span className="text-[10px] text-[#A1A1AA] font-bold">IG {igPct}%</span>
              </div>
            </div>
          </div>

          {/* SECTION 2 — HOURLY ACTIVITY */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-bold uppercase tracking-tighter text-[#FAFAFA]">
                ACTIVITY BY HOUR OF DAY
              </h3>
              <span className="text-[10px] uppercase text-[#3F3F46] hidden sm:block">BASED ON HISTORICAL DATA</span>
            </div>

            <div style={{ height: chartH }} className="w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={hourlyChartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272A" vertical={false} />
                  <XAxis 
                    dataKey="label" 
                    ticks={['12AM', '6AM', '12PM', '6PM', '10PM']} 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#A1A1AA', fontSize: 10, fontFamily: 'Space Grotesk' }}
                  />
                  <YAxis hide />
                  <Tooltip content={renderTooltip} cursor={{ stroke: '#3F3F46', strokeWidth: 1 }} />
                  {activeView !== 'instagram' && (
                    <Area 
                      type="monotone" 
                      dataKey="youtube" 
                      name="YouTube" 
                      stackId="1" 
                      fill="#DFE104" 
                      fillOpacity={0.2} 
                      stroke="#DFE104" 
                      strokeWidth={1.5} 
                      isAnimationActive={false}
                    />
                  )}
                  {activeView !== 'youtube' && (
                    <Area 
                      type="monotone" 
                      dataKey="instagram" 
                      name="Instagram" 
                      stackId="1" 
                      fill="rgba(250,250,250,0.35)" 
                      fillOpacity={0.8} 
                      stroke="rgba(250,250,250,0.3)" 
                      strokeWidth={1} 
                      isAnimationActive={false}
                    />
                  )}
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="flex gap-6 justify-start mt-3 flex-wrap">
              {activeView !== 'instagram' && (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-[#DFE104]" />
                  <span className="text-[10px] uppercase font-bold text-[#A1A1AA]">YOUTUBE</span>
                </div>
              )}
              {activeView !== 'youtube' && (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-[#FAFAFA]/35" />
                  <span className="text-[10px] uppercase font-bold text-[#A1A1AA]">INSTAGRAM REELS</span>
                </div>
              )}
              <div className="text-[10px] uppercase text-[#3F3F46]">
                CREATOR USERNAME + TIMESTAMP ONLY — NO VIDEO TITLES
              </div>
            </div>

            {overlapHours.length > 0 && activeView === 'combined' && (
              <div className="border-l-4 border-[#DFE104] pl-4 py-3 bg-[#27272A]/30 pr-4 mt-4">
                <div className="text-xs uppercase tracking-widest text-[#DFE104] font-bold mb-1">
                  PLATFORM OVERLAP DETECTED
                </div>
                <p className="text-xs text-[#A1A1AA] leading-relaxed">
                  {overlapHours[0].label} — {overlapHours[overlapHours.length - 1].label} shows high activity on BOTH YouTube and Instagram.
                </p>
                <p className="text-xs text-[#3F3F46] mt-1">
                  This time window is likely when you platform-switch — scrolling one app until it gets boring, then switching.
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
                  {activeView !== 'youtube' && (
                    <Bar dataKey="instagram" fill="rgba(250,250,250,0.4)" name="Instagram" isAnimationActive={false} />
                  )}
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="flex gap-3 flex-wrap mt-4">
              <div className="bg-[#DFE104]/10 border border-[#DFE104]/30 px-4 py-2 font-bold">
                <span className="text-[10px] uppercase tracking-widest text-[#DFE104]">
                  {mostYTDay.day} IS YOUR MOST YOUTUBE-HEAVY DAY
                </span>
              </div>
              <div className="bg-[#27272A] border border-[#3F3F46] px-4 py-2 font-bold">
                <span className="text-[10px] uppercase tracking-widest text-[#A1A1AA]">
                  {mostIGDay.day} IS YOUR MOST INSTAGRAM-HEAVY DAY
                </span>
              </div>
            </div>
          </div>

          {/* DATA HONESTY FOOTER */}
          <div className="border-t border-[#3F3F46] pt-4 mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start gap-2">
              <Info size={11} className="text-[#3F3F46] flex-shrink-0 mt-0.5" />
              <div className="text-[10px] text-[#3F3F46] leading-relaxed uppercase tracking-wider">
                INSTAGRAM DATA IS A HISTORICAL SNAPSHOT. Re-upload your export anytime to refresh it with more recent data.
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Lock size={11} className="text-[#3F3F46] flex-shrink-0 mt-0.5" />
              <div className="text-[10px] text-[#3F3F46] leading-relaxed uppercase tracking-wider">
                ALL PROCESSING HAPPENS IN YOUR BROWSER. Raw Instagram files are never sent to any server.
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  )
}