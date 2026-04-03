import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import Login from '@/pages/Login'
import HotSheet from '@/pages/HotSheet'
import CostsView from '@/pages/CostsView'
import Settings from '@/pages/Settings'
import Training from '@/pages/Training'
import TrainingSession from '@/pages/TrainingSession'
import TrainingComplete from '@/pages/TrainingComplete'
import Leaderboard from '@/pages/Leaderboard'
import AdminDashboard from '@/pages/AdminDashboard'
import ScenarioManager from '@/pages/ScenarioManager'
import HostawayImporter from '@/pages/HostawayImporter'
import TeamManagement from '@/pages/TeamManagement'
import type { ReactNode } from 'react'

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { session, profile, loading, signOut } = useAuth()

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

  // Approval gate — unapproved users see a waiting screen
  if (profile && !profile.approved) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-page-bg">
        <div className="text-center max-w-sm mx-auto px-6">
          <div className="w-14 h-14 rounded-full bg-surface border border-border flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">&#x23F3;</span>
          </div>
          <h2 className="text-lg font-semibold text-text-primary mb-2">Waiting for Approval</h2>
          <p className="text-sm text-text-secondary mb-1">
            Hi {profile.name}, your account has been created.
          </p>
          <p className="text-sm text-text-secondary mb-6">
            An admin needs to approve your access before you can use HavenHQ. Hang tight!
          </p>
          <button
            onClick={() => signOut()}
            className="text-sm text-text-muted hover:text-text-secondary transition-colors cursor-pointer"
          >
            Sign out
          </button>
        </div>
      </div>
    )
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
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/scenarios"
        element={
          <ProtectedRoute>
            <ScenarioManager />
          </ProtectedRoute>
        }
      />
      <Route
        path="/leaderboard"
        element={
          <ProtectedRoute>
            <Leaderboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/team"
        element={
          <ProtectedRoute>
            <TeamManagement />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/imports"
        element={
          <ProtectedRoute>
            <HostawayImporter />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
