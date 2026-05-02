import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/axios';
import useAuthStore from '../store/authStore';

export function useCommunityData() {
  const accessToken = useAuthStore(state => state.accessToken);
  const queryClient = useQueryClient();

  const myGroupQuery = useQuery({
    queryKey: ['community', 'my-group'],
    queryFn: async () => {
      const res = await api.get('/community/my-group');
      return res.data;
    },
    staleTime: 60 * 1000,
    enabled: !!accessToken,
  });

  const allGroupsQuery = useQuery({
    queryKey: ['community', 'all-groups'],
    queryFn: async () => {
      const res = await api.get('/community/groups');
      return res.data;
    },
    staleTime: 60 * 1000,
    enabled: !!accessToken && !myGroupQuery.data?.hasMembership, // Only fetch all groups if not in one
  });

  const joinGroupMutation = useMutation({
    mutationFn: async (groupId) => {
      const res = await api.post(`/community/join/${groupId}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community'] });
    }
  });

  const submitWeekMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/community/submit-week');
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community'] });
    }
  });

  const leaveGroupMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/community/leave');
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community'] });
    }
  });

  const addReactionMutation = useMutation({
    mutationFn: async ({ messageId, reaction, action }) => {
      const res = await api.post(`/community/react/${messageId}`, { reaction, action });
      return res.data;
    },
  });

  const deleteMessageMutation = useMutation({
    mutationFn: async (messageId) => {
      const res = await api.delete(`/community/messages/${messageId}`);
      return res.data;
    },
  });

  return {
    myGroupData: myGroupQuery.data,
    isLoadingMyGroup: myGroupQuery.isLoading,
    
    allGroupsData: allGroupsQuery.data,
    isLoadingAllGroups: allGroupsQuery.isLoading,

    joinGroup: joinGroupMutation.mutateAsync,
    isJoining: joinGroupMutation.isPending,

    submitWeek: submitWeekMutation.mutateAsync,
    isSubmitting: submitWeekMutation.isPending,

    leaveGroup: leaveGroupMutation.mutateAsync,
    isLeaving: leaveGroupMutation.isPending,

    addReaction: addReactionMutation.mutateAsync,
    deleteMessage: deleteMessageMutation.mutateAsync,
  };
}

