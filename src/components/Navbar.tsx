import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { Moon, Sun, ChevronDown, Sparkles, User, LogOut } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useTheme } from '../hooks/useTheme'
import { useAuth } from '../hooks/useAuth'

export function Navbar() {
  const { theme, setTheme } = useTheme()
  const { user, logout } = useAuth()

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="group inline-flex items-center gap-2">
          <div className="relative grid h-9 w-9 place-items-center rounded-xl bg-luxury-gradient shadow-luxury">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <span className="text-lg font-semibold tracking-tight">Rice Trading</span>
        </Link>

        <div className="flex items-center gap-2">
          {/* Theme Dropdown */}
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button className="btn-secondary h-10 rounded-xl px-3">
                <div className="flex items-center gap-2">
                  {theme === 'dark' ? (
                    <Moon className="h-4 w-4" />
                  ) : (
                    <Sun className="h-4 w-4" />
                  )}
                  <span className="hidden sm:inline">Theme</span>
                  <ChevronDown className="h-4 w-4 opacity-70" />
                </div>
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content className="glass min-w-[10rem] rounded-xl p-1 shadow-lg" sideOffset={8}>
                <DropdownMenu.Item
                  className="flex cursor-pointer select-none items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
                  onSelect={() => setTheme('light')}
                >
                  <Sun className="h-4 w-4" /> Light
                </DropdownMenu.Item>
                <DropdownMenu.Item
                  className="flex cursor-pointer select-none items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
                  onSelect={() => setTheme('dark')}
                >
                  <Moon className="h-4 w-4" /> Luxury Dark
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>

          {/* User Dropdown */}
          {user && (
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button className="btn-secondary h-10 rounded-xl px-3">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <span className="hidden sm:inline">{user.full_name || user.username}</span>
                    <ChevronDown className="h-4 w-4 opacity-70" />
                  </div>
                </button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content className="glass min-w-[12rem] rounded-xl p-1 shadow-lg" sideOffset={8}>
                  <div className="px-3 py-2 text-sm text-muted-foreground border-b border-border/60">
                    <div className="font-medium text-foreground">{user.full_name || user.username}</div>
                    <div className="text-xs">{user.role_name}</div>
                  </div>
                  <DropdownMenu.Item
                    className="flex cursor-pointer select-none items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
                    onSelect={() => logout()}
                  >
                    <LogOut className="h-4 w-4" /> Logout
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          )}
        </div>
      </div>
    </header>
  )
}



