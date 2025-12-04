'use client'

import React, { useState } from 'react'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { loginUser, clearError } from '@/store/slices/authSlice'
import { Eye, EyeOff, Mail, Loader2, AlertCircle } from 'lucide-react'
import { API_URL } from '@/lib/config'
import Link from 'next/link'

interface LoginFormProps {
  onSuccess?: () => void
}

const LoginForm: React.FC<LoginFormProps> = ({ onSuccess }) => {
  const dispatch = useAppDispatch()
  const { isLoading, error } = useAppSelector((state) => state.auth)
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [isForgotPasswordMode, setIsForgotPasswordMode] = useState(false)
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false)
  const [forgotPasswordError, setForgotPasswordError] = useState<string | null>(null)
  const [forgotPasswordSuccess, setForgotPasswordSuccess] = useState<string | null>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    
    // Clear errors when user starts typing
    if (error) {
      dispatch(clearError())
    }
    if (forgotPasswordError) {
      setForgotPasswordError(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (isForgotPasswordMode) {
      await handleForgotPassword()
    } else {
      const result = await dispatch(loginUser(formData))
      
      if (loginUser.fulfilled.match(result)) {
        onSuccess?.()
      }
    }
  }

  const handleForgotPassword = async () => {
    if (!formData.email) {
      setForgotPasswordError('Please enter your email address')
      return
    }

    setForgotPasswordLoading(true)
    setForgotPasswordError(null)
    setForgotPasswordSuccess(null)

    try {
      const response = await fetch(`${API_URL}/password-reset/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: formData.email }),
      })

      const data = await response.json()

      if (data.success) {
        setForgotPasswordSuccess('Password reset instructions have been sent to your email.')
        // Switch back to login mode after 3 seconds
        setTimeout(() => {
          setIsForgotPasswordMode(false)
          setForgotPasswordSuccess(null)
        }, 3000)
      } else {
        setForgotPasswordError(data.detail || 'Failed to send reset email')
      }
    } catch (error) {
      setForgotPasswordError('Network error. Please try again.')
    } finally {
      setForgotPasswordLoading(false)
    }
  }

  const switchToForgotPassword = () => {
    setIsForgotPasswordMode(true)
    setForgotPasswordError(null)
    setForgotPasswordSuccess(null)
    dispatch(clearError())
  }

  const switchBackToLogin = () => {
    setIsForgotPasswordMode(false)
    setForgotPasswordError(null)
    setForgotPasswordSuccess(null)
    dispatch(clearError())
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 border border-gray-100">
        <div className="text-center mb-6 sm:mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
            {isForgotPasswordMode ? 'Reset Password' : 'Welcome Back'}
          </h2>
          <p className="text-sm sm:text-base text-gray-600">
            {isForgotPasswordMode 
              ? 'Enter your email to receive reset instructions' 
              : 'Sign in to your Dilan AI account'
            }
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {(error || forgotPasswordError) && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{error || forgotPasswordError}</span>
            </div>
          )}

          {forgotPasswordSuccess && (
            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{forgotPasswordSuccess}</span>
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              placeholder="Enter your email"
            />
          </div>

          {!isForgotPasswordMode && (
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  placeholder="Enter your password"
                  disabled={isLoading || forgotPasswordLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  disabled={isLoading || forgotPasswordLoading}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
              <div className="text-right mt-2">
                <button
                  type="button"
                  onClick={switchToForgotPassword}
                  className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
                  disabled={isLoading || forgotPasswordLoading}
                >
                  Forgot password?
                </button>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || forgotPasswordLoading || !formData.email || (!isForgotPasswordMode && !formData.password)}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold py-3 px-4 rounded-lg hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105"
          >
            {(isLoading || forgotPasswordLoading) ? (
              <div className="flex items-center justify-center">
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                {isForgotPasswordMode ? 'Sending Reset Email...' : 'Signing In...'}
              </div>
            ) : (
              <div className="flex items-center justify-center">
                {isForgotPasswordMode ? (
                  <>
                    <Mail className="h-5 w-5 mr-2" />
                    Send Reset Email
                  </>
                ) : (
                  'Sign In'
                )}
              </div>
            )}
          </button>
        </form>

        <div className="mt-6 text-center space-y-3">
          {isForgotPasswordMode ? (
            <>
              <p className="text-gray-600">Remember your password?</p>
              <button
                type="button"
                onClick={switchBackToLogin}
                disabled={isLoading || forgotPasswordLoading}
                className="text-blue-600 hover:text-blue-800 font-medium hover:underline"
              >
                Back to Sign In
              </button>
            </>
          ) : (
            <p className="text-gray-600">
              Don't have an account?{' '}
              <Link href="/auth/register" className="text-blue-600 hover:text-blue-700 font-medium">
                Sign up
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export default LoginForm
