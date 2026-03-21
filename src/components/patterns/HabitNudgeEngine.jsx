import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Clock, Zap, Timer, MapPin, BookOpen, Code, PenLine, CheckCircle, Flame } from 'lucide-react'

const MOCK_SESSIONS = [
  { id: '1', durationMinutes: 78, moodRating: 1, platform: 'instagram', timestamp: Date.now() - 86400000 },
  { id: '2', durationMinutes: 45, moodRating: 2, platform: 'youtube', timestamp: Date.now() - 172800000 },
  { id: '3', durationMinutes: 22, moodRating: 4, platform: 'instagram', timestamp: Date.now() - 259200000 },
  { id: '4', durationMinutes: 90, moodRating: 1, platform: 'instagram', timestamp: Date.now() - 86400000 - 79200000 },
  { id: '5', durationMinutes: 15, moodRating: 5, platform: 'youtube', timestamp: Date.now() - 345600000 },
]

const MOCK_ONBOARDING = {
  careerPath: 'Software Development',
  goals: ['reduce_total', 'intentional', 'reclaim_time'],
  interests: [
    { id: 'cricket', label: 'Cricket', dailyMinutes: 30 },
    { id: 'fitness', label: 'Fitness', dailyMinutes: 20 },
  ],
}

const readStorage = (key) => {
  try {
    const s = localStorage.getItem(key)
    return s ? JSON.parse(s) : null
  } catch { return null }
}

const generateSuggestions = (sessions, onboarding, intention, feedback) => {
  const now = new Date()
  const currentHour = now.getHours()
  const goals = onboarding?.goals || []
  const careerPath = onboarding?.careerPath || ''
  
  const isLateNight = currentHour >= 22 || currentHour < 2
  const isMorning = currentHour >= 6 && currentHour < 10
  const isEvening = currentHour >= 18 && currentHour < 22
  const isAfternoon = currentHour >= 12 && currentHour < 18
  
  const isBoredomOrStress = intention === 'boredom' || intention === 'stress'
  
  const recentSessions = sessions.filter(s => s.timestamp > Date.now() - 7 * 86400000)
  const avgDuration = recentSessions.length > 0
    ? recentSessions.reduce((s, i) => s + i.durationMinutes, 0) / recentSessions.length
    : 30
  const avgMood = recentSessions.length > 0
    ? recentSessions.reduce((s, i) => s + i.moodRating, 0) / recentSessions.length
    : 3
  const recentMoodBad = avgMood < 3
  
  const effectiveSuggIds = feedback.filter(f => f.outcome === 'effective').map(f => f.suggestionId)
  
  const pool = [
    {
      id: 'focused_work_block',
      title: 'START A 25-MIN FOCUS BLOCK',
      description: 'Set a timer and work on one specific task. No phone. When the timer ends, you can scroll guilt-free.',
      relevantGoals: ['reduce_total', 'intentional', 'career_content'],
      bestTimes: 'morning afternoon',
      worstMood: true,
      icon: Timer,
      actionLabel: 'SET TIMER NOW',
    },
    {
      id: 'go_outside',
      title: 'STEP OUTSIDE FOR 10 MINUTES',
      description: 'A short walk resets the urge to scroll more effectively than willpower alone. Take your phone — just keep it in your pocket.',
      relevantGoals: ['better_mood', 'reclaim_time'],
      bestTimes: 'afternoon evening',
      worstMood: true,
      icon: MapPin,
      actionLabel: 'START WALK TIMER',
    },
    {
      id: 'read_something',
      title: 'READ FOR 15 MINUTES',
      description: 'Open a book, article, or documentation you\'ve been meaning to get to. Same screen-time budget, completely different outcome.',
      relevantGoals: ['career_content', 'reclaim_time'],
      bestTimes: 'evening late_night',
      worstMood: false,
      icon: BookOpen,
      actionLabel: 'I\'LL READ INSTEAD',
    },
    {
      id: 'one_skill_task',
      title: `WORK ON ONE ${careerPath.toUpperCase()} SKILL`,
      description: `Pick one small task related to ${careerPath || 'your goals'}. Not a big project — one small concrete thing. 20 minutes.`,
      relevantGoals: ['career_content', 'understand_patterns'],
      bestTimes: 'morning afternoon',
      worstMood: false,
      icon: Code,
      actionLabel: 'LET\'S DO IT',
    },
    {
      id: 'mindful_pause',
      title: 'WAIT 5 MINUTES BEFORE OPENING ANY APP',
      description: 'Set a 5-minute timer. If you still want to scroll after it ends, go for it intentionally. Most cravings pass in under 3 minutes.',
      relevantGoals: ['intentional', 'reduce_total'],
      bestTimes: 'all',
      worstMood: true,
      icon: Clock,
      actionLabel: 'START 5-MIN PAUSE',
    },
    {
      id: 'log_craving',
      title: 'REFLECT ON WHAT TRIGGERED THIS',
      description: 'You opened ScrollSense instead of Instagram. That\'s already the win. Log what you were feeling — it takes 30 seconds and builds your pattern data.',
      relevantGoals: ['understand_patterns'],
      bestTimes: 'all',
      worstMood: true,
      icon: PenLine,
      actionLabel: 'LOG THE CRAVING',
    },
  ]
  
  const scored = pool.map(s => {
    let score = 0
    if (s.relevantGoals.some(g => goals.includes(g))) score += 3
    if (s.bestTimes === 'all') score += 1
    else {
      if (isLateNight && s.bestTimes.includes('late_night')) score += 2
      if (isMorning && s.bestTimes.includes('morning')) score += 2
      if (isEvening && s.bestTimes.includes('evening')) score += 2
      if (isAfternoon && s.bestTimes.includes('afternoon')) score += 2
    }
    if (recentMoodBad && s.worstMood) score += 2
    if (isBoredomOrStress && s.worstMood) score += 2
    if (effectiveSuggIds.includes(s.id)) score += 3
    return { ...s, score }
  })
  
  return scored.sort((a, b) => b.score - a.score).slice(0, 3)
}

export default function HabitNudgeEngine() {
  const [sessions] = useState(() => readStorage('scrollsense_sessions') || MOCK_SESSIONS)
  const [onboarding] = useState(() => readStorage('scrollsense_onboarding') || MOCK_ONBOARDING)
  const [todayIntention] = useState(() => readStorage('scrollsense_daily_intention'))
  const [feedback, setFeedback] = useState(() => readStorage('scrollsense_habit_feedback') || [])
  const [responded, setResponded] = useState({})

  useEffect(() => {
    // Check pending feedback
    const checkPendingFeedback = () => {
      let updated = false
      const newFeedback = feedback.map(f => {
        if (f.outcome === null && f.action === 'accepted') {
          const entryTime = new Date(f.timestamp).getTime()
          const subsequentSessions = sessions.filter(s => new Date(s.timestamp || s.date).getTime() > entryTime)
          
          if (subsequentSessions.length > 0) {
            updated = true
            const recentSessions = sessions.filter(s => new Date(s.timestamp || s.date).getTime() < entryTime && new Date(s.timestamp || s.date).getTime() > entryTime - 7 * 86400000)
            const avgDuration = recentSessions.length > 0 ? recentSessions.reduce((s, i) => s + i.durationMinutes, 0) / recentSessions.length : 30
            
            const nextSession = subsequentSessions.sort((a,b) => new Date(a.timestamp || a.date) - new Date(b.timestamp || b.date))[0]
            return { ...f, outcome: nextSession.durationMinutes < avgDuration ? 'effective' : 'ineffective' }
          } else if (Date.now() - entryTime > 86400000) {
            updated = true
            return { ...f, outcome: 'ineffective' }
          }
        }
        return f
      })

      if (updated) {
        setFeedback(newFeedback)
        localStorage.setItem('scrollsense_habit_feedback', JSON.stringify(newFeedback))
      }
    }

    checkPendingFeedback()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const suggestions = generateSuggestions(sessions, onboarding, todayIntention?.value, feedback)

  const recordFeedback = (suggestionId, action) => {
    const entry = {
      id: Date.now().toString(),
      suggestionId,
      action,
      timestamp: new Date().toISOString(),
      sessionsBefore: sessions.length,
      outcome: null,
    }
    const updated = [...feedback, entry]
    setFeedback(updated)
    localStorage.setItem('scrollsense_habit_feedback', JSON.stringify(updated))
  }

  const handleAction = (suggestionId, action) => {
    recordFeedback(suggestionId, action)
    setResponded(prev => ({ ...prev, [suggestionId]: action }))
  }

  const handleUndo = (suggestionId) => {
    setResponded(prev => {
      const copy = { ...prev }
      delete copy[suggestionId]
      return copy
    })
    const updated = feedback.filter(f => !(f.suggestionId === suggestionId && f.outcome === null))
    setFeedback(updated)
    localStorage.setItem('scrollsense_habit_feedback', JSON.stringify(updated))
  }

  const currentHour = new Date().getHours()
  const isLateNight = currentHour >= 22 || currentHour < 2
  const isMorning = currentHour >= 6 && currentHour < 10
  const isEvening = currentHour >= 18 && currentHour < 22
  const isAfternoon = currentHour >= 12 && currentHour < 18

  const contextText = isLateNight ? "IT'S LATE — THIS IS USUALLY A HIGH-RISK TIME" :
                      isMorning ? "GOOD MORNING — START INTENTIONALLY" :
                      isEvening ? "EVENING PATTERNS AHEAD — HERE'S AN ALTERNATIVE" :
                      isAfternoon ? "AFTERNOON WINDOW — MAKE IT COUNT" : 
                      "BASED ON YOUR PATTERNS"

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      viewport={{ once: true }}
      className="border-2 border-[#3F3F46] bg-[#09090B] p-6 md:p-8 rounded-none mt-6"
    >
      {/* HEADER */}
      <div className="flex justify-between items-start flex-wrap gap-4 mb-6">
        <div>
          <div className="text-xs uppercase tracking-widest text-[#DFE104] mb-1">
            HABIT NUDGE ENGINE
          </div>
          <h2 className="text-2xl md:text-4xl font-bold uppercase tracking-tighter leading-[0.85] text-[#FAFAFA]">
            WHAT TO DO INSTEAD
          </h2>
          <div className="mt-2 flex items-center gap-2 flex-wrap">
            <Clock size={11} className="text-[#A1A1AA]" />
            <span className="text-xs uppercase tracking-widest text-[#A1A1AA]">{contextText}</span>
          </div>
        </div>
        <div className="border border-[#3F3F46] px-2 py-1 text-[10px] font-bold text-[#A1A1AA]">
          F14
        </div>
      </div>

      {/* INTENTION CONTEXT */}
      {todayIntention && (
        <div className="flex items-center gap-3 bg-[#27272A]/40 border border-[#3F3F46] px-4 py-3 mb-6">
          <Zap size={13} className="text-[#DFE104] flex-shrink-0" />
          <div className="text-xs uppercase tracking-widest text-[#A1A1AA]">
            {todayIntention.value === 'boredom' ? "YOU SAID YOU'RE BORED TODAY — THESE ARE BETTER THAN MINDLESS SCROLLING" :
             todayIntention.value === 'stress' ? "YOU SAID YOU'RE STRESSED — THESE ACTUALLY HELP" :
             todayIntention.value === 'specific' ? "YOU HAVE SOMETHING SPECIFIC IN MIND — FIND IT QUICKLY, THEN CLOSE THE APP" :
             "YOUR INTENTION IS SET — THESE KEEP YOU ON TRACK"}
          </div>
        </div>
      )}

      {/* SUGGESTION CARDS */}
      <div className="flex flex-col gap-4">
        <AnimatePresence mode="popLayout">
          {suggestions.map((suggestion, i) => {
            const status = responded[suggestion.id]
            const Icon = suggestion.icon

            if (status === 'accepted') {
              return (
                <motion.div 
                  key={suggestion.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="border-2 border-[#DFE104]/40 bg-[#DFE104]/5 p-5 flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-4">
                    <CheckCircle size={18} className="text-[#DFE104] flex-shrink-0" />
                    <div>
                      <div className="text-sm font-bold uppercase tracking-tighter text-[#DFE104]">
                        {suggestion.title}
                      </div>
                      <div className="text-xs text-[#A1A1AA] mt-1 uppercase tracking-wider">
                        COME BACK AFTER AND LOG HOW IT WENT →
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleUndo(suggestion.id)}
                    className="text-[10px] uppercase text-[#3F3F46] hover:text-[#A1A1AA] cursor-pointer"
                  >
                    UNDO
                  </button>
                </motion.div>
              )
            }

            if (status === 'skipped') {
              return (
                <motion.div 
                  key={suggestion.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="border-2 border-[#27272A] bg-transparent p-4 opacity-40 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="text-xs uppercase tracking-tighter text-[#3F3F46]">
                      {suggestion.title}
                    </div>
                    <span className="text-[10px] text-[#3F3F46]">· SKIPPED</span>
                  </div>
                  <button 
                    onClick={() => handleUndo(suggestion.id)}
                    className="text-[10px] uppercase text-[#3F3F46] hover:text-[#A1A1AA] cursor-pointer"
                  >
                    UNDO
                  </button>
                </motion.div>
              )
            }

            return (
              <motion.div 
                key={suggestion.id}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.1 }}
                viewport={{ once: true }}
                className="border-2 border-[#3F3F46] bg-[#09090B] p-4 md:p-6"
              >
                <div className="flex items-start gap-4">
                  <Icon size={18} className="text-[#DFE104] flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="text-base font-bold uppercase tracking-tighter text-[#FAFAFA]">
                      {suggestion.title}
                    </h3>
                    <p className="text-sm text-[#A1A1AA] leading-relaxed mt-1">
                      {suggestion.description}
                    </p>
                  </div>
                  {suggestion.score >= 7 && (
                    <div className="flex items-center gap-1">
                      <Flame size={12} className="text-[#DFE104]" />
                      <span className="text-[9px] uppercase tracking-widest text-[#DFE104] hidden sm:block">HIGH MATCH</span>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-2 md:gap-3 mt-4 pt-4 border-t border-[#3F3F46]">
                  <button 
                    onClick={() => handleAction(suggestion.id, 'accepted')}
                    className="bg-[#DFE104] text-black font-bold uppercase tracking-tighter px-5 py-2.5 text-xs rounded-none hover:scale-[1.02] active:scale-95 transition-all text-center flex-1 sm:flex-none min-h-[44px]"
                  >
                    I'LL TRY THIS
                  </button>
                  <button 
                    onClick={() => handleAction(suggestion.id, 'skipped')}
                    className="border border-[#3F3F46] bg-transparent text-[#3F3F46] uppercase tracking-tighter px-5 py-2.5 text-xs rounded-none hover:text-[#A1A1AA] hover:border-[#A1A1AA] transition-all text-center flex-1 sm:flex-none min-h-[44px]"
                  >
                    NOT NOW
                  </button>
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>

      {/* EFFECTIVENESS TRACKER */}
      {feedback.length >= 3 && (
        <div className="mt-8 pt-6 border-t border-[#3F3F46]">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-bold uppercase tracking-tighter text-[#FAFAFA]">
              WHAT'S BEEN WORKING FOR YOU
            </h3>
            <span className="text-xs uppercase tracking-widest text-[#3F3F46]">
              {feedback.length} SUGGESTIONS TRACKED
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 md:gap-4">
            <div>
              <div className="text-lg md:text-2xl font-bold uppercase text-[#DFE104]">
                {feedback.filter(f => f.outcome === 'effective').length}
              </div>
              <div className="text-[10px] uppercase text-[#A1A1AA] mt-1">REDUCED YOUR SCROLL</div>
            </div>

            <div>
              <div className="text-lg md:text-2xl font-bold uppercase text-[#FAFAFA]">
                {Math.round(feedback.filter(f => f.action === 'accepted').length / feedback.length * 100) || 0}%
              </div>
              <div className="text-[10px] uppercase text-[#A1A1AA] mt-1">ACCEPTANCE RATE</div>
            </div>

            <div>
              {(() => {
                const grouped = feedback.filter(f => f.outcome === 'effective').reduce((acc, f) => {
                  acc[f.suggestionId] = (acc[f.suggestionId] || 0) + 1
                  return acc
                }, {})
                const bestId = Object.keys(grouped).sort((a,b) => grouped[b] - grouped[a])[0]
                const pool = suggestions // use generated list or ideal pool for full info
                const bestSugg = [{id:'focused_work_block', title:'START A 25-MIN FOCUS BLOCK', icon: Timer}, {id:'go_outside', title:'STEP OUTSIDE FOR 10 MINUTES', icon: MapPin}, {id:'read_something', title:'READ FOR 15 MINUTES', icon: BookOpen}, {id:'one_skill_task', title:'WORK ON ONE SKILL', icon: Code}, {id:'mindful_pause', title:'WAIT 5 MINUTES BEFORE OPENING ANY APP', icon: Clock}, {id:'log_craving', title:'REFLECT ON WHAT TRIGGERED THIS', icon: PenLine}].find(s => s.id === bestId)

                return bestSugg ? (
                  <>
                    <bestSugg.icon size={20} className="text-[#DFE104] mt-1 mb-1 hidden md:block" />
                    <div className="text-sm md:text-xl font-bold uppercase text-[#FAFAFA] block md:hidden">1st</div>
                    <div className="text-[10px] uppercase text-[#A1A1AA] mt-1 break-words">
                      {bestSugg.title.slice(0, 15)}...
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-lg md:text-2xl font-bold text-[#3F3F46]">--</div>
                    <div className="text-[10px] uppercase text-[#A1A1AA] mt-1">BEST SUGGESTION</div>
                  </>
                )
              })()}
            </div>
          </div>

          {(() => {
            const pending = feedback.filter(f => f.outcome === null && f.action === 'accepted').length
            return pending > 0 && (
              <div className="flex items-center gap-2 mt-4">
                <Clock size={11} className="text-[#3F3F46]" />
                <span className="text-[10px] uppercase tracking-wider text-[#3F3F46]">
                  {pending} SUGGESTION(S) WAITING FOR YOUR NEXT SESSION LOG
                </span>
              </div>
            )
          })()}
        </div>
      )}

      {/* HOW IT LEARNS */}
      <div className="border-l-4 border-[#27272A] pl-4 py-2 mt-6">
        <div className="text-xs uppercase tracking-widest text-[#3F3F46] font-bold mb-1">
          HOW SCROLLSENSE IMPROVES THESE SUGGESTIONS
        </div>
        <p className="text-xs text-[#3F3F46] leading-relaxed">
          When you try a suggestion and log a shorter session afterwards, ScrollSense marks it as effective and shows it more. Over time, suggestions adapt to what actually works for you — not generic advice.
        </p>
      </div>
    </motion.div>
  )
}