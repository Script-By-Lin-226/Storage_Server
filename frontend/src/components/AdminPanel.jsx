import React, { useState, useEffect } from 'react'
import axios from 'axios'
import {
  Users,
  Trash2,
  Edit2,
  Shield,
  Search,
  RefreshCw,
  TrendingUp,
  HardDrive,
  FileText,
  X,
  Check,
  Crown,
  Clock,
  CheckCircle2,
  XCircle
} from 'lucide-react'
import AdminMessages from './AdminMessages'

function AdminPanel() {
  const [users, setUsers] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedUser, setSelectedUser] = useState(null)
  const [showQuotaModal, setShowQuotaModal] = useState(false)
  const [showRoleModal, setShowRoleModal] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [quotaValue, setQuotaValue] = useState('')
  const [roleValue, setRoleValue] = useState('user')
  const [passwordValue, setPasswordValue] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [activeTab, setActiveTab] = useState('users')
  const [premiumPurchases, setPremiumPurchases] = useState([])
  const [premiumLoading, setPremiumLoading] = useState(false)

  useEffect(() => {
    fetchUsers()
    fetchStats()
    fetchPremiumPurchases()
  }, [])

  const fetchUsers = async (search = '') => {
    try {
      setLoading(true)
      const params = search ? { search } : {}
      const response = await axios.get('/admin/users', { params })
      setUsers(response.data.users || [])
    } catch (error) {
      setError('Failed to load users')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const response = await axios.get('/admin/stats')
      setStats(response.data)
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    }
  }

  const fetchPremiumPurchases = async () => {
    try {
      setPremiumLoading(true)
      // Fetch all premium purchases; card already shows count of pending.
      const response = await axios.get('/admin/premium-purchases')
      setPremiumPurchases(response.data.purchases || [])
    } catch (error) {
      console.error('Failed to fetch premium purchases:', error)
    } finally {
      setPremiumLoading(false)
    }
  }

  const handleSearch = () => {
    fetchUsers(searchTerm)
  }

  const handleUpdateQuota = async () => {
    if (!selectedUser || !quotaValue || parseFloat(quotaValue) <= 0) {
      setError('Please enter a valid quota (GB)')
      return
    }

    try {
      await axios.patch(`/admin/users/${selectedUser.id}/quota`, {
        quota_gb: parseFloat(quotaValue)
      })
      setSuccess('Quota updated successfully!')
      setShowQuotaModal(false)
      setQuotaValue('')
      setSelectedUser(null)
      fetchUsers(searchTerm)
      fetchStats()
      setTimeout(() => setSuccess(''), 3000)
    } catch (error) {
      setError(error.response?.data?.detail || 'Failed to update quota')
    }
  }

  const handleUpdateRole = async () => {
    if (!selectedUser) return

    try {
      await axios.patch(`/admin/users/${selectedUser.id}/role`, {
        role: roleValue
      })
      setSuccess('Role updated successfully!')
      setShowRoleModal(false)
      setRoleValue('user')
      setSelectedUser(null)
      fetchUsers(searchTerm)
      setTimeout(() => setSuccess(''), 3000)
    } catch (error) {
      setError(error.response?.data?.detail || 'Failed to update role')
    }
  }

  const handleResetPassword = async () => {
    if (!selectedUser || !passwordValue || passwordValue.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    try {
      await axios.post(`/admin/users/${selectedUser.id}/reset-password`, {
        new_password: passwordValue
      })
      setSuccess('Password reset successfully!')
      setShowPasswordModal(false)
      setPasswordValue('')
      setSelectedUser(null)
      setTimeout(() => setSuccess(''), 3000)
    } catch (error) {
      setError(error.response?.data?.detail || 'Failed to reset password')
    }
  }

  const handleDeleteUser = async (user) => {
    if (!window.confirm(`Are you sure you want to delete user "${user.username}"? This will delete all their files!`)) {
      return
    }

    try {
      await axios.delete(`/admin/users/${user.id}`)
      setSuccess('User deleted successfully!')
      fetchUsers(searchTerm)
      fetchStats()
      setTimeout(() => setSuccess(''), 3000)
    } catch (error) {
      setError(error.response?.data?.detail || 'Failed to delete user')
    }
  }

  const openQuotaModal = (user) => {
    setSelectedUser(user)
    setQuotaValue(user.quota?.max_storage_gb?.toString() || '10')
    setShowQuotaModal(true)
    setError('')
  }

  const openRoleModal = (user) => {
    setSelectedUser(user)
    setRoleValue(user.role)
    setShowRoleModal(true)
    setError('')
  }

  const openPasswordModal = (user) => {
    setSelectedUser(user)
    setPasswordValue('')
    setShowPasswordModal(true)
    setError('')
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const formatStatus = (status) => {
    if (status === 'approved') return 'Approved'
    if (status === 'rejected') return 'Rejected'
    return 'Pending'
  }

  const handlePremiumStatusChange = async (purchaseId, newStatus) => {
    try {
      await axios.patch(`/admin/premium-purchases/${purchaseId}`, { status: newStatus })
      setSuccess(`Purchase ${newStatus}`)
      fetchPremiumPurchases()
      fetchStats()
      setTimeout(() => setSuccess(''), 3000)
    } catch (error) {
      setError(error.response?.data?.detail || 'Failed to update premium status')
    }
  }

  const handlePreviewTranscript = async (purchaseId) => {
    try {
      const response = await axios.get(`/admin/premium-purchases/${purchaseId}/transcript`, {
        responseType: 'blob'
      })
      const blobUrl = window.URL.createObjectURL(response.data)
      window.open(blobUrl, '_blank', 'noopener,noreferrer')
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load transcript')
      setTimeout(() => setError(''), 3000)
    }
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-soft dark:shadow-soft-dark p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 truncate">Total Users</p>
                <p className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white mt-1 sm:mt-2">{stats.users?.total || 0}</p>
              </div>
              <Users className="w-6 h-6 sm:w-8 sm:h-8 text-primary-600 dark:text-primary-400 shrink-0" />
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-soft dark:shadow-soft-dark p-4 sm:p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 truncate">Admins</p>
                <p className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white mt-1 sm:mt-2">{stats.users?.admins || 0}</p>
              </div>
              <Shield className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600 dark:text-blue-400 shrink-0" />
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-soft dark:shadow-soft-dark p-4 sm:p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 truncate">Total Files</p>
                <p className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white mt-1 sm:mt-2">{stats.files?.total || 0}</p>
              </div>
              <FileText className="w-6 h-6 sm:w-8 sm:h-8 text-green-600 dark:text-green-400 shrink-0" />
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-soft dark:shadow-soft-dark p-4 sm:p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 truncate">Storage Used</p>
                <p className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white mt-1 sm:mt-2 truncate">
                  {stats.storage?.total_used?.formatted || '0 B'}
                </p>
              </div>
              <HardDrive className="w-6 h-6 sm:w-8 sm:h-8 text-orange-600 dark:text-orange-400 shrink-0" />
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-soft dark:shadow-soft-dark p-4 sm:p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 truncate">Premium Pending</p>
                <p className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white mt-1 sm:mt-2 truncate">
                  {stats.premium?.pending_purchases || 0}
                </p>
              </div>
              <Crown className="w-6 h-6 sm:w-8 sm:h-8 text-amber-500 shrink-0" />
            </div>
          </div>
        </div>
      )}

      {/* Tabs for Users / Payments */}
      <div className="flex items-center gap-2 border-b border-gray-200 dark:border-gray-700">
        <button
          type="button"
          onClick={() => setActiveTab('users')}
          className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px transition ${
            activeTab === 'users'
              ? 'border-primary-500 text-primary-600 dark:text-primary-400'
              : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          Users
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('payments')}
          className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px flex items-center gap-1 transition ${
            activeTab === 'payments'
              ? 'border-primary-500 text-primary-600 dark:text-primary-400'
              : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          <Crown className="w-4 h-4" />
          Payments
          {stats?.premium?.pending_purchases > 0 && (
            <span className="ml-1 inline-flex items-center justify-center px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-[10px] font-semibold text-amber-700 dark:text-amber-300">
              {stats.premium.pending_purchases}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('messages')}
          className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px transition ${
            activeTab === 'messages'
              ? 'border-primary-500 text-primary-600 dark:text-primary-400'
              : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          Messages
        </button>
      </div>

      {activeTab === 'users' && (
        <>
          <div className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-soft dark:shadow-soft-dark p-4 sm:p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-stretch sm:items-center justify-between">
              <div className="flex-1 w-full min-w-0">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Search users..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    className="w-full pl-10 pr-4 py-3 sm:py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 focus:ring-2 focus:ring-primary-500 outline-none text-base sm:text-sm"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 sm:flex gap-2 sm:gap-3">
                <button onClick={handleSearch} className="touch-target inline-flex items-center justify-center gap-2 px-4 py-3 sm:py-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition">
                  <Search className="w-5 h-5 shrink-0" />
                  Search
                </button>
                <button onClick={() => { setSearchTerm(''); fetchUsers() }} className="touch-target inline-flex items-center justify-center gap-2 px-4 py-3 sm:py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition">
                  <RefreshCw className="w-5 h-5 shrink-0" />
                  Refresh
                </button>
              </div>
            </div>
            {error && (
              <div className="mt-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-xl">
                {error}
              </div>
            )}
            {success && (
              <div className="mt-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 px-4 py-3 rounded-xl">
                {success}
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-soft dark:shadow-soft-dark overflow-hidden border border-gray-200 dark:border-gray-700">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="w-8 h-8 text-primary-600 dark:text-primary-400 animate-spin" />
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-12 px-4">
                <Users className="w-14 h-14 sm:w-16 sm:h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400 text-base sm:text-lg">No users found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-[1214.5px] divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700/50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">User</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Role</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Quota</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Used</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Files</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Created</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {users.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">{user.username}</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">{user.email}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${user.role === 'admin' ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300' : 'bg-gray-100 dark:bg-gray-600 text-gray-800 dark:text-gray-300'}`}>
                            {user.role === 'admin' && <Shield className="w-3 h-3 mr-1" />}
                            {user.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{user.quota?.max_storage_gb || 0} GB</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{user.quota?.used_storage_gb || 0} GB</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{user.file_count || 0}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{formatDate(user.created_at)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end gap-2">
                            <button onClick={() => openQuotaModal(user)} className="text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 p-2 rounded-lg" title="Update Quota"><TrendingUp className="w-5 h-5" /></button>
                            <button onClick={() => openRoleModal(user)} className="text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/30 p-2 rounded-lg" title="Change Role"><Shield className="w-5 h-5" /></button>
                            <button onClick={() => openPasswordModal(user)} className="text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/30 p-2 rounded-lg" title="Reset Password"><Edit2 className="w-5 h-5" /></button>
                            <button onClick={() => handleDeleteUser(user)} className="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 p-2 rounded-lg" title="Delete User"><Trash2 className="w-5 h-5" /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === 'payments' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-soft dark:shadow-soft-dark overflow-hidden border border-gray-200 dark:border-gray-700">
          {premiumLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-8 h-8 text-primary-600 dark:text-primary-400 animate-spin" />
            </div>
          ) : premiumPurchases.length === 0 ? (
            <div className="text-center py-12 px-4">
              <Crown className="w-14 h-14 sm:w-16 sm:h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400 text-base sm:text-lg">No pending premium payments</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-[1214.5px] divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">User</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Plan</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Phone</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Method</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Transcript</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Created</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {premiumPurchases.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">{p.username || `User #${p.user_id}`}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">{p.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        <div className="font-medium text-gray-900 dark:text-gray-100">{p.plan_name}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{p.storage_gb} GB • {p.price_ks.toLocaleString()} ks</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{p.phone_msisdn}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{p.payment_method}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {p.transcript_uploaded ? (
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-xs">
                              <FileText className="w-3 h-3" />
                              Uploaded
                            </span>
                            <button
                              type="button"
                              onClick={() => handlePreviewTranscript(p.id)}
                              className="text-xs px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                            >
                              Preview
                            </button>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs">
                            <X className="w-3 h-3" />
                            None
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {formatDate(p.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                        <div className="flex items-center justify-end gap-2">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-xs">
                            <Clock className="w-3 h-3" />
                            {formatStatus(p.status)}
                          </span>
                          <button
                            type="button"
                            onClick={() => handlePremiumStatusChange(p.id, 'approved')}
                            className="inline-flex items-center justify-center p-1.5 rounded-lg text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30"
                            title="Approve"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handlePremiumStatusChange(p.id, 'rejected')}
                            className="inline-flex items-center justify-center p-1.5 rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/30"
                            title="Reject"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'messages' && <AdminMessages />}

      {/* Quota Modal */}
      {showQuotaModal && selectedUser && (
        <div className="fixed inset-0 bg-black/60 dark:bg-black/70 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 w-full max-w-md border border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Update Quota</h3>
              <button onClick={() => setShowQuotaModal(false)} className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"><X className="w-5 h-5" /></button>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Update storage quota for <strong className="text-gray-900 dark:text-white">{selectedUser.username}</strong></p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Quota (GB)</label>
              <input type="number" value={quotaValue} onChange={(e) => setQuotaValue(e.target.value)} min="0" step="0.1" className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 focus:ring-2 focus:ring-primary-500 outline-none" placeholder="Enter quota in GB" />
            </div>
            <div className="flex gap-3">
              <button onClick={handleUpdateQuota} className="flex-1 bg-primary-600 text-white py-2 rounded-xl hover:bg-primary-700 transition">Update</button>
              <button onClick={() => setShowQuotaModal(false)} className="flex-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 py-2 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Role Modal */}
      {showRoleModal && selectedUser && (
        <div className="fixed inset-0 bg-black/60 dark:bg-black/70 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 w-full max-w-md border border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Change Role</h3>
              <button onClick={() => setShowRoleModal(false)} className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"><X className="w-5 h-5" /></button>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Change role for <strong className="text-gray-900 dark:text-white">{selectedUser.username}</strong></p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Role</label>
              <select value={roleValue} onChange={(e) => setRoleValue(e.target.value)} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 outline-none">
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="flex gap-3">
              <button onClick={handleUpdateRole} className="flex-1 bg-primary-600 text-white py-2 rounded-xl hover:bg-primary-700 transition">Update</button>
              <button onClick={() => setShowRoleModal(false)} className="flex-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 py-2 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Password Modal */}
      {showPasswordModal && selectedUser && (
        <div className="fixed inset-0 bg-black/60 dark:bg-black/70 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 w-full max-w-md border border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Reset Password</h3>
              <button onClick={() => setShowPasswordModal(false)} className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"><X className="w-5 h-5" /></button>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Reset password for <strong className="text-gray-900 dark:text-white">{selectedUser.username}</strong></p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">New Password</label>
              <input type="password" value={passwordValue} onChange={(e) => setPasswordValue(e.target.value)} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 focus:ring-2 focus:ring-primary-500 outline-none" placeholder="Enter new password (min 8 characters)" />
            </div>
            <div className="flex gap-3">
              <button onClick={handleResetPassword} className="flex-1 bg-primary-600 text-white py-2 rounded-xl hover:bg-primary-700 transition">Reset</button>
              <button onClick={() => setShowPasswordModal(false)} className="flex-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 py-2 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminPanel
