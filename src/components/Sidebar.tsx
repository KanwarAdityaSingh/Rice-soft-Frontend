import { useEffect, useState, useRef } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Users, BarChart3, Trophy, Store, UserCheck, UserCircle, ChevronRight, Settings, LogOut, X, Sprout, ShoppingCart, Package, FileText, CreditCard, Truck } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { canRead, isCustomUser, getPermissions } from '../utils/permissions'
import { Tooltip } from '@mui/material'

interface SidebarProps {
  collapsedDefault?: boolean
  mobileOpen?: boolean
  onMobileClose?: () => void
  onCollapsedChange?: (collapsed: boolean) => void
}

export function Sidebar({ collapsedDefault = true, mobileOpen = false, onMobileClose, onCollapsedChange }: SidebarProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [collapsed, setCollapsed] = useState<boolean>(collapsedDefault)
  const activeLinkRef = useRef<HTMLDivElement | null>(null)
  const navRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    const persisted = localStorage.getItem('sidebar_collapsed')
    if (persisted != null) {
      const persistedCollapsed = persisted === 'true'
      setCollapsed(persistedCollapsed)
      onCollapsedChange?.(persistedCollapsed)
    } else {
      onCollapsedChange?.(collapsedDefault)
    }
  }, [collapsedDefault, onCollapsedChange])

  useEffect(() => {
    localStorage.setItem('sidebar_collapsed', String(collapsed))
    onCollapsedChange?.(collapsed)
  }, [collapsed, onCollapsedChange])

  const baseLinks = [
    { to: '/crm/leads', label: 'Leads', icon: Users, key: 'leads' as const },
    { to: '/crm/analytics', label: 'Analytics', icon: BarChart3, key: null as any },
    { to: '/crm/leaderboard', label: 'Leaderboard', icon: Trophy, key: null as any },
    { to: '/directory/vendors', label: 'Vendors', icon: Store, key: 'vendor' as const },
    { to: '/directory/transporters', label: 'Transporters', icon: Truck, key: null as any },
    { to: '/directory/salesmen', label: 'Salesperson', icon: UserCheck, key: 'salesman' as const },
    { to: '/directory/brokers', label: 'Brokers', icon: UserCircle, key: 'broker' as const },
    { to: '/directory/rice-codes', label: 'Rice Codes', icon: Sprout, key: 'riceCode' as const },
    { to: '/purchases/saudas', label: 'Saudas', icon: Package, key: null as any },
    { to: '/purchases/inward-slip-passes', label: 'Inward Slip Passes', icon: FileText, key: null as any },
    { to: '/purchases/lots', label: 'Lots', icon: Package, key: null as any },
    { to: '/purchases', label: 'Purchases', icon: ShoppingCart, key: null as any },
    { to: '/purchases/payment-advices', label: 'Payment Advices', icon: CreditCard, key: null as any },
  ]

  const links = baseLinks.filter((l) => {
    if (!l.key) return true; // non-entity routes always visible
    // Check if permissions exist - if they do, check them regardless of user type
    const permissions = getPermissions();
    if (permissions && typeof permissions === 'object' && l.key && permissions[l.key as keyof typeof permissions]) {
      return canRead(l.key);
    }
    // If no permissions stored, only filter for custom users (legacy behavior)
    return !isCustomUser() || canRead(l.key)
  }) as Array<{ to: string; label: string; icon: any }>

  // Close mobile menu when route changes
  useEffect(() => {
    if (mobileOpen && onMobileClose) {
      onMobileClose()
    }
  }, [location.pathname])

  // Scroll to active link when route changes
  useEffect(() => {
    if (activeLinkRef.current && navRef.current) {
      const activeElement = activeLinkRef.current
      const navElement = navRef.current
      
      // Get the position of the active element relative to the nav container
      const activeRect = activeElement.getBoundingClientRect()
      const navRect = navElement.getBoundingClientRect()
      
      // Check if the active element is below the visible area
      if (activeRect.bottom > navRect.bottom) {
        // Scroll the active element into view with some padding
        activeElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      } else if (activeRect.top < navRect.top) {
        // Check if the active element is above the visible area
        activeElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }
    }
  }, [location.pathname, collapsed])

  // On mobile, always show expanded. On desktop, use collapsed state
  const isCollapsed = collapsed

  return (
    <>
      {/* Mobile Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={onMobileClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-16 bottom-0 z-40 transition-all duration-300 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0 w-[260px] md:w-auto ${
          isCollapsed ? 'md:w-16' : 'md:w-[260px]'
        }`}
        aria-label="Sidebar"
      >
        <div className="h-full flex flex-col border-r border-border/60 bg-background/95 backdrop-blur-sm">
          {/* Header / Toggle */}
          <div className="p-2 flex items-center justify-between md:justify-end">
            {/* Mobile Close Button */}
            <button
              className="md:hidden h-8 w-8 rounded-lg hover:bg-muted/60 flex items-center justify-center transition-colors"
              onClick={onMobileClose}
              aria-label="Close menu"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Desktop Toggle */}
            <Tooltip 
              title="Toggle sidebar" 
              placement="right" 
              arrow
              disableInteractive
              enterDelay={300}
            >
              <button
                className="hidden md:flex h-8 w-8 rounded-lg hover:bg-muted/60 items-center justify-center transition-colors"
                onClick={() => setCollapsed((c) => !c)}
                aria-label="Toggle sidebar"
              >
                <ChevronRight className={`h-4 w-4 transition-transform ${collapsed ? '' : 'rotate-180'}`} />
              </button>
            </Tooltip>
          </div>

        {/* Links */}
        <nav ref={navRef} className="flex-1 px-2 space-y-1 overflow-y-auto">
          {links.map(({ to, label, icon: Icon }) => {
            // More precise matching: exact match or path starts with route + '/'
            // But only if no more specific route also matches
            const pathMatches = location.pathname === to || location.pathname.startsWith(to + '/')
            
            // Check if there's a more specific route that also matches
            const hasMoreSpecificMatch = pathMatches && links.some(otherLink => {
              if (otherLink.to === to) return false
              // Check if otherLink is more specific (longer path) and also matches
              return otherLink.to.length > to.length && 
                     (location.pathname.startsWith(otherLink.to + '/') || location.pathname === otherLink.to)
            })
            
            const active = pathMatches && !hasMoreSpecificMatch
            const linkContent = (
              <Link
                to={to}
                className={`group flex items-center gap-3 rounded-xl px-2 py-2 text-sm transition-colors ${
                  active ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted/70">
                  <Icon className="h-4.5 w-4.5" />
                </span>
                {/* Always show label on mobile, respect collapsed on desktop */}
                <span className={`font-medium md:hidden`}>{label}</span>
                {!collapsed && <span className="font-medium hidden md:inline">{label}</span>}
              </Link>
            )
            
            // On desktop, show tooltip when collapsed. On mobile, never show tooltip
            return collapsed && !mobileOpen ? (
              <Tooltip 
                key={to} 
                title={label} 
                placement="right" 
                arrow
                disableInteractive
                enterDelay={300}
                enterNextDelay={300}
                slotProps={{
                  popper: {
                    modifiers: [
                      {
                        name: 'offset',
                        options: {
                          offset: [0, 8],
                        },
                      },
                    ],
                  },
                }}
              >
                <div ref={active ? activeLinkRef : null} className="w-full">{linkContent}</div>
              </Tooltip>
            ) : (
              <div key={to} ref={active ? activeLinkRef : null}>{linkContent}</div>
            )
          })}
        </nav>

        {/* Footer: user */}
        <div className="p-4 border-t border-border/60 bg-muted/20">
          {user && (
            <div className={`${collapsed ? 'md:flex md:flex-col md:items-center md:gap-2 space-y-3' : 'space-y-3'}`}>
              {/* User Info */}
              <div className={`flex items-center gap-3 ${collapsed ? 'md:justify-center w-full' : 'w-full'}`}>
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 text-primary flex items-center justify-center text-sm font-bold shadow-sm flex-shrink-0">
                  {user.full_name?.[0]?.toUpperCase() || user.username?.[0]?.toUpperCase() || 'U'}
                </div>
                {/* Always show user info on mobile */}
                <div className="min-w-0 flex-1 md:hidden">
                  <div className="text-sm font-semibold leading-snug truncate" title={user.full_name || user.username}>
                    {user.full_name || user.username}
                  </div>
                  <div className="text-xs text-muted-foreground leading-snug capitalize" title={user.user_type}>
                    {user.user_type}
                  </div>
                </div>
                {/* Conditionally show on desktop based on collapsed state */}
                {!collapsed && (
                  <div className="min-w-0 flex-1 hidden md:block">
                    <div className="text-sm font-semibold leading-snug truncate" title={user.full_name || user.username}>
                      {user.full_name || user.username}
                    </div>
                    <div className="text-xs text-muted-foreground leading-snug capitalize" title={user.user_type}>
                      {user.user_type}
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons - Always show on mobile, conditional on desktop */}
              <div className="flex flex-col gap-1.5 w-full md:hidden">
                {user.user_type === 'admin' && (
                  <button
                    className="flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-medium hover:bg-primary/10 hover:text-primary transition-colors w-full border border-border/40"
                    onClick={() => navigate('/admin/users')}
                    title="Manage Users"
                  >
                    <Settings className="h-4 w-4" />
                    <span>Manage Users</span>
                  </button>
                )}
                <button
                  className="flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-medium hover:bg-destructive/10 hover:text-destructive transition-colors w-full border border-border/40"
                  onClick={() => logout()}
                  title="Logout"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Logout</span>
                </button>
              </div>

              {/* Desktop Expanded Buttons */}
              {!collapsed && (
                <div className="hidden md:flex flex-col gap-1.5 w-full">
                  {user.user_type === 'admin' && (
                    <button
                      className="flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-medium hover:bg-primary/10 hover:text-primary transition-colors w-full border border-border/40"
                      onClick={() => navigate('/admin/users')}
                      title="Manage Users"
                    >
                      <Settings className="h-4 w-4" />
                      <span>Manage Users</span>
                    </button>
                  )}
                  <button
                    className="flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-medium hover:bg-destructive/10 hover:text-destructive transition-colors w-full border border-border/40"
                    onClick={() => logout()}
                    title="Logout"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Logout</span>
                  </button>
                </div>
              )}

              {/* Desktop Collapsed State Buttons */}
              {collapsed && (
                <div className="hidden md:flex md:flex-col md:gap-2">
                  {user.user_type === 'admin' && (
                    <Tooltip 
                      title="Manage Users" 
                      placement="right" 
                      arrow
                      disableInteractive
                      enterDelay={300}
                      slotProps={{
                        popper: {
                          modifiers: [
                            {
                              name: 'offset',
                              options: {
                                offset: [0, 8],
                              },
                            },
                          ],
                        },
                      }}
                    >
                      <button
                        className="flex items-center justify-center rounded-lg p-2 hover:bg-primary/10 hover:text-primary transition-colors"
                        onClick={() => navigate('/admin/users')}
                      >
                        <Settings className="h-5 w-5" />
                      </button>
                    </Tooltip>
                  )}
                  <Tooltip 
                    title="Logout" 
                    placement="right" 
                    arrow
                    disableInteractive
                    enterDelay={300}
                    slotProps={{
                      popper: {
                        modifiers: [
                          {
                            name: 'offset',
                            options: {
                              offset: [0, 8],
                            },
                          },
                        ],
                      },
                    }}
                  >
                    <button
                      className="flex items-center justify-center rounded-lg p-2 hover:bg-destructive/10 hover:text-destructive transition-colors"
                      onClick={() => logout()}
                    >
                      <LogOut className="h-5 w-5" />
                    </button>
                  </Tooltip>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </aside>
    </>
  )
}


