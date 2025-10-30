import { ArrowRight, Users, Sparkles, Zap, UserCheck, TrendingUp } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function LandingPage() {
  return (
    <main className="relative isolate">
      {/* Hero */}
      <section className="relative hero-bg overflow-hidden">
        <div className="container grid items-center gap-8 sm:gap-10 py-10 sm:py-14 md:py-16 md:grid-cols-2 px-4 sm:px-6">
          <div className="relative z-10 space-y-4 sm:space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/60 px-2 sm:px-3 py-1 text-[10px] sm:text-xs text-muted-foreground">
              <Sparkles className="h-3 sm:h-3.5 w-3 sm:w-3.5 text-primary" />
              Crafted for high-performance trading teams
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight">
              Trade smarter.
              <br />
              <span className="text-gradient">Operate beautifully.</span>
            </h1>
            <p className="max-w-xl text-sm sm:text-base md:text-lg text-muted-foreground">
              A clean, modern CRM and operations suite for contracts, deliveries, inventory and finances — designed to feel effortless.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link to="/login" className="btn-primary rounded-xl text-center">
                Get started <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
              <Link to="/crm/analytics" className="btn-secondary rounded-xl text-center">
                Explore analytics
              </Link>
            </div>

          </div>

          {/* Preview Card */}
          <div className="relative hidden sm:block">
            <div className="absolute -left-10 -top-10 h-40 w-40 floating-orb" />
            <div className="absolute -right-10 bottom-0 h-32 w-32 floating-orb" />
            <div className="glass rounded-3xl p-6 shadow-xl glow-soft">
              <div className="grid gap-4">
                <div className="grid grid-cols-3 gap-3">
                  <MiniCard icon={<Users className="h-4 w-4" />} title="Leads" value="2,431" accent="primary" />
                  <MiniCard icon={<UserCheck className="h-4 w-4" />} title="Salesmen" value="312" accent="accent" />
                  <MiniCard icon={<TrendingUp className="h-4 w-4" />} title="Conversions" value="58" accent="primary" />
                </div>
                <div className="gradient-border p-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="text-sm font-medium">This month</div>
                      <div className="text-xs text-muted-foreground">Pipeline velocity</div>
                    </div>
                    <div className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-xs text-primary">
                      <Zap className="h-3.5 w-3.5" /> +18%
                    </div>
                  </div>
                  <AnimatedBars />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Link to="/crm/leads" className="card-glow p-4 highlight-box">
                    <div className="mb-1 text-sm font-medium">Leads</div>
                    <p className="text-xs text-muted-foreground">Manage prospects end‑to‑end</p>
                  </Link>
                  <Link to="/crm/leaderboard" className="card-glow p-4 highlight-box">
                    <div className="mb-1 text-sm font-medium">Leaderboard</div>
                    <p className="text-xs text-muted-foreground">Celebrate top performers</p>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Grid removed; global sidebar provides routing */}

      {/* Trust & Compliance */}

    </main>
  )
}

function MiniCard({ icon, title, value, accent = 'primary' }: { icon: React.ReactNode; title: string; value: string; accent?: 'primary' | 'accent' }) {
  return (
    <div className="card-glow p-2 sm:p-3">
      <div className="mb-0.5 sm:mb-1 inline-flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs">
        <span className={accent === 'primary' ? 'text-primary' : 'text-accent'}>{icon}</span>
        <span className="text-muted-foreground">{title}</span>
      </div>
      <div className="text-xs sm:text-sm font-semibold">{value}</div>
    </div>
  )
}

// FeatureCard removed with feature grid

function AnimatedBars() {
  const bars = new Array(12).fill(0);
  return (
    <div className="mt-4 h-24 w-full rounded-md bg-muted/30 p-3">
      <div className="flex h-full items-end gap-2">
        {bars.map((_, i) => (
          <div
            key={i}
            className="flex-1 rounded-md bg-gradient-to-t from-primary/40 to-accent/50 animate-subtle-pulse"
            style={{ height: `${30 + ((i * 13) % 60)}%`, animationDelay: `${i * 120}ms` }}
          />
        ))}
      </div>
    </div>
  )
}