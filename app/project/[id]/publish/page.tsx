'use client'

import React, { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { 
  Globe, 
  Lock, 
  Eye,
  CheckCircle,
  Radio
} from 'lucide-react'
import { API_URL } from '@/lib/config'
import { fetchWithAuth, getAuthHeaders } from '@/lib/api-client'

interface Publication {
  id: string
  slug: string
  display_name: string
  tagline: string
  description: string
  is_published: boolean
  is_private: boolean
  pricing_model: string
  price_per_session: number
  price_per_minute: number
  monthly_subscription_price: number
  free_trial_minutes: number
}

const PublishManagerPage = () => {
  const params = useParams()
  const projectId = params.id as string

  const [publication, setPublication] = useState<Publication | null>(null)
  const [loading, setLoading] = useState(true)
  const [isPublishing, setIsPublishing] = useState(false)
  const [expert, setExpert] = useState<any>(null)

  // Publish form state
  const [publishForm, setPublishForm] = useState({
    slug: '',
    is_published: false,
    is_private: false // Requires authentication
  })

  // Pricing plans state
  const [selectedPlan, setSelectedPlan] = useState('basic')
  const [pricingPlans] = useState([
    { id: 'basic', name: 'Basic', description: 'Perfect for getting started', price: 29, features: ['Limited access', 'Basic support', '1 session per day'] },
    { id: 'pro', name: 'Professional', description: 'For regular users', price: 79, features: ['Unlimited access', 'Priority support', 'Unlimited sessions'] },
    { id: 'premium', name: 'Premium', description: 'For power users', price: 149, features: ['Unlimited access', '24/7 support', 'Priority responses', 'Custom features'] }
  ])

  useEffect(() => {
    fetchPublicationData()
    fetchExpertData()
  }, [projectId])

  const fetchExpertData = async () => {
    try {
      const expertResponse = await fetchWithAuth(`${API_URL}/experts/${projectId}`, {
        headers: getAuthHeaders(),
      })
      const expertData = await expertResponse.json()
      
      if (expertData.success && expertData.expert) {
        setExpert(expertData.expert)
      }
    } catch (error) {
      console.error('Error fetching expert data:', error)
    }
  }

  const fetchPublicationData = async () => {
    try {
      setLoading(true)
      
      // Fetch publication data using the correct endpoint
      const publicationResponse = await fetchWithAuth(`${API_URL}/publishing/experts/${projectId}/publication`, {
        headers: getAuthHeaders(),
      })
      const publicationData = await publicationResponse.json()
      
      if (publicationData.success) {
        if (publicationData.publication) {
          setPublication(publicationData.publication)
          setPublishForm({
            slug: publicationData.publication.slug || '',
            is_published: publicationData.publication.is_published || false,
            is_private: publicationData.publication.is_private || false
          })
        } else {
          // No publication exists yet
          setPublication(null)
          setPublishForm({
            slug: '',
            is_published: false,
            is_private: false
          })
        }
      }
    } catch (error) {
      console.error('Error fetching publication data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handlePublishToggle = async (published: boolean) => {
    try {
      setIsPublishing(true)
      
      if (published && !publication) {
        // Need to create publication first
        await createPublication()
        return
      }
      
      const endpoint = published 
        ? `${API_URL}/publishing/experts/${projectId}/publish`
        : `${API_URL}/publishing/experts/${projectId}/unpublish`
      
      const response = await fetchWithAuth(endpoint, {
        method: 'POST',
        headers: getAuthHeaders(),
      })
      
      const data = await response.json()
      
      if (data.success) {
        setPublishForm({ ...publishForm, is_published: published })
        alert(`Expert ${published ? 'published' : 'unpublished'} successfully!`)
        if (published && data.public_url) {
          console.log(`Expert is now live at: ${data.public_url}`)
        }
        fetchPublicationData() // Refresh data
      } else {
        alert(`Failed to ${published ? 'publish' : 'unpublish'} expert: ` + (data.detail || data.error))
        // Reset toggle if failed
        setPublishForm({ ...publishForm, is_published: !published })
      }
    } catch (error) {
      console.error('Error toggling publish status:', error)
      alert('Error updating publish status. Please try again.')
      // Reset toggle if failed
      setPublishForm({ ...publishForm, is_published: !publishForm.is_published })
    } finally {
      setIsPublishing(false)
    }
  }

  const createPublication = async () => {
    try {
      if (!publishForm.slug) {
        alert('Please enter a slug first')
        return
      }

      // Use expert data for display_name, tagline, and description, fallback to defaults
      const displayName = expert?.name || publishForm.slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
      const tagline = expert?.headline || 'AI Expert Assistant'
      const description = expert?.description || 'Professional AI assistant ready to help you.'

      // Create a basic publication with expert data
      const publicationData = {
        display_name: displayName,
        slug: publishForm.slug.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
        tagline: tagline,
        description: description,
        is_private: publishForm.is_private,
        category: 'business',
        specialty: 'consultant',
        template_category: 'business',
        theme: 'professional',
        pricing_model: selectedPlan === 'basic' ? 'per_session' : selectedPlan === 'pro' ? 'per_minute' : 'subscription',
        price_per_session: selectedPlan === 'basic' ? 29.00 : null,
        price_per_minute: selectedPlan === 'pro' ? 2.00 : null,
        monthly_subscription_price: selectedPlan === 'premium' ? 149.00 : null,
        free_trial_minutes: 5
      }

      console.log('Creating publication with data:', publicationData)
      
      const response = await fetchWithAuth(`${API_URL}/publishing/experts/${projectId}/publication`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(publicationData)
      })

      console.log('Response status:', response.status)
      const data = await response.json()
      console.log('Response data:', data)

      if (data.success) {
        alert('Publication created successfully!')
        
        // Auto-publish after creation
        const publishResponse = await fetchWithAuth(`${API_URL}/publishing/experts/${projectId}/publish`, {
          method: 'POST',
          headers: getAuthHeaders(),
        })

        const publishData = await publishResponse.json()

        if (publishData.success) {
          alert('Expert published successfully!')
        } else {
          alert('Publication created but failed to publish: ' + (publishData.detail || publishData.error))
        }
        
        fetchPublicationData()
      } else {
        const errorMsg = data.detail || data.error || 'Unknown error'
        console.error('Publication creation error:', data)
        alert('Failed to create publication: ' + errorMsg)
      }
    } catch (error: any) {
      console.error('Error creating publication:', error)
      const errorMsg = error.response?.data?.detail || error.message || 'Please try again'
      alert('Error creating publication: ' + errorMsg)
    } finally {
      setIsPublishing(false)
    }
  }

  const handleRepublish = async () => {
    try {
      setIsPublishing(true)

      // If no publication exists, create one first
      if (!publication) {
        await createPublication()
        return
      }

      // Update publication with latest expert data
      const updateData: any = {
        display_name: expert?.name,
        tagline: expert?.headline,
        description: expert?.description,
        is_private: publishForm.is_private,
      }
      
      // Include slug if changed
      if (publishForm.slug && publishForm.slug !== publication.slug) {
        updateData.slug = publishForm.slug
      }

      const response = await fetchWithAuth(`${API_URL}/publishing/experts/${projectId}/publication`, {
        method: 'PUT',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData)
      })

      const data = await response.json()

      if (data.success) {
        alert('Publication updated successfully!')
        fetchPublicationData()
      } else {
        alert('Failed to update publication: ' + (data.detail || data.error))
      }
    } catch (error) {
      console.error('Error republishing:', error)
      alert('Error republishing. Please try again.')
    } finally {
      setIsPublishing(false)
    }
  }

  const handlePublishChange = (field: string, value: any) => {
    setPublishForm({ ...publishForm, [field]: value })
  }

  const handlePlanSelect = (planId: string) => {
    setSelectedPlan(planId)
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[calc(100vh-200px)]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Publish Manager</h1>
          <p className="text-gray-600 mt-2">Control how your expert is published and visible to end users</p>
        </div>

        <Card className="shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center text-xl">
                  <Globe className="h-5 w-5 mr-2 text-green-600" />
                  Publication Settings
                </CardTitle>
                <CardDescription>
                  Manage your expert's publication status and visibility
                </CardDescription>
              </div>
              <Button 
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                onClick={handleRepublish}
                disabled={!publishForm.slug || isPublishing}
              >
                {isPublishing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    {publication ? 'Republishing...' : 'Creating...'}
                  </>
                ) : (
                  <>
                    <Globe className="h-4 w-4 mr-2" />
                    {publication ? 'Republish' : 'Create & Publish'}
                  </>
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Info Message */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> Display name, headline, and description are automatically synced from your Profile Settings. 
                  Update them in the Profile Settings page.
                </p>
              </div>

              {/* Slug */}
              <div>
                <Label className="block text-sm font-medium text-gray-700 mb-2">
                  Public URL Slug
                </Label>
                <div className="flex items-center flex-1">
                  <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                    /expert/
                  </span>
                  <Input
                    value={publishForm.slug}
                    onChange={(e) => handlePublishChange('slug', e.target.value)}
                    placeholder="your-expert-name"
                    className="flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-r-md"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {publishForm.slug ? (
                    <>
                      Your public URL: <span className="text-blue-600 font-medium">{typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}/expert/{publishForm.slug}</span>
                    </>
                  ) : 'Enter a unique slug for your expert'}
                </p>
              </div>

              {/* Visibility Radio Buttons */}
              <div>
                <Label className="block text-sm font-medium text-gray-700 mb-3">
                  Visibility
                </Label>
                <div className="space-y-3">
                  {/* Public Option */}
                  <div 
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      !publishForm.is_private 
                        ? 'border-green-500 bg-green-50' 
                        : 'border-gray-200 hover:border-green-300'
                    }`}
                    onClick={() => setPublishForm({ ...publishForm, is_private: false })}
                  >
                    <div className="flex items-center">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mr-3 ${
                        !publishForm.is_private 
                          ? 'border-green-500 bg-green-500' 
                          : 'border-gray-300'
                      }`}>
                        {!publishForm.is_private && (
                          <div className="w-2.5 h-2.5 rounded-full bg-white"></div>
                        )}
                      </div>
                      <Globe className={`h-5 w-5 mr-2 ${
                        !publishForm.is_private ? 'text-green-600' : 'text-gray-400'
                      }`} />
                      <div className="flex-1">
                        <h4 className={`text-sm font-medium ${
                          !publishForm.is_private ? 'text-green-900' : 'text-gray-900'
                        }`}>
                          Public
                        </h4>
                        <p className={`text-xs ${
                          !publishForm.is_private ? 'text-green-700' : 'text-gray-500'
                        }`}>
                          Anyone can discover and access your expert
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Private Option */}
                  <div 
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      publishForm.is_private 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200 hover:border-blue-300'
                    }`}
                    onClick={() => setPublishForm({ ...publishForm, is_private: true })}
                  >
                    <div className="flex items-center">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mr-3 ${
                        publishForm.is_private 
                          ? 'border-blue-500 bg-blue-500' 
                          : 'border-gray-300'
                      }`}>
                        {publishForm.is_private && (
                          <div className="w-2.5 h-2.5 rounded-full bg-white"></div>
                        )}
                      </div>
                      <Lock className={`h-5 w-5 mr-2 ${
                        publishForm.is_private ? 'text-blue-600' : 'text-gray-400'
                      }`} />
                      <div className="flex-1">
                        <h4 className={`text-sm font-medium ${
                          publishForm.is_private ? 'text-blue-900' : 'text-gray-900'
                        }`}>
                          Private
                        </h4>
                        <p className={`text-xs ${
                          publishForm.is_private ? 'text-blue-700' : 'text-gray-500'
                        }`}>
                          Users must sign in to access this expert
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Pricing Plans - Only show when Private is selected */}
              {publishForm.is_private && (
                <div>
                  <Label className="block text-sm font-medium text-gray-700 mb-3">
                    Select Pricing Plan
                  </Label>
                  <div className="grid grid-cols-1 gap-3">
                    {pricingPlans.map((plan) => (
                      <div 
                        key={plan.id}
                        className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${selectedPlan === plan.id ? 'border-blue-500 ring-2 ring-blue-200 bg-blue-50' : 'border-gray-200 hover:border-blue-300'}`}
                        onClick={() => handlePlanSelect(plan.id)}
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <h6 className="font-bold text-gray-900 flex items-center">
                              {plan.name}
                              {selectedPlan === plan.id && (
                                <CheckCircle className="h-4 w-4 text-blue-600 ml-2" />
                              )}
                            </h6>
                            <p className="text-sm text-gray-600 mt-1">{plan.description}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xl font-bold text-gray-900">${plan.price}<span className="text-sm font-normal text-gray-600">/mo</span></p>
                          </div>
                        </div>
                        <ul className="mt-3 text-sm text-gray-700 space-y-1">
                          {plan.features.map((feature, idx) => (
                            <li key={idx} className="flex items-center">
                              <div className="w-1.5 h-1.5 rounded-full bg-green-500 mr-3"></div>
                              <span>{feature}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}

export default PublishManagerPage
