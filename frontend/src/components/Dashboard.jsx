import React, { Suspense, lazy, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { LogOut, Folder, BarChart3, Shield, Moon, Sun, User, Crown, MessageSquare, X } from 'lucide-react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'

const FileManager = lazy(() => import('./FileManager'))
const StatsPanel = lazy(() => import('./StatsPanel'))
const AdminPanel = lazy(() => import('./AdminPanel'))
const Messages = lazy(() => import('./Messages'))
const Profile = lazy(() => import('./Profile'))

function Dashboard() {
  const { logout, user } = useAuth()
  const { dark, toggle: toggleTheme } = useTheme()
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('files')
  const [showProfile, setShowProfile] = useState(false)
  const isAdmin = user?.role === 'admin'

  useEffect(() => {
    // LCP optimization: avoid network + state churn during first paint when user is on "Files".
    // Fetch stats when needed, and only poll while the statistics tab is open.
    if (activeTab === 'stats') {
      fetchStats()
      const interval = setInterval(fetchStats, 30000)
      return () => clearInterval(interval)
    }
  }, [])

  const fetchStats = async () => {
    try {
      const response = await axios.get('/files/stats')
      setStats(response.data)
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const navItems = useMemo(
    () => [
      { id: 'files', label: 'Files', shortLabel: 'Files', icon: Folder },
      { id: 'stats', label: 'Statistics', shortLabel: 'Stats', icon: BarChart3 },
      { id: 'messages', label: 'Messages', shortLabel: 'Messages', icon: MessageSquare },
      ...(isAdmin ? [{ id: 'admin', label: 'Admin', shortLabel: 'Admin', icon: Shield }] : []),
    ],
    [isAdmin],
  )

  useEffect(() => {
    if (activeTab === 'stats') fetchStats()
  }, [activeTab])

  const tabFallback = (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 sm:p-6 shadow-soft dark:shadow-soft-dark">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-40 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
          <div className="h-3 w-64 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
        </div>
      </div>
      <div className="mt-4 grid gap-2">
        <div className="h-10 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
        <div className="h-10 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
        <div className="h-10 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-white dark:bg-[#121212] transition-colors">
      <header className="sticky top-0 z-30 bg-white/95 dark:bg-[#121212]/95 backdrop-blur border-b border-gray-200 dark:border-gray-800 shadow-soft dark:shadow-soft-dark">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14 sm:h-16 gap-2 min-h-[3.5rem]">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <div
                className="flex flex-col leading-tight min-w-0 cursor-pointer"
                onClick={() => setShowProfile(true)}
              >
                <span className="ktt-logo-font text-base sm:text-2xl text-[#121212] dark:text-white tracking-tight truncate">
                  Kyike Tar Tein
                </span>
                <span className="hidden xs:inline text-[11px] sm:text-xs text-[#4E5153] dark:text-[#B9B9B9]">
                  Secure Cloud Storage
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1 sm:gap-2 shrink-0">
              {!isAdmin && (
                <button
                  type="button"
                  onClick={() => navigate('/premium')}
                  className="touch-target inline-flex items-center justify-center gap-1 px-2 sm:px-2.5 rounded-lg text-xs font-medium text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                  title="Buy Premium"
                >
                  <Crown className="w-4 h-4" />
                  <span className="hidden sm:inline">Premium</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowProfile(true)}
                className="hidden sm:inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm truncate max-w-[120px] lg:max-w-[180px]"
                title="View profile"
              >
                <User className="w-4 h-4 shrink-0" />
                <span className="truncate">{user?.username || user?.email}</span>
              </button>
              <button type="button" onClick={toggleTheme} className="touch-target inline-flex items-center justify-center p-2.5 rounded-xl text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700" aria-label={dark ? 'Light mode' : 'Dark mode'}>
                {dark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
              <button onClick={logout} className="touch-target flex items-center justify-center gap-1.5 px-3 py-2.5 sm:px-4 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl font-medium text-sm sm:text-base">
                <LogOut className="w-5 h-5 shrink-0" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="bg-white dark:bg-[#121212] border-b border-gray-200 dark:border-gray-800 overflow-x-auto overflow-y-hidden -mb-px">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <nav className="flex gap-0.5 sm:gap-1 min-w-0">
            {navItems.map(({ id, label, shortLabel, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`touch-target flex items-center shrink-0 py-3.5 sm:py-4 px-3 sm:px-4 border-b-2 font-medium text-xs sm:text-sm transition rounded-t-lg whitespace-nowrap ${
                  activeTab === id
                    ? 'border-[#86FF3B] text-[#121212] dark:text-[#86FF3B] bg-[#F5FFEC] dark:bg-[#121212]'
                    : 'border-transparent text-[#4E5153] dark:text-gray-400 hover:text-[#121212] dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                }`}
              >
                <Icon className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2 shrink-0" />
                {shortLabel}
              </button>
            ))}
          </nav>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 pb-24 sm:pb-10">
        <Suspense fallback={tabFallback}>
          {activeTab === 'files' && <FileManager onFileChange={fetchStats} />}
          {activeTab === 'stats' && <StatsPanel stats={stats} loading={loading} />}
          {activeTab === 'messages' && <Messages />}
          {activeTab === 'admin' && isAdmin && <AdminPanel />}
        </Suspense>
      </main>

      <footer className="mt-15 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-[#121212]">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 text-sm text-[#4E5153] dark:text-[#B9B9B9] flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
          <div>© {new Date().getFullYear()} Kyike Tar Tein. All rights reserved.</div>
          <div className="flex items-center gap-2">
            <span>Contact Telegram:</span>
            <a
              className="text-[#86FF3B] hover:underline"
              href="https://t.me/Liam_226"
              target="_blank"
              rel="noreferrer"
            >
              @Liam_226
            </a>
          </div>
        </div>
      </footer>

      {showProfile && (
        <div className="fixed inset-0 z-40 flex justify-end">
          <button
            type="button"
            className="absolute inset-0 bg-black/40 dark:bg-black/60"
            onClick={() => setShowProfile(false)}
            aria-label="Close profile"
          />
          <div className="relative z-50 h-full w-full max-w-md bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 shadow-2xl animate-slide-in-right overflow-y-auto scrollbar-ktt">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800">
              <div className="flex items-center gap-2 min-w-0">
                <span className="ktt-logo-font text-base text-[#121212] dark:text-white tracking-tight truncate">
                  Kyike Tar Tein
                </span>
                <span className="hidden sm:inline text-[11px] text-[#4E5153] dark:text-[#B9B9B9]">
                
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowProfile(false)}
                className="inline-flex items-center justify-center p-1.5 rounded-full text-gray-500 dark:text-gray-400 hover:text-[#121212] dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
                aria-label="Close profile"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-2 sm:px-4 pb-6">
              <Suspense fallback={<div className="px-4 py-6 text-sm text-[#4E5153] dark:text-[#B9B9B9]">Loading profile...</div>}>
                <Profile />
              </Suspense>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Dashboard
