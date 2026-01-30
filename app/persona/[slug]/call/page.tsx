'use client'

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSelector, useDispatch } from 'react-redux'
import { Button } from '@/components/ui/button'
import { API_URL } from '@/lib/config'
import { ArrowLeft, Phone, PhoneOff, User, LogIn, LogOut, MessageSquare } from 'lucide-react'
import { useVoiceConversation } from '@/hooks/useVoiceConversation'
import { RootState } from '@/store/store'
import { logout, loadUserFromStorage } from '@/store/slices/authSlice'
import { usePlanLimitations } from '@/hooks/usePlanLimitations'
import { UsageStatusBar } from '@/components/usage/UsageStatusBar'
import { LimitReachedModal } from '@/components/usage/LimitReachedModal'


interface Expert {
  id: string
  name: string
  headline: string
  description: string
  avatar_url: string
  elevenlabs_agent_id: string
  user_id: string
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

const ExpertCallPage = () => {
  const params = useParams()
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
  const [isExpertOwner, setIsExpertOwner] = useState(false)
  const [usageRefreshTrigger, setUsageRefreshTrigger] = useState(0)  // Add refresh trigger
  const [usageTrackingInterval, setUsageTrackingInterval] = useState<NodeJS.Timeout | null>(null)
  const [lastTrackedMinute, setLastTrackedMinute] = useState(0)
  const [showLimitReachedModal, setShowLimitReachedModal] = useState(false)

  // Plan limitations hook
  const {
    usage,
    limitStatus,
    currentPlan,
    subscription,
    loading: planLoading,
    error: planError,
    refreshUsage,
    trackUsage,
    checkCanSendMessage,
    checkCanMakeCall,
    getRemainingUsage,
  } = usePlanLimitations({
    expertId: expert?.id || "",
    enabled: isAuthenticated && !!expert?.id,
  })

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
    userId: user?.id,
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

  // Check expert ownership when user authentication changes
  useEffect(() => {
    if (expert && user) {
      if (String(expert.user_id) === String(user.id)) {
        setIsExpertOwner(true);
        console.log("🎯 Expert owner detected on auth change (call page):", user.id, "owns expert", expert.id);
      } else {
        setIsExpertOwner(false);
      }
    } else {
      setIsExpertOwner(false);
    }
  }, [user, expert])

  const fetchExpertData = async () => {
    try {
      // Fetch expert data directly by ID (no publication required)
      const response = await fetch(`${API_URL}/experts/${slug}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('dilan_ai_token')}`,
          'Content-Type': 'application/json'
        }
      })
      const data = await response.json()

      if (data.success && data.expert) {
        setExpert({
          ...data.expert,
          avatar_url: data.expert?.avatar_url ? convertS3UrlToProxy(data.expert.avatar_url) : null
        })

        // Check if current user is the expert owner
        if (user && data.expert && String(data.expert.user_id) === String(user.id)) {
          setIsExpertOwner(true);
          console.log("🎯 Expert owner detected on call page:", user.id, "owns expert", data.expert.id);
        } else {
          setIsExpertOwner(false);
        }

        // Set default publication data for styling
        setPublication({
          id: data.expert.id,
          slug: data.expert.id,
          display_name: data.expert.name,
          is_published: true,
          primary_color: '#3B82F6',
          secondary_color: '#1E40AF',
          theme: 'default'
        })
      } else {
        setError('Expert not found or access denied')
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

    // Check if user can make calls using plan limitations
    if (isAuthenticated && !checkCanMakeCall(1)) {
      console.log("🚫 Call blocked - showing limit modal");
      setShowLimitReachedModal(true);
      return;
    }

    try {
      // Check for microphone permission first
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError('Your browser does not support microphone access. Please use a modern browser.')
        return
      }

      await startConversation()

      // Reset tracking state
      setCallDuration(0)
      setLastTrackedMinute(0)

      // Start timer
      const interval = setInterval(() => {
        setCallDuration(prev => prev + 1)
      }, 1000)
      setTimerInterval(interval)

      // Start real-time usage tracking (every 30 seconds)
      const usageInterval = setInterval(() => {
        trackRealTimeUsage();
      }, 30000); // Track every 30 seconds
      setUsageTrackingInterval(usageInterval);
      console.log('📊 Started real-time usage tracking');
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

      // Stop all timers first
      if (timerInterval) {
        clearInterval(timerInterval)
        setTimerInterval(null)
      }
      if (usageTrackingInterval) {
        clearInterval(usageTrackingInterval)
        setUsageTrackingInterval(null)
      }

      // Calculate total minutes used (round up partial minutes for billing)
      const totalMinutes = Math.ceil(callDuration / 60);

      console.log(`📞 Call ended: ${callDuration} seconds -> billing ${totalMinutes} minute(s)`);

      // Track final usage - only track remaining minutes not already tracked
      if (isAuthenticated && expert?.id && totalMinutes > lastTrackedMinute) {
        const remainingMinutes = totalMinutes - lastTrackedMinute;
        console.log(`📞 Tracking final ${remainingMinutes} minutes for call (total: ${totalMinutes}, already tracked: ${lastTrackedMinute})`);

        try {
          await trackUsage({
            expert_id: expert.id,
            event_type: "minutes_used",
            quantity: remainingMinutes,
          });
          console.log("📊 Final call usage tracked successfully");

          // Refresh usage data after tracking
          setTimeout(() => {
            refreshUsage().catch((err) =>
              console.error("Failed to refresh usage after call:", err),
            );
          }, 1000); // Small delay to ensure backend processing completes
        } catch (error) {
          console.error('Failed to track final call minutes:', error);
        }
      }

      // Reset state
      setLastTrackedMinute(0);
    } catch (error) {
      console.error('Failed to end voice conversation:', error)
    }
  }

  const handleBack = () => {
    router.push(`/project/${slug}/chat`)
  }

  const handleGoToChat = () => {
    router.push(`/project/${slug}/chat`)
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

  // Real-time usage tracking function
  const trackRealTimeUsage = async () => {
    if (!isAuthenticated || !expert?.id || callDuration === 0) return;

    const currentMinutes = Math.ceil(callDuration / 60);

    // Only track if we've crossed into a new minute
    if (currentMinutes > lastTrackedMinute) {
      const minutesToTrack = currentMinutes - lastTrackedMinute;

      console.log(`📊 Real-time tracking: ${minutesToTrack} minute(s) (total: ${currentMinutes}, last tracked: ${lastTrackedMinute})`);

      try {
        await trackUsage({
          expert_id: expert.id,
          event_type: "minutes_used",
          quantity: minutesToTrack,
        });

        setLastTrackedMinute(currentMinutes);

        // Refresh usage data to get updated limits
        await refreshUsage();

        // Check if user is running low on time or out of minutes
        const remainingUsage = getRemainingUsage();
        console.log(`📊 After tracking - remaining minutes: ${remainingUsage.minutes}`);

        // If no minutes remaining, end the call gracefully
        if (remainingUsage.minutes !== null && remainingUsage.minutes <= 0) {
          console.log(`🚫 No minutes remaining - ending call gracefully`);
          await handleEndCall();
          setShowLimitReachedModal(true);
        }

      } catch (error) {
        console.error("Failed to track real-time usage:", error);
      }
    }
  };

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerInterval) {
        clearInterval(timerInterval)
      }
      if (usageTrackingInterval) {
        clearInterval(usageTrackingInterval)
      }
    }
  }, [timerInterval, usageTrackingInterval])

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

  // Apply theme colors
  const primaryColor = publication?.primary_color || '#3B82F6'
  const secondaryColor = publication?.secondary_color || '#1E40AF'

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b border-gray-200">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 sm:space-x-4 flex-1 min-w-0">
              <button
                onClick={handleBack}
                className="text-gray-600 hover:text-gray-900 flex-shrink-0"
              >
                <ArrowLeft className="h-6 w-6" />
              </button>
              <div className="flex items-center space-x-2 min-w-0 flex-1">
                {expert?.avatar_url ? (
                  <img
                    src={expert.avatar_url}
                    alt={expert.name}
                    className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                  />
                ) : null}
                <span className="font-semibold text-gray-900 truncate text-sm sm:text-base">{expert?.name}</span>
              </div>
            </div>

            {/* User Profile / Login */}
            <div className="flex items-center space-x-1 sm:space-x-3 flex-shrink-0">
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
                className="sm:hidden flex items-center justify-center w-8 h-8 bg-black hover:bg-gray-800 text-white border-0 shadow-sm mr-1 rounded-full"
              >
                <MessageSquare className="h-3 w-3" />
              </Button>
              {isAuthenticated && user ? (
                <div className="flex items-center space-x-1 sm:space-x-3">
                  <div className="text-right hidden sm:block">
                    <p className="text-sm font-medium text-gray-900">{user.full_name || user.username}</p>
                    <p className="text-xs text-gray-500">{user.email}</p>
                  </div>
                  {/* Mobile: Show only avatar */}
                  <div className="sm:hidden">
                    {user.avatar_url ? (
                      <img
                        src={user.avatar_url.startsWith('http') ? user.avatar_url : `${API_URL}${user.avatar_url}`}
                        className="w-8 h-8 rounded-full object-cover border-2 border-gray-200"
                        alt={user.username}
                        onError={(e) => {
                          e.currentTarget.style.display = 'none'
                          e.currentTarget.nextElementSibling?.classList.remove('hidden')
                        }}
                      />
                    ) : null}
                    <div className={`w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center ${user.avatar_url ? 'hidden' : ''}`}>
                      <User className="h-4 w-4 text-gray-500" />
                    </div>
                  </div>
                  {/* Desktop: Show full profile */}
                  <div className="hidden sm:block">
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
                  </div>
                  <Button
                    onClick={handleLogout}
                    variant="ghost"
                    size="sm"
                    className="text-gray-600 hover:text-gray-900 hidden sm:flex"
                  >
                    <LogOut className="h-4 w-4" />
                  </Button>
                  {/* Mobile logout - icon only */}
                  <Button
                    onClick={handleLogout}
                    variant="ghost"
                    size="sm"
                    className="sm:hidden w-8 h-8 p-0 text-gray-600 hover:text-gray-900"
                  >
                    <LogOut className="h-3 w-3" />
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

      {/* Usage Status Bar - only show for authenticated users with plan limitations */}
      {isAuthenticated && currentPlan && !limitStatus.isUnlimited && (
        <div className="px-4 py-2 bg-gray-50 border-b">
          <div className="container mx-auto">
            <UsageStatusBar
              limitStatus={limitStatus}
              currentPlan={currentPlan}
              loading={planLoading}
              compact={true}
              expertSlug={slug}
            />
          </div>
        </div>
      )}

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
          <div className="mb-6 mt-12">
            {!state.isConnected ? (
              <Button
                onClick={handleStartCall}
                disabled={state.isConnecting || !expert || planLoading}
                className="bg-black hover:bg-gray-800 text-white px-8 py-6 rounded-full text-lg font-medium shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {state.isConnecting ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Connecting...
                  </>
                ) : planLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Loading usage data...
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
                      className={`relative z-10 w-16 h-16 rounded-full flex items-center justify-center shadow-lg transition-all ${state.isListening
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

          {/* Browser Compatibility Banner */}
          <div className="mb-8">
            <div className="inline-flex items-center px-6 py-3 rounded-full  border border-200 text-800 text-sm font-medium shadow-sm">
              <svg
                className="w-4 h-4 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
              Best experience with Chrome or Safari
            </div>
          </div>

        </div>
      </div>

      {/* Limit Reached Modal */}
      <LimitReachedModal
        isOpen={showLimitReachedModal}
        onClose={() => setShowLimitReachedModal(false)}
        limitStatus={limitStatus}
        currentPlan={currentPlan}
        expertSlug={slug}
        featureType="call"
      />
    </div>
  )
}

export default ExpertCallPage
