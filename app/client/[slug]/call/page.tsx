'use client'

import React, { useState, useEffect } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useSelector, useDispatch } from 'react-redux'
import { Button } from '@/components/ui/button'
import { API_URL } from '@/lib/config'
import { ArrowLeft, Phone, PhoneOff, User, LogIn, LogOut, MessageSquare } from 'lucide-react'
import { useVoiceConversation } from '@/hooks/useVoiceConversation'
import { RootState } from '@/store/store'
import { logout, loadUserFromStorage } from '@/store/slices/authSlice'

interface Expert {
  id: string
  name: string
  headline: string
  description: string
  avatar_url: string
  elevenlabs_agent_id: string
}

interface Publication {
  id: string
  slug: string
  display_name: string
  is_published: boolean
  primary_color: string
  secondary_color: string
  theme: string
}

const ClientCallPage = () => {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const dispatch = useDispatch()
  const slug = params.slug as string

  // Auth state from Redux
  const { user, isAuthenticated } = useSelector((state: RootState) => state.auth)

  const [expert, setExpert] = useState<Expert | null>(null)
  const [publication, setPublication] = useState<Publication | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [callDuration, setCallDuration] = useState(0)
  const [timerInterval, setTimerInterval] = useState<NodeJS.Timeout | null>(null)
  const [paymentSessionId, setPaymentSessionId] = useState<string | null>(null)
  const [paymentSessionValid, setPaymentSessionValid] = useState<boolean | null>(null)

  const convertS3UrlToProxy = (s3Url: string): string => {
    if (!s3Url) return s3Url as any
    const match = s3Url.match(/https:\/\/ai-dilan\.s3\.[^/]+\.amazonaws\.com\/(.+)/)
    if (match) {
      return `${API_URL}/images/avatar/full/${match[1]}`
    }
    return s3Url
  }

  const {
    state,
    startConversation,
    endConversation,
  } = useVoiceConversation({
    expertId: expert?.id || '',
    onError: (error) => {
      setError(error)
    },
    onStatusChange: (status) => {
      console.log('Voice status changed:', status)
    }
  })

  // Load user from storage on mount
  useEffect(() => {
    dispatch(loadUserFromStorage())
  }, [])

  useEffect(() => {
    fetchExpertData()
  }, [slug])

  // Check for payment session ID and validate it
  useEffect(() => {
    const sessionIdParam = searchParams.get('session_id')
    if (sessionIdParam) {
      setPaymentSessionId(sessionIdParam)
      validatePaymentSession(sessionIdParam)
    } else {
      // If no session ID, check if user needs to pay
      checkPaymentRequirement()
    }
  }, [searchParams, isAuthenticated])

  const validatePaymentSession = async (sessionId: string) => {
    if (!isAuthenticated) {
      setPaymentSessionValid(false)
      return
    }

    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${API_URL}/payments/session/${sessionId}/status`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      const data = await response.json()
      if (data.success && data.session.payment_status === 'succeeded') {
        setPaymentSessionValid(true)
      } else {
        setPaymentSessionValid(false)
        // Redirect back to expert page for payment
        router.push(`/client/${slug}`)
      }
    } catch (error) {
      console.error('Error validating payment session:', error)
      setPaymentSessionValid(false)
      router.push(`/client/${slug}`)
    }
  }

  const checkPaymentRequirement = () => {
    // If no payment session and user is authenticated, they need to pay
    if (isAuthenticated && !paymentSessionId) {
      // For now, allow free access - in production you might want to redirect to payment
      setPaymentSessionValid(true)
    } else if (!isAuthenticated) {
      // Redirect to login
      router.push(`/client/login?redirect=/client/${slug}/call`)
    }
  }

  const fetchExpertData = async () => {
    try {
      setLoading(true)
      
      const response = await fetch(`${API_URL}/publishing/public/expert/${slug}`)
      const data = await response.json()
      
      if (data.success) {
        setExpert({
          ...data.expert,
          avatar_url: data.expert?.avatar_url ? convertS3UrlToProxy(data.expert.avatar_url) : null
        })
        setPublication(data.publication)
      } else {
        setError('Expert not found or not published')
      }
    } catch (error) {
      console.error('Error fetching expert data:', error)
      setError('Failed to load expert page')
    } finally {
      setLoading(false)
    }
  }

  const handleStartCall = async () => {
    if (!expert) return
    
    try {
      // Check for microphone permission first
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError('Your browser does not support microphone access. Please use a modern browser.')
        return
      }
      
      await startConversation()
      
      // Start timer
      setCallDuration(0)
      const interval = setInterval(() => {
        setCallDuration(prev => prev + 1)
      }, 1000)
      setTimerInterval(interval)
    } catch (error) {
      console.error('Failed to start voice conversation:', error)
      if (error instanceof Error) {
        if (error.message.includes('Permission denied')) {
          setError('Microphone access denied. Please allow microphone access and try again.')
        } else if (error.message.includes('NotFoundError')) {
          setError('No microphone found. Please connect a microphone and try again.')
        } else {
          setError(error.message)
        }
      }
    }
  }

  const handleEndCall = async () => {
    try {
      await endConversation()
      
      // Stop timer
      if (timerInterval) {
        clearInterval(timerInterval)
        setTimerInterval(null)
      }
    } catch (error) {
      console.error('Failed to end voice conversation:', error)
    }
  }

  const handleBack = () => {
    router.push(`/client/${slug}`)
  }

  const handleGoToChat = () => {
    router.push(`/client/${slug}/chat`)
  }

  const handleLogout = () => {
    dispatch(logout())
  }

  const formatCallDuration = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    
    if (hrs > 0) {
      return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerInterval) {
        clearInterval(timerInterval)
      }
    }
  }, [timerInterval])

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Loading expert...
          </h2>
          <p className="text-gray-500">Please wait while we establish the connection</p>
        </div>
      </div>
    )
  }

  if (error && !expert) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Expert Not Found</h1>
          <p className="text-gray-600 mb-6">{error || 'The expert you are looking for is not available.'}</p>
          <Button onClick={() => router.push('/experts')}>
            Browse All Experts
          </Button>
        </div>
      </div>
    )
  }

  // Show loading screen while validating payment
  if (paymentSessionValid === null) {
    return (
      <div className="flex h-screen items-center justify-center bg-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Validating access...</p>
        </div>
      </div>
    )
  }

  // Show payment required screen if payment session is invalid
  if (paymentSessionValid === false) {
    return (
      <div className="flex h-screen items-center justify-center bg-white">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Payment Required</h2>
          <p className="text-gray-600 mb-4">Please complete payment to access this call</p>
          <Button onClick={() => router.push(`/client/${slug}`)}>
            Go to Payment
          </Button>
        </div>
      </div>
    )
  }

  // Apply theme colors
  const primaryColor = publication?.primary_color || '#3B82F6'
  const secondaryColor = publication?.secondary_color || '#1E40AF'

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b border-gray-200">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={handleBack}
                className="text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="h-6 w-6" />
              </button>
              <div className="flex items-center space-x-2">
                {expert?.avatar_url ? (
                  <img
                    src={expert.avatar_url}
                    alt={expert.name}
                    className="w-8 h-8 rounded-full object-cover"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                  />
                ) : null}
                <span className="font-semibold text-gray-900">{expert?.name}</span>
              </div>
            </div>
            
            {/* User Profile / Login */}
            <div className="flex items-center space-x-3">
              {/* Chat Button */}
              <Button
                onClick={handleGoToChat}
                size="sm"
                className="hidden sm:flex items-center justify-center w-9 h-9 bg-black hover:bg-gray-800 text-white border-0 shadow-sm mr-2 rounded-full"
              >
                <MessageSquare className="h-4 w-4" />
              </Button>
              
              {/* Mobile Chat Button */}
              <Button
                onClick={handleGoToChat}
                size="sm"
                className="sm:hidden flex items-center justify-center w-9 h-9 bg-black hover:bg-gray-800 text-white border-0 shadow-sm mr-2 rounded-full"
              >
                <MessageSquare className="h-4 w-4" />
              </Button>
              {isAuthenticated && user ? (
                <div className="flex items-center space-x-3">
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">{user.full_name || user.username}</p>
                    <p className="text-xs text-gray-500">{user.email}</p>
                  </div>
                  {user.avatar_url ? (
                    <img 
                      src={user.avatar_url.startsWith('http') ? user.avatar_url : `${API_URL}${user.avatar_url}`} 
                      className="w-10 h-10 rounded-full object-cover border-2 border-gray-200" 
                      alt={user.username}
                      onError={(e) => {
                        e.currentTarget.style.display = 'none'
                        e.currentTarget.nextElementSibling?.classList.remove('hidden')
                      }}
                    />
                  ) : null}
                  <div className={`w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center ${user.avatar_url ? 'hidden' : ''}`}>
                    <User className="h-5 w-5 text-gray-500" />
                  </div>
                  <Button
                    onClick={handleLogout}
                    variant="ghost"
                    size="sm"
                    className="text-gray-600 hover:text-gray-900"
                  >
                    <LogOut className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <Button
                  onClick={() => router.push('/auth/login')}
                  size="sm"
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  <LogIn className="mr-2 h-4 w-4" />
                  Login
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto text-center">
          {/* Call Timer at Top */}
          {state.isConnected && (
            <div className="mb-12">
              <div className="inline-flex items-center space-x-2">
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                <span className="text-lg font-mono font-medium text-gray-700">
                  {formatCallDuration(callDuration)}
                </span>
              </div>
            </div>
          )}

          {/* Expert Avatar - Large with thin ring */}
          <div className="mb-8 relative inline-flex items-center justify-center">
            <style jsx>{`
              @keyframes rotate {
                from {
                  transform: rotate(0deg);
                }
                to {
                  transform: rotate(360deg);
                }
              }
              .rotating-ring {
                animation: rotate 2s linear infinite;
              }
              @keyframes pulse-glow {
                0%, 100% {
                  opacity: 0.3;
                  transform: scale(1);
                }
                50% {
                  opacity: 0.6;
                  transform: scale(1.05);
                }
              }
              .pulse-glow {
                animation: pulse-glow 2s ease-in-out infinite;
              }
              @keyframes vibrate-ripple {
                0% {
                  transform: scale(1);
                  opacity: 0.6;
                }
                25% {
                  transform: scale(1.08);
                  opacity: 0.45;
                }
                50% {
                  transform: scale(1.16);
                  opacity: 0.3;
                }
                75% {
                  transform: scale(1.24);
                  opacity: 0.15;
                }
                100% {
                  transform: scale(1.32);
                  opacity: 0;
                }
              }
              .vibrate-ripple {
                animation: vibrate-ripple 1.5s ease-out infinite;
              }
            `}</style>
            
            {/* Thin rotating ring when thinking/listening */}
            {state.isConnected && !state.isSpeaking && (
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                <svg className="w-60 h-60 rotating-ring" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="48"
                    fill="none"
                    stroke="#FF6B35"
                    strokeWidth="1.5"
                    strokeDasharray="75 225"
                    strokeLinecap="round"
                    opacity="0.7"
                  />
                </svg>
              </div>
            )}
            
            {/* Vibrating ripple rings when AI is talking */}
            {state.isConnected && state.isSpeaking && (
              <>
                {/* Ripple 1 */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none vibrate-ripple">
                  <div className="w-48 h-48 rounded-full border-2 border-orange-400"></div>
                </div>
                
                {/* Ripple 2 */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none vibrate-ripple" style={{ animationDelay: '0.3s' }}>
                  <div className="w-48 h-48 rounded-full border-2 border-orange-400"></div>
                </div>
                
                {/* Ripple 3 */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none vibrate-ripple" style={{ animationDelay: '0.6s' }}>
                  <div className="w-48 h-48 rounded-full border-2 border-orange-400"></div>
                </div>
                
                {/* Outer pulsing glow */}
                <div className="absolute inset-0 flex items-center justify-center pulse-glow pointer-events-none">
                  <div className="w-72 h-72 rounded-full bg-orange-400 blur-2xl opacity-20"></div>
                </div>
                
                {/* Middle pulsing glow */}
                <div className="absolute inset-0 flex items-center justify-center pulse-glow pointer-events-none" style={{ animationDelay: '0.3s' }}>
                  <div className="w-64 h-64 rounded-full bg-orange-400 blur-xl opacity-25"></div>
                </div>
              </>
            )}
            
            {expert?.avatar_url ? (
              <img
                src={expert.avatar_url}
                alt={expert.name}
                className="w-48 h-48 rounded-full object-cover shadow-2xl relative z-10"
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
              />
            ) : (
              <div className="w-48 h-48 rounded-full flex items-center justify-center bg-gray-200 text-gray-600 text-6xl font-bold shadow-2xl relative z-10">
                {expert?.name.charAt(0)}
              </div>
            )}
          </div>

          {/* Expert Name */}
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            {expert?.name}
          </h1>

          {/* Status Text */}
          {state.isConnected && (
            <div className="mb-8">
              <span className="text-sm font-medium" style={{ color: '#FF6B35' }}>
                {state.isSpeaking ? 'Talking' : state.isListening ? 'Thinking' : 'Connected'}
                {state.isSpeaking && ' 🔊'}
                {!state.isSpeaking && state.isListening && ' 💭'}
              </span>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Call Button */}
          <div className="mb-8 mt-12">
            {!state.isConnected ? (
              <Button
                onClick={handleStartCall}
                disabled={state.isConnecting || !expert}
                className="bg-black hover:bg-gray-800 text-white px-8 py-6 rounded-full text-lg font-medium shadow-lg"
              >
                {state.isConnecting ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Connecting...
                  </>
                ) : (
                  <>
                    <Phone className="mr-2 h-5 w-5" />
                    Start a call
                  </>
                )}
              </Button>
            ) : (
              <>
                <Button
                  onClick={handleEndCall}
                  className="bg-red-500 hover:bg-red-600 text-white px-8 py-6 rounded-full text-lg font-medium shadow-lg"
                >
                  <PhoneOff className="mr-2 h-5 w-5" />
                  End Call
                </Button>
                
                {/* Microphone Button with Ripple Effect */}
                <div className="mt-8 flex justify-center">
                  <div className="relative inline-flex items-center justify-center">
                    <style jsx>{`
                      @keyframes ripple {
                        0% {
                          transform: scale(1);
                          opacity: 0.6;
                        }
                        50% {
                          transform: scale(1.3);
                          opacity: 0.3;
                        }
                        100% {
                          transform: scale(1.6);
                          opacity: 0;
                        }
                      }
                      .ripple-effect {
                        animation: ripple 1.5s ease-out infinite;
                      }
                    `}</style>
                    
                    {/* Ripple rings when user is listening/talking */}
                    {state.isListening && (
                      <>
                        <div className="absolute inset-0 rounded-full bg-gray-400 ripple-effect"></div>
                        <div className="absolute inset-0 rounded-full bg-gray-400 ripple-effect" style={{ animationDelay: '0.5s' }}></div>
                        <div className="absolute inset-0 rounded-full bg-gray-400 ripple-effect" style={{ animationDelay: '1s' }}></div>
                      </>
                    )}
                    
                    {/* Microphone button */}
                    <button
                      className={`relative z-10 w-16 h-16 rounded-full flex items-center justify-center shadow-lg transition-all ${
                        state.isListening 
                          ? 'bg-gray-700 scale-110' 
                          : 'bg-gray-200 hover:bg-gray-300'
                      }`}
                    >
                      <svg 
                        className={`w-6 h-6 ${state.isListening ? 'text-white' : 'text-gray-700'}`}
                        fill="currentColor" 
                        viewBox="0 0 20 20"
                      >
                        <path d="M7 4a3 3 0 016 0v6a3 3 0 11-6 0V4z" />
                        <path d="M5.5 9.643a.75.75 0 00-1.5 0V10c0 3.06 2.29 5.585 5.25 5.954V17.5h-1.5a.75.75 0 000 1.5h4.5a.75.75 0 000-1.5h-1.5v-1.546A6.001 6.001 0 0016 10v-.357a.75.75 0 00-1.5 0V10a4.5 4.5 0 01-9 0v-.357z" />
                      </svg>
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

export default ClientCallPage
