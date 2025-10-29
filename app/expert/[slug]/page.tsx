'use client'

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { API_URL } from '@/lib/config'
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
  Eye
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
  const slug = params.slug as string

  const [expert, setExpert] = useState<Expert | null>(null)
  const [publication, setPublication] = useState<Publication | null>(null)
  const [contentSections, setContentSections] = useState<ContentSection[]>([])
  const [template, setTemplate] = useState<Template | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showFullDescription, setShowFullDescription] = useState(false)

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

  const handleStartChat = () => {
    // Redirect to chat interface with slug
    router.push(`/expert/${slug}/chat`)
  }

  const handleStartCall = () => {
    // Redirect to call interface with slug
    router.push(`/expert/${slug}/call`)
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

  return (
    <div className="min-h-screen bg-white">
      {/* Simple Header */}
      <div className="border-b border-gray-200">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-orange-500 rounded flex items-center justify-center">
                <span className="text-white text-sm">≡</span>
              </div>
              <div className="w-8 h-8 bg-orange-500 rounded flex items-center justify-center">
                <span className="text-white text-sm">🇺🇸</span>
              </div>
            </div>
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
              className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-full"
              onClick={handleStartChat}
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              Chat
            </Button>
            <Button 
              size="lg" 
              className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-full"
              onClick={handleStartCall}
            >
              <Phone className="h-4 w-4 mr-2" />
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

          
          {/* Ask Question Input */}
          <div className="mt-12 pt-8 border-t border-gray-200">
            <div className="relative">
              <input
                type="text"
                placeholder={`Ask ${expert.name} a question`}
                className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
              <button className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PublicExpertPage
