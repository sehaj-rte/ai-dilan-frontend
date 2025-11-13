'use client'

import React, { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { useToast, ToastContainer } from '@/components/ui/toast'
import { useSlugValidation } from '@/hooks/useSlugValidation'
import { 
  Globe, 
  Lock, 
  Eye,
  CheckCircle,
  Radio,
  AlertCircle,
  Loader2,
  Copy,
  Check
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
  const { toasts, removeToast, success, error, warning, info } = useToast()

  const [publication, setPublication] = useState<Publication | null>(null)
  const [loading, setLoading] = useState(true)
  const [isPublishing, setIsPublishing] = useState(false)
  const [expert, setExpert] = useState<any>(null)
  const [isCopied, setIsCopied] = useState(false)

  // Publish form state
  const [publishForm, setPublishForm] = useState({
    slug: '',
    is_published: false,
    is_private: false // Requires authentication
  })

  // Slug validation
  const {
    validateSlug,
    isChecking: isCheckingSlug,
    validationResult,
    getValidationStatus,
    getStatusMessage,
    getStatusColor
  } = useSlugValidation({ expertId: projectId })

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

  // Validate slug when form slug changes
  useEffect(() => {
    if (publishForm.slug && publishForm.slug.length >= 2) {
      validateSlug(publishForm.slug)
    }
  }, [publishForm.slug, validateSlug])

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
        success(`Expert ${published ? 'published' : 'unpublished'} successfully!`)
        if (published && data.public_url) {
          console.log(`Expert is now live at: ${data.public_url}`)
        }
        fetchPublicationData() // Refresh data
      } else {
        error(`Failed to ${published ? 'publish' : 'unpublish'} expert: ` + (data.detail || data.error))
        // Reset toggle if failed
        setPublishForm({ ...publishForm, is_published: !published })
      }
    } catch (err) {
      console.error('Error toggling publish status:', err)
      error('Error updating publish status. Please try again.')
      // Reset toggle if failed
      setPublishForm({ ...publishForm, is_published: !publishForm.is_published })
    } finally {
      setIsPublishing(false)
    }
  }

  const createPublication = async () => {
    try {
      if (!publishForm.slug) {
        warning('Please enter a slug first')
        return
      }

      // Check slug availability before creating
      if (getValidationStatus() === 'unavailable') {
        error('Slug is not available. Please choose a different one.')
        return
      }

      if (getValidationStatus() === 'invalid') {
        error('Slug is invalid. Please fix the validation errors.')
        return
      }

      if (getValidationStatus() === 'checking') {
        warning('Please wait for slug validation to complete')
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
        success('Publication created successfully!')
        
        // Auto-publish after creation
        const publishResponse = await fetchWithAuth(`${API_URL}/publishing/experts/${projectId}/publish`, {
          method: 'POST',
          headers: getAuthHeaders(),
        })

        const publishData = await publishResponse.json()

        if (publishData.success) {
          success('Expert published successfully!')
        } else {
          error('Publication created but failed to publish: ' + (publishData.detail || publishData.error))
        }
        
        fetchPublicationData()
      } else {
        const errorMsg = data.detail || data.error || 'Unknown error'
        console.error('Publication creation error:', data)
        error('Failed to create publication: ' + errorMsg)
      }
    } catch (err: any) {
      console.error('Error creating publication:', err)
      const errorMsg = err.response?.data?.detail || err.message || 'Please try again'
      error('Error creating publication: ' + errorMsg)
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

      // Check slug availability if slug has changed
      if (publishForm.slug !== publication.slug) {
        if (getValidationStatus() === 'unavailable') {
          error('Slug is not available. Please choose a different one.')
          return
        }

        if (getValidationStatus() === 'invalid') {
          error('Slug is invalid. Please fix the validation errors.')
          return
        }

        if (getValidationStatus() === 'checking') {
          warning('Please wait for slug validation to complete')
          return
        }
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
        success('Publication updated successfully!')
        fetchPublicationData()
      } else {
        error('Failed to update publication: ' + (data.detail || data.error))
      }
    } catch (err) {
      console.error('Error republishing:', err)
      error('Error republishing. Please try again.')
    } finally {
      setIsPublishing(false)
    }
  }

  const handlePublishChange = (field: string, value: any) => {
    setPublishForm({ ...publishForm, [field]: value })
    
    // Trigger slug validation when slug changes
    if (field === 'slug' && value) {
      validateSlug(value)
    }
  }

  // Clean slug input to only allow valid characters
  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value
    // Allow only lowercase letters, numbers, and hyphens
    const cleanedValue = rawValue.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-')
    handlePublishChange('slug', cleanedValue)
  }

  const handlePlanSelect = (planId: string) => {
    setSelectedPlan(planId)
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setIsCopied(true)
      success('URL copied to clipboard!')
      
      // Reset the copied state after 2 seconds
      setTimeout(() => {
        setIsCopied(false)
      }, 2000)
    } catch (err) {
      console.error('Failed to copy text: ', err)
      error('Failed to copy URL')
    }
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
      <ToastContainer toasts={toasts} onClose={removeToast} />
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
                disabled={!publishForm.slug || isPublishing || isCheckingSlug || getValidationStatus() === 'unavailable' || getValidationStatus() === 'invalid'}
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
                  Public URL Slug *
                </Label>
                <div className="flex items-center flex-1">
                  <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                    /expert/
                  </span>
                  <div className="relative flex-1">
                    <Input
                      value={publishForm.slug}
                      onChange={handleSlugChange}
                      placeholder="your-expert-name"
                      className={`flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-r-md pr-10 ${
                        getValidationStatus() === 'available' ? 'border-green-500 focus:border-green-500' :
                        getValidationStatus() === 'unavailable' ? 'border-red-500 focus:border-red-500' :
                        getValidationStatus() === 'invalid' ? 'border-orange-500 focus:border-orange-500' :
                        getValidationStatus() === 'error' ? 'border-red-500 focus:border-red-500' :
                        'border-gray-300'
                      }`}
                      required
                    />
                    {/* Status Icon */}
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      {isCheckingSlug && (
                        <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
                      )}
                      {!isCheckingSlug && getValidationStatus() === 'available' && (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      )}
                      {!isCheckingSlug && getValidationStatus() === 'invalid' && (
                        <AlertCircle className="h-4 w-4 text-orange-500" />
                      )}
                      {!isCheckingSlug && (getValidationStatus() === 'unavailable' || getValidationStatus() === 'error') && (
                        <AlertCircle className="h-4 w-4 text-red-500" />
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Status Message */}
                {publishForm.slug && (
                  <div className={`text-xs mt-1 flex items-center ${getStatusColor()}`}>
                    {getStatusMessage()}
                  </div>
                )}
                
                {/* URL Preview */}
                <div className="text-xs text-gray-500 mt-1">
                  {publishForm.slug && getValidationStatus() === 'available' ? (
                    <div className="flex items-center gap-2">
                      <span>✅ Your public URL:</span>
                      <span className="text-blue-600 font-medium">
                        {typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}/client/{validationResult?.slug || publishForm.slug}
                      </span>
                      <button
                        onClick={() => copyToClipboard(`${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}/client/${validationResult?.slug || publishForm.slug}`)}
                        className="inline-flex items-center justify-center w-5 h-5 rounded hover:bg-gray-100 transition-colors"
                        title="Copy URL to clipboard"
                      >
                        {isCopied ? (
                          <Check className="w-3 h-3 text-green-500" />
                        ) : (
                          <Copy className="w-3 h-3 text-gray-400 hover:text-gray-600" />
                        )}
                      </button>
                    </div>
                  ) : publishForm.slug ? (
                    <div className="flex items-center gap-2">
                      <span>Preview URL:</span>
                      <span className="text-gray-400">
                        {typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}/client/{publishForm.slug}
                      </span>
                    </div>
                  ) : (
                    <span>Enter a unique slug for your expert (only lowercase letters, numbers, and hyphens)</span>
                  )}
                </div>
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
