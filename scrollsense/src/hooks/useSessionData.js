import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/axios'
import useAuthStore from '../store/authStore'

export function useSessionData() {
  const accessToken = useAuthStore(state => state.accessToken)
  const queryClient = useQueryClient()

  // Today's sessions — powers SessionLogger idle state
  const todayQuery = useQuery({
    queryKey: ['sessions-today'],
    queryFn: async () => {
      const res = await api.get('/sessions/today')
      return res.data
    },
    staleTime: 30000,           // 30 seconds — updates frequently
    refetchOnWindowFocus: true, // refresh when user comes back to tab
    enabled: !!accessToken,
  })

  // Session stats — powers insight callout in SessionLogger
  const statsQuery = useQuery({
    queryKey: ['sessions-stats'],
    queryFn: async () => {
      const res = await api.get('/sessions/stats')
      return res.data
    },
    staleTime: 2 * 60 * 1000,
    enabled: !!accessToken,
  })

  // Daily BehaviorDay data - to get youtube_auto
  const dailyQuery = useQuery({
    queryKey: ['daily-week'],
    queryFn: async () => {
      const res = await api.get('/daily/week')
      return res.data
    },
    staleTime: 30000,
    refetchOnWindowFocus: true,
    enabled: !!accessToken,
  })

  // Log a session mutation
  const logSessionMutation = useMutation({
    mutationFn: async (sessionData) => {
      // sessionData: { durationMinutes, moodRating, platform, timestamp }
      const res = await api.post('/sessions/log', sessionData)
      return res.data
    },
    onSuccess: () => {
      // Invalidate all session-related queries so UI updates immediately
      queryClient.invalidateQueries({ queryKey: ['sessions-today'] })
      queryClient.invalidateQueries({ queryKey: ['sessions-stats'] })
      queryClient.invalidateQueries({ queryKey: ['digest-status'] })
      queryClient.invalidateQueries({ queryKey: ['digest-checkin'] })
      // Also refresh dashboard so F6/F10/F12/F13 update
      queryClient.invalidateQueries({ queryKey: ['youtube-dashboard'] })
    },
  })

  // Log intention mutation
  const logIntentionMutation = useMutation({
    mutationFn: async (intentionData) => {
      // intentionData: { intentionCategory, timestamp, type: 'daily' }
      const res = await api.post('/sessions/intention', intentionData)
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions-today'] })
    },
  })

  const today = todayQuery.data || {}
  const stats = statsQuery.data || {}
  
  const todayStr = new Date().toISOString().split('T')[0]
  const todayBehaviorDay = dailyQuery.data?.days?.find(d => d.date === todayStr)
  
  // Calculate today's youtube data
  const hasBehaviorDayData = !!todayBehaviorDay
  const todayYoutubeMinutes = todayBehaviorDay?.metrics?.platforms?.youtube || 0
  const todayAutoMinutes = todayBehaviorDay?.metrics?.platforms?.youtube_auto || 0

  return {
    // Today's data
    todaySessions: today.sessions ?? [],
    todaySummary: today.summary ?? {
      count: 0,
      totalMinutes: 0,
      averageMood: null,
      platformBreakdown: {},
    },
    todayIntention: today.todayIntention ?? null,
    
    // Auto data from BehaviorDay
    hasBehaviorDayData,
    todayYoutubeMinutes,
    todayAutoMinutes,

    // Stats for insight callout
    weekStats: stats.week ?? {
      totalMinutes: 0,
      avgMood: null,
      avgDuration: null,
      sessionCount: 0,
    },
    allTimeStats: stats.allTime ?? {
      totalMinutes: 0,
      totalSessions: 0,
    },
    moodInsight: stats.moodInsight ?? {
      threshold: null,
      worsePercent: null,
      hasEnoughData: false,
    },
    dailyLimitMinutes: stats.dailyLimitMinutes ?? 90,

    // Loading states
    isLoadingToday: todayQuery.isLoading,
    isLoadingStats: statsQuery.isLoading,

    // Mutations
    logSession: logSessionMutation.mutateAsync,
    isLoggingSession: logSessionMutation.isPending,
    logSessionError: logSessionMutation.error,

    logIntention: logIntentionMutation.mutateAsync,
    isLoggingIntention: logIntentionMutation.isPending,
  }
}
