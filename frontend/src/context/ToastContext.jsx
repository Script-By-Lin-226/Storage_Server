import React, { createContext, useContext, useState, useCallback } from 'react'

const ToastContext = createContext()

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const addToast = useCallback((message, type = 'info') => {
    const id = Date.now() + Math.random()
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 4000)
    return id
  }, [])

  const toast = useCallback(
    (msg, type) => addToast(msg, type),
    [addToast]
  )
  const success = useCallback((msg) => addToast(msg, 'success'), [addToast])
  const error = useCallback((msg) => addToast(msg, 'error'), [addToast])
  const info = useCallback((msg) => addToast(msg, 'info'), [addToast])

  return (
    <ToastContext.Provider value={{ toast, success, error, info }}>
      {children}
      <ToastStack toasts={toasts} />
    </ToastContext.Provider>
  )
}

function ToastStack({ toasts }) {
  if (toasts.length === 0) return null
  return (
    <div
      className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full pointer-events-none"
      aria-live="polite"
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} message={t.message} type={t.type} />
      ))}
    </div>
  )
}

function ToastItem({ message, type }) {
  const styles = {
    success: 'bg-emerald-600 text-white border-emerald-700 shadow-emerald-900/20',
    error: 'bg-rose-600 text-white border-rose-700 shadow-rose-900/20',
    info: 'bg-sky-600 text-white border-sky-700 shadow-sky-900/20 dark:bg-sky-700 dark:border-sky-800',
  }
  return (
    <div
      className={`px-4 py-3 rounded-xl border shadow-lg animate-slide-in font-medium ${styles[type] || styles.info}`}
      role="alert"
    >
      {message}
    </div>
  )
}
