import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { Lock, AlertCircle, TrendingUp, Shield, Zap } from 'lucide-react'

export default function LoginPage() {
  const { login, isLoading, error } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [localError, setLocalError] = useState<string | null>(null)

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



