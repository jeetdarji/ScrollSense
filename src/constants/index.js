export const ROUTES = {
  HOME:       '/',
  LOGIN:      '/login',
  SIGNUP:     '/signup',
  ONBOARDING: '/onboarding',
  DASHBOARD:  '/dashboard',
  PATTERNS:   '/patterns',
  PROGRESS:   '/progress',
  COMMUNITY:  '/community',
  SETTINGS:   '/settings',
}

export const DESIGN_TOKENS = {
  BACKGROUND:       '#09090B',
  FOREGROUND:       '#FAFAFA',
  MUTED:            '#27272A',
  MUTED_FOREGROUND: '#A1A1AA',
  ACCENT:           '#DFE104',
  ACCENT_FOREGROUND:'#000000',
  BORDER:           '#3F3F46',
}

export const INTENTION_CATEGORIES = [
  { id: 'boredom',       label: 'Boredom',              emoji: '😐' },
  { id: 'stress',        label: 'Stress / Escape',       emoji: '😰' },
  { id: 'specific',      label: 'Looking for something', emoji: '🔍' },
  { id: 'entertainment', label: 'Planned entertainment', emoji: '🎬' },
  { id: 'learning',      label: 'Want to learn',         emoji: '📚' },
]

export const CRAVING_CATEGORIES = [
  { id: 'boredom',   label: 'Boredom'   },
  { id: 'anxiety',   label: 'Anxiety'   },
  { id: 'habit',     label: 'Habit'     },
  { id: 'loneliness',label: 'Loneliness'},
]

export const MOOD_SCALE = [
  { value: 5, label: 'Great',          emoji: '😄' },
  { value: 4, label: 'Good',           emoji: '🙂' },
  { value: 3, label: 'Neutral',        emoji: '😐' },
  { value: 2, label: 'Meh',            emoji: '😕' },
  { value: 1, label: 'Worse than before', emoji: '😞' },
]

export const CONTENT_CATEGORIES = {
  CAREER:   { label: 'Career Relevant', color: '#DFE104' },
  INTEREST: { label: 'Genuine Interest', color: '#FAFAFA' },
  JUNK:     { label: 'Random / Junk',   color: '#3F3F46' },
}