export function Footer() {
  return (
    <footer className="border-t border-border/60">
      <div className="container min-h-[var(--footer-height)] flex flex-col items-center justify-between gap-4 sm:flex-row">
        <p className="text-sm text-muted-foreground">© {new Date().getFullYear()} Rice Trading Management</p>
        <div className="text-xs text-muted-foreground">
          Built with love for efficiency and elegance
        </div>
      </div>
    </footer>
  )
}



