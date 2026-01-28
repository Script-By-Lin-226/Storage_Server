import React, { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { RefreshCw, Send, Inbox } from 'lucide-react'

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

export default function AdminMessages() {
  const [loading, setLoading] = useState(true)
  const [messages, setMessages] = useState([])
  const [selectedUserId, setSelectedUserId] = useState(null)
  const [reply, setReply] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const users = useMemo(() => {
    const map = new Map()
    for (const m of messages) {
      const key = m.user_id
      if (!map.has(key)) {
        map.set(key, {
          user_id: m.user_id,
          username: m.username,
          email: m.email,
          unread: 0,
          last_at: m.created_at
        })
      }
      const u = map.get(key)
      if (!m.read_by_admin) u.unread += 1
      if (m.created_at && (!u.last_at || m.created_at > u.last_at)) u.last_at = m.created_at
    }
    return Array.from(map.values()).sort((a, b) => (b.last_at || '').localeCompare(a.last_at || ''))
  }, [messages])

  const selectedMessages = useMemo(() => {
    if (!selectedUserId) return []
    return messages.filter((m) => m.user_id === selectedUserId)
  }, [messages, selectedUserId])

  const fetchAll = async () => {
    try {
      setLoading(true)
      const res = await axios.get('/admin/messages', { params: { limit: 1000 } })
      const items = res.data?.messages || []
      setMessages(items)
      if (!selectedUserId && items.length > 0) setSelectedUserId(items[0].user_id)
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to load admin messages')
      setTimeout(() => setError(''), 3000)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAll()
  }, [])

  useEffect(() => {
    // mark unread for selected conversation as read (best effort)
    if (!selectedUserId) return
    const unread = messages.filter((m) => m.user_id === selectedUserId && !m.read_by_admin)
    Promise.allSettled(unread.map((m) => axios.patch(`/admin/messages/${m.id}/read`))).then(() => {
      if (unread.length) fetchAll()
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUserId])

  const handleReply = async () => {
    const text = reply.trim()
    if (!text || !selectedUserId) return
    try {
      await axios.post(`/admin/messages/${selectedUserId}`, { content: text })
      setReply('')
      setSuccess('Sent')
      setTimeout(() => setSuccess(''), 1500)
      fetchAll()
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to send')
      setTimeout(() => setError(''), 3000)
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-soft dark:shadow-soft-dark border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <Inbox className="w-5 h-5 text-primary-600 dark:text-primary-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">User Message Inbox</h3>
        </div>
        <button
          type="button"
          onClick={fetchAll}
          className="touch-target inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline text-sm font-medium">Refresh</span>
        </button>
      </div>

      {(error || success) && (
        <div className="px-4 sm:px-6 pt-4">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-xl">
              {error}
            </div>
          )}
          {success && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 px-4 py-3 rounded-xl">
              {success}
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3">
        {/* Inbox list (Telegram/Messenger style) */}
        <div className="border-r border-gray-200 dark:border-gray-700">
          <div className="p-3 sm:p-4">
            {loading ? (
              <div className="flex items-center justify-center py-10">
                <RefreshCw className="w-7 h-7 text-primary-600 dark:text-primary-400 animate-spin" />
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-10 text-gray-500 dark:text-gray-400">No messages</div>
            ) : (
              <div className="space-y-2 max-h-[560px] overflow-auto pr-1 scrollbar-ktt">
                {users.map((u) => (
                  <button
                    key={u.user_id}
                    type="button"
                    onClick={() => setSelectedUserId(selectedUserId === u.user_id ? null : u.user_id)}
                    className={`w-full text-left px-3 py-2 rounded-xl border transition ${
                      selectedUserId === u.user_id
                        ? 'border-primary-300 dark:border-primary-700 bg-primary-50/60 dark:bg-primary-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/40'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                          {u.username || `User #${u.user_id}`}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{u.email}</div>
                      </div>
                      {u.unread > 0 && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-xs font-semibold text-amber-700 dark:text-amber-300">
                          {u.unread}
                        </span>
                      )}
                    </div>
                    <div className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">{formatTime(u.last_at)}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Conversation */}
        <div className="lg:col-span-2">
          <div className="p-4 sm:p-6">
            {!selectedUserId ? (
              <div className="text-center py-10 text-gray-500 dark:text-gray-400">Select a user to view conversation</div>
            ) : (
              <>
                <div className="mb-3 text-xs text-gray-500 dark:text-gray-400">
                  Chat with{' '}
                  <span className="font-semibold text-gray-700 dark:text-gray-200">
                    {users.find((u) => u.user_id === selectedUserId)?.username || `User #${selectedUserId}`}
                  </span>
                </div>

                <div className="space-y-3 max-h-[460px] overflow-auto pr-1 scrollbar-ktt">
                  {selectedMessages.map((m) => (
                    <div
                      key={m.id}
                      className={`rounded-xl border p-3 ${
                        m.sender === 'user'
                          ? 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/40'
                          : m.sender === 'system'
                            ? 'border-amber-200 dark:border-amber-900/50 bg-amber-50/60 dark:bg-amber-900/20'
                            : 'border-blue-200 dark:border-blue-900/50 bg-blue-50/60 dark:bg-blue-900/20'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-xs font-semibold text-gray-700 dark:text-gray-200">
                          {m.sender === 'user' ? 'User' : m.sender === 'system' ? 'System' : 'Admin'}
                        </div>
                        <div className="text-[11px] text-gray-500 dark:text-gray-400">{formatTime(m.created_at)}</div>
                      </div>
                      <div className="mt-2 whitespace-pre-wrap text-sm text-gray-800 dark:text-gray-100 font-sans leading-relaxed">
                        {renderContent(m.content)}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 border-t border-gray-200 dark:border-gray-700 pt-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Reply</label>
                  <div className="flex gap-2">
                    <input
                      value={reply}
                      onChange={(e) => setReply(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleReply()}
                      placeholder="Write a reply..."
                      className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 focus:ring-2 focus:ring-primary-500 outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleReply}
                      className="touch-target inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary-600 text-white hover:bg-primary-700"
                    >
                      <Send className="w-4 h-4" />
                      Send
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

