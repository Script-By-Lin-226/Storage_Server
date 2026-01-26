import React, { createContext, useContext, useState, useEffect } from 'react'

const ThemeContext = createContext()
const STORAGE_KEY = 'storage-server-theme'

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}

export function ThemeProvider({ children }) {
  const [dark, setDark] = useState(() => {
    if (typeof window === 'undefined') return false
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved !== null) return saved === 'dark'
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  useEffect(() => {
    const root = document.documentElement
    if (dark) {
      root.classList.add('dark')
      localStorage.setItem(STORAGE_KEY, 'dark')
    } else {
      root.classList.remove('dark')
      localStorage.setItem(STORAGE_KEY, 'light')
    }
  }, [dark])

  const toggle = () => setDark((d) => !d)
  return (
    <ThemeContext.Provider value={{ dark, toggle, isDark: dark }}>
      {children}
    </ThemeContext.Provider>
  )
}
