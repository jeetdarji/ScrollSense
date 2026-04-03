import { useQuery } from '@tanstack/react-query'
import api from '../lib/axios'
import useAuthStore from '../store/authStore'

export function useYouTubeData() {
  const accessToken = useAuthStore(state => state.accessToken)

  const dashboardQuery = useQuery({
    queryKey: ['youtube-dashboard'],
    queryFn: async () => {
      const res = await api.get('/insights/dashboard')
      return res.data
    },
    staleTime: 5 * 60 * 1000,
    retry: 2,
    retryDelay: 1000,
    enabled: !!accessToken,
  })

  const statusQuery = useQuery({
    queryKey: ['youtube-status'],
    queryFn: async () => {
      const res = await api.get('/youtube/status')
      return res.data
    },
    refetchInterval: (query) => {
      return query.state.data?.isClassifying ? 5000 : false
    },
    staleTime: 10000,
    retry: 1,
    enabled: !!accessToken,
  })

  const checkinQuery = useQuery({
    queryKey: ['digest-checkin'],
    queryFn: async () => {
      const res = await api.get('/digest/checkin')
      return res.data
    },
    staleTime: 10 * 60 * 1000,
    retry: 1,
    enabled: !!accessToken,
    onError: () => {},
  })

  const checkinStatusQuery = useQuery({
    queryKey: ['digest-status'],
    queryFn: async () => {
      const res = await api.get('/digest/status')
      return res.data
    },
    staleTime: 60000,
    retry: 1,
    enabled: !!accessToken,
  })

  const isLoading = dashboardQuery.isLoading
  const dashData = dashboardQuery.data || {}
  const status = statusQuery.data || {}
  const checkin = checkinQuery.data || { 
    available: false, sessionsLogged: 0 
  }
  const checkinStatus = checkinStatusQuery.data || { 
    sessionsLogged: 0, progressPercent: 0 
  }

  return {
    isConnected: status.isConnected ?? dashData.isConnected ?? false,
    isLoading,
    isClassifying: status.isClassifying ?? false,
    classificationProgress: status.classificationProgress ?? 0,
    onboardingRequired: dashData.onboardingRequired ?? false,

    weeklyBreakdown: dashData.weeklyBreakdown ?? [],
    currentWeek: dashData.currentWeek ?? {
      goal: 0,
      interest: 0,
      junk: 100,
      totalMinutes: 0,
      totalVideos: 0,
      changeVsLastWeek: null,
      hasEnoughDataForTrend: false,
      weeksOfData: 0,
    },
    topChannels: dashData.topChannels ?? [],
    contentSuggestions: dashData.contentSuggestions ?? [],

    checkin: {
      ...checkin,
      sessionsLogged: checkinStatus.sessionsLogged ?? 
                      checkin.sessionsLogged ?? 0,
      progressPercent: checkinStatus.progressPercent ?? 0,
      sessionsNeeded: checkinStatus.sessionsNeeded ?? 
                      Math.max(0, 3 - (checkinStatus.sessionsLogged ?? 0)),
    },

    interests: dashData.interests ?? [],

    goalScoreHistory: dashData.goalScoreHistory ?? [],

    userContext: dashData.userContext ?? {},

    refetchDashboard: dashboardQuery.refetch,
    refetchStatus: statusQuery.refetch,
    refetchCheckin: checkinQuery.refetch,
  }
}

