import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Mail, ArrowLeft, Eye, EyeOff, AlertCircle } from 'lucide-react'
import useAuthStore from '../store/authStore'

export default function LoginPage() {
  const [step, setStep] = useState('method') // 'method' | 'email_form' | 'loading'
  const [formData, setFormData] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState({})
  const [showPassword, setShowPassword] = useState(false)
  const [loginError, setLoginError] = useState('')
  const [showForgotMsg, setShowForgotMsg] = useState(false)
  
  const navigate = useNavigate()
  const setUser = useAuthStore(state => state.setUser)

  const handleGoogleLogin = () => {
    window.location.href = `${import.meta.env.VITE_API_URL}/auth/google`
  }

  const handleEmailLogin = () => {
    const errs = {}
    if (!formData.email.includes('@')) errs.email = 'VALID EMAIL REQUIRED'
    if (!formData.password) errs.password = 'PASSWORD REQUIRED'
    
    setErrors(errs)
    if (Object.keys(errs).length > 0) return

    setStep('loading')
    setLoginError('')
    
    setTimeout(() => {
      const mockUser = {
        id: 'usr_' + formData.email.replace('@','_'),
        email: formData.email,
        name: formData.email.split('@')[0],
        authMethod: 'email',
      }
      localStorage.setItem('scrollsense_user', JSON.stringify(mockUser))
      setUser(mockUser)
      const onboardingDone = localStorage.getItem('scrollsense_onboarding')
      navigate(onboardingDone ? '/dashboard' : '/onboarding')
    }, 1000)
  }

  return (
    <div className="min-h-[100dvh] bg-[#09090B] flex font-space relative">
      <div className="hidden lg:flex lg:w-1/2 bg-[#09090B] border-r-2 border-[#3F3F46] flex-col justify-between p-12 relative overflow-hidden">
        <div>
          <Link to="/" className="font-bold uppercase tracking-tighter text-sm text-[#FAFAFA] hover:text-[#DFE104] transition-colors">
            SCROLLSENSE
          </Link>
        </div>
        
        <div className="flex-1 flex flex-col justify-center">
          <motion.div initial="hidden" animate="visible" variants={{
            hidden: { opacity: 0 },
            visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
          }}>
            <motion.h1 aria-hidden className="font-bold uppercase tracking-tighter leading-[0.85] text-[#27272A]" style={{ fontSize: 'clamp(4rem,8vw,8rem)' }} variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}>
              KNOW
            </motion.h1>
            <motion.h1 aria-hidden className="font-bold uppercase tracking-tighter leading-[0.85] text-[#27272A]" style={{ fontSize: 'clamp(4rem,8vw,8rem)' }} variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}>
              WHAT
            </motion.h1>
            <motion.h1 aria-hidden className="font-bold uppercase tracking-tighter leading-[0.85] text-[#DFE104]" style={{ fontSize: 'clamp(4rem,8vw,8rem)' }} variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}>
              YOU
            </motion.h1>
            <motion.h1 aria-hidden className="font-bold uppercase tracking-tighter leading-[0.85] text-[#27272A]" style={{ fontSize: 'clamp(4rem,8vw,8rem)' }} variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}>
              SCROLL.
            </motion.h1>
          </motion.div>
          
          <div className="mt-8 flex flex-col gap-4">
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-[#DFE104] flex-shrink-0 mt-1.5" />
              <span className="text-sm text-[#A1A1AA] leading-relaxed">Your patterns are waiting for you</span>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-[#DFE104] flex-shrink-0 mt-1.5" />
              <span className="text-sm text-[#A1A1AA] leading-relaxed">Pick up right where you left off</span>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-[#DFE104] flex-shrink-0 mt-1.5" />
              <span className="text-sm text-[#A1A1AA] leading-relaxed">Your data hasn't changed</span>
            </div>
          </div>
        </div>
        
        <div className="border-t border-[#3F3F46] pt-6 flex items-center">
          <span className="text-xs uppercase text-[#3F3F46]">
            NEW HERE?
          </span>
          <Link to="/signup" className="text-xs uppercase text-[#DFE104] hover:underline ml-2">
            CREATE AN ACCOUNT →
          </Link>
        </div>
      </div>

      <div className="w-full lg:w-1/2 flex flex-col px-6 sm:px-8 md:px-12 py-6 sm:py-12 min-h-[100dvh] relative overflow-y-auto">
        <div className="w-full max-w-md mx-auto my-auto">
          {step === 'method' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="flex flex-wrap gap-3 items-center justify-between mb-8 sm:mb-10 w-full">
                <Link to="/" className="lg:hidden font-bold uppercase tracking-tighter text-sm text-[#FAFAFA] hover:text-[#DFE104] transition-colors leading-none">
                  SCROLLSENSE
                </Link>
                <div className="text-[10px] sm:text-xs uppercase text-[#3F3F46] ml-auto tracking-widest leading-none mt-1 sm:mt-0">
                  <span className="hidden sm:inline">NEW TO SCROLLSENSE?</span>
                  <span className="sm:hidden">NEW HERE?</span>
                  <Link to="/signup" className="text-[#DFE104] hover:underline ml-2">CREATE ACCOUNT</Link>
                </div>
              </div>

              <h2 className="text-2xl md:text-3xl font-bold uppercase tracking-tighter text-[#FAFAFA] mb-1">WELCOME BACK</h2>
              <p className="text-sm text-[#3F3F46] uppercase tracking-wider mb-8">Good to see you again.</p>

              <button onClick={handleGoogleLogin} className="bg-[#FAFAFA] text-black font-bold h-14 w-full flex items-center justify-center gap-3 uppercase tracking-tighter text-sm rounded-none hover:scale-105 active:scale-95 transition-all duration-200">
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                CONTINUE WITH GOOGLE
              </button>

              <div className="flex items-center gap-4 my-6">
                <div className="border-t border-[#3F3F46] flex-1" />
                <span className="text-[10px] uppercase text-[#3F3F46]">OR</span>
                <div className="border-t border-[#3F3F46] flex-1" />
              </div>

              <button onClick={() => setStep('email_form')} className="border-2 border-[#3F3F46] bg-transparent text-[#FAFAFA] h-14 w-full flex items-center justify-center gap-3 uppercase tracking-tighter text-sm rounded-none hover:bg-[#27272A]/50 transition-all">
                <Mail size={16} color="#A1A1AA" />
                CONTINUE WITH EMAIL
              </button>
            </motion.div>
          )}

          {step === 'email_form' && (
            <motion.div initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }}>
              <button onClick={() => { setStep('method'); setShowForgotMsg(false); setLoginError('') }} className="flex items-center gap-2 cursor-pointer w-fit mb-8 text-[#3F3F46] hover:text-[#A1A1AA] transition-colors group">
                <ArrowLeft size={14} className="group-hover:text-[#A1A1AA] transition-colors" color="#3F3F46" />
                <span className="text-xs uppercase tracking-widest group-hover:text-[#A1A1AA] transition-colors block mt-[2px]">BACK</span>
              </button>

              <h2 className="text-2xl font-bold uppercase tracking-tighter text-[#FAFAFA] mb-1">LOG IN WITH EMAIL</h2>
              <p className="text-sm text-[#3F3F46] uppercase tracking-wider mb-8">Enter your credentials below.</p>

              <div className="flex flex-col gap-6">
                <div>
                  <label className="text-[10px] uppercase tracking-widest text-[#A1A1AA] mb-2 block">EMAIL ADDRESS</label>
                  <input type="email" placeholder="YOUR@EMAIL.COM" value={formData.email} onChange={e => { setFormData(prev => ({ ...prev, email: e.target.value })); if (errors.email) setErrors(prev => ({ ...prev, email: '' })) }} className="bg-transparent border-b-2 border-[#3F3F46] focus:border-[#DFE104] text-[#FAFAFA] text-base w-full pb-3 outline-none transition-colors duration-200 placeholder:text-[#3F3F46] uppercase tracking-wider rounded-none" />
                  {errors.email && <p className="text-[10px] text-red-500 uppercase mt-1">{errors.email}</p>}
                </div>

                <div>
                  <label className="text-[10px] uppercase tracking-widest text-[#A1A1AA] mb-2 block">PASSWORD</label>
                  <div className="relative">
                    <input type={showPassword ? 'text' : 'password'} placeholder="••••••••" value={formData.password} onChange={e => { setFormData(prev => ({ ...prev, password: e.target.value })); if (errors.password) setErrors(prev => ({ ...prev, password: '' })) }} className="bg-transparent border-b-2 border-[#3F3F46] focus:border-[#DFE104] text-[#FAFAFA] text-base w-full pb-3 pr-10 outline-none transition-colors duration-200 placeholder:text-[#3F3F46] uppercase tracking-wider rounded-none" />
                    <button onClick={() => setShowPassword(!showPassword)} className="absolute right-0 bottom-2 p-1 cursor-pointer group flex items-center justify-center h-[26px]" type="button">
                      {showPassword ? <EyeOff size={16} className="text-[#3F3F46] group-hover:text-[#A1A1AA]" /> : <Eye size={16} className="text-[#3F3F46] group-hover:text-[#A1A1AA]" />}
                    </button>
                  </div>
                  {errors.password && <p className="text-[10px] text-red-500 uppercase mt-1">{errors.password}</p>}
                  
                  <div className="text-right mt-1">
                    <span onClick={() => setShowForgotMsg(true)} className="text-[10px] uppercase text-[#3F3F46] hover:text-[#A1A1AA] cursor-pointer transition-colors block">
                      FORGOT PASSWORD?
                    </span>
                    {showForgotMsg && (
                      <p className="text-[10px] text-[#A1A1AA] uppercase mt-2">Password reset is not available in demo mode.</p>
                    )}
                  </div>
                </div>

                {loginError && (
                  <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-red-900/20 border border-red-900/50 px-4 py-3 flex items-center gap-3">
                    <AlertCircle size={14} className="text-red-400 flex-shrink-0" />
                    <span className="text-xs text-red-400 uppercase tracking-wider">{loginError}</span>
                  </motion.div>
                )}

                <button onClick={handleEmailLogin} className="bg-[#DFE104] text-black font-bold h-14 w-full uppercase tracking-tighter text-sm rounded-none hover:scale-105 active:scale-95 transition-all mt-4">
                  LOG IN TO SCROLLSENSE
                </button>
              </div>
            </motion.div>
          )}

          {step === 'loading' && (
            <div className="py-16 text-center flex flex-col items-center justify-center animate-in fade-in duration-300">
              <div className="w-full max-w-[200px] h-[2px] bg-[#3F3F46] overflow-hidden relative rounded-none">
                <motion.div className="w-1/3 h-full bg-[#DFE104] absolute top-0 left-0" animate={{ x: ['-100%', '300%'] }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} />
              </div>
              <p className="text-xs uppercase tracking-widest text-[#A1A1AA] mt-6">LOGGING YOU IN...</p>
              <p className="text-[10px] uppercase text-[#3F3F46] mt-2">One moment.</p>
            </div>
          )}
        </div>
      </div>
      
      <div className="absolute bottom-6 right-6 hidden lg:block">
        <Link to="/" className="text-[10px] uppercase tracking-widest text-[#27272A] hover:text-[#3F3F46] transition-colors">
          ← BACK TO SCROLLSENSE.APP
        </Link>
      </div>
    </div>
  )
}
