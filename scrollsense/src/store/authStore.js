import { create } from 'zustand'

const useAuthStore = create((set) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isLoading: true,

  setUser: (user) => set({ 
    user,
    isAuthenticated: !!user,
    isLoading: false
  }),

  setAccessToken: (token) => set({ accessToken: token }),

  clearUser: () => {
    set({ user: null, accessToken: null, isAuthenticated: false, isLoading: false })
  },

  setLoading: (isLoading) => set({ isLoading }),
}))

export default useAuthStore