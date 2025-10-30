import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Users, BarChart3, Trophy, Store, UserCheck, UserCircle, ChevronRight, Settings, LogOut } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'

interface SidebarProps {
  collapsedDefault?: boolean
}

export function Sidebar({ collapsedDefault = true }: SidebarProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [collapsed, setCollapsed] = useState<boolean>(collapsedDefault)

  useEffect(() => {
    const persisted = localStorage.getItem('sidebar_collapsed')
    if (persisted != null) setCollapsed(persisted === 'true')
  }, [])

  useEffect(() => {
    localStorage.setItem('sidebar_collapsed', String(collapsed))
  }, [collapsed])

  const links = [
    { to: '/crm/leads', label: 'Leads', icon: Users },
    { to: '/crm/analytics', label: 'Analytics', icon: BarChart3 },
    { to: '/crm/leaderboard', label: 'Leaderboard', icon: Trophy },
    { to: '/directory/vendors', label: 'Vendors', icon: Store },
    { to: '/directory/salesmen', label: 'Salesmen', icon: UserCheck },
    { to: '/directory/brokers', label: 'Brokers', icon: UserCircle },
  ] as const

  return (
    <aside
      className={`fixed left-0 top-16 bottom-0 z-40 transition-[width] duration-300 ${collapsed ? 'w-[64px]' : 'w-[260px]'}`}
      aria-label="Sidebar"
    >
      <div className="h-full flex flex-col border-r border-border/60 bg-background/80 backdrop-blur-sm">
        {/* Header / Toggle */}
        <div className="p-2 flex items-center justify-end">
          <button
            className="h-8 w-8 rounded-lg hover:bg-muted/60 flex items-center justify-center transition-colors"
            onClick={() => setCollapsed((c) => !c)}
            aria-label="Toggle sidebar"
            title="Toggle sidebar"
          >
            <ChevronRight className={`h-4 w-4 transition-transform ${collapsed ? '' : 'rotate-180'}`} />
          </button>
        </div>

        {/* Links */}
        <nav className="flex-1 px-2 space-y-1 overflow-y-auto">
          {links.map(({ to, label, icon: Icon }) => {
            const active = location.pathname.startsWith(to)
            return (
              <Link
                key={to}
                to={to}
                className={`group flex items-center gap-3 rounded-xl px-2 py-2 text-sm transition-colors ${
                  active ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
                title={label}
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted/70">
                  <Icon className="h-4.5 w-4.5" />
                </span>
                {!collapsed && <span className="font-medium">{label}</span>}
              </Link>
            )
          })}
        </nav>

        {/* Footer: user */}
        <div className="p-3 border-t border-border/60">
          {user && (
            <div className={`flex items-center ${collapsed ? 'justify-center' : 'justify-between'} gap-2`}>
              <div className="flex items-center gap-2 min-w-0">
                <div className="h-8 w-8 rounded-lg bg-primary/15 text-primary flex items-center justify-center text-xs font-semibold">
                  {user.full_name?.[0]?.toUpperCase() || user.username?.[0]?.toUpperCase() || 'U'}
                </div>
                {!collapsed && (
                  <div className="min-w-0">
                    <div className="text-sm font-medium leading-tight truncate">{user.full_name || user.username}</div>
                    <div className="text-xs text-muted-foreground leading-tight truncate capitalize">{user.user_type}</div>
                  </div>
                )}
              </div>
              {!collapsed && (
                <div className="flex items-center gap-1">
                  {user.user_type === 'admin' && (
                    <button
                      className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs hover:bg-muted/60"
                      onClick={() => navigate('/admin/users')}
                    >
                      <Settings className="h-3.5 w-3.5" /> Manage
                    </button>
                  )}
                  <button
                    className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs hover:bg-muted/60"
                    onClick={() => logout()}
                  >
                    <LogOut className="h-3.5 w-3.5" /> Logout
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}


