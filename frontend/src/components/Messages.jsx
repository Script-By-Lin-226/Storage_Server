import React, { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { Send, RefreshCw, MessageSquare, Bell } from 'lucide-react'

function formatTime(ts) {
  if (!ts) return ''
  try {
    return new Date(ts).toLocaleString()
  } catch {
    return ts
  }
}

function renderContent(text) {
  if (!text) return null
  const tokens = text.split(/(\s+)/)
  return tokens.map((t, idx) => {
    const isUrl = /^https?:\/\//i.test(t) || /^\/[A-Za-z0-9]/.test(t)
    if (isUrl) {
      return (
        <a
          key={idx}
          href={t}
          target="_blank"
          rel="noreferrer"
          className="text-primary-600 dark:text-primary-300 underline break-words"
        >
          {t}
        </a>
      )
    }
    return <span key={idx}>{t}</span>
  })
}

export default function Messages() {
  const [loading, setLoading] = useState(true)
  const [messages, setMessages] = useState([])
  const [content, setContent] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const unreadCount = useMemo(() => messages.filter((m) => !m.read_by_user).length, [messages])

  const fetchMessages = async () => {
    try {
      setLoading(true)
      const res = await axios.get('/messages/me', { params: { limit: 200 } })
      const items = res.data?.messages || []
      setMessages(items)

      // Mark unseen messages as read (best effort)
      const unread = items.filter((m) => !m.read_by_user)
      await Promise.allSettled(unread.map((m) => axios.patch(`/messages/${m.id}/read`)))
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to load messages')
      setTimeout(() => setError(''), 3000)
    } finally {
      setLoading(false)
    }
  }

  const checkExpiryReminder = async () => {
    // backend will dedupe and only create when near expiry
    try {
      await axios.post('/messages/expiry-reminder/check', null, { params: { days_before: 7 } })
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    ;(async () => {
      await checkExpiryReminder()
      await fetchMessages()
    })()
  }, [])

  const handleSend = async () => {
    const text = content.trim()
    if (!text) return
    try {
      await axios.post('/messages', { content: text })
      setContent('')
      setSuccess('Message sent')
      setTimeout(() => setSuccess(''), 2000)
      fetchMessages()
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to send message')
      setTimeout(() => setError(''), 3000)
    }
  }

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-soft dark:shadow-soft-dark p-4 sm:p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-primary-600 dark:text-primary-400" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Messages</h2>
              {unreadCount > 0 && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-xs font-semibold text-amber-700 dark:text-amber-300">
                  {unreadCount} new
                </span>
              )}
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Send a message to Admin. Expiry reminders will appear here automatically.
            </p>
          </div>
          <button
            type="button"
            onClick={fetchMessages}
            className="touch-target inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline text-sm font-medium">Refresh</span>
          </button>
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

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-soft dark:shadow-soft-dark border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Write to Admin</label>
          <div className="flex gap-2">
            <input
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Type your message..."
              className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 focus:ring-2 focus:ring-primary-500 outline-none"
            />
            <button
              type="button"
              onClick={handleSend}
              className="touch-target inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary-600 text-white hover:bg-primary-700"
            >
              <Send className="w-4 h-4" />
              Send
            </button>
          </div>
        </div>

        <div className="p-4 sm:p-6">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <RefreshCw className="w-8 h-8 text-primary-600 dark:text-primary-400 animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-10 text-gray-500 dark:text-gray-400">
              <Bell className="w-10 h-10 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
              No messages yet
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`rounded-xl border p-3 sm:p-4 ${
                    m.sender === 'admin'
                      ? 'border-blue-200 dark:border-blue-900/50 bg-blue-50/60 dark:bg-blue-900/20'
                      : m.sender === 'system'
                        ? 'border-amber-200 dark:border-amber-900/50 bg-amber-50/60 dark:bg-amber-900/20'
                        : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/40'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-xs font-semibold text-gray-700 dark:text-gray-200">
                      {m.sender === 'admin' ? 'Admin' : m.sender === 'system' ? 'System' : 'You'}
                      {m.message_type === 'expiry_reminder' && (
                        <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 text-[10px] font-semibold">
                          Expiry reminder
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-gray-500 dark:text-gray-400">{formatTime(m.created_at)}</div>
                  </div>
                  <div className="mt-2 whitespace-pre-wrap text-sm text-gray-800 dark:text-gray-100 font-sans leading-relaxed">
                    {renderContent(m.content)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

