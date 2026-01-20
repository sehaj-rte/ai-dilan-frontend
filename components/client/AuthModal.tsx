'use client'

import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  Loader2,
  AlertCircle,
  Mail,
  Lock,
  User,
  MessageCircle,
  Phone,
  Eye,
  EyeOff
} from 'lucide-react'

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  onLogin: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  onSignup: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  onForgotPassword?: (email: string) => Promise<{ success: boolean; error?: string }>
  sessionType?: 'chat' | 'call'
  expertName?: string
  showSignupInitially?: boolean
  onRequestSubscription?: () => void
  canSubscribe?: boolean
}

const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onLogin,
  onSignup,
  onForgotPassword,
  sessionType,
  expertName,
  showSignupInitially = false,
  onRequestSubscription,
  canSubscribe = false
}) => {
  const handleSubscribeClick = () => {
    onClose()
    onRequestSubscription()
  }

  const [isLoginMode, setIsLoginMode] = useState(!showSignupInitially)
  const [isForgotPasswordMode, setIsForgotPasswordMode] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (isForgotPasswordMode) {
      if (!email) {
        setError('Please enter your email address')
        return
      }
    } else {
      if (!email || !password) {
        setError('Please fill in all fields')
        return
      }
    }

    setLoading(true)
    setError(null)
    setSuccessMessage(null)

    try {
      let result
      if (isForgotPasswordMode) {
        if (onForgotPassword) {
          result = await onForgotPassword(email)
          if (result.success) {
            setSuccessMessage('Password reset instructions have been sent to your email.')
            // Switch back to login mode after 3 seconds
            setTimeout(() => {
              setIsForgotPasswordMode(false)
              setSuccessMessage(null)
            }, 3000)
          } else {
            setError(result.error || 'Failed to send reset email')
          }
        } else {
          setError('Forgot password functionality is not available')
        }
      } else if (isLoginMode) {
        result = await onLogin(email, password)
        if (!result.success) {
          setError(result.error || 'Authentication failed')
        }
      } else {
        result = await onSignup(email, password)
        if (!result.success) {
          setError(result.error || 'Registration failed')
        }
      }
      // If successful, the context will handle closing the modal and continuing the flow
    } catch (error) {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setEmail('')
    setPassword('')
    setShowPassword(false)
    setError(null)
    setSuccessMessage(null)
    setLoading(false)
  }

  const switchMode = () => {
    setIsLoginMode(!isLoginMode)
    setIsForgotPasswordMode(false)
    resetForm()
  }

  const switchToForgotPassword = () => {
    setIsForgotPasswordMode(true)
    setIsLoginMode(true) // Keep login mode for UI consistency
    resetForm()
  }

  const switchBackToLogin = () => {
    setIsForgotPasswordMode(false)
    resetForm()
  }

  // Reset form and mode when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setIsLoginMode(!showSignupInitially)
      setIsForgotPasswordMode(false)
      resetForm()
    }
  }, [isOpen, showSignupInitially])

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {isForgotPasswordMode ? 'Reset Password' : isLoginMode ? 'Welcome Back' : 'Create Account'}
          </DialogTitle>

          {sessionType && expertName && (
            <div className="flex items-center gap-2 text-gray-600 text-sm">
              {sessionType === 'chat' ? (
                <MessageCircle className="h-4 w-4" />
              ) : (
                <Phone className="h-4 w-4" />
              )}
              <span>
                Continue to {sessionType} with {expertName}
              </span>
            </div>
          )}
        </DialogHeader>

        <div className="space-y-6">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">
                Email Address
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  disabled={loading}
                  required
                />
              </div>
            </div>

            {!isForgotPasswordMode && (
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10"
                    disabled={loading}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    disabled={loading}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {!isLoginMode && (
                  <p className="text-xs text-gray-500">
                    Password should be at least 6 characters long
                  </p>
                )}
                {isLoginMode && !isForgotPasswordMode && (
                  <div className="text-right">
                    <button
                      type="button"
                      onClick={switchToForgotPassword}
                      className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
                      disabled={loading}
                    >
                      Forgot password?
                    </button>
                  </div>
                )}
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={loading || !email || (!isForgotPasswordMode && !password)}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {isForgotPasswordMode ? 'Sending Reset Email...' : isLoginMode ? 'Signing In...' : 'Creating Account...'}
                </>
              ) : (
                <>
                  {isForgotPasswordMode ? (
                    <>
                      <Mail className="h-4 w-4 mr-2" />
                      Send Reset Email
                    </>
                  ) : isLoginMode ? (
                    <>
                      <User className="h-4 w-4 mr-2" />
                      Sign In
                    </>
                  ) : (
                    <>
                      <User className="h-4 w-4 mr-2" />
                      Create Account
                    </>
                  )}
                </>
              )}
            </Button>
          </form>

          <div className="relative">
            <Separator />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="bg-white px-2 text-xs text-gray-500">
                OR
              </span>
            </div>
          </div>

          <div className="text-center space-y-3">
            {isForgotPasswordMode ? (
              <>
                <p className="text-sm text-gray-600">Remember your password?</p>
                <Button
                  variant="link"
                  onClick={switchBackToLogin}
                  disabled={loading}
                  className="p-0 h-auto text-blue-600 hover:text-blue-800"
                >
                  Back to Sign In
                </Button>
              </>
            ) : isLoginMode ? (
              <>
                <p className="text-sm text-gray-600">Don't have an account? Please subscribe here.</p>
                {onRequestSubscription && canSubscribe && (
                  <Button
                    type="button"
                    onClick={handleSubscribeClick}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    Please subscribe here
                  </Button>
                )}
              </>
            ) : (
              <>
                <p className="text-sm text-gray-600">Already have an account?</p>
                <Button
                  variant="link"
                  onClick={switchMode}
                  disabled={loading}
                  className="p-0 h-auto text-blue-600 hover:text-blue-800"
                >
                  Sign in instead
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default AuthModal
