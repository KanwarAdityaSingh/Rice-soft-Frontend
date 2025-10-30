import { useState } from 'react'
import { Navbar } from '../components/Navbar'
import { Footer } from '../components/Footer'
import { PageTransition } from '../components/shared/PageTransition'
import { ToastContainer } from '../components/shared/ToastContainer'
import { Sidebar } from '../components/Sidebar'

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true)

  return (
    <div className="relative flex min-h-screen flex-col bg-background">
      {/* Global Background Gradient */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute top-0 left-1/4 h-96 w-96 bg-luxury-gradient blur-3xl opacity-30" />
        <div className="absolute bottom-0 right-1/4 h-96 w-96 bg-luxury-gradient blur-3xl opacity-20" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] bg-luxury-gradient blur-3xl opacity-10" />
      </div>
      
      <Navbar onMobileMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)} />
      <Sidebar 
        collapsedDefault={true} 
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
        onCollapsedChange={setSidebarCollapsed}
      />
      <PageTransition>
        <div 
          className={`flex-1 relative z-10 transition-all duration-300 ${
            sidebarCollapsed ? 'md:pl-16' : 'md:pl-[260px]'
          }`}
        >
          {children}
        </div>
      </PageTransition>
      <Footer />
      <ToastContainer />
    </div>
  )
}



