export default function SalespeoplePage() {
  return (
    <div className="container mx-auto py-10 space-y-8">
      <header className="hero-bg rounded-2xl p-6 sm:p-8 relative overflow-hidden">
        <div className="absolute -left-6 -top-6 h-24 w-24 floating-orb" />
        <div className="absolute -right-6 -bottom-6 h-20 w-20 floating-orb" />
        <div className="relative">
          <h1 className="text-3xl sm:text-4xl font-bold"><span className="text-gradient">Salespeople</span></h1>
          <p className="mt-2 text-muted-foreground">Manage sales team — Coming soon</p>
        </div>
      </header>

      <section className="card-glow rounded-2xl p-6 highlight-box">
        <p className="text-sm text-muted-foreground">No modules here yet.</p>
      </section>
    </div>
  );
}
