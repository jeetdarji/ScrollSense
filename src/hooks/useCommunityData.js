import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/axios';
import useAuthStore from '../store/authStore';

/**
 * useCommunityData — React Query hook for all community API interactions.
 *
 * Provides queries for group data, messages, and recommendations,
 * plus mutations for join, leave, submit, and messaging.
 */
export function useCommunityData() {
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuthStore();

  // ── Primary query: user's current group + performance ─────────────────
  const myGroupQuery = useQuery({
    queryKey: ['community-my-group'],
    queryFn: async () => {
      const { data } = await api.get('/community/my-group');
      return data;
    },
    staleTime: 60 * 1000,
    enabled: isAuthenticated,
    refetchOnWindowFocus: true,
    retry: 2,
  });

  const hasMembership = myGroupQuery.data?.hasMembership === true;

  // ── All groups listing ────────────────────────────────────────────────
  const groupsQuery = useQuery({
    queryKey: ['community-groups'],
    queryFn: async () => {
      const { data } = await api.get('/community/groups');
      return data;
    },
    staleTime: 2 * 60 * 1000,
    enabled: isAuthenticated,
    retry: 2,
  });

  // ── Personalized recommendations ─────────────────────────────────────
  const recommendationsQuery = useQuery({
    queryKey: ['community-recommendations'],
    queryFn: async () => {
      const { data } = await api.get('/community/recommendations');
      return data;
    },
    staleTime: 5 * 60 * 1000,
    enabled: isAuthenticated && !hasMembership,
    retry: 1,
  });

  // ── Group chat messages ──────────────────────────────────────────────
  const groupId = myGroupQuery.data?.group?.id;

  const messagesQuery = useQuery({
    queryKey: ['community-messages', groupId],
    queryFn: async () => {
      const { data } = await api.get(`/community/messages/${groupId}`);
      return data;
    },
    staleTime: 30 * 1000,
    enabled: isAuthenticated && hasMembership && !!groupId,
    refetchInterval: 60 * 1000,
    retry: 1,
  });

  // ── Mutations ─────────────────────────────────────────────────────────

  const joinGroupMutation = useMutation({
    mutationFn: async (targetGroupId) => {
      const { data } = await api.post(`/community/join/${targetGroupId}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community-my-group'] });
      queryClient.invalidateQueries({ queryKey: ['community-groups'] });
      queryClient.invalidateQueries({ queryKey: ['community-recommendations'] });
    },
  });

  const submitWeekMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/community/submit-week');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community-my-group'] });
    },
  });

  const leaveGroupMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/community/leave');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community-my-group'] });
      queryClient.invalidateQueries({ queryKey: ['community-groups'] });
      queryClient.invalidateQueries({ queryKey: ['community-recommendations'] });
      queryClient.invalidateQueries({ queryKey: ['community-messages'] });
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (content) => {
      const { data } = await api.post(`/community/messages/${groupId}`, { content });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community-messages', groupId] });
    },
  });

  const deleteMessageMutation = useMutation({
    mutationFn: async (messageId) => {
      const { data } = await api.delete(`/community/messages/${messageId}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community-messages', groupId] });
    },
  });

  const requestNewGroupMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/community/request-new-group');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community-my-group'] });
      queryClient.invalidateQueries({ queryKey: ['community-groups'] });
      queryClient.invalidateQueries({ queryKey: ['community-recommendations'] });
      queryClient.invalidateQueries({ queryKey: ['community-messages'] });
    },
  });

  return {
    // ── Query data ──
    myGroup: myGroupQuery.data,
    groups: groupsQuery.data,
    recommendations: recommendationsQuery.data,
    messages: messagesQuery.data,
    hasMembership,

    // ── Loading states ──
    isLoadingMyGroup: myGroupQuery.isLoading,
    isLoadingGroups: groupsQuery.isLoading,
    isLoadingRecommendations: recommendationsQuery.isLoading,
    isLoadingMessages: messagesQuery.isLoading,

    // ── Error states ──
    myGroupError: myGroupQuery.error,
    groupsError: groupsQuery.error,
    recommendationsError: recommendationsQuery.error,
    messagesError: messagesQuery.error,

    // ── Mutations ──
    joinGroup: joinGroupMutation.mutateAsync,
    submitWeek: submitWeekMutation.mutateAsync,
    leaveGroup: leaveGroupMutation.mutateAsync,
    sendMessage: sendMessageMutation.mutateAsync,
    deleteMessage: deleteMessageMutation.mutateAsync,
    requestNewGroup: requestNewGroupMutation.mutateAsync,

    // ── Mutation loading states ──
    isJoining: joinGroupMutation.isPending,
    isSubmitting: submitWeekMutation.isPending,
    isLeaving: leaveGroupMutation.isPending,
    isSending: sendMessageMutation.isPending,
    isRequestingNewGroup: requestNewGroupMutation.isPending,

    // ── Refetch functions ──
    refetchMyGroup: myGroupQuery.refetch,
    refetchMessages: messagesQuery.refetch,
  };
}
