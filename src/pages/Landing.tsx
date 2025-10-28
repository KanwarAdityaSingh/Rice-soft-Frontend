import { ArrowRight, Users, BarChart3, Trophy, Sparkles, Zap } from 'lucide-react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'

export default function LandingPage() {
  return (
    <main className="relative isolate">
      {/* Hero */}
      <section className="relative hero-bg overflow-hidden">
        <div className="container grid items-center gap-10 py-14 sm:py-16 md:grid-cols-2">
          <div className="relative z-10 space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/60 px-3 py-1 text-xs text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Crafted for high-performance trading teams
            </div>
            <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight leading-tight">
              Trade smarter.
              <br />
              <span className="text-gradient">Operate beautifully.</span>
            </h1>
            <p className="max-w-xl text-base sm:text-lg text-muted-foreground">
              A clean, modern CRM and operations suite for contracts, deliveries, inventory and finances — designed to feel effortless.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link to="/login" className="btn-primary rounded-xl">
                Get started <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
              <Link to="/crm/analytics" className="btn-secondary rounded-xl">
                Explore analytics
              </Link>
            </div>

          </div>

          {/* Preview Card */}
          <div className="relative">
            <div className="absolute -left-10 -top-10 h-40 w-40 floating-orb" />
            <div className="absolute -right-10 bottom-0 h-32 w-32 floating-orb" />
            <div className="glass rounded-3xl p-6 shadow-xl glow-soft">
              <div className="grid gap-4">
                <div className="grid grid-cols-3 gap-3">
                  <MiniCard icon={<Users className="h-4 w-4" />} title="Leads" value="2,431" accent="primary" />
                  <MiniCard icon={<BarChart3 className="h-4 w-4" />} title="MQL" value="312" accent="accent" />
                  <MiniCard icon={<Trophy className="h-4 w-4" />} title="Wins" value="58" accent="primary" />
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

      {/* Feature Grid */}
      <section className="container py-10 sm:py-14">
        <div className="grid gap-4 sm:grid-cols-3">
          <FeatureCard link="/crm/leads" icon={<Users className="h-5 w-5" />} title="Leads" subtitle="Capture, qualify and convert" />
          <FeatureCard link="/crm/analytics" icon={<BarChart3 className="h-5 w-5" />} title="Analytics" subtitle="Clarity without the clutter" />
          <FeatureCard highlight link="/crm/leaderboard" icon={<Trophy className="h-5 w-5" />} title="Leaderboard" subtitle="Compete. Win. Celebrate." />
        </div>
      </section>

      {/* Trust & Compliance */}

    </main>
  )
}

function MiniCard({ icon, title, value, accent = 'primary' }: { icon: React.ReactNode; title: string; value: string; accent?: 'primary' | 'accent' }) {
  return (
    <div className="card-glow p-3">
      <div className="mb-1 inline-flex items-center gap-1.5 text-xs">
        <span className={accent === 'primary' ? 'text-primary' : 'text-accent'}>{icon}</span>
        <span className="text-muted-foreground">{title}</span>
      </div>
      <div className="text-sm font-semibold">{value}</div>
    </div>
  )
}

function FeatureCard({ link, icon, title, subtitle, highlight = false }: { link: string; icon: React.ReactNode; title: string; subtitle: string; highlight?: boolean }) {
  return (
    <Link to={link} className="group">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.4 }}
        transition={{ duration: 0.35 }}
        className={`rounded-2xl p-5 cursor-pointer transition-all duration-300 group-hover:scale-[1.02] ${highlight ? 'border border-primary/40 bg-gradient-to-br from-primary/10 to-accent/10' : 'card-glow'}`}
      >
        <div className="mb-2 inline-flex items-center gap-2 text-sm font-medium">
          <span className={`text-primary ${highlight ? 'animate-subtle-pulse' : ''}`}>{icon}</span>
          {title}
        </div>
        <div className="text-xs text-muted-foreground">{subtitle}</div>

      </motion.div>
    </Link>
  )
}

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