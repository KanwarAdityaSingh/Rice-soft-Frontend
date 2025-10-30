import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { ThemeProvider } from './theme/ThemeProvider'
import { AuthProvider } from './providers/AuthProvider'
import LandingPage from './pages/Landing'
import LoginPage from './pages/Login'
import ManageUsers from './pages/admin/ManageUsers'
import BrokersPage from './pages/directory/Brokers.tsx'
import SalesmenPage from './pages/directory/Salesmen.tsx'
import VendorsPage from './pages/directory/Vendors.tsx'
import LeadsPage from './pages/crm/Leads'
import LeadDetailPage from './pages/crm/LeadDetail'
import AnalyticsPage from './pages/crm/Analytics'
import LeaderboardPage from './pages/crm/Leaderboard'
import { AppLayout } from './layouts/AppLayout'
import { ProtectedRoute } from './components/ProtectedRoute'

export default function App() {
  // Global error handler
  if (typeof window !== 'undefined') {
    window.addEventListener('error', (e) => {
      console.error('Global error:', e.error);
    });
  }
  
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <AnimatedRoutes />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  )
}

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
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
        <Route
          path="/admin/users"
          element={
            <ProtectedRoute>
              <AppLayout>
                <ManageUsers />
              </AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/crm/leads"
          element={
            <ProtectedRoute>
              <AppLayout>
                <LeadsPage />
              </AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/crm/leads/:id"
          element={
            <ProtectedRoute>
              <AppLayout>
                <LeadDetailPage />
              </AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/crm/analytics"
          element={
            <ProtectedRoute>
              <AppLayout>
                <AnalyticsPage />
              </AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/crm/leaderboard"
          element={
            <ProtectedRoute>
              <AppLayout>
                <LeaderboardPage />
              </AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/directory/brokers"
          element={
            <ProtectedRoute>
              <AppLayout>
                <BrokersPage />
              </AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/directory/salesmen"
          element={
            <ProtectedRoute>
              <AppLayout>
                <SalesmenPage />
              </AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/directory/vendors"
          element={
            <ProtectedRoute>
              <AppLayout>
                <VendorsPage />
              </AppLayout>
            </ProtectedRoute>
          }
        />
      </Routes>
    </AnimatePresence>
  );
}
