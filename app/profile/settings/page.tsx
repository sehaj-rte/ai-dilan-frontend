'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAppSelector, useAppDispatch } from '@/store/hooks'
import { fetchCurrentUser } from '@/store/slices/authSlice'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { 
  User, 
  ArrowLeft,
  Save,
  Camera,
  Upload,
  Loader2,
  AlertCircle,
  CheckCircle,
  X
} from 'lucide-react'
import { API_URL } from '@/lib/config'
import { fetchWithAuth, getAuthHeaders, getAuthHeadersForFormData } from '@/lib/api-client'
import OptimizedImage from '@/components/ui/OptimizedImage'

interface UserProfile {
  id: string
  email: string
  username: string
  full_name?: string
  phone_number?: string
  bio?: string
  avatar_url?: string
  is_active: boolean
}

const ProfileSettingsPage = () => {
  const router = useRouter()
  const { user } = useAppSelector((state) => state.auth)
  const dispatch = useAppDispatch()
  
  const [profile, setProfile] = useState<UserProfile>({
    id: user?.id || '',
    email: user?.email || '',
    username: user?.username || '',
    full_name: user?.full_name || '',
    phone_number: user?.phone_number || '',
    bio: user?.bio || '',
    avatar_url: user?.avatar_url || '',
    is_active: user?.is_active || true
  })
  
  const [isLoading, setIsLoading] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  // Update profile state when user data changes
  useEffect(() => {
    if (user) {
      setProfile({
        id: user.id,
        email: user.email,
        username: user.username,
        full_name: user.full_name || '',
        phone_number: user.phone_number || '',
        bio: user.bio || '',
        avatar_url: user.avatar_url || '',
        is_active: user.is_active
      })
      
      if (user.avatar_url) {
        setPreviewUrl(convertS3UrlToProxy(user.avatar_url))
      }
    }
  }, [user])

  // Load user profile on mount
  useEffect(() => {
    if (user) {
      fetchUserProfile()
    }
  }, [user])

  const fetchUserProfile = async () => {
    try {
      setIsLoading(true)
      const response = await fetchWithAuth(`${API_URL}/auth/profile`, {
        headers: getAuthHeaders(),
      })
      const data = await response.json()
      
      if (data.success && data.user) {
        setProfile(data.user)
        if (data.user.avatar_url) {
          setPreviewUrl(convertS3UrlToProxy(data.user.avatar_url))
        }
      }
    } catch (error) {
      console.error('Error fetching profile:', error)
      setError('Failed to load profile data')
    } finally {
      setIsLoading(false)
    }
  }

  const convertS3UrlToProxy = (s3Url: string): string => {
    if (!s3Url) return s3Url
    
    const match = s3Url.match(/https:\/\/ai-dilan\.s3\.[^/]+\.amazonaws\.com\/(.+)/)
    if (match) {
      return `${API_URL}/images/avatar/full/${match[1]}`
    }
    return s3Url
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file')
        return
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('Image must be smaller than 5MB')
        return
      }
      
      setSelectedFile(file)
      setError(null)
      
      // Create preview URL
      const reader = new FileReader()
      reader.onload = (e: ProgressEvent<FileReader>) => {
        setPreviewUrl(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleAvatarUpload = async () => {
    if (!selectedFile) return

    try {
      setUploadingAvatar(true)
      setError(null)

      const formData = new FormData()
      formData.append('avatar', selectedFile)

      const response = await fetchWithAuth(`${API_URL}/auth/upload-avatar`, {
        method: 'POST',
        headers: getAuthHeadersForFormData(),
        body: formData,
      })

      const data = await response.json()

      if (data.success) {
        setProfile(prev => ({
          ...prev,
          avatar_url: data.avatar_url
        }))
        setSuccess('Avatar uploaded successfully!')
        setSelectedFile(null)
        
        // Update preview URL
        if (data.avatar_url) {
          setPreviewUrl(convertS3UrlToProxy(data.avatar_url))
        }
        
        // Refresh auth store
        dispatch(fetchCurrentUser())
      } else {
        setError(data.error || 'Failed to upload avatar')
      }
    } catch (error) {
      console.error('Error uploading avatar:', error)
      setError('Failed to upload avatar')
    } finally {
      setUploadingAvatar(false)
    }
  }

  const handleSaveProfile = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetchWithAuth(`${API_URL}/auth/profile`, {
        method: 'PUT',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          full_name: profile.full_name,
          phone_number: profile.phone_number,
          bio: profile.bio,
        }),
      })

      const data = await response.json()

      if (data.success) {
        setSuccess('Profile updated successfully!')
        
        // Refresh the auth store
        dispatch(fetchCurrentUser())
        
        // Clear success message after 3 seconds
        setTimeout(() => {
          setSuccess(null)
        }, 3000)
      } else {
        setError(data.error || 'Failed to update profile')
      }
    } catch (error) {
      console.error('Error updating profile:', error)
      setError('Failed to update profile')
    } finally {
      setIsLoading(false)
    }
  }

  const getUserInitials = () => {
    if (profile.full_name) {
      const names = profile.full_name.split(' ')
      return names.length > 1 
        ? `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase()
        : names[0][0].toUpperCase()
    }
    return profile.email?.[0]?.toUpperCase() || 'U'
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Access Denied
          </h1>
          <p className="text-gray-600 mb-6">
            Please log in to access your profile settings.
          </p>
          <Button onClick={() => router.push('/')}>
            Go Home
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Profile Settings</h1>
              <p className="text-gray-600">Manage your account information and preferences</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto p-6">
        <div className="space-y-6">
          {/* Avatar Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Profile Picture
              </CardTitle>
              <CardDescription>
                Upload a profile picture to personalize your account
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-6">
                {/* Avatar Preview */}
                <div className="relative group">
                  {previewUrl ? (
                    <OptimizedImage
                      src={previewUrl}
                      alt="Profile picture"
                      className="w-24 h-24 rounded-full object-cover border-4 border-gray-200"
                      fallbackClassName="w-24 h-24 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center border-4 border-gray-200"
                      fallbackIcon={
                        <span className="text-blue-600 text-2xl font-bold">
                          {getUserInitials()}
                        </span>
                      }
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center border-4 border-gray-200">
                      <span className="text-blue-600 text-2xl font-bold">
                        {getUserInitials()}
                      </span>
                    </div>
                  )}
                  
                  {/* Camera overlay */}
                  <label
                    htmlFor="avatar-upload"
                    className="absolute inset-0 w-24 h-24 rounded-full bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-pointer"
                  >
                    <Camera className="h-6 w-6 text-white" />
                  </label>
                </div>

                {/* Upload Controls */}
                <div className="flex-1 space-y-3">
                  <input
                    id="avatar-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={() => document.getElementById('avatar-upload')?.click()}
                      disabled={uploadingAvatar}
                      className="flex items-center gap-2"
                    >
                      <Upload className="h-4 w-4" />
                      Choose Image
                    </Button>
                    
                    {selectedFile && (
                      <Button
                        onClick={handleAvatarUpload}
                        disabled={uploadingAvatar}
                        className="flex items-center gap-2"
                      >
                        {uploadingAvatar ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Uploading...
                          </>
                        ) : (
                          <>
                            <Save className="h-4 w-4" />
                            Upload
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                  
                  <p className="text-sm text-gray-500">
                    Recommended: Square image, at least 200x200px, max 5MB
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Profile Information */}
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>
                Update your personal details and contact information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Email (read-only) */}
              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  value={profile.email}
                  disabled
                  className="bg-gray-50"
                />
                <p className="text-sm text-gray-500 mt-1">Email cannot be changed</p>
              </div>

              {/* Full Name */}
              <div>
                <Label htmlFor="full_name">Full Name</Label>
                <Input
                  id="full_name"
                  value={profile.full_name || ''}
                  onChange={(e) => setProfile(prev => ({ ...prev, full_name: e.target.value }))}
                  placeholder="Enter your full name"
                />
              </div>

              {/* Phone Number */}
              <div>
                <Label htmlFor="phone_number">Phone Number</Label>
                <Input
                  id="phone_number"
                  type="tel"
                  value={profile.phone_number || ''}
                  onChange={(e) => setProfile(prev => ({ ...prev, phone_number: e.target.value }))}
                  placeholder="Enter your phone number"
                />
              </div>

              {/* Bio */}
              <div>
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  value={profile.bio || ''}
                  onChange={(e) => setProfile(prev => ({ ...prev, bio: e.target.value }))}
                  placeholder="Tell us about yourself..."
                  rows={4}
                  maxLength={500}
                />
                <p className="text-sm text-gray-500 mt-1">
                  {(profile.bio || '').length}/500 characters
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Error/Success Messages */}
          {error && (
            <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <span>{error}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setError(null)}
                className="ml-auto"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
          
          {success && (
            <div className="flex items-center gap-2 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
              <CheckCircle className="h-5 w-5 flex-shrink-0" />
              <span>{success}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSuccess(null)}
                className="ml-auto"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Save Button */}
          <div className="flex justify-end">
            <Button
              onClick={handleSaveProfile}
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProfileSettingsPage