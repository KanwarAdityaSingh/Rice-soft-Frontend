import { createContext, useCallback, useEffect, useMemo, useState } from 'react'

interface UserProfile {
  id: string
  name: string
  role: 'Admin' | 'Salesman' | 'Accountant' | 'Warehouse Operator' | 'Broker' | 'Viewer'
}

interface AuthContextValue {
  user: UserProfile | null
  login: (username: string, password: string) => Promise<void>
  logout: () => void
}

export const AuthContext = createContext<AuthContextValue>({
  user: null,
  login: async () => {},
  logout: () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null)

  useEffect(() => {
    const raw = localStorage.getItem('auth:user')
    if (raw) {
      try {
        setUser(JSON.parse(raw))
      } catch {
        localStorage.removeItem('auth:user')
      }
    }
  }, [])

  const login = useCallback(async (username: string, password: string) => {
    // Placeholder for real API integration
    await new Promise((r) => setTimeout(r, 500))
    const fakeUser: UserProfile = { id: 'u_1', name: username, role: 'Admin' }
    setUser(fakeUser)
    localStorage.setItem('auth:user', JSON.stringify(fakeUser))
  }, [])

  const logout = useCallback(() => {
    setUser(null)
    localStorage.removeItem('auth:user')
  }, [])

  const value = useMemo(() => ({ user, login, logout }), [user, login, logout])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}



