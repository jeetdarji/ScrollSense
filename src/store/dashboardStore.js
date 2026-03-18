import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useDashboardStore = create(
  persist(
    (set, get) => ({
      todayIntention: {
        value: '',
        date: '',
        dismissed: false,
      },

      setTodayIntention: (value) => {
        const today = new Date().toISOString().split('T')[0];
        set({
          todayIntention: {
            value,
            date: today,
            dismissed: false,
          },
        });
      },

      resetTodayIntention: () => {
        set((state) => ({
          todayIntention: {
            ...state.todayIntention,
            value: '',
          },
        }));
      },

      dismissIntentionBanner: () => {
        set((state) => ({
          todayIntention: {
            ...state.todayIntention,
            dismissed: true,
          },
        }));
      },

      clearIntentionIfStale: () => {
        const today = new Date().toISOString().split('T')[0];
        const state = get();
        
        if (state.todayIntention.date !== today) {
          set({
            todayIntention: {
              value: '',
              date: '',
              dismissed: false,
            },
          });
        }
      },
    }),
    {
      name: 'scrollsense_daily_intention',
    }
  )
);
