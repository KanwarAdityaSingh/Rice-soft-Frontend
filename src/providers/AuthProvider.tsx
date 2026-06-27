import { createContext, useCallback, useEffect, useMemo, useState } from 'react'
import { apiService, ApiError } from '../services/api'
import {
  clearAuthStorage,
  getAccessToken,
  getStoredUser,
  migrateLegacyAuthStorage,
  setAccessToken,
  setStoredPermissions,
  setStoredUser,
} from '../services/authStorage'
import { setPermissions } from '../utils/permissions'
import type { PermissionsMap } from '../types/entities'

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
  loginWithOtp: (phone: string, otp: string) => Promise<void>
  logout: () => void
  isLoading: boolean
  error: string | null
}

export const AuthContext = createContext<AuthContextValue>({
  user: null,
  login: async () => {},
  loginWithOtp: async () => {},
  logout: () => {},
  isLoading: false,
  error: null,
})

function persistLoginSession(response: {
  token: string
  user: UserProfile
  permissions?: PermissionsMap | null
}) {
  apiService.resetSessionInvalidationGuard()
  setAccessToken(response.token)
  setStoredUser(response.user)
  setStoredPermissions(response.permissions ?? null)
  setPermissions(response.permissions ?? null)
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const logout = useCallback(() => {
    setUser(null)
    setPermissions(null)
    clearAuthStorage()
    apiService.logout().catch(() => {})
  }, [])

  useEffect(() => {
    apiService.setLogoutCallback(() => {
      setUser(null)
      setPermissions(null)
      clearAuthStorage()
    })
  }, [])

  useEffect(() => {
    let cancelled = false

    const init = async () => {
      setIsLoading(true)
      migrateLegacyAuthStorage()

      try {
        const cachedUser = getStoredUser<UserProfile>()
        const token = getAccessToken()

        if (cancelled) return

        if (!token) {
          // Tab has no session — do not silently restore from refresh cookie (banking-style).
          clearAuthStorage()
          setPermissions(null)
          setUser(null)
          return
        }

        if (cachedUser && !cancelled) {
          setUser(cachedUser)
        }

        try {
          const profile = await apiService.getProfile()
          if (cancelled) return
          setStoredUser(profile)
          setUser(profile)
        } catch (err) {
          if (cancelled) return
          if (err instanceof ApiError && err.status === 401) {
            clearAuthStorage()
            setPermissions(null)
            setUser(null)
          }
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    void init()
    return () => {
      cancelled = true
    }
  }, [])

  const login = useCallback(async (username: string, password: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await apiService.login({ username, password })
      persistLoginSession(response)
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

  const loginWithOtp = useCallback(async (phone: string, otp: string) => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await apiService.verifyOtp(phone, otp)
      persistLoginSession(response)
      setUser(response.user)
    } catch (error) {
      let errorMessage = 'Login failed. Please try again.'
      if (error instanceof ApiError) {
        if (error.status === 401) {
          errorMessage = error.data?.error || 'Invalid OTP'
        } else if (error.status === 429) {
          errorMessage = error.message || 'Too many requests. Please try again later.'
        } else if (error.status === 400) {
          errorMessage = error.message || 'Validation failed'
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

  const value = useMemo(
    () => ({
      user,
      login,
      loginWithOtp,
      logout,
      isLoading,
      error,
    }),
    [user, login, loginWithOtp, logout, isLoading, error]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
