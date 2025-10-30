import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Users, BarChart3, Trophy, Store, UserCheck, UserCircle, ChevronRight, Settings, LogOut, X, Sprout } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
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

  const links = [
    { to: '/crm/leads', label: 'Leads', icon: Users },
    { to: '/crm/analytics', label: 'Analytics', icon: BarChart3 },
    { to: '/crm/leaderboard', label: 'Leaderboard', icon: Trophy },
    { to: '/directory/vendors', label: 'Vendors', icon: Store },
    { to: '/directory/salesmen', label: 'Salesmen', icon: UserCheck },
    { to: '/directory/brokers', label: 'Brokers', icon: UserCircle },
    { to: '/directory/rice-codes', label: 'Rice Codes', icon: Sprout },
  ] as const

  // Close mobile menu when route changes
  useEffect(() => {
    if (mobileOpen && onMobileClose) {
      onMobileClose()
    }
  }, [location.pathname])

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
          collapsed ? 'w-16' : 'w-[260px]'
        } ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0`}
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
        <nav className="flex-1 px-2 space-y-1 overflow-y-auto">
          {links.map(({ to, label, icon: Icon }) => {
            const active = location.pathname.startsWith(to)
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
                {!collapsed && <span className="font-medium">{label}</span>}
              </Link>
            )
            
            return collapsed ? (
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
                <div className="w-full">{linkContent}</div>
              </Tooltip>
            ) : (
              <div key={to}>{linkContent}</div>
            )
          })}
        </nav>

        {/* Footer: user */}
        <div className="p-4 border-t border-border/60 bg-muted/20">
          {user && (
            <div className={`${collapsed ? 'flex flex-col items-center gap-2' : 'space-y-3'}`}>
              {/* User Info */}
              <div className={`flex items-center gap-3 ${collapsed ? 'justify-center' : 'w-full'}`}>
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 text-primary flex items-center justify-center text-sm font-bold shadow-sm flex-shrink-0">
                  {user.full_name?.[0]?.toUpperCase() || user.username?.[0]?.toUpperCase() || 'U'}
                </div>
                {!collapsed && (
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold leading-snug truncate" title={user.full_name || user.username}>
                      {user.full_name || user.username}
                    </div>
                    <div className="text-xs text-muted-foreground leading-snug capitalize" title={user.user_type}>
                      {user.user_type}
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              {!collapsed && (
                <div className="flex flex-col gap-1.5 w-full">
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

              {/* Collapsed State Buttons */}
              {collapsed && (
                <>
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
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </aside>
    </>
  )
}


