import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import FileManager from './FileManager'
import StatsPanel from './StatsPanel'
import AdminPanel from './AdminPanel'
import Messages from './Messages'
import { LogOut, Folder, BarChart3, Shield, Moon, Sun, User, Crown, MessageSquare } from 'lucide-react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'

function Dashboard() {
  const { logout, user } = useAuth()
  const { dark, toggle: toggleTheme } = useTheme()
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('files')
  const isAdmin = user?.role === 'admin'

  useEffect(() => {
    fetchStats()
    const interval = setInterval(fetchStats, 30000)
    return () => clearInterval(interval)
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

  const navItems = [
    { id: 'files', label: 'Files', shortLabel: 'Files', icon: Folder },
    { id: 'stats', label: 'Statistics', shortLabel: 'Stats', icon: BarChart3 },
    { id: 'messages', label: 'Messages', shortLabel: 'Messages', icon: MessageSquare },
    ...(isAdmin ? [{ id: 'admin', label: 'Admin', shortLabel: 'Admin', icon: Shield }] : []),
  ]

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <header className="bg-white dark:bg-gray-800 shadow-soft dark:shadow-soft-dark border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14 sm:h-16 gap-2 min-h-[3.5rem]">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <div className="flex shrink-0 items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-primary-100 dark:bg-primary-900/40 text-primary-600 dark:text-primary-400">
                <Folder className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <h1 className="text-base sm:text-xl font-bold text-gray-900 dark:text-white truncate">Kyike Tar Tein</h1>
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
              <span className="hidden sm:inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm truncate max-w-[120px] lg:max-w-[180px]">
                <User className="w-4 h-4 shrink-0" />
                <span className="truncate">{user?.username || user?.email}</span>
              </span>
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

      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 overflow-x-auto overflow-y-hidden -mb-px">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <nav className="flex gap-0.5 sm:gap-1 min-w-0">
            {navItems.map(({ id, label, shortLabel, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`touch-target flex items-center shrink-0 py-3.5 sm:py-4 px-3 sm:px-4 border-b-2 font-medium text-xs sm:text-sm transition rounded-t-lg whitespace-nowrap ${
                  activeTab === id
                    ? 'border-primary-500 text-primary-600 dark:text-primary-400 bg-primary-50/50 dark:bg-primary-900/20'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                }`}
              >
                <Icon className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2 shrink-0" />
                {shortLabel}
              </button>
            ))}
          </nav>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
        {activeTab === 'files' && <FileManager onFileChange={fetchStats} />}
        {activeTab === 'stats' && <StatsPanel stats={stats} loading={loading} />}
        {activeTab === 'messages' && <Messages />}
        {activeTab === 'admin' && isAdmin && <AdminPanel />}
      </main>

      <footer className="border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 text-sm text-gray-600 dark:text-gray-400 flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
          <div>© {new Date().getFullYear()} Kyike Tar Tein. All rights reserved.</div>
          <div className="flex items-center gap-2">
            <span>Contact:</span>
            <a
              className="text-primary-600 dark:text-primary-400 hover:underline"
              href="https://t.me/Liam_226"
              target="_blank"
              rel="noreferrer"
            >
              @Liam_226
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default Dashboard
