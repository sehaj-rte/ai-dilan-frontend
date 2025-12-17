'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { API_URL } from '@/lib/config'
import { fetchWithAuth, getAuthHeaders } from '@/lib/api-client'
import { 
  ArrowLeft, 
  Globe, 
  Palette, 
  DollarSign, 
  Eye, 
  Save,
  Sparkles,
  CheckCircle2
} from 'lucide-react'

interface Expert {
  id: string
  name: string
  description: string
  category: string
  specialty: string
}

interface Template {
  name: string
  subcategories: string[]
  theme: string
  color_scheme: {
    primary: string
    secondary: string
    accent: string
  }
}

interface PublicationData {
  display_name: string
  tagline: string
  description: string
  category: string
  specialty: string
  template_category: string
  template_subcategory: string
  slug: string
  pricing_model: string
  price_per_session: number
  price_per_minute: number
  monthly_subscription_price: number
  free_trial_minutes: number
  primary_color: string
  secondary_color: string
  theme: string
}

const ExpertPublishPage = () => {
  const router = useRouter()
  const params = useParams()
  const expertId = params.id as string

  const [expert, setExpert] = useState<Expert | null>(null)
  const [templates, setTemplates] = useState<{[key: string]: Template}>({})
  const [suggestedTemplate, setSuggestedTemplate] = useState<{category: string, template: Template} | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)

  const [publicationData, setPublicationData] = useState<PublicationData>({
    display_name: '',
    tagline: '',
    description: '',
    category: '',
    specialty: '',
    template_category: 'business',
    template_subcategory: '',
    slug: '',
    pricing_model: 'per_session',
    price_per_session: 50,
    price_per_minute: 2,
    monthly_subscription_price: 99,
    free_trial_minutes: 5,
    primary_color: '#3B82F6',
    secondary_color: '#1E40AF',
    theme: 'professional'
  })

  useEffect(() => {
    fetchExpertAndTemplates()
  }, [expertId])

  const fetchExpertAndTemplates = async () => {
    try {
      setLoading(true)
      
      // Fetch expert details
      const expertResponse = await fetchWithAuth(`${API_URL}/experts/${expertId}`, {
        headers: getAuthHeaders(),
      })
      const expertData = await expertResponse.json()
      
      if (expertData.success) {
        const expertInfo = expertData.expert
        setExpert(expertInfo)
        
        // Pre-fill form with expert data
        setPublicationData(prev => ({
          ...prev,
          display_name: expertInfo.name,
          description: expertInfo.description,
          category: expertInfo.category || '',
          specialty: expertInfo.specialty || '',
          slug: expertInfo.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
        }))

        // Fetch template suggestions
        const templateResponse = await fetchWithAuth(`${API_URL}/publishing/experts/${expertId}/publication/template-suggestions`, {
          headers: getAuthHeaders(),
        })
        const templateData = await templateResponse.json()
        
        if (templateData.success) {
          setTemplates(templateData.available_templates)
          setSuggestedTemplate(templateData.suggested_template)
          
          if (templateData.suggested_template) {
            const template = templateData.suggested_template.template
            setPublicationData(prev => ({
              ...prev,
              template_category: templateData.suggested_template.category,
              theme: template.theme,
              primary_color: template.color_scheme.primary,
              secondary_color: template.color_scheme.secondary
            }))
          }
        }
      }
    } catch (error) {
      console.error('Error fetching expert and templates:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: keyof PublicationData, value: string | number) => {
    setPublicationData(prev => ({
      ...prev,
      [field]: value
    }))

    // Auto-generate slug from display name
    if (field === 'display_name') {
      const slug = (value as string).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
      setPublicationData(prev => ({
        ...prev,
        slug
      }))
    }
  }

  const handleTemplateChange = (templateCategory: string) => {
    const template = templates[templateCategory]
    if (template) {
      setPublicationData(prev => ({
        ...prev,
        template_category: templateCategory,
        template_subcategory: '',
        theme: template.theme,
        primary_color: template.color_scheme.primary,
        secondary_color: template.color_scheme.secondary
      }))
    }
  }

  const handleSaveAndPublish = async () => {
    try {
      setSaving(true)
      
      const response = await fetchWithAuth(`${API_URL}/publishing/experts/${expertId}/publication/with-template?template_category=${publicationData.template_category}`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(publicationData)
      })
      
      const data = await response.json()
      
      if (data.success) {
        // Publish the expert
        const publishResponse = await fetchWithAuth(`${API_URL}/publishing/experts/${expertId}/publish`, {
          method: 'POST',
          headers: getAuthHeaders(),
        })
        
        const publishData = await publishResponse.json()
        
        if (publishData.success) {
          alert('Expert published successfully!')
          router.push('/projects')
        } else {
          alert('Publication created but failed to publish: ' + publishData.error)
        }
      } else {
        alert('Failed to create publication: ' + data.error)
      }
    } catch (error) {
      console.error('Error saving and publishing:', error)
      alert('Error saving publication. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="h-full bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="h-full bg-gradient-to-br from-blue-50 via-white to-purple-50">
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
            <h1 className="text-3xl font-bold text-gray-900">Publish Your Expert</h1>
            <p className="text-gray-600">Set up your public expert page with custom branding</p>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center space-x-4">
            <div className={`flex items-center justify-center w-8 h-8 rounded-full ${currentStep >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>
              1
            </div>
            <div className="w-16 h-1 bg-gray-200">
              <div className={`h-full bg-blue-600 transition-all duration-300 ${currentStep >= 2 ? 'w-full' : 'w-0'}`}></div>
            </div>
            <div className={`flex items-center justify-center w-8 h-8 rounded-full ${currentStep >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>
              2
            </div>
            <div className="w-16 h-1 bg-gray-200">
              <div className={`h-full bg-blue-600 transition-all duration-300 ${currentStep >= 3 ? 'w-full' : 'w-0'}`}></div>
            </div>
            <div className={`flex items-center justify-center w-8 h-8 rounded-full ${currentStep >= 3 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>
              3
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto">
          {currentStep === 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Globe className="h-5 w-5 mr-2" />
                  Basic Information
                </CardTitle>
                <CardDescription>
                  Set up the basic details for your public expert page
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="display_name">Display Name</Label>
                    <Input
                      id="display_name"
                      value={publicationData.display_name}
                      onChange={(e) => handleInputChange('display_name', e.target.value)}
                      placeholder="Dr. Sarah Johnson"
                    />
                  </div>
                  <div>
                    <Label htmlFor="slug">URL Slug</Label>
                    <Input
                      id="slug"
                      value={publicationData.slug}
                      onChange={(e) => handleInputChange('slug', e.target.value)}
                      placeholder="dr-sarah-johnson"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Your expert will be available at: yoursite.com/{publicationData.slug}
                    </p>
                  </div>
                </div>

                <div>
                  <Label htmlFor="tagline">Tagline</Label>
                  <Input
                    id="tagline"
                    value={publicationData.tagline}
                    onChange={(e) => handleInputChange('tagline', e.target.value)}
                    placeholder="Expert Dentist with 15+ Years Experience"
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={publicationData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder="Provide comprehensive dental care with a focus on patient comfort and advanced treatments..."
                    rows={4}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="category">Category</Label>
                    <Input
                      id="category"
                      value={publicationData.category}
                      onChange={(e) => handleInputChange('category', e.target.value)}
                      placeholder="Healthcare"
                    />
                  </div>
                  <div>
                    <Label htmlFor="specialty">Specialty</Label>
                    <Input
                      id="specialty"
                      value={publicationData.specialty}
                      onChange={(e) => handleInputChange('specialty', e.target.value)}
                      placeholder="Dentistry"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button onClick={() => setCurrentStep(2)}>
                    Next: Choose Template
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {currentStep === 2 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Palette className="h-5 w-5 mr-2" />
                  Choose Template & Branding
                </CardTitle>
                <CardDescription>
                  Select a professional template that matches your expertise
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {suggestedTemplate && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center mb-2">
                      <Sparkles className="h-4 w-4 text-blue-600 mr-2" />
                      <span className="font-medium text-blue-900">Recommended for you</span>
                    </div>
                    <p className="text-blue-800">
                      Based on your specialty "{publicationData.specialty}", we recommend the {suggestedTemplate.template.name} template.
                    </p>
                  </div>
                )}

                <div>
                  <Label>Template Category</Label>
                  <Select value={publicationData.template_category} onValueChange={handleTemplateChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(templates).map(([key, template]) => (
                        <SelectItem key={key} value={key}>
                          {template.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {templates[publicationData.template_category]?.subcategories.length > 0 && (
                  <div>
                    <Label>Subcategory</Label>
                    <Select value={publicationData.template_subcategory} onValueChange={(value) => handleInputChange('template_subcategory', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a subcategory" />
                      </SelectTrigger>
                      <SelectContent>
                        {templates[publicationData.template_category].subcategories.map((sub) => (
                          <SelectItem key={sub} value={sub}>
                            {sub}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="primary_color">Primary Color</Label>
                    <div className="flex items-center space-x-2">
                      <Input
                        id="primary_color"
                        type="color"
                        value={publicationData.primary_color}
                        onChange={(e) => handleInputChange('primary_color', e.target.value)}
                        className="w-16 h-10"
                      />
                      <Input
                        value={publicationData.primary_color}
                        onChange={(e) => handleInputChange('primary_color', e.target.value)}
                        placeholder="#3B82F6"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="secondary_color">Secondary Color</Label>
                    <div className="flex items-center space-x-2">
                      <Input
                        id="secondary_color"
                        type="color"
                        value={publicationData.secondary_color}
                        onChange={(e) => handleInputChange('secondary_color', e.target.value)}
                        className="w-16 h-10"
                      />
                      <Input
                        value={publicationData.secondary_color}
                        onChange={(e) => handleInputChange('secondary_color', e.target.value)}
                        placeholder="#1E40AF"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-between">
                  <Button variant="outline" onClick={() => setCurrentStep(1)}>
                    Previous
                  </Button>
                  <Button onClick={() => setCurrentStep(3)}>
                    Next: Pricing
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {currentStep === 3 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <DollarSign className="h-5 w-5 mr-2" />
                  Pricing & Launch
                </CardTitle>
                <CardDescription>
                  Set your pricing model and launch your expert
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label>Pricing Model</Label>
                  <Select value={publicationData.pricing_model} onValueChange={(value) => handleInputChange('pricing_model', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="per_session">Per Session</SelectItem>
                      <SelectItem value="per_minute">Per Minute</SelectItem>
                      <SelectItem value="subscription">Monthly Subscription</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {publicationData.pricing_model === 'per_session' && (
                  <div>
                    <Label htmlFor="price_per_session">Price per Session (£)</Label>
                    <Input
                      id="price_per_session"
                      type="number"
                      value={publicationData.price_per_session}
                      onChange={(e) => handleInputChange('price_per_session', parseFloat(e.target.value))}
                      min="1"
                      step="1"
                    />
                  </div>
                )}

                {publicationData.pricing_model === 'per_minute' && (
                  <div>
                    <Label htmlFor="price_per_minute">Price per Minute (£)</Label>
                    <Input
                      id="price_per_minute"
                      type="number"
                      value={publicationData.price_per_minute}
                      onChange={(e) => handleInputChange('price_per_minute', parseFloat(e.target.value))}
                      min="0.1"
                      step="0.1"
                    />
                  </div>
                )}

                {publicationData.pricing_model === 'subscription' && (
                  <div>
                    <Label htmlFor="monthly_subscription_price">Monthly Subscription (£)</Label>
                    <Input
                      id="monthly_subscription_price"
                      type="number"
                      value={publicationData.monthly_subscription_price}
                      onChange={(e) => handleInputChange('monthly_subscription_price', parseFloat(e.target.value))}
                      min="1"
                      step="1"
                    />
                  </div>
                )}

                <div>
                  <Label htmlFor="free_trial_minutes">Free Trial Minutes</Label>
                  <Input
                    id="free_trial_minutes"
                    type="number"
                    value={publicationData.free_trial_minutes}
                    onChange={(e) => handleInputChange('free_trial_minutes', parseInt(e.target.value))}
                    min="0"
                    step="1"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Allow users to try your expert for free before purchasing
                  </p>
                </div>

                <div className="flex justify-between">
                  <Button variant="outline" onClick={() => setCurrentStep(2)}>
                    Previous
                  </Button>
                  <Button 
                    onClick={handleSaveAndPublish}
                    disabled={saving}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {saving ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    ) : (
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                    )}
                    {saving ? 'Publishing...' : 'Save & Publish'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

export default ExpertPublishPage
