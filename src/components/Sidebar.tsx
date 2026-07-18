import { useEffect, useState, useRef } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Store, UserCheck, UserCircle, ChevronRight, ChevronDown, Settings, LogOut, X, Sprout, ShoppingCart, Package, FileText, CreditCard, Truck, Car, IdCard, BookOpen, FlaskConical, Box, TrendingUp, ShoppingBag, Receipt, FileDigit, ScrollText, StickyNote, Warehouse, History, Ticket, type LucideIcon } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { canRead, isCustomUser, getPermissions } from '../utils/permissions'
import type { PermissionsEntityKey } from '../types/entities'
import { Tooltip } from '@mui/material'

type NavLinkDef = {
  to: string
  label: string
  icon: LucideIcon
  key: PermissionsEntityKey | null
}

type NavGroupDef = {
  id: string
  title: string
  items: NavLinkDef[]
}

/** v2: default all groups collapsed; v1 had default expanded */
const SIDEBAR_GROUPS_OPEN_KEY = 'sidebar_nav_groups_open_v2'

function isLinkActive(pathname: string, to: string, allLinks: { to: string }[]): boolean {
  const pathMatches = pathname === to || pathname.startsWith(to + '/')
  if (!pathMatches) return false
  const hasMoreSpecificMatch = allLinks.some((otherLink) => {
    if (otherLink.to === to) return false
    return (
      otherLink.to.length > to.length &&
      (pathname.startsWith(otherLink.to + '/') || pathname === otherLink.to)
    )
  })
  return !hasMoreSpecificMatch
}

function readStoredGroupOpen(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(SIDEBAR_GROUPS_OPEN_KEY)
    if (!raw) return {}
    return JSON.parse(raw) as Record<string, boolean>
  } catch {
    return {}
  }
}

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

  const navGroups: NavGroupDef[] = [
    {
      id: 'parties-people',
      title: 'Parties & people',
      items: [
        { to: '/directory/vendors', label: 'Purchase Party', icon: Store, key: 'vendor' },
        { to: '/directory/sales-parties', label: 'Sales Party', icon: ShoppingBag, key: null },
        { to: '/directory/salesmen', label: 'Salesperson', icon: UserCheck, key: 'salesman' },
        { to: '/directory/brokers', label: 'Brokers', icon: UserCircle, key: 'broker' },
      ],
    },
    {
      id: 'logistics',
      title: 'Logistics',
      items: [
        { to: '/directory/transporters', label: 'Transporters', icon: Truck, key: null },
        { to: '/directory/vehicles', label: 'Vehicles', icon: Car, key: null },
        { to: '/directory/drivers', label: 'Drivers', icon: IdCard, key: null },
      ],
    },
    {
      id: 'directory-masters',
      title: 'Masters',
      items: [
        { to: '/directory/rice-codes', label: 'Rice Codes', icon: Sprout, key: 'riceCode' },
        { to: '/directory/godowns', label: 'Godowns', icon: Warehouse, key: null },
      ],
    },
    {
      id: 'purchases',
      title: 'Purchases',
      items: [
        { to: '/purchases/saudas', label: 'Saudas', icon: Package, key: null },
        { to: '/purchases/inward-slip-passes', label: 'Inward Slip Passes', icon: FileText, key: null },
        { to: '/purchases/lots', label: 'Lots', icon: Package, key: null },
        { to: '/purchases', label: 'Purchases', icon: ShoppingCart, key: null },
        { to: '/purchases/payment-advices', label: 'Payment Advices', icon: CreditCard, key: null },
      ],
    },
    {
      id: 'production',
      title: 'Production',
      items: [
        { to: '/production/recipes', label: 'Recipes', icon: BookOpen, key: null },
        { to: '/production/products', label: 'Products', icon: Package, key: null },
        { to: '/production/product-rate-history', label: 'Product Rate History', icon: History, key: null },
        { to: '/production/packaging', label: 'Packaging', icon: Box, key: null },
        { to: '/production/packaging-vendors', label: 'Packaging Vendors', icon: ShoppingBag, key: null },
        { to: '/production/batches', label: 'Batches', icon: FlaskConical, key: null },
        { to: '/production/inventory', label: 'Inventory', icon: TrendingUp, key: null },
      ],
    },
    {
      id: 'sales',
      title: 'Sales',
      items: [
        { to: '/sales/sales-saudas', label: 'Sales Saudas', icon: Receipt, key: null },
        { to: '/sales/invoice-dispatches', label: 'Invoice Dispatches', icon: FileDigit, key: null },
        { to: '/sales/inventory-ledger', label: 'Inventory Ledger', icon: ScrollText, key: null },
        { to: '/sales/credit-notes', label: 'Credit Notes', icon: StickyNote, key: null },
      ],
    },
    {
      id: 'coupons',
      title: 'Coupons',
      items: [
        { to: '/coupons', label: 'Coupon Studio', icon: Ticket, key: null },
      ],
    },
  ]

  const [groupOpen, setGroupOpen] = useState<Record<string, boolean>>(() => {
    const stored = readStoredGroupOpen()
    const next: Record<string, boolean> = { ...stored }
    for (const g of navGroups) {
      if (next[g.id] === undefined) next[g.id] = false
    }
    return next
  })

  useEffect(() => {
    localStorage.setItem(SIDEBAR_GROUPS_OPEN_KEY, JSON.stringify(groupOpen))
  }, [groupOpen])

  const linkVisible = (l: NavLinkDef): boolean => {
    if (!l.key) return true
    const permissions = getPermissions()
    if (permissions && typeof permissions === 'object' && permissions[l.key]) {
      return canRead(l.key)
    }
    return !isCustomUser() || canRead(l.key)
  }

  const filteredGroups = navGroups
    .map((g) => ({ ...g, items: g.items.filter(linkVisible) }))
    .filter((g) => g.items.length > 0)

  const links = filteredGroups.flatMap((g) => g.items)

  // Expand the group that contains the current route (so the active item is never hidden)
  useEffect(() => {
    const groups = navGroups
      .map((g) => ({ ...g, items: g.items.filter(linkVisible) }))
      .filter((g) => g.items.length > 0)
    const flat = groups.flatMap((g) => g.items)
    for (const g of groups) {
      for (const item of g.items) {
        if (isLinkActive(location.pathname, item.to, flat)) {
          setGroupOpen((prev) => {
            if (prev[g.id] === true) return prev
            return { ...prev, [g.id]: true }
          })
          return
        }
      }
    }
  }, [location.pathname])

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
  /** Icon-only rail: no room for group headers — show all links (collapse state ignored). */
  const showGroupHeaders = !collapsed || mobileOpen

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

        {/* Links (grouped) */}
        <nav ref={navRef} className="flex-1 px-2 pb-2 overflow-y-auto">
          {filteredGroups.map((group, groupIndex) => {
            const isOpen = showGroupHeaders ? (groupOpen[group.id] ?? false) : true
            return (
            <div
              key={group.id}
              className={
                groupIndex > 0
                  ? collapsed && !mobileOpen
                    ? 'mt-2 border-t border-border/50 pt-2'
                    : 'mt-4 border-t border-border/50 pt-3'
                  : ''
              }
            >
              {showGroupHeaders && (
                <button
                  type="button"
                  className="mb-1 flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-muted/50"
                  onClick={() =>
                    setGroupOpen((prev) => ({
                      ...prev,
                      [group.id]: !(prev[group.id] ?? false),
                    }))
                  }
                  aria-expanded={isOpen}
                  aria-controls={`nav-group-${group.id}`}
                  aria-label={`${isOpen ? 'Collapse' : 'Expand'} section: ${group.title}`}
                >
                  <ChevronDown
                    className={`h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform duration-200 ${
                      isOpen ? '' : '-rotate-90'
                    }`}
                    aria-hidden
                  />
                  <span className="flex-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/90">
                    {group.title}
                  </span>
                </button>
              )}
              <div
                id={`nav-group-${group.id}`}
                className={`space-y-1 ${showGroupHeaders && !isOpen ? 'hidden' : ''}`}
              >
                {group.items.map(({ to, label, icon: Icon }) => {
                  const active = isLinkActive(location.pathname, to, links)
                  const linkContent = (
                    <Link
                      to={to}
                      className={`group flex items-center gap-3 rounded-xl px-2 py-2 text-sm transition-colors ${
                        active
                          ? 'bg-primary/10 text-primary'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                      }`}
                    >
                      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted/70">
                        <Icon className="h-4.5 w-4.5" />
                      </span>
                      <span className="font-medium md:hidden">{label}</span>
                      {!collapsed && <span className="font-medium hidden md:inline">{label}</span>}
                    </Link>
                  )

                  return collapsed && !mobileOpen ? (
                    <Tooltip
                      key={to}
                      title={
                        <span>
                          <span className="block text-[10px] uppercase tracking-wide text-muted-foreground">
                            {group.title}
                          </span>
                          <span>{label}</span>
                        </span>
                      }
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
                      <div ref={active ? activeLinkRef : null} className="w-full">
                        {linkContent}
                      </div>
                    </Tooltip>
                  ) : (
                    <div key={to} ref={active ? activeLinkRef : null}>
                      {linkContent}
                    </div>
                  )
                })}
              </div>
            </div>
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


