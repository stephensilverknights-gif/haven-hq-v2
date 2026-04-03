import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import Login from '@/pages/Login'
import HotSheet from '@/pages/HotSheet'
import CostsView from '@/pages/CostsView'
import Settings from '@/pages/Settings'
import Training from '@/pages/Training'
import TrainingSession from '@/pages/TrainingSession'
import TrainingComplete from '@/pages/TrainingComplete'
import type { ReactNode } from 'react'

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-page-bg">
        <p className="text-text-secondary">Loading...</p>
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <HotSheet />
          </ProtectedRoute>
        }
      />
      <Route
        path="/costs"
        element={
          <ProtectedRoute>
            <CostsView />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <Settings />
          </ProtectedRoute>
        }
      />
      <Route
        path="/training"
        element={
          <ProtectedRoute>
            <Training />
          </ProtectedRoute>
        }
      />
      <Route
        path="/training/session/:id"
        element={
          <ProtectedRoute>
            <TrainingSession />
          </ProtectedRoute>
        }
      />
      <Route
        path="/training/complete/:id"
        element={
          <ProtectedRoute>
            <TrainingComplete />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
