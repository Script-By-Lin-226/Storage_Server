import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { User, Mail, Shield, HardDrive, Clock, Crown } from 'lucide-react'

function Profile() {
  const [userInfo, setUserInfo] = useState(null)
  const [activePlan, setActivePlan] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        setError('')

        const [meRes, purchasesRes, statsRes] = await Promise.all([
          axios.get('/user/me'),
          axios.get('/premium/purchases'),
          axios.get('/files/stats'),
        ])

        setUserInfo(meRes.data)

        const purchases = purchasesRes.data?.purchases || []
        const active = purchases.find((p) => p.is_active) || null
        setActivePlan(active)
      } catch (err) {
        console.error('Failed to load profile', err)
        setError('Failed to load profile information')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  const formatDate = (iso) => {
    if (!iso) return 'N/A'
    return new Date(iso).toLocaleDateString()
  }

  if (loading) {
    return (
      <div className="w-full px-4 py-6">
        <p className="text-sm text-[#4E5153] dark:text-[#B9B9B9]">Loading profile...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="w-full px-4 py-6">
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      </div>
    )
  }

  return (
    <div className="w-full px-3 sm:px-6 lg:px-8 py-4 sm:py-6 flex justify-end">
      <div className="w-full max-w-md space-y-4 sm:space-y-6">
        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 sm:p-5 shadow-soft dark:shadow-soft-dark">
          <h2 className="text-base sm:text-lg font-semibold text-[#121212] dark:text-white mb-3 flex items-center gap-2">
            <User className="w-4 h-4 sm:w-5 sm:h-5 text-[#86FF3B]" />
            Account
          </h2>
          <div className="space-y-2.5 sm:space-y-3 text-sm">
            <div className="flex items-center gap-3">
              <User className="w-4 h-4 text-[#4E5153] dark:text-[#B9B9B9]" />
              <div className="min-w-0">
                <p className="text-[11px] text-[#4E5153] dark:text-[#B9B9B9] uppercase tracking-wide">Username</p>
                <p className="text-sm text-[#121212] dark:text-white font-medium truncate">{userInfo?.username}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Mail className="w-4 h-4 text-[#4E5153] dark:text-[#B9B9B9]" />
              <div className="min-w-0">
                <p className="text-[11px] text-[#4E5153] dark:text-[#B9B9B9] uppercase tracking-wide">Email</p>
                <p className="text-sm text-[#121212] dark:text-white font-medium break-words">{userInfo?.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Shield className="w-4 h-4 text-[#4E5153] dark:text-[#B9B9B9]" />
              <div>
                <p className="text-[11px] text-[#4E5153] dark:text-[#B9B9B9] uppercase tracking-wide">Role</p>
                <p className="text-sm text-[#121212] dark:text-white font-medium capitalize">{userInfo?.role}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Clock className="w-4 h-4 text-[#4E5153] dark:text-[#B9B9B9]" />
              <div>
                <p className="text-[11px] text-[#4E5153] dark:text-[#B9B9B9] uppercase tracking-wide">Joined</p>
                <p className="text-sm text-[#121212] dark:text-white font-medium">
                  {formatDate(userInfo?.created_at)}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 sm:p-5 shadow-soft dark:shadow-soft-dark">
          <h2 className="text-base sm:text-lg font-semibold text-[#121212] dark:text-white mb-3 flex items-center gap-2">
            <Crown className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500" />
            Active Plan
          </h2>
          {activePlan ? (
            <div className="space-y-2 text-sm">
              <p className="text-[#121212] dark:text-white font-medium">
                {activePlan.plan_name}{' '}
                <span className="text-xs font-normal text-[#4E5153] dark:text-[#B9B9B9]">
                  ({activePlan.storage_gb >= 1024 ? '1 TB' : `${activePlan.storage_gb} GB`})
                </span>
              </p>
              <p className="text-xs text-[#4E5153] dark:text-[#B9B9B9]">
                Status:{' '}
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                  {activePlan.status === 'approved' ? 'Approved' : activePlan.status}
                </span>
              </p>
              <p className="text-xs text-[#4E5153] dark:text-[#B9B9B9]">
                Next billing date: {formatDate(activePlan.expires_at)}
              </p>
            </div>
          ) : (
            <p className="text-sm text-[#4E5153] dark:text-[#B9B9B9]">
              You are currently on the Basic free plan. Upgrade to Premium for more space.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export default Profile

