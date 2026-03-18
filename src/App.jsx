import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { lazy, Suspense, useEffect } from 'react'
import { initLenis, destroyLenis } from './lib/lenis'

const LandingPage   = lazy(() => import('./pages/LandingPage.jsx'))
const DashboardPage = lazy(() => import('./pages/DashboardPage.jsx'))
const OnboardingPage= lazy(() => import('./pages/OnboardingPage.jsx'))
const PatternsPage  = lazy(() => import('./pages/PatternsPage.jsx'))
const ProgressPage  = lazy(() => import('./pages/ProgressPage.jsx'))
const CommunityPage = lazy(() => import('./pages/CommunityPage.jsx'))
const SettingsPage  = lazy(() => import('./pages/SettingsPage.jsx'))
const LoginPage     = lazy(() => import('./pages/LoginPage.jsx'))
const SignupPage     = lazy(() => import('./pages/SignupPage.jsx'))
const NotFoundPage  = lazy(() => import('./pages/NotFoundPage.jsx'))

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

export default function App() {
  useEffect(() => {
    initLenis()
    return () => destroyLenis()
  }, [])

  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/"           element={<LandingPage />} />
          <Route path="/login"      element={<LoginPage />} />
          <Route path="/signup"     element={<SignupPage />} />
          <Route path="/onboarding" element={<OnboardingPage />} />
          <Route path="/dashboard"  element={<DashboardPage />} />
          <Route path="/patterns"   element={<PatternsPage />} />
          <Route path="/progress"   element={<ProgressPage />} />
          <Route path="/community"  element={<CommunityPage />} />
          <Route path="/settings"   element={<SettingsPage />} />
          <Route path="*"           element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}