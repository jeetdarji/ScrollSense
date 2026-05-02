import { useQuery, useQueryClient } from '@tanstack/react-query'
import api from '../lib/axios'
import useAuthStore from '../store/authStore'

export function useProgressData() {
  const queryClient = useQueryClient()
  const accessToken = useAuthStore(state => state.accessToken)

  const timeRefundQuery = useQuery({
    queryKey: ['progress-time-refund'],
    queryFn: async () => {
      const res = await api.get('/progress/time-refund')
      return res.data
    },
    staleTime: 2 * 60 * 1000,
    retry: 2,
    enabled: !!accessToken,
  })

  const trendsQuery = useQuery({
    queryKey: ['progress-trends'],
    queryFn: async () => {
      const res = await api.get('/progress/trends')
      return res.data
    },
    staleTime: 2 * 60 * 1000,
    retry: 2,
    enabled: !!accessToken,
  })

  const refetchAll = () => {
    queryClient.invalidateQueries({ queryKey: ['progress-time-refund'] })
    queryClient.invalidateQueries({ queryKey: ['progress-trends'] })
  }

  return {
    timeRefund: timeRefundQuery.data || null,
    timeRefundLoading: timeRefundQuery.isLoading,
    timeRefundError: timeRefundQuery.error,
    trends: trendsQuery.data || null,
    trendsLoading: trendsQuery.isLoading,
    trendsError: trendsQuery.error,
    isLoading: timeRefundQuery.isLoading || trendsQuery.isLoading,
    refetchAll,
  }
}
