import { createContext, useCallback, useEffect, useMemo, useState } from 'react'
import { apiService, ApiError, type UserResponse } from '../services/api'

interface UserProfile {
  id: string
  username: string
  email: string
  role_id: string
  role_name: string
  full_name: string
  phone: string
  is_active: boolean
  last_login: string | null
  created_at: string
  updated_at: string
}

interface AuthContextValue {
  user: UserProfile | null
  login: (username: string, password: string) => Promise<void>
  logout: () => void
  isLoading: boolean
  error: string | null
}

export const AuthContext = createContext<AuthContextValue>({
  user: null,
  login: async () => {},
  logout: () => {},
  isLoading: false,
  error: null,
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const initializeAuth = async () => {
      const token = localStorage.getItem('auth:token')
      const userData = localStorage.getItem('auth:user')
      
      if (token && userData) {
        try {
          setUser(JSON.parse(userData))
          // Optionally verify token with backend
          await apiService.getProfile()
        } catch (error) {
          // Token is invalid, clear storage
          localStorage.removeItem('auth:token')
          localStorage.removeItem('auth:user')
          setUser(null)
        }
      }
    }

    initializeAuth()
  }, [])

  const login = useCallback(async (username: string, password: string) => {
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await apiService.login({ username, password })
      
      // Store token and user data
      localStorage.setItem('auth:token', response.token)
      localStorage.setItem('auth:user', JSON.stringify(response.user))
      
      setUser(response.user)
    } catch (error) {
      const errorMessage = error instanceof ApiError 
        ? error.message 
        : 'Login failed. Please try again.'
      setError(errorMessage)
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [])

  const logout = useCallback(async () => {
    try {
      await apiService.logout()
    } catch (error) {
      // Log error but don't prevent logout
      console.error('Logout error:', error)
    } finally {
      setUser(null)
      localStorage.removeItem('auth:token')
      localStorage.removeItem('auth:user')
    }
  }, [])

  const value = useMemo(() => ({ 
    user, 
    login, 
    logout, 
    isLoading, 
    error 
  }), [user, login, logout, isLoading, error])
  
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}



