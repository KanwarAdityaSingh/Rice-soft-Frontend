import { createContext, useCallback, useEffect, useMemo, useState } from 'react'
import { apiService, ApiError } from '../services/api'

interface UserProfile {
  id: string
  username: string
  email: string
  full_name: string
  phone: string | null
  user_type: string
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
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Initialize auth from storage or fetch profile with token
    const init = async () => {
      setIsLoading(true)
      try {
        const userData = localStorage.getItem('auth:user')
        const token = localStorage.getItem('auth:token')

        if (userData) {
          try {
            setUser(JSON.parse(userData))
          } catch {
            localStorage.removeItem('auth:user')
          }
        } else if (token) {
          try {
            const profile = await apiService.getProfile()
            localStorage.setItem('auth:user', JSON.stringify(profile))
            setUser(profile)
          } catch (e) {
            // Invalid/expired token
            localStorage.removeItem('auth:token')
            localStorage.removeItem('auth:user')
            setUser(null)
          }
        } else {
          setUser(null)
        }
      } finally {
        setIsLoading(false)
      }
    }
    void init()
  }, [])

  const login = useCallback(async (username: string, password: string) => {
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await apiService.login({ username, password })
      
      // Store token and user data in localStorage
      localStorage.setItem('auth:token', response.token)
      localStorage.setItem('auth:user', JSON.stringify(response.user))
      
      setUser(response.user)
    } catch (error) {
      let errorMessage = 'Login failed. Please try again.'
      
      if (error instanceof ApiError) {
        if (error.status === 401) {
          errorMessage = 'Invalid username or password'
        } else if (error.status === 400) {
          errorMessage = 'Please check your username and password'
        } else {
          errorMessage = error.message || 'Login failed'
        }
      } else if (error instanceof Error) {
        errorMessage = error.message
      }
      
      setError(errorMessage)
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [])

  const logout = useCallback(() => {
    setUser(null)
    localStorage.removeItem('auth:token')
    localStorage.removeItem('auth:user')
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