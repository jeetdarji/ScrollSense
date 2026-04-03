import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/axios'
import useAuthStore from '../store/authStore'

export function useCravingData() {
  const accessToken = useAuthStore(state => state.accessToken)
  const queryClient = useQueryClient()

  // Recent cravings list — powers idle state list in CravingLog
  const recentQuery = useQuery({
    queryKey: ['cravings-recent'],
    queryFn: async () => {
      const res = await api.get('/cravings/recent')
      return res.data
    },
    staleTime: 60000,
    enabled: !!accessToken,
  })

  // Craving stats — resistance rate etc.
  const statsQuery = useQuery({
    queryKey: ['cravings-stats'],
    queryFn: async () => {
      const res = await api.get('/cravings/stats')
      return res.data
    },
    staleTime: 2 * 60 * 1000,
    enabled: !!accessToken,
  })

  // Log craving mutation
  const logCravingMutation = useMutation({
    mutationFn: async (cravingData) => {
      // cravingData: { trigger, outcome, timestamp }
      // NOTE: notes field intentionally excluded — stays in localStorage
      const { trigger, outcome, timestamp } = cravingData
      const res = await api.post('/cravings', { trigger, outcome, timestamp })
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cravings-recent'] })
      queryClient.invalidateQueries({ queryKey: ['cravings-stats'] })
    },
  })

  const recent = recentQuery.data || {}
  const stats = statsQuery.data || {}

  return {
    // Recent list for idle state
    recentCravings: recent.cravings ?? [],
    totalCravings: recent.total ?? 0,

    // Stats
    resistanceRate: stats.resistanceRate ?? null,
    mostCommonTrigger: stats.mostCommonTrigger ?? null,
    thisWeekCount: stats.thisWeek ?? 0,
    outcomes: stats.outcomes ?? { resisted: 0, partial: 0, gaveIn: 0 },

    // Loading
    isLoadingRecent: recentQuery.isLoading,

    // Mutation
    logCraving: logCravingMutation.mutateAsync,
    isLogging: logCravingMutation.isPending,
    logError: logCravingMutation.error,
  }
}
