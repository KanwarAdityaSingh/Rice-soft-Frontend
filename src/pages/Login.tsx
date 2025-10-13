import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useContext } from 'react'
import { AuthContext } from '../providers/AuthProvider'
import { Sparkles, Lock } from 'lucide-react'

export default function LoginPage() {
  const { login } = useContext(AuthContext)
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    await login(username, password)
    setLoading(false)
    navigate('/')
  }

  return (
    <div className="relative isolate mx-auto grid min-h-[calc(100vh-4rem)] w-full max-w-6xl grid-cols-1 items-center gap-8 px-6 py-10 sm:py-16 lg:grid-cols-2">
      <div className="relative hidden h-full flex-col justify-center lg:flex">
        <div className="absolute inset-0 -z-10 rounded-3xl bg-luxury-gradient blur-3xl" />
        <div className="relative space-y-6">
          <div className="inline-flex items-center gap-3 rounded-2xl bg-secondary/60 px-4 py-2 text-sm text-secondary-foreground">
            <Sparkles className="h-4 w-4 text-primary" />
            Luxury-grade internal tooling
          </div>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            Rice Trading Management
          </h1>
          <p className="text-muted-foreground">
            Log in to manage saudas, lots, purchases, inventory and more with an
            experience crafted for focus and speed.
          </p>
        </div>
      </div>

      <div className="glass relative mx-auto w-full max-w-md rounded-3xl p-6 sm:p-8">
        <div className="mb-6 flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-luxury-gradient">
            <Lock className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Welcome back</h2>
            <p className="text-sm text-muted-foreground">Sign in to continue</p>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="username" className="text-sm font-medium">Username</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-xl border border-border bg-background/60 px-3 py-2 outline-none ring-0 transition focus:border-primary"
              placeholder="Your username"
              required
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-border bg-background/60 px-3 py-2 outline-none ring-0 transition focus:border-primary"
              placeholder="••••••••"
              required
            />
          </div>
          <button className="btn-primary w-full rounded-xl py-2" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          By continuing you agree to our internal policies
        </p>
      </div>
    </div>
  )
}



