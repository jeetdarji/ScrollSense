import { useQuery, useMutation } from '@tanstack/react-query'
import api from '../lib/axios'
import useAuthStore from '../store/authStore'

export function usePatternsData() {
  const accessToken = useAuthStore(state => state.accessToken)
  const enabled = !!accessToken

  const trigger = useQuery({
    queryKey: ['triggerPatterns'],
    queryFn: async () => {
      const res = await api.get('/patterns/trigger-detector')
      return res.data
    },
    enabled,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
  })

  const echo = useQuery({
    queryKey: ['echoChamber'],
    queryFn: async () => {
      const res = await api.get('/patterns/echo-chamber')
      return res.data
    },
    enabled,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
  })

  const nudge = useQuery({
    queryKey: ['habitNudge'],
    queryFn: async () => {
      const res = await api.get('/patterns/habit-nudge')
      return res.data
    },
    enabled,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: true,
  })

  const crossPlatform = useQuery({
    queryKey: ['patterns-cross-platform'],
    queryFn: async () => {
      const res = await api.get('/patterns/cross-platform')
      return res.data
    },
    enabled,
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: true,
  })

  const nudgeFeedback = useMutation({
    mutationFn: async ({ nudgeId, action }) => {
      const res = await api.post('/patterns/habit-nudge/feedback', { nudgeId, action })
      return res.data
    },
  })

  return {
    triggerPatterns: trigger,
    echoChamber: echo,
    habitNudge: nudge,
    crossPlatform,
    nudgeFeedback,
  }
}

export default usePatternsData
