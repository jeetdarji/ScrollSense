import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import axios from '../lib/axios';
import useAuthStore from '../store/authStore';

export const useSettingsData = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { isAuthenticated, setUser, clearUser } = useAuthStore();

  // Primary settings query
  const { 
    data: settingsResponse, 
    isLoading: isLoadingSettings, 
    error: settingsError 
  } = useQuery({
    queryKey: ['user-settings'],
    queryFn: async () => {
      const { data } = await axios.get('/user/settings');
      return data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: isAuthenticated,
  });

  // Sync user to auth store when settings are fetched (onSuccess removed in TanStack Query v5)
  useEffect(() => {
    if (settingsResponse?.user) {
      setUser(settingsResponse.user);
    }
  }, [settingsResponse, setUser]);

  // Data vault query
  const { 
    data: dataVaultResponse, 
    isLoading: isLoadingDataVault 
  } = useQuery({
    queryKey: ['user-data-vault'],
    queryFn: async () => {
      const { data } = await axios.get('/user/data-vault');
      return data;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    enabled: isAuthenticated
  });

  // Mutations
  const { mutateAsync: saveAccountSettings, isPending: isSavingAccount } = useMutation({
    mutationFn: async (settingsData) => {
      const { data } = await axios.put('/user/settings', settingsData);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['user-settings'] });
      queryClient.invalidateQueries({ queryKey: ['youtube-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['progress-time-refund'] });
      
      if (data?.user) {
        setUser(data.user);
      }
    }
  });

  const { mutateAsync: saveNotificationPrefs, isPending: isSavingNotifications } = useMutation({
    mutationFn: async (prefsData) => {
      const { data } = await axios.put('/user/notifications', prefsData);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-settings'] });
    }
  });

  const { mutateAsync: deleteInstagramData, isPending: isDeletingInstagram } = useMutation({
    mutationFn: async () => {
      const { data } = await axios.delete('/user/instagram-data');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-settings'] });
      queryClient.invalidateQueries({ queryKey: ['youtube-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['progress-time-refund'] });
      queryClient.invalidateQueries({ queryKey: ['patterns-echo'] });
      
      localStorage.removeItem('scrollsense_instagram_processed');
      localStorage.removeItem('scrollsense_instagram_topics');
    }
  });

  const { mutateAsync: deleteAccount, isPending: isDeletingAccount } = useMutation({
    mutationFn: async () => {
      const { data } = await axios.delete('/user/account');
      return data;
    },
    onSuccess: () => {
      // Clear all scrollsense-related local storage
      const keysToKeep = [];
      Object.keys(localStorage)
        .filter(k => k.startsWith('scrollsense_'))
        .forEach(k => localStorage.removeItem(k));
      
      clearUser();
      navigate('/');
    }
  });

  const combinedLoading = isLoadingSettings || isSavingAccount || isSavingNotifications || isDeletingInstagram || isDeletingAccount;

  return {
    settings: settingsResponse?.user,
    isLoadingSettings,
    settingsError,
    
    dataVault: dataVaultResponse,
    isLoadingDataVault,
    
    saveAccountSettings,
    isSavingAccount,
    
    saveNotificationPrefs,
    isSavingNotifications,
    
    deleteInstagramData,
    isDeletingInstagram,
    
    deleteAccount,
    isDeletingAccount,
    
    combinedLoading
  };
};
