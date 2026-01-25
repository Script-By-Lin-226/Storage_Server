import React, { createContext, useContext, useState, useEffect } from 'react'
import axios from 'axios'

const AuthContext = createContext()

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)
  const [token, setToken] = useState(null)
  const [user, setUser] = useState(null)

  // Configure axios defaults
  axios.defaults.baseURL = '/api'
  axios.defaults.headers.common['Content-Type'] = 'application/json'

  const fetchUserInfo = async () => {
    try {
      const response = await axios.get('/user/me')
      setUser(response.data)
    } catch (error) {
      console.error('Failed to fetch user info:', error)
      // If token is invalid, clear it
      if (error.response?.status === 401) {
        localStorage.removeItem('token')
        setToken(null)
        delete axios.defaults.headers.common['Authorization']
        setIsAuthenticated(false)
        setUser(null)
      }
    }
  }

  useEffect(() => {
    // Check for stored token
    const storedToken = localStorage.getItem('token')
    if (storedToken) {
      setToken(storedToken)
      axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`
      setIsAuthenticated(true)
      // Fetch user info
      fetchUserInfo().finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const login = async (email, password) => {
    try {
      const response = await axios.post('/auth/login', { email, password })
      const { access_token } = response.data
      
      localStorage.setItem('token', access_token)
      setToken(access_token)
      axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`
      setIsAuthenticated(true)
      
      // Fetch user info after login
      await fetchUserInfo()
      
      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.detail || 'Login failed'
      }
    }
  }

  const logout = () => {
    localStorage.removeItem('token')
    setToken(null)
    delete axios.defaults.headers.common['Authorization']
    setIsAuthenticated(false)
    setUser(null)
  }

  const value = {
    isAuthenticated,
    loading,
    token,
    user,
    login,
    logout
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
