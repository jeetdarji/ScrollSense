import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import api from '../lib/axios'
import useAuthStore from '../store/authStore'

// Central invalidation helper — refreshes ALL data-driven UI after a sync
const SYNC_DEPENDENT_KEYS = [
  ['youtube-dashboard'],
  ['digest-checkin'],
  ['digest-status'],
  ['habitNudge'],
  ['triggerPatterns'],
  ['echoChamber'],
  ['progress-time-refund'],
  ['progress-trends'],
  ['patterns-cross-platform'],
];

export function useYouTubeData() {
  const queryClient = useQueryClient()
  const accessToken = useAuthStore(state => state.accessToken)
  const prevClassifyingRef = useRef(false)
  // Track the lastSyncAt seen from the status endpoint to detect background syncs
  const lastKnownSyncAtRef = useRef(null)

  const dashboardQuery = useQuery({
    queryKey: ['youtube-dashboard'],
    queryFn: async () => {
      const res = await api.get('/insights/dashboard')
      return res.data
    },
    staleTime: 0,                // always re-fetch — data changes after every sync
    refetchOnWindowFocus: true,  // re-fetch when tab regains focus
    refetchOnMount: true,        // re-fetch every time the dashboard mounts
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
      // Poll every 5s when classifying, every 5 min otherwise to detect background syncs
      return query.state.data?.isClassifying ? 5000 : 5 * 60 * 1000
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

  const isClassifying = status.isClassifying ?? false;

  // 1. Detect classification-just-finished transition (user was online during job)
  useEffect(() => {
    if (prevClassifyingRef.current && !isClassifying) {
      SYNC_DEPENDENT_KEYS.forEach(key =>
        queryClient.invalidateQueries({ queryKey: key })
      );
    }
    prevClassifyingRef.current = isClassifying;
  }, [isClassifying, queryClient]);

  // 2. Detect background sync (scheduler ran while user was away, or in a different tab).
  //    When lastSyncAt changes to a *newer* timestamp, the DB has fresh data → refresh all.
  useEffect(() => {
    const currentSyncAt = status.lastSyncAt;
    if (
      currentSyncAt &&
      lastKnownSyncAtRef.current &&
      currentSyncAt !== lastKnownSyncAtRef.current
    ) {
      SYNC_DEPENDENT_KEYS.forEach(key =>
        queryClient.invalidateQueries({ queryKey: key })
      );
    }
    if (currentSyncAt) {
      lastKnownSyncAtRef.current = currentSyncAt;
    }
  }, [status.lastSyncAt, queryClient]);

  // 3. Auto-trigger sync when server signals data is >8h stale (syncNeeded flag).
  //    Fire-and-forget so it doesn't block UI; status polling will detect when it starts.
  useEffect(() => {
    if (status.isConnected && status.syncNeeded && !isClassifying && accessToken) {
      api.post('/youtube/sync').catch(() => {});
    }
  }, [status.isConnected, status.syncNeeded, isClassifying, accessToken]);

  return {
    isConnected: status.isConnected ?? dashData.isConnected ?? false,
    isLoading,
    isClassifying: status.isClassifying ?? false,
    classificationProgress: status.classificationProgress ?? 0,
    onboardingRequired: dashData.onboardingRequired ?? false,
    instagramUploaded: dashData.instagramUploaded ?? false,

    // Data freshness and sync metadata
    lastSyncAt: status.lastSyncAt ?? null,
    dataFreshness: status.dataFreshness ?? 'never_synced',
    syncNeeded: status.syncNeeded ?? false,
    hasClassificationData: status.hasClassificationData ?? false,
    totalVideosClassified: status.totalVideosClassified ?? 0,
    weeksOfData: status.weeksOfData ?? 0,

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

    // Platform metadata
    instagramDataAvailable: dashData.instagramDataAvailable ?? false,
    platformsIncluded: dashData.platformsIncluded ?? ['youtube'],
    weeklyPlatformBreakdown: dashData.weeklyPlatformBreakdown ?? { youtubeMinutes: 0, instagramMinutes: 0 },

    cycleInfo: dashData.cycleInfo ?? { cycleNumber: 1, weekInCycle: 1, isNewCycle: false, totalWeeksEver: 0 },

    refetchDashboard: dashboardQuery.refetch,
    refetchStatus: statusQuery.refetch,
    refetchCheckin: checkinQuery.refetch,
  }
}

