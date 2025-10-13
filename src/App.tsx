import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ThemeProvider } from './theme/ThemeProvider'
import { AuthProvider, AuthContext } from './providers/AuthProvider'
import LandingPage from './pages/Landing'
import LoginPage from './pages/Login'
import { useContext, type ReactNode } from 'react'
import { AppLayout } from './layouts/AppLayout'

function RequireAuth({ children }: { children: ReactNode }) {
  const { user } = useContext(AuthContext)
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route
              path="/"
              element={
                <RequireAuth>
                  <AppLayout>
                    <LandingPage />
                  </AppLayout>
                </RequireAuth>
              }
            />
            <Route path="/login" element={<LoginPage />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  )
}
