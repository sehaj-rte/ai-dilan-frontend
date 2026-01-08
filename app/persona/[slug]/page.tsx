'use client'

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSelector, useDispatch } from 'react-redux'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import SpeechToTextInput from '@/components/ui/speech-to-text-input'
import { API_URL } from '@/lib/config'
import { RootState } from '@/store/store'
import { loadUserFromStorage, logout } from '@/store/slices/authSlice'
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
  LogOut
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

const PublicExpertPage = () => {
  const params = useParams()
  const router = useRouter()
  const dispatch = useDispatch()
  const slug = params.slug as string

  // Auth state from Redux
  const { user, isAuthenticated } = useSelector((state: RootState) => state.auth)

  const [expert, setExpert] = useState<Expert | null>(null)
  const [publication, setPublication] = useState<Publication | null>(null)
  const [contentSections, setContentSections] = useState<ContentSection[]>([])
  const [template, setTemplate] = useState<Template | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showFullDescription, setShowFullDescription] = useState(false)
  const [questionText, setQuestionText] = useState('')

  const convertS3UrlToProxy = (s3Url: string): string => {
    if (!s3Url) return s3Url
    const match = s3Url.match(/https:\/\/ai-dilan\.s3\.[^/]+\.amazonaws\.com\/(.+)/)
    if (match) {
      return `${API_URL}/images/avatar/full/${match[1]}`
    }
    return s3Url
  }

  // Load user from storage on mount
  useEffect(() => {
    dispatch(loadUserFromStorage())
  }, [])

  useEffect(() => {
    console.log("slug", slug)
    fetchExpertData()
  }, [slug, isAuthenticated])

  const fetchExpertData = async () => {
    try {
      setLoading(true)
      
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
        // Set default publication data for styling
        setPublication({
          id: data.expert.id,
          slug: data.expert.id,
          display_name: data.expert.name,
          tagline: data.expert.headline || '',
          description: data.expert.description || '',
          is_private: false,
          category: 'general',
          specialty: 'general',
          pricing_model: 'free',
          price_per_session: 0,
          price_per_minute: 0,
          monthly_subscription_price: 0,
          free_trial_minutes: 0,
          primary_color: '#3B82F6',
          secondary_color: '#1E40AF',
          theme: 'default',
          view_count: 0,
          template_category: 'general'
        })
        setContentSections([])
        setTemplate(null)
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

  const handleStartChat = () => {
    // Redirect to chat interface with slug
    router.push(`/persona/${slug}/chat`)
  }

  const handleStartCall = () => {
    // Redirect to call interface with slug
    router.push(`/persona/${slug}/call`)
  }

  const handleQuestionSubmit = () => {
    // Redirect to chat page with the question as URL parameter
    if (questionText.trim()) {
      router.push(`/persona/${slug}/chat?q=${encodeURIComponent(questionText.trim())}`)
    } else {
      router.push(`/persona/${slug}/chat`)
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
        return `£${publication.price_per_session}/session`
      case 'per_minute':
        return `£${publication.price_per_minute}/minute`
      case 'subscription':
        return `£${publication.monthly_subscription_price}/month`
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
          <Button onClick={() => router.push('/experts')}>
            Browse All Experts
          </Button>
        </div>
      </div>
    )
  }

  // Apply template colors
  const primaryColor = publication.primary_color || '#3B82F6'
  const secondaryColor = publication.secondary_color || '#1E40AF'

  // Redirect to login if not authenticated (expert testing requires auth)
  if (!loading && !isAuthenticated) {
    router.push(`/persona/login?redirect=/persona/${slug}`)
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

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
            {isAuthenticated && user && (
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{user.email}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    dispatch(logout())
                    router.push('/auth/login')
                  }}
                  className="flex items-center gap-2"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
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

          {/* CTA Buttons */}
          <div className="flex justify-center gap-3 mb-12">
            <Button 
              size="lg" 
              className="text-white px-8 py-3 rounded-full font-semibold shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
              style={{ backgroundColor: primaryColor }}
              onClick={handleStartChat}
            >
              <MessageCircle className="h-5 w-5 mr-2" />
              Chat
            </Button>
            <Button 
              size="lg" 
              className="text-white px-8 py-3 rounded-full font-semibold shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
              style={{ backgroundColor: primaryColor }}
              onClick={handleStartCall}
            >
              <Phone className="h-5 w-5 mr-2" />
              Call
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
                const headline = expert?.headline || 'No headline available.'
                const charLimit = 200
                const shouldTruncate = headline.length > charLimit
                
                return (
                  <>
                    <p>
                      {shouldTruncate && !showFullDescription
                        ? `${headline.substring(0, charLimit)}...`
                        : headline}
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
    </div>
  )
}

export default PublicExpertPage
