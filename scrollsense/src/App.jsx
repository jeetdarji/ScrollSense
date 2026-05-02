import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { lazy, Suspense, useEffect } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { initLenis, destroyLenis } from './lib/lenis'
import useAuthStore from './store/authStore'
import api from './lib/axios'
import ProtectedRoute from './components/shared/ProtectedRoute'

const LandingPage   = lazy(() => import('./pages/LandingPage.jsx'))
const DashboardPage = lazy(() => import('./pages/DashboardPage.jsx'))
const OnboardingPage= lazy(() => import('./pages/OnboardingPage.jsx'))
const PatternsPage  = lazy(() => import('./pages/PatternsPage.jsx'))
const ProgressPage  = lazy(() => import('./pages/ProgressPage.jsx'))
const CommunityPage = lazy(() => import('./pages/CommunityPage.jsx'))
const SettingsPage  = lazy(() => import('./pages/SettingsPage.jsx'))
const LoginPage     = lazy(() => import('./pages/LoginPage.jsx'))
const SignupPage    = lazy(() => import('./pages/SignupPage.jsx'))
const NotFoundPage  = lazy(() => import('./pages/NotFoundPage.jsx'))
const ExtensionPage = lazy(() => import('./pages/ExtensionPage.jsx'))

function PageLoader() {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#09090B',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <span style={{
        fontFamily: 'Space Grotesk, sans-serif',
        fontSize: '0.75rem',
        letterSpacing: '0.2em',
        textTransform: 'uppercase',
        color: '#3F3F46',
      }}>
        LOADING
      </span>
    </div>
  )
}

/**
 * Extension credential bridge helpers.
 * Write the current access token + API URL to localStorage so the
 * ScrollSense browser extension can authenticate its watch-time reports.
 * The extension's content script reads 'ss_ext_credentials' from this domain's
 * localStorage and forwards it to the extension background service worker.
 */
function _syncExtCredentials(token) {
  try {
    const payload = JSON.stringify({
      token,
      apiUrl: import.meta.env.VITE_API_URL,
    });
    localStorage.setItem('ss_ext_credentials', payload);
    // Dispatch custom event so the content script on this same tab picks it up
    // (window.addEventListener('storage') only fires in OTHER tabs, not this one)
    window.dispatchEvent(new CustomEvent('ss_credentials_updated'));
  } catch (_) {
    // localStorage may be unavailable in private browsing — silent failure is fine
  }
}

function _clearExtCredentials() {
  try {
    localStorage.removeItem('ss_ext_credentials');
    window.dispatchEvent(new CustomEvent('ss_credentials_cleared'));
  } catch (_) {}
}

function AppRoutes() {
  const { user, setUser, setAccessToken, clearUser, setLoading, isAuthenticated } = useAuthStore()

  useEffect(() => {
    const restoreSession = async () => {
      setLoading(true)
      try {
        // Call /auth/refresh — uses httpOnly cookie, no header needed
        // This gives us a fresh access token AND user object
        const res = await api.post('/auth/refresh')
        const { accessToken, user } = res.data
        setAccessToken(accessToken)
        setUser(user)
        // Bridge credentials to the browser extension (if installed).
        // The extension's content script reads this key from localStorage
        // to authenticate its watch-time reports to the backend.
        _syncExtCredentials(accessToken)
      } catch (err) {
        // Refresh failed — user not logged in or cookie expired
        clearUser()
        _clearExtCredentials()
      }
    }
    restoreSession()
  }, [])

  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={
        isAuthenticated
          ? <Navigate to={user?.onboardingComplete || localStorage.getItem('scrollsense_onboarded') === 'true' ? "/dashboard" : "/onboarding"} replace />
          : <LoginPage />
      } />
      <Route path="/signup" element={
        isAuthenticated
          ? <Navigate to={user?.onboardingComplete || localStorage.getItem('scrollsense_onboarded') === 'true' ? "/dashboard" : "/onboarding"} replace />
          : <SignupPage />
      } />

      <Route path="/onboarding" element={
        <ProtectedRoute><OnboardingPage /></ProtectedRoute>
      } />
      <Route path="/dashboard" element={
        <ProtectedRoute><DashboardPage /></ProtectedRoute>
      } />
      <Route path="/patterns" element={
        <ProtectedRoute><PatternsPage /></ProtectedRoute>
      } />
      <Route path="/progress" element={
        <ProtectedRoute><ProgressPage /></ProtectedRoute>
      } />
      <Route path="/community" element={
        <ProtectedRoute><CommunityPage /></ProtectedRoute>
      } />
      <Route path="/settings" element={
        <ProtectedRoute><SettingsPage /></ProtectedRoute>
      } />
      
      <Route path="/extension" element={<ExtensionPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

const queryClient = new QueryClient()

export default function App() {
  useEffect(() => {
    initLenis()
    return () => destroyLenis()
  }, [])

  return (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <Suspense fallback={<PageLoader />}>
          <AppRoutes />
        </Suspense>
      </QueryClientProvider>
    </BrowserRouter>
  )
}