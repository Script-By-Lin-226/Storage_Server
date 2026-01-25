import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import axios from 'axios'
import {
  LogIn,
  UserPlus,
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  ArrowRight,
  CheckCircle,
  XCircle,
  Sparkles,
  Shield
} from 'lucide-react'

function Auth() {
  const [mode, setMode] = useState('login') // 'login', 'register', 'forgot'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const [passwordStrength, setPasswordStrength] = useState(0)
  const { login } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    // Calculate password strength
    if (password) {
      let strength = 0
      if (password.length >= 8) strength++
      if (password.length >= 12) strength++
      if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++
      if (/\d/.test(password)) strength++
      if (/[^a-zA-Z\d]/.test(password)) strength++
      setPasswordStrength(strength)
    } else {
      setPasswordStrength(0)
    }
  }, [password])

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const result = await login(email, password)
    
    if (result.success) {
      navigate('/')
    } else {
      setError(result.error)
    }
    
    setLoading(false)
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (passwordStrength < 3) {
      setError('Password is too weak. Please use a stronger password.')
      return
    }

    setLoading(true)

    try {
      const response = await axios.post('/auth/register', {
        username,
        email,
        password,
        role: 'user'
      })

      setSuccess('Account created successfully! Redirecting to login...')
      setTimeout(() => {
        setMode('login')
        setEmail(email)
        setPassword('')
        setUsername('')
        setConfirmPassword('')
        setSuccess('')
      }, 2000)
    } catch (error) {
      setError(error.response?.data?.detail || error.response?.data?.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  const handleForgotPassword = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      const response = await axios.post('/auth/forgot-password', { email })
      setSuccess(response.data.message || 'Password reset instructions sent to your email')
    } catch (error) {
      setError(error.response?.data?.detail || 'Failed to send reset email')
    } finally {
      setLoading(false)
    }
  }

  const getPasswordStrengthColor = () => {
    if (passwordStrength <= 1) return 'bg-red-500'
    if (passwordStrength <= 2) return 'bg-orange-500'
    if (passwordStrength <= 3) return 'bg-yellow-500'
    if (passwordStrength <= 4) return 'bg-green-500'
    return 'bg-green-600'
  }

  const getPasswordStrengthText = () => {
    if (passwordStrength <= 1) return 'Very Weak'
    if (passwordStrength <= 2) return 'Weak'
    if (passwordStrength <= 3) return 'Fair'
    if (passwordStrength <= 4) return 'Good'
    return 'Strong'
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-primary-100 to-blue-50 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob"></div>
        <div className="absolute top-40 right-10 w-72 h-72 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-1/2 w-72 h-72 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-4000"></div>
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Card Container with Animation */}
        <div className="bg-white/90 backdrop-blur-lg rounded-3xl shadow-2xl p-8 md:p-10 border border-white/20 transform transition-all duration-500 hover:shadow-3xl">
          {/* Header with Icon Animation */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-primary-500 to-blue-600 rounded-2xl mb-4 transform transition-all duration-300 hover:scale-110 hover:rotate-3 shadow-lg">
              {mode === 'login' && <LogIn className="w-10 h-10 text-white" />}
              {mode === 'register' && <UserPlus className="w-10 h-10 text-white" />}
              {mode === 'forgot' && <Mail className="w-10 h-10 text-white" />}
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary-600 to-blue-600 bg-clip-text text-transparent mb-2">
              {mode === 'login' && 'Welcome Back'}
              {mode === 'register' && 'Create Account'}
              {mode === 'forgot' && 'Reset Password'}
            </h1>
            <p className="text-gray-600 mt-2">
              {mode === 'login' && 'Sign in to your account to continue'}
              {mode === 'register' && 'Start your journey with us today'}
              {mode === 'forgot' && 'Enter your email to reset your password'}
            </p>
          </div>

          {/* Messages */}
          {error && (
            <div className="mb-6 bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-lg animate-slide-in">
              <div className="flex items-center">
                <XCircle className="w-5 h-5 mr-2" />
                <span>{error}</span>
              </div>
            </div>
          )}
          {success && (
            <div className="mb-6 bg-green-50 border-l-4 border-green-500 text-green-700 p-4 rounded-lg animate-slide-in">
              <div className="flex items-center">
                <CheckCircle className="w-5 h-5 mr-2" />
                <span>{success}</span>
              </div>
            </div>
          )}

          {/* Login Form */}
          {mode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-6 animate-fade-in">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Email Address
                  </label>
                  <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 group-focus-within:text-primary-600 transition-colors" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full pl-12 pr-4 py-3.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all duration-200 bg-gray-50 focus:bg-white"
                      placeholder="you@example.com"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Password
                  </label>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 group-focus-within:text-primary-600 transition-colors" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="w-full pl-12 pr-12 py-3.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all duration-200 bg-gray-50 focus:bg-white"
                      placeholder="Enter your password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-primary-600 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setMode('forgot')}
                  className="text-sm text-primary-600 hover:text-primary-700 font-medium transition-colors"
                >
                  Forgot password?
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-primary-600 to-blue-600 text-white py-3.5 rounded-xl font-semibold hover:from-primary-700 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>

              <div className="text-center">
                <p className="text-sm text-gray-600">
                  Don't have an account?{' '}
                  <button
                    type="button"
                    onClick={() => setMode('register')}
                    className="text-primary-600 hover:text-primary-700 font-semibold transition-colors"
                  >
                    Sign up
                  </button>
                </p>
              </div>
            </form>
          )}

          {/* Register Form */}
          {mode === 'register' && (
            <form onSubmit={handleRegister} className="space-y-6 animate-fade-in">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Username
                  </label>
                  <div className="relative group">
                    <User className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 group-focus-within:text-primary-600 transition-colors" />
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                      className="w-full pl-12 pr-4 py-3.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all duration-200 bg-gray-50 focus:bg-white"
                      placeholder="Choose a username"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Email Address
                  </label>
                  <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 group-focus-within:text-primary-600 transition-colors" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full pl-12 pr-4 py-3.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all duration-200 bg-gray-50 focus:bg-white"
                      placeholder="you@example.com"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Password
                  </label>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 group-focus-within:text-primary-600 transition-colors" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="w-full pl-12 pr-12 py-3.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all duration-200 bg-gray-50 focus:bg-white"
                      placeholder="Create a strong password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-primary-600 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {password && (
                    <div className="mt-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-600">Password Strength:</span>
                        <span className={`text-xs font-semibold ${getPasswordStrengthColor().replace('bg-', 'text-')}`}>
                          {getPasswordStrengthText()}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all duration-300 ${getPasswordStrengthColor()}`}
                          style={{ width: `${(passwordStrength / 5) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Confirm Password
                  </label>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 group-focus-within:text-primary-600 transition-colors" />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      className="w-full pl-12 pr-12 py-3.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all duration-200 bg-gray-50 focus:bg-white"
                      placeholder="Confirm your password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-primary-600 transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {confirmPassword && password !== confirmPassword && (
                    <p className="mt-1 text-xs text-red-600">Passwords do not match</p>
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || password !== confirmPassword}
                className="w-full bg-gradient-to-r from-primary-600 to-blue-600 text-white py-3.5 rounded-xl font-semibold hover:from-primary-700 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Creating account...</span>
                  </>
                ) : (
                  <>
                    <span>Create Account</span>
                    <UserPlus className="w-5 h-5" />
                  </>
                )}
              </button>

              <div className="text-center">
                <p className="text-sm text-gray-600">
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => setMode('login')}
                    className="text-primary-600 hover:text-primary-700 font-semibold transition-colors"
                  >
                    Sign in
                  </button>
                </p>
              </div>
            </form>
          )}

          {/* Forgot Password Form */}
          {mode === 'forgot' && (
            <form onSubmit={handleForgotPassword} className="space-y-6 animate-fade-in">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Email Address
                </label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 group-focus-within:text-primary-600 transition-colors" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full pl-12 pr-4 py-3.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all duration-200 bg-gray-50 focus:bg-white"
                    placeholder="you@example.com"
                  />
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  We'll send you instructions to reset your password
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-primary-600 to-blue-600 text-white py-3.5 rounded-xl font-semibold hover:from-primary-700 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Sending...</span>
                  </>
                ) : (
                  <>
                    <span>Send Reset Link</span>
                    <Mail className="w-5 h-5" />
                  </>
                )}
              </button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className="text-sm text-primary-600 hover:text-primary-700 font-semibold transition-colors flex items-center justify-center gap-1"
                >
                  <ArrowRight className="w-4 h-4 rotate-180" />
                  Back to Sign In
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

export default Auth
