import { ArrowRight, Users, Sparkles, Zap, UserCheck, TrendingUp } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function LandingPage() {
  return (
    <main className="relative isolate">
      {/* Hero */}
      <section className="relative hero-bg overflow-hidden">
        <div className="container flex flex-col gap-8 sm:gap-10 py-10 sm:py-14 md:py-16 md:grid md:grid-cols-2 items-center px-4 sm:px-6">
          <div className="relative z-10 space-y-4 sm:space-y-6 w-full">
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

          {/* Preview Card - Now visible on mobile */}
          <div className="relative w-full">
            {/* Decorative orbs - hidden on mobile */}
            <div className="absolute -left-10 -top-10 h-40 w-40 floating-orb hidden md:block" />
            <div className="absolute -right-10 bottom-0 h-32 w-32 floating-orb hidden md:block" />
            
            <div className="glass rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-xl glow-soft">
              <div className="grid gap-3 sm:gap-4">
                {/* Mini Cards - responsive grid */}
                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                  <MiniCard icon={<Users className="h-3 sm:h-4 w-3 sm:w-4" />} title="Leads" value="2,431" accent="primary" />
                  <MiniCard icon={<UserCheck className="h-3 sm:h-4 w-3 sm:w-4" />} title="Salesmen" value="312" accent="accent" />
                  <MiniCard icon={<TrendingUp className="h-3 sm:h-4 w-3 sm:w-4" />} title="Conversions" value="58" accent="primary" />
                </div>
                
                {/* Analytics Chart */}
                <div className="gradient-border p-3 sm:p-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5 sm:space-y-1">
                      <div className="text-xs sm:text-sm font-medium">This month</div>
                      <div className="text-[10px] sm:text-xs text-muted-foreground">Pipeline velocity</div>
                    </div>
                    <div className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-[10px] sm:text-xs text-primary">
                      <Zap className="h-3 sm:h-3.5 w-3 sm:w-3.5" /> +18%
                    </div>
                  </div>
                  <AnimatedBars />
                </div>
                
                {/* Action Cards */}
                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  <Link to="/crm/leads" className="card-glow p-3 sm:p-4 highlight-box">
                    <div className="mb-0.5 sm:mb-1 text-xs sm:text-sm font-medium">Leads</div>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">Manage prospects end‑to‑end</p>
                  </Link>
                  <Link to="/crm/leaderboard" className="card-glow p-3 sm:p-4 highlight-box">
                    <div className="mb-0.5 sm:mb-1 text-xs sm:text-sm font-medium">Leaderboard</div>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">Celebrate top performers</p>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

   

    </main>
  )
}

function MiniCard({ icon, title, value, accent = 'primary' }: { icon: React.ReactNode; title: string; value: string; accent?: 'primary' | 'accent' }) {
  return (
    <div className="card-glow p-2 sm:p-3 min-h-[60px] sm:min-h-[70px] flex flex-col justify-center">
      <div className="mb-0.5 sm:mb-1 inline-flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs">
        <span className={accent === 'primary' ? 'text-primary' : 'text-accent'}>{icon}</span>
        <span className="text-muted-foreground truncate">{title}</span>
      </div>
      <div className="text-xs sm:text-sm font-semibold truncate">{value}</div>
    </div>
  )
}

// FeatureCard removed with feature grid

function AnimatedBars() {
  const bars = new Array(12).fill(0);
  return (
    <div className="mt-3 sm:mt-4 h-20 sm:h-24 w-full rounded-md bg-muted/30 p-2 sm:p-3">
      <div className="flex h-full items-end gap-1 sm:gap-2">
        {bars.map((_, i) => (
          <div
            key={i}
            className="flex-1 rounded-sm sm:rounded-md bg-gradient-to-t from-primary/40 to-accent/50 animate-subtle-pulse min-w-[4px]"
            style={{ height: `${30 + ((i * 13) % 60)}%`, animationDelay: `${i * 120}ms` }}
          />
        ))}
      </div>
    </div>
  )
}

function PipelineNode({ to, label, description, icon }: { to: string; label: string; description: string; icon?: React.ReactNode }) {
  return (
    <Link to={to} className="group relative isolate">
      <div className="relative highlight-box card-glow px-4 py-3 sm:px-5 sm:py-4 rounded-xl md:min-w-[180px]">
        <div className="absolute -inset-px rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 animate-gradient bg-[linear-gradient(135deg,hsl(var(--primary)/0.18),hsl(var(--accent)/0.14))]"></div>
        <div className="relative z-10 flex items-start gap-2">
          <div className="mt-0.5 text-primary">{icon}</div>
          <div>
            <div className="text-sm sm:text-base font-semibold">
              {label}
            </div>
            <div className="text-[11px] sm:text-xs text-muted-foreground">
              {description}
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}

function PipelineConnector() {
  return (
    <div className="relative md:flex-1 flex md:block items-center justify-center">
      {/* Vertical (mobile) */}
      <div className="md:hidden h-8 w-[2px] mx-auto bg-gradient-to-b from-primary/40 via-accent/40 to-transparent rounded-full"></div>
      {/* Horizontal (md+) */}
      <div className="hidden md:block h-[2px] w-full bg-gradient-to-r from-transparent via-primary/50 to-transparent rounded-full animate-subtle-pulse"></div>
    </div>
  )
}

function PipelineMini({ to, label }: { to: string; label: string }) {
  return (
    <Link to={to} className="group">
      <div className="card-glow rounded-lg p-2.5 sm:p-3 text-center hover:translate-y-[-2px] transition-transform">
        <div className="text-xs sm:text-sm font-medium">
          {label}
        </div>
        <div className="mt-1 h-[2px] w-full bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
      </div>
    </Link>
  )
}