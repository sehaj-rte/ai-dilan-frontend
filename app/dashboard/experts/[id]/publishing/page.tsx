'use client'

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { 
  ArrowLeft, 
  Globe, 
  Lock, 
  Settings, 
  Eye,
  Save,
  Upload,
  User
} from 'lucide-react'

interface Expert {
  id: string
  name: string
  description: string
  avatar_url: string | null
  category: string
  specialty: string
}

interface Publication {
  id: string
  slug: string
  display_name: string
  tagline: string
  description: string
  is_published: boolean
  visibility: 'public' | 'private'
  pricing_model: string
  price_per_session: number
  price_per_minute: number
  monthly_subscription_price: number
  free_trial_minutes: number
}

const ExpertPublishingPage = () => {
  const params = useParams()
  const router = useRouter()
  const expertId = params.id as string

  const [expert, setExpert] = useState<Expert | null>(null)
  const [publication, setPublication] = useState<Publication | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (expertId) {
      fetchExpertAndPublication()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expertId])

  const fetchExpertAndPublication = async () => {
    try {
      setLoading(true)
      
      // Fetch expert details
      const expertResponse = await fetch(`/api/experts/${expertId}`)
      const expertData = await expertResponse.json()
      
      if (expertData.success) {
        setExpert(expertData.expert)
        
        // If publication exists, fetch it
        if (expertData.expert.publication_id) {
          const pubResponse = await fetch(`/api/publishing/experts/${expertId}/publication`)
          const pubData = await pubResponse.json()
          
          if (pubData.success) {
            setPublication(pubData.publication)
          }
        } else {
          // Create default publication data
          setPublication({
            id: '',
            slug: expertData.expert.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
            display_name: expertData.expert.name,
            tagline: '',
            description: expertData.expert.description || '',
            is_published: false,
            visibility: 'private',
            pricing_model: 'per_session',
            price_per_session: 50,
            price_per_minute: 2,
            monthly_subscription_price: 99,
            free_trial_minutes: 5
          })
        }
      }
    } catch (error) {
      console.error('Error fetching expert data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: keyof Publication, value: string | number | boolean) => {
    if (publication) {
      setPublication({
        ...publication,
        [field]: value
      })
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      
      const url = publication?.id 
        ? `/api/publishing/experts/${expertId}/publication` 
        : `/api/publishing/experts/${expertId}/publication`
      
      const method = publication?.id ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(publication)
      })
      
      const data = await response.json()
      
      if (data.success) {
        alert('Publication settings saved successfully!')
        if (data.publication) {
          setPublication(data.publication)
        }
      } else {
        alert('Failed to save publication settings: ' + data.error)
      }
    } catch (error) {
      console.error('Error saving publication:', error)
      alert('Error saving publication settings. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handlePublishToggle = async (isPublished: boolean) => {
    try {
      if (!publication) return
      
      // Save the publication first
      await handleSave()
      
      // Then update publish status
      const url = isPublished 
        ? `/api/publishing/experts/${expertId}/publish` 
        : `/api/publishing/experts/${expertId}/unpublish`
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      })
      
      const data = await response.json()
      
      if (data.success) {
        setPublication({
          ...publication,
          is_published: isPublished
        })
        alert(`Expert ${isPublished ? 'published' : 'unpublished'} successfully!`)
      } else {
        alert(`Failed to ${isPublished ? 'publish' : 'unpublish'} expert: ` + data.error)
      }
    } catch (error) {
      console.error('Error publishing expert:', error)
      alert('Error updating publication status. Please try again.')
    }
  }

  const handleVisibilityChange = (visibility: 'public' | 'private') => {
    if (publication) {
      handleInputChange('visibility', visibility)
      // Note: User must click Save button to persist changes
      // No auto-save to prevent continuous API calls
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!expert) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Expert Not Found</h1>
          <Button onClick={() => router.push('/dashboard')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center mb-8">
          <Button
            variant="outline"
            onClick={() => router.push('/projects')}
            className="mr-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Projects
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Publish Settings</h1>
            <p className="text-gray-600">Manage how your expert appears to end users</p>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <div className="lg:w-1/4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Settings className="h-5 w-5 mr-2" />
                  Settings Manager
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Button variant="ghost" className="w-full justify-start">
                    <User className="h-4 w-4 mr-2" />
                    Profile Information
                  </Button>
                  <Button variant="ghost" className="w-full justify-start">
                    <Globe className="h-4 w-4 mr-2" />
                    Visibility Settings
                  </Button>
                  <Button variant="ghost" className="w-full justify-start">
                    <Eye className="h-4 w-4 mr-2" />
                    Preview
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:w-3/4 space-y-6">
            {/* Profile Information Section */}
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>
                  This information will be visible to end users on your public page
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Avatar Upload */}
                <div>
                  <Label>Avatar</Label>
                  <div className="flex items-center gap-6 mt-2">
                    {expert.avatar_url ? (
                      <img 
                        src={expert.avatar_url} 
                        alt="Expert Avatar" 
                        className="w-24 h-24 rounded-full object-cover border-2 border-gray-200"
                      />
                    ) : (
                      <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center">
                        <User className="h-8 w-8 text-gray-500" />
                      </div>
                    )}
                    <Button variant="outline">
                      <Upload className="h-4 w-4 mr-2" />
                      Upload New Avatar
                    </Button>
                  </div>
                </div>

                {/* Display Name */}
                <div>
                  <Label htmlFor="display_name">Display Name</Label>
                  <Input
                    id="display_name"
                    value={publication?.display_name || expert.name}
                    onChange={(e) => handleInputChange('display_name', e.target.value)}
                    placeholder="Your expert's public name"
                  />
                </div>

                {/* Slug */}
                <div>
                  <Label htmlFor="slug">Public URL Slug</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500 text-sm">yourdomain.com/persona/</span>
                    <Input
                      id="slug"
                      value={publication?.slug || ''}
                      onChange={(e) => handleInputChange('slug', e.target.value)}
                      placeholder="expert-url-slug"
                      className="flex-1"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    This will be your expert's public URL. Use lowercase letters and hyphens only.
                  </p>
                </div>

                {/* Tagline */}
                <div>
                  <Label htmlFor="tagline">Tagline</Label>
                  <Input
                    id="tagline"
                    value={publication?.tagline || ''}
                    onChange={(e) => handleInputChange('tagline', e.target.value)}
                    placeholder="Brief description of your expertise"
                  />
                </div>

                {/* Description */}
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={publication?.description || expert.description || ''}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder="Detailed description of your expert's capabilities and services"
                    rows={4}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Visibility Settings */}
            <Card>
              <CardHeader>
                <CardTitle>Visibility Settings</CardTitle>
                <CardDescription>
                  Control who can access your expert
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Visibility Toggle */}
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h3 className="font-medium">Public Visibility</h3>
                    <p className="text-sm text-gray-500">
                      Make your expert available to everyone on the internet
                    </p>
                  </div>
                  <Switch
                    checked={publication?.visibility === 'public'}
                    onCheckedChange={(checked) => 
                      handleVisibilityChange(checked ? 'public' : 'private')
                    }
                  />
                </div>

                {publication?.visibility === 'private' && (
                  <div className="space-y-4">
                    <h3 className="font-medium">Private Access Plans</h3>
                    <p className="text-sm text-gray-500">
                      Choose a plan for private access to your expert
                    </p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                      {/* Basic Plan */}
                      <Card className="border-2 cursor-pointer hover:border-blue-500 transition-colors">
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="font-bold text-lg">Basic</h4>
                            <Badge variant="secondary">Recommended</Badge>
                          </div>
                          <div className="text-2xl font-bold mb-4">$29<span className="text-sm font-normal">/month</span></div>
                          <ul className="space-y-2 text-sm">
                            <li className="flex items-center">
                              <span className="h-2 w-2 rounded-full bg-green-500 mr-2"></span>
                              10 chat sessions/month
                            </li>
                            <li className="flex items-center">
                              <span className="h-2 w-2 rounded-full bg-green-500 mr-2"></span>
                              Email support
                            </li>
                            <li className="flex items-center">
                              <span className="h-2 w-2 rounded-full bg-green-500 mr-2"></span>
                              Basic analytics
                            </li>
                          </ul>
                        </CardContent>
                      </Card>

                      {/* Pro Plan */}
                      <Card className="border-2 cursor-pointer hover:border-blue-500 transition-colors">
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="font-bold text-lg">Pro</h4>
                          </div>
                          <div className="text-2xl font-bold mb-4">$79<span className="text-sm font-normal">/month</span></div>
                          <ul className="space-y-2 text-sm">
                            <li className="flex items-center">
                              <span className="h-2 w-2 rounded-full bg-green-500 mr-2"></span>
                              Unlimited chat sessions
                            </li>
                            <li className="flex items-center">
                              <span className="h-2 w-2 rounded-full bg-green-500 mr-2"></span>
                              Voice calls included
                            </li>
                            <li className="flex items-center">
                              <span className="h-2 w-2 rounded-full bg-green-500 mr-2"></span>
                              Priority support
                            </li>
                            <li className="flex items-center">
                              <span className="h-2 w-2 rounded-full bg-green-500 mr-2"></span>
                              Advanced analytics
                            </li>
                          </ul>
                        </CardContent>
                      </Card>

                      {/* Enterprise Plan */}
                      <Card className="border-2 cursor-pointer hover:border-blue-500 transition-colors">
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="font-bold text-lg">Enterprise</h4>
                          </div>
                          <div className="text-2xl font-bold mb-4">Custom</div>
                          <ul className="space-y-2 text-sm">
                            <li className="flex items-center">
                              <span className="h-2 w-2 rounded-full bg-green-500 mr-2"></span>
                              Unlimited everything
                            </li>
                            <li className="flex items-center">
                              <span className="h-2 w-2 rounded-full bg-green-500 mr-2"></span>
                              Dedicated support
                            </li>
                            <li className="flex items-center">
                              <span className="h-2 w-2 rounded-full bg-green-500 mr-2"></span>
                              Custom integrations
                            </li>
                            <li className="flex items-center">
                              <span className="h-2 w-2 rounded-full bg-green-500 mr-2"></span>
                              Team management
                            </li>
                          </ul>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                )}

                {/* Publish Status */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h3 className="font-medium">Publish Status</h3>
                    <p className="text-sm text-gray-500">
                      {publication?.is_published ? 'Your expert is currently published' : 'Your expert is not published'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {publication?.is_published ? (
                      <>
                        <Globe className="h-4 w-4 text-green-600" />
                        <Badge className="bg-green-100 text-green-800">Published</Badge>
                      </>
                    ) : (
                      <>
                        <Lock className="h-4 w-4 text-gray-600" />
                        <Badge variant="secondary">Draft</Badge>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Save Button */}
            <div className="flex justify-end">
              <Button 
                onClick={handleSave}
                disabled={saving}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {saving ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                {saving ? 'Saving...' : 'Save Publishing Settings'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ExpertPublishingPage
