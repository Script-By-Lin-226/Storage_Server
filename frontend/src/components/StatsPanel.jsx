import React from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'
import {
  HardDrive,
  Folder,
  FileText,
  TrendingUp,
  RefreshCw
} from 'lucide-react'

function StatsPanel({ stats, loading }) {
  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700">
              <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-24 mb-4" />
              <div className="h-8 bg-gray-200 dark:bg-gray-600 rounded w-20 mb-2" />
              <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-32" />
            </div>
          ))}
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700">
          <div className="h-6 bg-gray-200 dark:bg-gray-600 rounded w-48 mb-6" />
          <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-full max-w-md mb-4" />
          <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-3/4 max-w-sm" />
        </div>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400">No statistics available</p>
      </div>
    )
  }

  const { user_storage, quota, file_types } = stats

  const formatPercent = (value) => {
    if (value == null || Number.isNaN(value)) return '0.0'
    const num = Number(value)
    if (num > 0 && num < 0.1) return '<0.1'
    return num.toFixed(1)
  }

  // Prepare data for pie chart (top 8 file types to avoid clutter)
  const fileTypeEntries = Object.entries(file_types || {})
    .sort(([, a], [, b]) => b - a)
  
  const topFileTypes = fileTypeEntries.slice(0, 8)
  const otherCount = fileTypeEntries.slice(8).reduce((sum, [, count]) => sum + count, 0)
  
  const fileTypeData = topFileTypes.map(([name, count]) => ({
    name: name === 'unknown' ? 'Other' : name.toUpperCase().replace('.', ''),
    value: count,
  }))
  
  // Add "Others" category if there are more file types
  if (otherCount > 0) {
    fileTypeData.push({
      name: 'Others',
      value: otherCount,
    })
  }

  // Professional color palette
  const COLORS = [
    '#0ea5e9', // Primary blue
    '#3b82f6', // Blue
    '#6366f1', // Indigo
    '#8b5cf6', // Purple
    '#a855f7', // Purple
    '#ec4899', // Pink
    '#f59e0b', // Amber
    '#10b981', // Green
    '#6b7280', // Gray for Others
  ]

  const StatCard = ({ icon: Icon, title, value, subtitle, colorClass = 'bg-primary-100 dark:bg-primary-900/40 text-primary-600 dark:text-primary-400' }) => (
    <div className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-soft dark:shadow-soft-dark p-4 sm:p-6 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 truncate">{title}</p>
          <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mt-1 sm:mt-2 truncate">{value}</p>
          {subtitle && <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5 truncate">{subtitle}</p>}
        </div>
        <div className={`shrink-0 p-2.5 sm:p-3 rounded-xl ${colorClass}`}>
          <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
        </div>
      </div>
    </div>
  )

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
        <StatCard
          icon={HardDrive}
          title="Total Quota"
          value={quota?.total?.formatted || '0 B'}
          subtitle="Your allocated storage"
          colorClass="bg-primary-100 dark:bg-primary-900/40 text-primary-600 dark:text-primary-400"
        />
        <StatCard
          icon={TrendingUp}
          title="Free Space"
          value={quota?.free?.formatted || '0 B'}
          subtitle={`${formatPercent(quota?.free_percentage)}% available`}
          colorClass="bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400"
        />
        <StatCard
          icon={Folder}
          title="Your Files"
          value={user_storage?.total_files || 0}
          subtitle={`${user_storage?.total_size?.formatted || '0 B'} total`}
          colorClass="bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400"
        />
        <StatCard
          icon={FileText}
          title="Used Space"
          value={quota?.used?.formatted || '0 B'}
          subtitle={`${formatPercent(quota?.used_percentage)}% of quota`}
          colorClass="bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400"
        />
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-soft dark:shadow-soft-dark p-4 sm:p-6 border border-gray-200 dark:border-gray-700">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-4 sm:mb-6">Your Storage Quota</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
          {/* Progress Bar */}
          <div>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600 dark:text-gray-400">Used</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {quota?.used?.formatted || '0 B'} / {quota?.total?.formatted || '0 B'}
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-4">
                  <div
                    className="bg-primary-600 h-4 rounded-full transition-all duration-500"
                    style={{ width: `${quota?.used_percentage || 0}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {formatPercent(quota?.used_percentage)}% of your quota used
                </p>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600 dark:text-gray-400">Free</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {quota?.free?.formatted || '0 B'}
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-4">
                  <div
                    className="bg-green-500 h-4 rounded-full transition-all duration-500"
                    style={{ width: `${quota?.free_percentage || 0}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {formatPercent(quota?.free_percentage)}% of your quota available
                </p>
              </div>
            </div>
          </div>

          {/* File Types Chart */}
          {fileTypeData.length > 0 && (
            <div>
              <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-white mb-3 sm:mb-4">
                File Types Distribution
              </h3>
              <div className="h-[220px] sm:h-[320px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={fileTypeData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={100}
                    innerRadius={50}
                    paddingAngle={2}
                    dataKey="value"
                    animationBegin={0}
                    animationDuration={800}
                  >
                    {fileTypeData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                        stroke="#fff"
                        strokeWidth={2}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--tooltip-bg, #fff)',
                      border: '1px solid #e5e7eb',
                      borderRadius: '12px',
                      padding: '12px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                      fontSize: '14px',
                    }}
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null
                      const total = fileTypeData.reduce((s, i) => s + i.value, 0)
                      const pct = ((payload[0].value / total) * 100).toFixed(1)
                      return (
                        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 shadow-lg">
                          <span className="font-medium text-gray-900 dark:text-white">{payload[0].name}</span>
                          <span className="text-gray-600 dark:text-gray-400"> · {payload[0].value} files ({pct}%)</span>
                        </div>
                      )
                    }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    iconType="circle"
                    wrapperStyle={{
                      paddingTop: '20px',
                      fontSize: '13px'
                    }}
                    formatter={(value, entry) => {
                      const total = fileTypeData.reduce((sum, item) => sum + item.value, 0)
                      const item = fileTypeData.find(d => d.name === value)
                      const percentage = item ? ((item.value / total) * 100).toFixed(1) : '0'
                      return `${value} (${percentage}%)`
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-soft dark:shadow-soft-dark p-4 sm:p-6 border border-gray-200 dark:border-gray-700">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-4 sm:mb-6">
          Detailed Statistics
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          <div>
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">Your Storage</h3>
            <dl className="space-y-2">
              <div className="flex justify-between">
                <dt className="text-gray-600 dark:text-gray-400">Total Files:</dt>
                <dd className="font-medium text-gray-900 dark:text-white">{user_storage?.total_files || 0}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600 dark:text-gray-400">Total Size:</dt>
                <dd className="font-medium text-gray-900 dark:text-white">{user_storage?.total_size?.formatted || '0 B'}</dd>
              </div>
            </dl>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">Your Quota</h3>
            <dl className="space-y-2">
              <div className="flex justify-between">
                <dt className="text-gray-600 dark:text-gray-400">Total Quota:</dt>
                <dd className="font-medium text-gray-900 dark:text-white">{quota?.total?.formatted || '0 B'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600 dark:text-gray-400">Used:</dt>
                <dd className="font-medium text-gray-900 dark:text-white">
                  {quota?.used?.formatted || '0 B'} ({formatPercent(quota?.used_percentage)}%)
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600 dark:text-gray-400">Free:</dt>
                <dd className="font-medium text-gray-900 dark:text-white">
                  {quota?.free?.formatted || '0 B'} ({formatPercent(quota?.free_percentage)}%)
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  )
}

export default StatsPanel
