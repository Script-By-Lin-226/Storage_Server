import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import FileManager from './FileManager'
import StatsPanel from './StatsPanel'
import AdminPanel from './AdminPanel'
import { LogOut, Folder, BarChart3, Shield } from 'lucide-react'
import axios from 'axios'

function Dashboard() {
  const { logout, user } = useAuth()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('files')
  const isAdmin = user?.role === 'admin'

  useEffect(() => {
    fetchStats()
    // Refresh stats every 30 seconds
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Folder className="w-8 h-8 text-primary-600 mr-3" />
              <h1 className="text-2xl font-bold text-gray-900">Storage Server</h1>
            </div>
            <button
              onClick={logout}
              className="flex items-center px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
            >
              <LogOut className="w-5 h-5 mr-2" />
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('files')}
              className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm transition ${
                activeTab === 'files'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Folder className="w-5 h-5 mr-2" />
              Files
            </button>
            <button
              onClick={() => setActiveTab('stats')}
              className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm transition ${
                activeTab === 'stats'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <BarChart3 className="w-5 h-5 mr-2" />
              Statistics
            </button>
            {isAdmin && (
              <button
                onClick={() => setActiveTab('admin')}
                className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm transition ${
                  activeTab === 'admin'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Shield className="w-5 h-5 mr-2" />
                Admin
              </button>
            )}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'files' && <FileManager onFileChange={fetchStats} />}
        {activeTab === 'stats' && <StatsPanel stats={stats} loading={loading} />}
        {activeTab === 'admin' && isAdmin && <AdminPanel />}
      </main>
    </div>
  )
}

export default Dashboard
