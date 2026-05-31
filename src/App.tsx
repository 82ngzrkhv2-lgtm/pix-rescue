import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth'
import Login from './pages/auth/Login'
import ForgotPassword from './pages/auth/ForgotPassword'
import Dashboard from './pages/app/Dashboard'
import WhatsApp from './pages/app/WhatsApp'
import Integrations from './pages/app/Integrations'
import Flows from './pages/app/Flows'
import Events from './pages/app/Events'
import Settings from './pages/app/Settings'
import Plan from './pages/app/Plan'
import Diagnostics from './pages/app/Diagnostics'
import Homologation from './pages/app/Homologation'
import LandingPage from './pages/LandingPage'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-app)' }}>
        <div className="flex flex-col items-center gap-4">
          <div className="spinner-dark" style={{ width: 32, height: 32, borderWidth: 3 }} />
          <p className="text-sm font-semibold" style={{ color: 'var(--text-muted)' }}>Carregando...</p>
        </div>
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return null
  if (user) return <Navigate to="/app/dashboard" replace />
  return <>{children}</>
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public Landing Page */}
      <Route path="/" element={<LandingPage />} />

      {/* Auth */}
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />

      {/* App (Protected) */}
      <Route path="/app/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/app/whatsapp" element={<ProtectedRoute><WhatsApp /></ProtectedRoute>} />
      <Route path="/app/integrations" element={<ProtectedRoute><Integrations /></ProtectedRoute>} />
      <Route path="/app/flows" element={<ProtectedRoute><Flows /></ProtectedRoute>} />
      <Route path="/app/events" element={<ProtectedRoute><Events /></ProtectedRoute>} />
      <Route path="/app/plan" element={<ProtectedRoute><Plan /></ProtectedRoute>} />
      <Route path="/app/diagnostics" element={<ProtectedRoute><Diagnostics /></ProtectedRoute>} />
      <Route path="/app/homologation" element={<ProtectedRoute><Homologation /></ProtectedRoute>} />
      <Route path="/app/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />

      {/* 404 */}
      <Route path="*" element={<Navigate to="/app/dashboard" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
