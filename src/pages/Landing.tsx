import { ArrowRight, Boxes, FileText, Scale, TrendingUp } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function LandingPage() {
  return (
    <main className="relative isolate">
      <section className="container grid items-center gap-8 py-10 sm:py-16 md:grid-cols-2">
        <div className="space-y-6">
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            Operate with elegance
          </h1>
          <p className="text-muted-foreground">
            Manage contracts, deliveries, inventory and finances in a single,
            ultra-polished workspace.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link to="/saudas" className="btn-primary rounded-xl">
              Go to Saudas <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
            <Link to="/reports" className="btn-secondary rounded-xl">View Reports</Link>
          </div>
        </div>
        <div className="glass rounded-3xl p-6">
          <div className="grid grid-cols-2 gap-4">
            <Feature icon={<Scale className="h-5 w-5" />} title="Weighbridge" subtitle="Auto net weight" />
            <Feature icon={<FileText className="h-5 w-5" />} title="Invoices" subtitle="RTGS rounding" />
            <Feature icon={<Boxes className="h-5 w-5" />} title="Inventory" subtitle="Real-time stock" />
            <Feature icon={<TrendingUp className="h-5 w-5" />} title="Analytics" subtitle="Fulfillment & more" />
          </div>
        </div>
      </section>
    </main>
  )
}

function Feature({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) {
  return (
    <div className="rounded-2xl border border-border/70 p-4">
      <div className="mb-2 inline-flex items-center gap-2 text-sm font-medium">
        <span className="text-primary">{icon}</span>
        {title}
      </div>
      <div className="text-xs text-muted-foreground">{subtitle}</div>
    </div>
  )
}



