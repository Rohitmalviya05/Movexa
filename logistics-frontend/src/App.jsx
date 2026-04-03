import React from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './context/AuthContext'
import Layout from './components/common/Layout'
import { LoadingScreen } from './components/common'

// Pages
import LandingPage from './components/common/LandingPage'
import { LoginPage, SignupPage } from './components/auth/AuthPages'
import CustomerDashboard from './components/customer/Dashboard'
import BookVehicle from './components/booking/BookVehicle'
import { BookingsList, BookingDetail } from './components/booking/Bookings'
import PaymentsPage from './components/payment/PaymentsPage'
import Settings from './components/common/Settings'
import DriverDashboard from './components/driver/DriverDashboard'
import DriverSetup from './components/driver/DriverSetup'
import { DriverBookingDetail, DriverBookingsList } from './components/driver/DriverBookings'
import DriverEarnings from './components/driver/DriverEarnings'

// ─── Guards ──────────────────────────────────────────────────────────────────

function RequireAuth({ children }) {
  const { isAuthenticated, loading } = useAuth()
  const location = useLocation()
  if (loading) return <LoadingScreen message="Authenticating..." />
  if (!isAuthenticated) return <Navigate to="/login" state={{ from: location }} replace />
  return children
}

function RequireRole({ role, children }) {
  const { user, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (user?.role !== role) return <Navigate to="/dashboard" replace />
  return children
}

function RedirectIfAuth({ children }) {
  const { isAuthenticated, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (isAuthenticated) return <Navigate to="/dashboard" replace />
  return children
}

// ─── Dashboard router by role ─────────────────────────────────────────────────

function DashboardRouter() {
  const { user } = useAuth()
  if (user?.role === 'driver') return <DriverDashboard />
  return <CustomerDashboard />
}

// ─── Main App ─────────────────────────────────────────────────────────────────

function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login"  element={<RedirectIfAuth><LoginPage /></RedirectIfAuth>} />
      <Route path="/signup" element={<RedirectIfAuth><SignupPage /></RedirectIfAuth>} />

      {/* Authenticated — shared layout */}
      <Route path="/" element={<RequireAuth><Layout /></RequireAuth>}>

        {/* Dashboard — role-aware */}
        <Route path="dashboard" element={<DashboardRouter />} />

        {/* Customer routes */}
        <Route path="book"           element={<RequireRole role="customer"><BookVehicle /></RequireRole>} />
        <Route path="bookings"       element={<RequireRole role="customer"><BookingsList /></RequireRole>} />
        <Route path="bookings/:id"   element={<RequireRole role="customer"><BookingDetail /></RequireRole>} />
        <Route path="payments"       element={<RequireRole role="customer"><PaymentsPage /></RequireRole>} />

        {/* Driver routes */}
        <Route path="driver/setup"           element={<RequireRole role="driver"><DriverSetup /></RequireRole>} />
        <Route path="driver/bookings"        element={<RequireRole role="driver"><DriverBookingsList /></RequireRole>} />
        <Route path="driver/bookings/:id"    element={<RequireRole role="driver"><DriverBookingDetail /></RequireRole>} />
        <Route path="driver/earnings"        element={<RequireRole role="driver"><DriverEarnings /></RequireRole>} />

        {/* Shared */}
        <Route path="settings" element={<Settings />} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3500,
            style: {
              background: '#161b22',
              color: '#f0f6fc',
              border: '1px solid #30363d',
              fontFamily: '"DM Sans", sans-serif',
              fontSize: '14px',
              borderRadius: '12px',
              padding: '12px 16px',
            },
            success: { iconTheme: { primary: '#4ade80', secondary: '#161b22' } },
            error:   { iconTheme: { primary: '#f87171', secondary: '#161b22' } },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  )
}
