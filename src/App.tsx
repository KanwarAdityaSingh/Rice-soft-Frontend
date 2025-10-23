import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { ThemeProvider } from './theme/ThemeProvider'
import { AuthProvider } from './providers/AuthProvider'
import LandingPage from './pages/Landing'
import LoginPage from './pages/Login'
import { AppLayout } from './layouts/AppLayout'
import { ProtectedRoute } from './components/ProtectedRoute'

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <LandingPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route path="/login" element={<LoginPage />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  )
}
