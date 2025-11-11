import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { Moon, Sun, User, LogOut, Settings, Menu, KeyRound } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useTheme } from '../hooks/useTheme'
import { useAuth } from '../hooks/useAuth'
import { useState } from 'react'
import { UpdatePasswordDialog } from './shared/UpdatePasswordDialog'

interface NavbarProps {
  onMobileMenuToggle?: () => void
}

export function Navbar({ onMobileMenuToggle }: NavbarProps) {
  const { theme, setTheme } = useTheme()
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false)

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Mobile Menu Button */}
          {user && onMobileMenuToggle && (
            <button
              onClick={onMobileMenuToggle}
              className="md:hidden h-10 w-10 flex items-center justify-center hover:bg-muted/60 rounded-lg transition-colors"
              aria-label="Toggle menu"
            >
              <Menu className="h-5 w-5" />
            </button>
          )}
          
          <button 
            onClick={() => navigate('/')} 
            className="group flex items-center relative"
          >
            {/* Brand name with enhanced styling */}
            <div className="relative">
              {/* Glow effect */}
              <div className="absolute inset-0 blur-md opacity-0 group-hover:opacity-40 transition-opacity duration-500">
                <span className="text-lg sm:text-xl md:text-2xl font-extrabold tracking-[0.15em] uppercase bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
                  Rice Trading
                </span>
              </div>
              
              {/* Main text with shimmer animation */}
              <span className="relative text-lg sm:text-xl md:text-2xl font-extrabold tracking-[0.15em] uppercase bg-gradient-to-r from-primary via-accent to-primary bg-[length:200%_100%] bg-clip-text text-transparent animate-gradient transition-all duration-300 group-hover:tracking-[0.18em]">
                Rice Trading
              </span>
              
              {/* Subtle underline accent */}
              <div className="absolute -bottom-1 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent opacity-0 group-hover:opacity-60 transition-opacity duration-500"></div>
            </div>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Theme Switcher */}
          <button 
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="h-10 w-10 flex items-center justify-center hover:opacity-70 transition-opacity focus:outline-none focus:ring-0"
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
          >
            {theme === 'dark' ? (
              <Moon className="h-5 w-5" />
            ) : (
              <Sun className="h-5 w-5" />
            )}
          </button>

          {/* User Dropdown */}
          {user && (
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button className="h-10 w-10 flex items-center justify-center hover:opacity-70 transition-opacity focus:outline-none focus:ring-0">
                  <User className="h-5 w-5" />
                </button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content className="glass min-w-[12rem] rounded-xl p-1 shadow-lg z-50" sideOffset={8}>
                  <div className="px-3 py-2 text-sm text-muted-foreground border-b border-border/60">
                    <div className="font-medium text-foreground">{user.full_name || user.username}</div>
                    <div className="text-xs capitalize">{user.user_type}</div>
                  </div>
                  {user.user_type === 'admin' && (
                    <DropdownMenu.Item
                      className="flex cursor-pointer select-none items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
                      onSelect={() => navigate('/admin/users')}
                    >
                      <Settings className="h-4 w-4" /> Manage Users
                    </DropdownMenu.Item>
                  )}
                  <DropdownMenu.Item
                    className="flex cursor-pointer select-none items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
                    onSelect={() => setPasswordDialogOpen(true)}
                  >
                    <KeyRound className="h-4 w-4" /> Update Password
                  </DropdownMenu.Item>
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
      {user && (
        <UpdatePasswordDialog
          open={passwordDialogOpen}
          onOpenChange={setPasswordDialogOpen}
        />
      )}
    </header>
  )
}
