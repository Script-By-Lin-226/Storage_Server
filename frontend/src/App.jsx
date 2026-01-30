import React, { Suspense, lazy, useEffect, useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import { ToastProvider } from './context/ToastContext'
import { UploadProvider } from './context/UploadContext'
import { SpeedInsights } from "@vercel/speed-insights/react"
import { Analytics } from "@vercel/analytics/react"
import './App.css'

const Dashboard = lazy(() => import('./components/Dashboard'))
const Auth = lazy(() => import('./components/Auth'))
const Premium = lazy(() => import('./components/Premium'))
const Profile = lazy(() => import('./components/Profile'))
const UploadProgressBar = lazy(() => import('./components/UploadProgressBar'))

function useIdleMount(delayMs = 2000) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    let cancelled = false

    const mount = () => {
      if (!cancelled) setMounted(true)
    }

    // Prefer idle time to avoid stealing main-thread during FCP/LCP.
    if (typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function') {
      const id = window.requestIdleCallback(mount, { timeout: delayMs })
      return () => {
        cancelled = true
        try {
          window.cancelIdleCallback(id)
        } catch (_) {}
      }
    }

    const t = window.setTimeout(mount, delayMs)
    return () => {
      cancelled = true
      window.clearTimeout(t)
    }
  }, [delayMs])

  return mounted
}


function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-primary-500 border-t-transparent" />
      </div>
    )
  }

  return isAuthenticated ? children : <Navigate to="/login" />
}

function App() {
  const mountTelemetry = useIdleMount(2000)

  return (
    <ThemeProvider>
      <ToastProvider>
        <UploadProvider>
          <AuthProvider>
            <Router>
              <Suspense
                fallback={
                  <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
                    <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary-500 border-t-transparent" />
                  </div>
                }
              >
                <Routes>
                  <Route path="/login" element={<Auth />} />
                  <Route
                    path="/"
                    element={
                      <ProtectedRoute>
                        <Dashboard />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/premium"
                    element={
                      <ProtectedRoute>
                        <Premium />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/profile"
                    element={
                      <ProtectedRoute>
                        <Profile />
                      </ProtectedRoute>
                    }
                  />
                  <Route path="*" element={<Navigate to="/" />} />
                </Routes>
              </Suspense>
              {/* Global upload progress bar – stays mounted across all pages */}
              <Suspense fallback={null}>
                <UploadProgressBar />
              </Suspense>
            </Router>
            {mountTelemetry && (
              <>
                <SpeedInsights />
                <Analytics />
              </>
            )}
          </AuthProvider>
        </UploadProvider>
      </ToastProvider>
    </ThemeProvider>
  )
}

export default App
