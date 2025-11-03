'use client'

import React, { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useAppSelector } from '@/store/hooks'
import { 
  User, 
  Image as ImageIcon,
  Save,
  Brain,
  HelpCircle,
  RotateCcw
} from 'lucide-react'
import { API_URL } from '@/lib/config'
import { fetchWithAuth, getAuthHeaders } from '@/lib/api-client'
import { ToastContainer, useToast } from '@/components/ui/toast'

interface Expert {
  id: string
  name: string
  description: string
  headline: string
  avatar_url: string | null
  is_active: boolean
  created_at: string
}

const ProfileSettingsPage = () => {
  const params = useParams()
  const projectId = params.id as string
  const { user } = useAppSelector((state) => state.auth)
  const { toasts, removeToast, success: showSuccess, error: showError, warning: showWarning } = useToast()

  const [expert, setExpert] = useState<Expert | null>(null)
  const [loading, setLoading] = useState(true)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // Settings form state
  const [settingsForm, setSettingsForm] = useState({
    name: '',
    headline: '',
    description: '',
    avatar_url: ''
  })

  // AI Behavior Settings state
  const [behaviorSettings, setBehaviorSettings] = useState({
    kb_mode: 'balanced',
    custom_instructions: ''
  })
  const [isSavingBehavior, setIsSavingBehavior] = useState(false)

  // Helper function to convert S3 URL to proxy URL
  const convertS3UrlToProxy = (s3Url: string): string => {
    if (!s3Url) return s3Url
    
    const match = s3Url.match(/https:\/\/ai-dilan\.s3\.[^/]+\.amazonaws\.com\/(.+)/)
    if (match) {
      return `${API_URL}/images/avatar/full/${match[1]}`
    }
    return s3Url
  }

  useEffect(() => {
    fetchExpertData()
    fetchBehaviorSettings()
  }, [projectId])

  // Log user data for debugging and ensure component updates when user changes
  useEffect(() => {
    if (user) {
      console.log('👤 User data in Profile Settings:', user)
    }
  }, [user])

  const fetchExpertData = async () => {
    try {
      setLoading(true)
      
      // Fetch expert data
      const expertResponse = await fetchWithAuth(`${API_URL}/experts/${projectId}`, {
        headers: getAuthHeaders(),
      })
      const expertData = await expertResponse.json()
      
      console.log('📥 Fetched expert data:', expertData)
      
      if (expertData.success && expertData.expert) {
        setExpert(expertData.expert)
        
        const avatarUrl = expertData.expert.avatar_url || ''
        console.log('🖼️ Expert avatar_url from server:', avatarUrl)
        
        setSettingsForm({
          name: expertData.expert.name || '',
          headline: expertData.expert.headline || '',
          description: expertData.expert.description || '',
          avatar_url: avatarUrl
        })
        
        // Add cache-busting parameter to force browser to reload image
        const proxyUrl = avatarUrl ? `${convertS3UrlToProxy(avatarUrl)}?t=${Date.now()}` : null
        console.log('🖼️ Setting avatar preview to:', proxyUrl)
        setAvatarPreview(proxyUrl)
      }
    } catch (error) {
      console.error('Error fetching expert data:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchBehaviorSettings = async () => {
    try {
      const response = await fetchWithAuth(`${API_URL}/experts/${projectId}/behavior-settings`, {
        headers: getAuthHeaders(),
      })
      const data = await response.json()
      
      if (data.success && data.settings) {
        setBehaviorSettings({
          kb_mode: data.settings.kb_mode || 'balanced',
          custom_instructions: data.settings.custom_instructions || ''
        })
      }
    } catch (error) {
      console.error('Error fetching behavior settings:', error)
    }
  }

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      
      // Check file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        showWarning('Image must be smaller than 5MB', 'File too large')
        e.target.value = '' // Reset input
        return
      }
      
      // Check file type
      if (!file.type.startsWith('image/')) {
        showWarning('Please select a valid image file', 'Invalid file type')
        e.target.value = '' // Reset input
        return
      }
      
      const reader = new FileReader()
      
      reader.onloadend = () => {
        const fullDataUrl = reader.result as string
        console.log('📸 Avatar preview updated:', fullDataUrl.substring(0, 50) + '...')
        console.log('📸 Full data URL length:', fullDataUrl.length)
        setAvatarPreview(fullDataUrl)
        setSettingsForm(prev => {
          const updated = { ...prev, avatar_url: fullDataUrl }
          console.log('📸 Settings form updated with avatar')
          return updated
        })
      }
      
      reader.onerror = () => {
        showError('Failed to read image file', 'Upload error')
        e.target.value = '' // Reset input
      }
      
      reader.readAsDataURL(file)
    }
    
    // Reset input value to allow selecting the same file again
    e.target.value = ''
  }

  const handleSettingsSave = async () => {
    try {
      setIsSaving(true)
      
      // Prepare update data
      const updateData: any = {
        name: settingsForm.name,
        description: settingsForm.description
      }
      
      // Add headline if it exists
      if (settingsForm.headline) {
        updateData.headline = settingsForm.headline
      }
      
      // Add avatar if it exists (as base64)
      if (settingsForm.avatar_url) {
        console.log('💾 Saving avatar, data length:', settingsForm.avatar_url.length)
        console.log('💾 Avatar data preview:', settingsForm.avatar_url.substring(0, 100))
        updateData.avatar_base64 = settingsForm.avatar_url
      } else {
        console.log('⚠️ No avatar data to save')
      }
      
      console.log('📤 Sending update data:', {
        ...updateData,
        avatar_base64: updateData.avatar_base64 ? `[${updateData.avatar_base64.length} chars]` : undefined
      })
      
      const response = await fetchWithAuth(`${API_URL}/experts/${projectId}`, {
        method: 'PUT',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData)
      })
      
      const data = await response.json()
      console.log('📥 Server response:', data)
      
      if (data.success) {
        showSuccess('Your profile settings have been saved.', 'Saved successfully')
        await fetchExpertData() // Refresh data
      } else {
        showError(data.error || data.detail || 'Failed to save settings', 'Save failed')
      }
    } catch (error) {
      console.error('Error saving settings:', error)
      showError('Error saving settings. Please try again.', 'Unexpected error')
    } finally {
      setIsSaving(false)
    }
  }

  const handleBehaviorSettingsSave = async () => {
    try {
      setIsSavingBehavior(true)
      
      const response = await fetchWithAuth(`${API_URL}/experts/${projectId}/behavior-settings`, {
        method: 'PUT',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(behaviorSettings)
      })
      
      const data = await response.json()
      
      if (data.success) {
        showSuccess('AI behavior settings saved successfully.', 'Settings Updated')
      } else {
        showError(data.error || 'Failed to save behavior settings', 'Save Failed')
      }
    } catch (error) {
      console.error('Error saving behavior settings:', error)
      showError('Error saving behavior settings. Please try again.', 'Unexpected Error')
    } finally {
      setIsSavingBehavior(false)
    }
  }

  const resetBehaviorSettings = () => {
    setBehaviorSettings({
      kb_mode: 'balanced',
      custom_instructions: ''
    })
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
          <h1 className="text-3xl font-bold text-gray-900">Profile Settings</h1>
          <p className="text-gray-600 mt-2">Configure your expert's profile information</p>
        </div>

        {/* Expert Profile Card */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center text-xl">
              <User className="h-5 w-5 mr-2 text-blue-600" />
              Expert Profile
            </CardTitle>
            <CardDescription>
              Manage your expert's public information
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Avatar Upload */}
              <div className="flex items-center space-x-6">
                <div className="relative group">
                  {avatarPreview ? (
                    <img 
                      src={avatarPreview} 
                      alt="Expert preview" 
                      className="w-24 h-24 rounded-full object-cover border-2 border-gray-300"
                      onLoad={() => console.log('✅ Avatar image loaded successfully')}
                      onError={(e) => {
                        console.error('❌ Avatar image failed to load:', avatarPreview)
                        // Fallback to default icon on error
                        setAvatarPreview(null)
                      }}
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center border-2 border-gray-300">
                      <User className="h-10 w-10 text-gray-400" />
                    </div>
                  )}
                  <div className="absolute bottom-0 right-0 bg-white rounded-full p-1 border border-gray-300 shadow-sm">
                    <ImageIcon className="h-4 w-4 text-gray-600" />
                  </div>
                  {avatarPreview && (
                    <button 
                      type="button"
                      onClick={() => {
                        setAvatarPreview(null)
                        setSettingsForm({ ...settingsForm, avatar_url: '' })
                      }}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Remove avatar"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                      </svg>
                    </button>
                  )}
                </div>
                <div>
                  <Label htmlFor="avatar-upload" className="block text-sm font-medium text-gray-700 mb-2">
                    Expert Avatar
                  </Label>
                  <input
                    id="avatar-upload"
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/gif,image/avif,image/webp"
                    onChange={handleAvatarChange}
                    className="block w-full text-sm text-gray-500
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-md file:border-0
                      file:text-sm file:font-medium
                      file:bg-blue-50 file:text-blue-700
                      hover:file:bg-blue-100 cursor-pointer"
                  />
                  <p className="text-xs text-gray-500 mt-1">PNG, JPG, GIF, AVIF, WebP up to 5MB</p>
                  {avatarPreview && (
                    <button 
                      type="button"
                      onClick={() => {
                        setAvatarPreview(null)
                        setSettingsForm({ ...settingsForm, avatar_url: '' })
                      }}
                      className="text-xs text-red-600 hover:text-red-800 mt-1"
                    >
                      Remove avatar
                    </button>
                  )}
                </div>
              </div>

              {/* Name */}
              <div>
                <Label htmlFor="expert-name" className="block text-sm font-medium text-gray-700 mb-2">
                  Expert Name
                </Label>
                <Input
                  id="expert-name"
                  value={settingsForm.name}
                  onChange={(e) => setSettingsForm({ ...settingsForm, name: e.target.value })}
                  placeholder="Enter your expert name"
                  className="w-full"
                />
              </div>

              {/* Headline */}
              <div>
                <Label htmlFor="expert-headline" className="block text-sm font-medium text-gray-700 mb-2">
                  Headline
                </Label>
                <Input
                  id="expert-headline"
                  value={settingsForm.headline}
                  onChange={(e) => setSettingsForm({ ...settingsForm, headline: e.target.value })}
                  placeholder="Enter a catchy headline (e.g., 'AI Marketing Expert' or 'Your Personal Fitness Coach')"
                  className="w-full"
                />
                <p className="text-xs text-gray-500 mt-1">A short, compelling tagline that describes what you do</p>
              </div>

              {/* Description */}
              <div>
                <Label htmlFor="expert-description" className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </Label>
                <Textarea
                  id="expert-description"
                  value={settingsForm.description}
                  onChange={(e) => setSettingsForm({ ...settingsForm, description: e.target.value })}
                  placeholder="Describe your expert..."
                  rows={4}
                  className="w-full"
                />
              </div>

              {/* Save Button */}
              <div className="flex justify-end">
                <Button 
                  onClick={handleSettingsSave}
                  disabled={isSaving}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isSaving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Settings
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* AI Behavior Settings Card */}
        <Card className="shadow-lg mt-6 border-purple-200 bg-gradient-to-br from-purple-50 to-white">
          <CardHeader>
            <CardTitle className="flex items-center text-xl">
              <Brain className="h-5 w-5 mr-2 text-purple-600" />
              AI Behavior Settings
            </CardTitle>
            <CardDescription>
              Control how your AI agent uses knowledge base and responds to users
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              
              {/* Knowledge Base Mode */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">Knowledge Base Mode</Label>
                  <button 
                    className="text-gray-400 hover:text-gray-600"
                    title="Controls how your agent uses its knowledge base vs. general knowledge"
                  >
                    <HelpCircle className="w-4 h-4" />
                  </button>
                </div>
                
                {/* Strict Mode */}
                <label 
                  className={`flex items-start space-x-3 p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                    behaviorSettings.kb_mode === 'strict' 
                      ? 'border-purple-400 bg-purple-50' 
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="kb_mode"
                    value="strict"
                    checked={behaviorSettings.kb_mode === 'strict'}
                    onChange={(e) => setBehaviorSettings({ ...behaviorSettings, kb_mode: e.target.value })}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="font-semibold text-sm">Knowledge Base Only (Strict)</div>
                    <div className="text-xs text-gray-600 mt-1">
                      Only answers from uploaded documents. Refuses questions outside scope.
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded">High Accuracy</span>
                      <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">Compliance-Safe</span>
                    </div>
                  </div>
                </label>

                {/* Balanced Mode - RECOMMENDED */}
                <label 
                  className={`flex items-start space-x-3 p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                    behaviorSettings.kb_mode === 'balanced' 
                      ? 'border-green-400 bg-green-50' 
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="kb_mode"
                    value="balanced"
                    checked={behaviorSettings.kb_mode === 'balanced'}
                    onChange={(e) => setBehaviorSettings({ ...behaviorSettings, kb_mode: e.target.value })}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <div className="font-semibold text-sm">Knowledge Base Priority (Balanced)</div>
                      <span className="text-xs px-2 py-1 bg-green-600 text-white rounded font-medium">Recommended</span>
                    </div>
                    <div className="text-xs text-gray-600 mt-1">
                      Searches KB first, supplements with general knowledge when needed.
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded">Best Balance</span>
                      <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">Helpful</span>
                    </div>
                  </div>
                </label>

                {/* Flexible Mode */}
                <label 
                  className={`flex items-start space-x-3 p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                    behaviorSettings.kb_mode === 'flexible' 
                      ? 'border-blue-400 bg-blue-50' 
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="kb_mode"
                    value="flexible"
                    checked={behaviorSettings.kb_mode === 'flexible'}
                    onChange={(e) => setBehaviorSettings({ ...behaviorSettings, kb_mode: e.target.value })}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="font-semibold text-sm">Mixed Mode (Flexible)</div>
                    <div className="text-xs text-gray-600 mt-1">
                      Blends KB and general knowledge naturally for comprehensive answers.
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded">Most Flexible</span>
                      <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">Conversational</span>
                    </div>
                  </div>
                </label>
              </div>

              {/* Custom Instructions */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base font-semibold">Custom Instructions</Label>
                    <p className="text-xs text-gray-500 mt-1">
                      Add specific instructions for how your AI should behave
                    </p>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={resetBehaviorSettings}
                    className="text-gray-600 hover:text-gray-900"
                  >
                    <RotateCcw className="w-4 h-4 mr-1" />
                    Reset
                  </Button>
                </div>

                <Textarea
                  value={behaviorSettings.custom_instructions}
                  onChange={(e) => setBehaviorSettings({ ...behaviorSettings, custom_instructions: e.target.value })}
                  placeholder="e.g., Always ask follow-up questions, Keep responses under 3 sentences, Include relevant examples..."
                  rows={6}
                  className="w-full resize-none"
                  maxLength={4000}
                />
                <div className="flex justify-between items-center">
                  <p className="text-xs text-gray-500">
                    💡 Tip: Be specific about communication style, disclaimers, or response format
                  </p>
                  <p className="text-xs text-gray-500">
                    {behaviorSettings.custom_instructions.length} / 4000
                  </p>
                </div>
              </div>

              {/* Current Mode Indicator */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start space-x-2">
                  <Brain className="w-5 h-5 text-yellow-600 mt-0.5" />
                  <div className="text-sm text-yellow-800">
                    <strong>Current Mode:</strong> {
                      behaviorSettings.kb_mode === 'strict' ? 'Knowledge Base Only (Strict)' :
                      behaviorSettings.kb_mode === 'flexible' ? 'Mixed Mode (Flexible)' :
                      'Knowledge Base Priority (Balanced)'
                    }
                    <br />
                    {behaviorSettings.kb_mode === 'strict' && 'Your agent will only answer using information from the knowledge base.'}
                    {behaviorSettings.kb_mode === 'balanced' && 'Your agent will search the knowledge base first and supplement with general knowledge when needed.'}
                    {behaviorSettings.kb_mode === 'flexible' && 'Your agent will blend knowledge base and general knowledge naturally.'}
                  </div>
                </div>
              </div>

              {/* Save Button */}
              <div className="flex justify-end gap-3 pt-4">
                <Button 
                  onClick={handleBehaviorSettingsSave}
                  disabled={isSavingBehavior}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  {isSavingBehavior ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save AI Settings
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}

export default ProfileSettingsPage
