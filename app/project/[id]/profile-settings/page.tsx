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
  Save
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
      
      if (expertData.success && expertData.expert) {
        setExpert(expertData.expert)
        setSettingsForm({
          name: expertData.expert.name || '',
          headline: expertData.expert.headline || '',
          description: expertData.expert.description || '',
          avatar_url: expertData.expert.avatar_url || ''
        })
        setAvatarPreview(expertData.expert.avatar_url ? convertS3UrlToProxy(expertData.expert.avatar_url) : null)
      }
    } catch (error) {
      console.error('Error fetching expert data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      
      // Check file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        showWarning('Image must be smaller than 5MB', 'File too large')
        return
      }
      
      // Check file type
      if (!file.type.startsWith('image/')) {
        showWarning('Please select a valid image file', 'Invalid file type')
        return
      }
      
      const reader = new FileReader()
      
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string)
        // Keep full data URL (backend expects the data:image/... prefix)
        const fullDataUrl = reader.result as string
        setSettingsForm({ ...settingsForm, avatar_url: fullDataUrl })
      }
      
      reader.readAsDataURL(file)
    }
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
        updateData.avatar_base64 = settingsForm.avatar_url
      }
      
      const response = await fetchWithAuth(`${API_URL}/experts/${projectId}`, {
        method: 'PUT',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData)
      })
      
      const data = await response.json()
      
      if (data.success) {
        showSuccess('Your profile settings have been saved.', 'Saved successfully')
        fetchExpertData() // Refresh data
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
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="block w-full text-sm text-gray-500
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-md file:border-0
                      file:text-sm file:font-medium
                      file:bg-blue-50 file:text-blue-700
                      hover:file:bg-blue-100"
                  />
                  <p className="text-xs text-gray-500 mt-1">PNG, JPG, GIF up to 5MB</p>
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
      </div>
    </DashboardLayout>
  )
}

export default ProfileSettingsPage
