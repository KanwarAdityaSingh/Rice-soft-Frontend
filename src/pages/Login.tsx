import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { Lock, AlertCircle, TrendingUp, Shield, Zap } from 'lucide-react'
import { apiService, ApiError } from '../services/api'

export default function LoginPage() {
  const { login, loginWithOtp, isLoading, error } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [localError, setLocalError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'password' | 'otp'>('password')
  const [otpStep, setOtpStep] = useState<'phone' | 'verify'>('phone')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [otp, setOtp] = useState('')
  const [otpError, setOtpError] = useState<string | null>(null)
  const [otpSent, setOtpSent] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const [canResend, setCanResend] = useState(false)
  const [attemptsRemaining, setAttemptsRemaining] = useState(5)
  const [isRequestingOtp, setIsRequestingOtp] = useState(false)
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLocalError(null)
    
    try {
      await login(username, password)
      navigate('/')
    } catch (error) {
      // Error is already handled by AuthProvider
      setLocalError('Login failed. Please check your credentials.')
    }
  }

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown((s) => s - 1), 1000)
      setCanResend(false)
      return () => clearTimeout(timer)
    }
    setCanResend(otpSent && otpStep === 'verify')
  }, [resendCooldown, otpSent, otpStep])

  function handlePhoneChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value.replace(/\D/g, '').slice(0, 10)
    setPhoneNumber(value)
    setOtpError(null)
  }

  async function handleRequestOtp(e?: React.FormEvent) {
    if (e) e.preventDefault()
    const normalized = phoneNumber.replace(/\D/g, '')
    if (normalized.length !== 10) {
      setOtpError('Please enter a valid 10-digit phone number')
      return
    }
    setIsRequestingOtp(true)
    setOtpError(null)
    try {
      await apiService.requestOtp(normalized)
      setOtpSent(true)
      setOtpStep('verify')
      setResendCooldown(45)
      setAttemptsRemaining(5)
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 429) {
          setOtpError('Too many requests. Please wait a bit before retrying.')
        } else if (err.status === 400) {
          setOtpError('Please enter a valid 10-digit phone number')
        } else {
          setOtpError(err.message || 'Unable to send OTP. Please try again.')
        }
      } else {
        setOtpError('Unable to send OTP. Please check your connection.')
      }
    } finally {
      setIsRequestingOtp(false)
    }
  }

  function handleOtpChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6)
    setOtp(value)
    setOtpError(null)
  }

  async function handleVerifyOtp(e?: React.FormEvent) {
    if (e) e.preventDefault()
    const normalizedOtp = otp.replace(/\D/g, '')
    const normalizedPhone = phoneNumber.replace(/\D/g, '')
    if (normalizedOtp.length !== 6) {
      setOtpError('Please enter a valid 6-digit OTP')
      return
    }
    if (normalizedPhone.length !== 10) {
      setOtpError('Please enter a valid 10-digit phone number')
      setOtpStep('phone')
      return
    }
    setIsVerifyingOtp(true)
    setOtpError(null)
    try {
      await loginWithOtp(normalizedPhone, normalizedOtp)
      setOtp('')
      setPhoneNumber('')
      navigate('/')
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 401) {
          const apiMsg: string | undefined = (err as any)?.data?.error
          if (apiMsg?.toLowerCase().includes('expired')) {
            setOtpError('OTP has expired. Please request a new one.')
          } else if (apiMsg?.toLowerCase().includes('too many')) {
            setOtpError('Too many failed attempts. Please request a new OTP.')
            setAttemptsRemaining(0)
          } else {
            setAttemptsRemaining((prev) => {
              const next = Math.max(prev - 1, 0)
              if (next === 0) {
                setOtpError('Too many failed attempts. Please request a new OTP.')
              } else {
                setOtpError(`Invalid OTP. Please try again. (${next} attempts remaining)`)
              }
              return next
            })
            setOtp('')
          }
        } else if (err.status === 429) {
          setOtpError('Too many verification attempts. Please wait a bit and try again.')
        } else if (err.status === 400) {
          setOtpError('Please enter a valid 6-digit OTP')
        } else {
          setOtpError(err.message || 'Unable to verify OTP. Please try again.')
        }
      } else {
        setOtpError('Unable to verify OTP. Please check your connection.')
      }
    } finally {
      setIsVerifyingOtp(false)
    }
  }

  async function handleResend() {
    if (!canResend) return
    setOtp('')
    await handleRequestOtp()
  }

  function resetOtpFlow() {
    setOtp('')
    setOtpError(null)
    setOtpSent(false)
    setOtpStep('phone')
    setResendCooldown(0)
    setCanResend(false)
    setAttemptsRemaining(5)
  }

  function switchTab(tab: 'password' | 'otp') {
    setActiveTab(tab)
    setLocalError(null)
    resetOtpFlow()
  }

  return (
    <div className="relative isolate mx-auto grid min-h-[calc(100vh-4rem)] w-full max-w-6xl grid-cols-1 items-center gap-6 sm:gap-8 px-4 sm:px-6 py-8 sm:py-10 md:py-16 lg:grid-cols-2">
      <div className="relative hidden h-full flex-col justify-center md:flex lg:flex">
        {/* Enhanced background with multiple gradient layers */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 rounded-3xl bg-luxury-gradient blur-3xl opacity-60" />
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-primary/20 via-transparent to-accent/20 blur-2xl" />
          <div className="absolute -top-20 -left-20 h-40 w-40 rounded-full bg-primary/10 blur-xl" />
          <div className="absolute -bottom-20 -right-20 h-40 w-40 rounded-full bg-accent/10 blur-xl" />
        </div>
        
        <div className="relative space-y-8">

          
          {/* Enhanced heading with gradient text */}
          <div className="space-y-3 sm:space-y-4">
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight">
              <span className="text-gradient bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
                Rice Trading
              </span>
              <br />
              <span className="text-foreground">Management</span>
            </h1>
            
            {/* Enhanced description with better typography */}
            <div className="space-y-4 max-w-lg">
              <p className="text-xl text-muted-foreground leading-relaxed">
                Log in to manage <span className="text-primary font-semibold">saudas</span>, 
                <span className="text-primary font-semibold"> lots</span>, 
                <span className="text-primary font-semibold"> purchases</span>, 
                <span className="text-primary font-semibold"> inventory</span> and more with an 
                experience crafted for <span className="text-gradient font-semibold">focus and speed</span>.
              </p>
              
              {/* Feature highlights */}
              <div className="grid grid-cols-1 gap-3 pt-4">
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                    <TrendingUp className="h-4 w-4 text-primary" />
                  </div>
                  <span>Real-time trading analytics and insights</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10">
                    <Shield className="h-4 w-4 text-accent" />
                  </div>
                  <span>Secure inventory and transaction management</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                    <Zap className="h-4 w-4 text-primary" />
                  </div>
                  <span>Lightning-fast operations and reporting</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="glass relative mx-auto w-full max-w-md rounded-2xl sm:rounded-3xl p-5 sm:p-6 md:p-8 shadow-2xl border border-white/10">
        {/* Enhanced header with gradient background */}
        <div className="mb-6 sm:mb-8 text-center">
          <div className="mx-auto mb-3 sm:mb-4 grid h-14 w-14 sm:h-16 sm:w-16 place-items-center rounded-xl sm:rounded-2xl bg-gradient-to-br from-primary to-accent shadow-lg">
            <Lock className="h-7 w-7 sm:h-8 sm:w-8 text-white" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-gradient mb-1 sm:mb-2">Welcome Back</h2>
          <p className="text-sm sm:text-base text-muted-foreground">Sign in to access your trading dashboard</p>
        </div>
        <div className="mb-4 grid grid-cols-2 gap-1 rounded-xl bg-muted p-1">
          <button
            type="button"
            onClick={() => switchTab('password')}
            className={`rounded-lg py-2 text-sm font-semibold transition ${activeTab === 'password' ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
          >
            Password
          </button>
          <button
            type="button"
            onClick={() => switchTab('otp')}
            className={`rounded-lg py-2 text-sm font-semibold transition ${activeTab === 'otp' ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
          >
            OTP
          </button>
        </div>

        {activeTab === 'password' ? (
          <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
            {(error || localError) && (
              <div className="flex items-center gap-2 sm:gap-3 rounded-lg sm:rounded-xl bg-destructive/10 border border-destructive/20 p-3 sm:p-4 text-xs sm:text-sm text-destructive">
                <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                <span>{error || localError}</span>
              </div>
            )}
            
            <div className="space-y-2 sm:space-y-3">
              <label htmlFor="username" className="text-xs sm:text-sm font-semibold text-foreground">Username</label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-lg sm:rounded-xl border border-border bg-background/80 px-3 sm:px-4 py-2.5 sm:py-3 text-sm outline-none ring-0 transition-all duration-200 focus:border-primary focus:ring-2 focus:ring-primary/20 hover:border-primary/50"
                placeholder="Enter your username"
                required
                disabled={isLoading}
              />
            </div>
            
            <div className="space-y-2 sm:space-y-3">
              <label htmlFor="password" className="text-xs sm:text-sm font-semibold text-foreground">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg sm:rounded-xl border border-border bg-background/80 px-3 sm:px-4 py-2.5 sm:py-3 text-sm outline-none ring-0 transition-all duration-200 focus:border-primary focus:ring-2 focus:ring-primary/20 hover:border-primary/50"
                placeholder="Enter your password"
                required
                disabled={isLoading}
              />
            </div>
            
            <button 
              className="btn-primary w-full rounded-lg sm:rounded-xl py-2.5 sm:py-3 text-sm font-semibold shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5" 
              disabled={isLoading}
              type="submit"
            >
              {isLoading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"></div>
                  Signing in...
                </div>
              ) : (
                'Sign in to Dashboard'
              )}
            </button>
          </form>
        ) : (
          <div className="space-y-5 sm:space-y-6">
            {otpError && (
              <div className="flex items-center gap-2 sm:gap-3 rounded-lg sm:rounded-xl bg-destructive/10 border border-destructive/20 p-3 sm:p-4 text-xs sm:text-sm text-destructive">
                <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                <span>{otpError}</span>
              </div>
            )}
            {otpSent && (
              <div className="rounded-lg sm:rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3 sm:p-4 text-xs sm:text-sm text-emerald-600">
                OTP sent to your phone if the number exists.
              </div>
            )}

            {otpStep === 'phone' ? (
              <form onSubmit={handleRequestOtp} className="space-y-4">
                <div className="space-y-2 sm:space-y-3">
                  <label htmlFor="phone" className="text-xs sm:text-sm font-semibold text-foreground">Phone number</label>
                  <input
                    id="phone"
                    type="tel"
                    value={phoneNumber}
                    onChange={handlePhoneChange}
                    placeholder="Enter 10-digit phone number"
                    maxLength={10}
                    className="w-full rounded-lg sm:rounded-xl border border-border bg-background/80 px-3 sm:px-4 py-2.5 sm:py-3 text-sm outline-none ring-0 transition-all duration-200 focus:border-primary focus:ring-2 focus:ring-primary/20 hover:border-primary/50"
                    disabled={isRequestingOtp}
                  />
                </div>
                <button
                  type="submit"
                  disabled={isRequestingOtp || phoneNumber.replace(/\D/g, '').length !== 10}
                  className="btn-primary w-full rounded-lg sm:rounded-xl py-2.5 sm:py-3 text-sm font-semibold shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5 disabled:opacity-50"
                >
                  {isRequestingOtp ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"></div>
                      Sending...
                    </div>
                  ) : (
                    'Send OTP'
                  )}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div className="space-y-2 sm:space-y-3">
                  <label htmlFor="otp" className="text-xs sm:text-sm font-semibold text-foreground">Enter OTP</label>
                  <input
                    id="otp"
                    type="text"
                    inputMode="numeric"
                    value={otp}
                    onChange={handleOtpChange}
                    placeholder="Enter 6-digit OTP"
                    maxLength={6}
                    className="w-full rounded-lg sm:rounded-xl border border-border bg-background/80 px-3 sm:px-4 py-2.5 sm:py-3 text-sm outline-none ring-0 transition-all duration-200 focus:border-primary focus:ring-2 focus:ring-primary/20 hover:border-primary/50"
                    disabled={isVerifyingOtp || attemptsRemaining === 0}
                  />
                </div>
                <div className="flex items-center justify-between text-xs sm:text-sm text-muted-foreground">
                  <span>{attemptsRemaining} attempts remaining</span>
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={!canResend}
                    className={`font-semibold ${canResend ? 'text-primary hover:text-primary/80' : 'text-muted-foreground cursor-not-allowed'}`}
                    title={canResend ? 'Resend OTP' : (resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend disabled')}
                  >
                    {canResend ? 'Resend OTP' : `Resend in ${resendCooldown}s`}
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setOtpStep('phone')}
                    className="w-full rounded-lg sm:rounded-xl border border-border bg-background/80 px-3 py-2.5 text-sm font-semibold hover:border-primary/50 transition"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={isVerifyingOtp || otp.replace(/\D/g, '').length !== 6 || attemptsRemaining === 0}
                    className="btn-primary w-full rounded-lg sm:rounded-xl py-2.5 text-sm font-semibold shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5 disabled:opacity-50"
                  >
                    {isVerifyingOtp ? (
                      <div className="flex items-center justify-center gap-2">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"></div>
                        Verifying...
                      </div>
                    ) : (
                      'Verify OTP'
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
        <div className="mt-6 text-center">
          <p className="text-xs text-muted-foreground">
            By continuing, you agree to our{' '}
            <span className="text-primary hover:text-primary/80 cursor-pointer transition-colors">internal policies</span>
            {' '}and{' '}
            <span className="text-primary hover:text-primary/80 cursor-pointer transition-colors">terms of service</span>
          </p>
        </div>
      </div>
    </div>
  )
}



