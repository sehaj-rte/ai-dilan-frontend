'use client'

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { API_URL } from '@/lib/config'
import { useClientAuthFlow } from '@/contexts/ClientAuthFlowContext'
import AuthModal from '@/components/client/AuthModal'
import PaymentModal from '@/components/client/PaymentModal'
import PrivateExpertPaymentModal from '@/components/client/PrivateExpertPaymentModal'
import { 
  MessageCircle, 
  Phone, 
  Star, 
  Clock, 
  DollarSign, 
  User, 
  Award, 
  CheckCircle2,
  Play,
  Globe,
  Calendar,
  Eye,
  Send,
  Lock,
  LogIn,
  ArrowLeft,
  LogOut,
  Loader2,
  AlertCircle
} from 'lucide-react'

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
  tagline: string
  description: string
  is_private: boolean
  category: string
  specialty: string
  pricing_model: string
  price_per_session: number
  price_per_minute: number
  monthly_subscription_price: number
  free_trial_minutes: number
  primary_color: string
  secondary_color: string
  theme: string
  view_count: number
  template_category: string
  expert_id: string
}

interface ContentSection {
  id: string
  section_type: string
  title: string
  content: string
  display_order: number
  is_visible: boolean
}

interface Template {
  name: string
  theme: string
  color_scheme: {
    primary: string
    secondary: string
    accent: string
  }
}

const ClientExpertPage = () => {
  const params = useParams()
  const router = useRouter()
  const slug = params.slug as string

  // Use ClientAuthFlow context
  const {
    showAuthModal,
    setShowAuthModal,
    showPaymentModal,
    setShowPaymentModal,
    handleChatOrCall,
    handleLogin,
    handleSignup,
    handlePaymentSuccess,
    currentUser,
    setCurrentUser
  } = useClientAuthFlow()

  // Derived auth state
  const isAuthenticated = !!currentUser
  const user = currentUser

  const [expert, setExpert] = useState<Expert | null>(null)
  const [publication, setPublication] = useState<Publication | null>(null)
  const [contentSections, setContentSections] = useState<ContentSection[]>([])
  const [template, setTemplate] = useState<Template | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showFullDescription, setShowFullDescription] = useState(false)
  const [questionText, setQuestionText] = useState('')
  const [selectedSessionType, setSelectedSessionType] = useState<'chat' | 'call'>('chat')
  const [showPrivatePaymentModal, setShowPrivatePaymentModal] = useState(false)
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false)
  const [checkingSubscription, setCheckingSubscription] = useState(false)

  const convertS3UrlToProxy = (s3Url: string): string => {
    if (!s3Url) return s3Url
    const match = s3Url.match(/https:\/\/ai-dilan\.s3\.[^/]+\.amazonaws\.com\/(.+)/)
    if (match) {
      return `${API_URL}/images/avatar/full/${match[1]}`
    }
    return s3Url
  }

  useEffect(() => {
    console.log("slug", slug)
    fetchExpertData()
  }, [slug])

  useEffect(() => {
    if (isAuthenticated && publication?.is_private) {
      checkUserSubscription()
    }
  }, [isAuthenticated, publication])

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
        setContentSections(data.content_sections || [])
        setTemplate(data.template)
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

  const checkUserSubscription = async () => {
    if (!publication?.id || !isAuthenticated) return
    
    try {
      setCheckingSubscription(true)
      const response = await fetch(`${API_URL}/payments/subscriptions/check/${publication.id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('dilan_ai_token')}`
        }
      })
      const data = await response.json()
      
      if (data.success) {
        setHasActiveSubscription(data.has_subscription)
      }
    } catch (error) {
      console.error('Error checking subscription:', error)
    } finally {
      setCheckingSubscription(false)
    }
  }

  const handleStartChat = () => {
    setSelectedSessionType('chat')
    handleSessionStart('chat')
  }

  const handleStartCall = () => {
    setSelectedSessionType('call')
    handleSessionStart('call')
  }

  const handleSessionStart = (sessionType: 'chat' | 'call') => {
    // If expert is private, check authentication and subscription
    if (publication?.is_private) {
      if (!isAuthenticated) {
        // Show auth modal first
        setShowAuthModal(true)
        return
      }
      
      if (!hasActiveSubscription) {
        // Show private payment modal
        setShowPrivatePaymentModal(true)
        return
      }
    }
    
    // If public expert or user has subscription, proceed directly
    if (sessionType === 'chat') {
      router.push(`/client/${slug}/chat`)
    } else {
      router.push(`/client/${slug}/call`)
    }
  }

  const handlePrivatePaymentSuccess = (subscriptionId: string) => {
    setShowPrivatePaymentModal(false)
    setHasActiveSubscription(true)
    
    // Redirect to the selected session type
    if (selectedSessionType === 'chat') {
      router.push(`/client/${slug}/chat`)
    } else {
      router.push(`/client/${slug}/call`)
    }
  }

  // Remove duplicate functions - using the ones defined above

  const getUserToken = () => {
    return localStorage.getItem('dilan_ai_token')
  }

  const handleQuestionSubmit = () => {
    // Redirect to chat page with the question as URL parameter
    if (questionText.trim()) {
      router.push(`/client/${slug}/chat?q=${encodeURIComponent(questionText.trim())}`)
    } else {
      router.push(`/client/${slug}/chat`)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleQuestionSubmit()
    }
  }

  const getPricingDisplay = () => {
    if (!publication) return ''
    
    switch (publication.pricing_model) {
      case 'per_session':
        return `$${publication.price_per_session}/session`
      case 'per_minute':
        return `$${publication.price_per_minute}/minute`
      case 'subscription':
        return `$${publication.monthly_subscription_price}/month`
      default:
        return 'Contact for pricing'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error || !expert || !publication) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Expert Not Found</h1>
          <p className="text-gray-600 mb-6">{error || 'The expert you are looking for is not available.'}</p>
          <Button onClick={() => router.push('/client/dashboard')}>
            Browse All Experts
          </Button>
        </div>
      </div>
    )
  }

  // Apply template colors
  const primaryColor = publication.primary_color || '#3B82F6'
  const secondaryColor = publication.secondary_color || '#1E40AF'

  // Remove authentication check - page should be public
  // Authentication only happens when user clicks Chat or Call buttons

  return (
    <div className="min-h-screen bg-white">
      {/* Simple Header */}
      <div className="border-b border-gray-200">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <h1 className="text-xl font-bold text-gray-900">{publication?.display_name || expert?.name || 'Expert'}</h1>
            </div>
            
            {/* User Info & Logout */}
            {isAuthenticated && user ? (
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{user.email}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setCurrentUser(null)
                    localStorage.removeItem('dilan_ai_token')
                    localStorage.removeItem('dilan_ai_user')
                    router.push(`/client/${slug}`)
                  }}
                  className="flex items-center gap-2"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAuthModal(true)}
                  className="flex items-center gap-2"
                >
                  <LogIn className="h-4 w-4" />
                  Login
                </Button>
                <Button
                  size="sm"
                  onClick={() => setShowAuthModal(true)}
                  className="flex items-center gap-2"
                  style={{ backgroundColor: primaryColor }}
                >
                  Sign Up
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content - Centered */}
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto text-center">
          {/* Expert Avatar */}
          <div className="mb-6">
            {expert.avatar_url ? (
              <div className="relative">
                <img
                  src={expert.avatar_url}
                  alt={expert.name}
                  className="w-32 h-32 rounded-full mx-auto object-cover shadow-lg"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none'
                    const fallback = e.currentTarget.parentElement?.querySelector('.avatar-fallback') as HTMLElement
                    if (fallback) fallback.style.display = 'flex'
                  }}
                />
                <div 
                  className="avatar-fallback w-32 h-32 rounded-full mx-auto hidden items-center justify-center bg-gray-200 text-gray-600 text-4xl font-bold shadow-lg"
                >
                  {expert.name.charAt(0)}
                </div>
              </div>
            ) : (
              <div className="w-32 h-32 rounded-full mx-auto flex items-center justify-center bg-gray-200 text-gray-600 text-4xl font-bold shadow-lg">
                {expert.name.charAt(0)}
              </div>
            )}
          </div>

          {/* Expert Name */}
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {expert.name}
          </h1>
          
          {/* Headline/Slug */}
          {expert.headline && (
            <p className="text-gray-500 text-sm mb-8">
              /{expert.headline}/
            </p>
          )}

          {/* Private Expert Badge */}
          {publication?.is_private && (
            <div className="flex justify-center mb-4">
              <Badge className="bg-purple-100 text-purple-800 px-3 py-1 flex items-center gap-2">
                <Lock className="h-4 w-4" />
                Private Expert - Subscription Required
              </Badge>
            </div>
          )}

          {/* Subscription Status */}
          {publication?.is_private && isAuthenticated && (
            <div className="flex justify-center mb-4">
              {checkingSubscription ? (
                <Badge className="bg-gray-100 text-gray-600 px-3 py-1 flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Checking subscription...
                </Badge>
              ) : hasActiveSubscription ? (
                <Badge className="bg-green-100 text-green-800 px-3 py-1 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  Active Subscription
                </Badge>
              ) : (
                <Badge className="bg-yellow-100 text-yellow-800 px-3 py-1 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Subscription Required
                </Badge>
              )}
            </div>
          )}

          {/* CTA Buttons */}
          <div className="flex justify-center gap-3 mb-12">
            <Button 
              size="lg" 
              className="text-white px-8 py-3 rounded-full font-semibold shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
              style={{ backgroundColor: primaryColor }}
              onClick={handleStartChat}
              disabled={checkingSubscription}
            >
              <MessageCircle className="h-5 w-5 mr-2" />
              {publication?.is_private && !isAuthenticated ? 'Login to Chat' : 
               publication?.is_private && !hasActiveSubscription ? 'Subscribe to Chat' : 'Chat'}
            </Button>
            <Button 
              size="lg" 
              className="text-white px-8 py-3 rounded-full font-semibold shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
              style={{ backgroundColor: primaryColor }}
              onClick={handleStartCall}
              disabled={checkingSubscription}
            >
              <Phone className="h-5 w-5 mr-2" />
              {publication?.is_private && !isAuthenticated ? 'Login to Call' : 
               publication?.is_private && !hasActiveSubscription ? 'Subscribe to Call' : 'Call'}
            </Button>
          </div>

          {/* Description Section */}
          <div className="border-t border-gray-200 pt-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <span className="mr-2">≡</span>
                Description
              </h2>
            </div>
            <div className="text-left text-gray-700 leading-relaxed space-y-4">
              {(() => {
                const description = publication?.description || expert?.description || 'No description available.'
                const charLimit = 200
                const shouldTruncate = description.length > charLimit
                
                return (
                  <>
                    <p>
                      {shouldTruncate && !showFullDescription
                        ? `${description.substring(0, charLimit)}...`
                        : description}
                    </p>
                    {shouldTruncate && (
                      <button 
                        onClick={() => setShowFullDescription(!showFullDescription)}
                        className="text-gray-500 text-sm hover:text-gray-700 font-medium"
                      >
                        {showFullDescription ? 'View less ~' : 'View more ~'}
                      </button>
                    )}
                  </>
                )
              })()}
            </div>
          </div>

        </div>
      </div>

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onLogin={handleLogin}
        onSignup={handleSignup}
        sessionType={selectedSessionType}
        expertName={publication?.display_name || expert?.name}
      />

      {/* Payment Modal */}
      {publication && (
        <PaymentModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          publication={publication}
          sessionType={selectedSessionType}
          onPaymentSuccess={handlePaymentSuccess}
          userToken={typeof window !== 'undefined' ? localStorage.getItem('dilan_ai_token') || undefined : undefined}
        />
      )}

      {/* Private Expert Payment Modal */}
      {publication?.is_private && user && (
        <PrivateExpertPaymentModal
          isOpen={showPrivatePaymentModal}
          onClose={() => setShowPrivatePaymentModal(false)}
          publication={publication}
          sessionType={selectedSessionType}
          onPaymentSuccess={handlePrivatePaymentSuccess}
          user={user}
        />
      )}
    </div>
  )
}

export default ClientExpertPage
