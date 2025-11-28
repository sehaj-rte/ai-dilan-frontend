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
  Phone
} from 'lucide-react'

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  onLogin: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  onSignup: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
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
  sessionType,
  expertName,
  showSignupInitially = false,
  onRequestSubscription,
  canSubscribe = false
}) => {
  const handleSubscribeClick = () => {
    if (!onRequestSubscription) return
    onClose()
    // Slight delay to allow this modal to close before opening another
    setTimeout(() => {
      onRequestSubscription()
    }, 150)
  }

  const [isLoginMode, setIsLoginMode] = useState(!showSignupInitially)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email || !password) {
      setError('Please fill in all fields')
      return
    }

    setLoading(true)
    setError(null)

    try {
      let result
      if (isLoginMode) {
        result = await onLogin(email, password)
      } else {
        result = await onSignup(email, password)
      }

      if (!result.success) {
        setError(result.error || 'Authentication failed')
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
    setError(null)
    setLoading(false)
  }

  const switchMode = () => {
    setIsLoginMode(!isLoginMode)
    resetForm()
  }

  // Reset form and mode when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setIsLoginMode(!showSignupInitially)
      resetForm()
    }
  }, [isOpen, showSignupInitially])

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {isLoginMode ? 'Welcome Back' : 'Create Account'}
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

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">
                Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                  disabled={loading}
                  required
                />
              </div>
              {!isLoginMode && (
                <p className="text-xs text-gray-500">
                  Password should be at least 6 characters long
                </p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={loading || !email || !password}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {isLoginMode ? 'Signing In...' : 'Creating Account...'}
                </>
              ) : (
                <>
                  {isLoginMode ? (
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
            {isLoginMode ? (
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
