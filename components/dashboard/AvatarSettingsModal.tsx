'use client'

import React, { useState, useRef } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useAppSelector, useAppDispatch } from '@/store/hooks'
import { API_URL } from '@/lib/config'
import { fetchWithAuth, getAuthHeaders, getAuthHeadersForFormData } from '@/lib/api-client'
import { 
  User, 
  Camera, 
  Upload, 
  Save, 
  X,
  Loader2,
  AlertCircle,
  CheckCircle
} from 'lucide-react'

interface AvatarSettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

interface UserProfile {
  id: string
  email: string
  username: string
  full_name?: string
  bio?: string
  avatar_url?: string
  is_active: boolean
}

const AvatarSettingsModal: React.FC<AvatarSettingsModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAppSelector((state) => state.auth)
  const dispatch = useAppDispatch()
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [profile, setProfile] = useState<UserProfile>({
    id: user?.id || '',
    email: user?.email || '',
    username: user?.username || '',
    full_name: user?.full_name || '',
    bio: '',
    avatar_url: '',
    is_active: user?.is_active || true
  })
  
  const [isLoading, setIsLoading] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  // Load user profile when modal opens
  React.useEffect(() => {
    if (isOpen && user) {
      fetchUserProfile()
    }
  }, [isOpen, user])

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
        headers: getAuthHeadersForFormData(), // Use FormData-specific headers (no Content-Type)
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
          bio: profile.bio,
        }),
      })

      const data = await response.json()

      if (data.success) {
        setSuccess('Profile updated successfully!')
        
        // Update the auth store with new user data
        // You might want to dispatch an action to update the user in the store
        setTimeout(() => {
          setSuccess(null)
          onClose()
        }, 2000)
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

  const handleClose = () => {
    setError(null)
    setSuccess(null)
    setPreviewUrl(null)
    setSelectedFile(null)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <User className="h-5 w-5" />
            <span>Avatar Settings</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Avatar Section */}
          <div className="space-y-4">
            <Label className="text-base font-medium">Profile Avatar</Label>
            
            <div className="flex items-center space-x-4">
              {/* Avatar Preview */}
              <div className="relative">
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt="Avatar preview"
                    className="w-20 h-20 rounded-full object-cover border-2 border-gray-200"
                    onError={() => setPreviewUrl(null)}
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center border-2 border-gray-200">
                    <User className="h-8 w-8 text-blue-600" />
                  </div>
                )}
                
                {/* Camera overlay */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 w-20 h-20 rounded-full bg-black bg-opacity-50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity duration-200"
                  disabled={uploadingAvatar}
                >
                  <Camera className="h-6 w-6 text-white" />
                </button>
              </div>

              {/* Upload Controls */}
              <div className="flex-1 space-y-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  variant="outline"
                  className="w-full"
                  disabled={uploadingAvatar}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Choose Image
                </Button>
                
                {selectedFile && (
                  <Button
                    onClick={handleAvatarUpload}
                    className="w-full"
                    disabled={uploadingAvatar}
                  >
                    {uploadingAvatar ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Upload Avatar
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
            
            <p className="text-xs text-gray-500">
              Recommended: Square image, at least 200x200px, max 5MB
            </p>
          </div>

          {/* Profile Information */}
          <div className="space-y-4">
            <Label className="text-base font-medium">Profile Information</Label>
            
            <div className="space-y-3">
              <div>
                <Label htmlFor="email" className="text-sm">Email</Label>
                <Input
                  id="email"
                  value={profile.email}
                  disabled
                  className="bg-gray-50"
                />
                <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
              </div>
              
              <div>
                <Label htmlFor="username" className="text-sm">Username</Label>
                <Input
                  id="username"
                  value={profile.username}
                  disabled
                  className="bg-gray-50"
                />
                <p className="text-xs text-gray-500 mt-1">Username cannot be changed</p>
              </div>
              
              <div>
                <Label htmlFor="full_name" className="text-sm">Display Name</Label>
                <Input
                  id="full_name"
                  value={profile.full_name || ''}
                  onChange={(e) => setProfile(prev => ({ ...prev, full_name: e.target.value }))}
                  placeholder="Enter your display name"
                />
              </div>
              
              <div>
                <Label htmlFor="bio" className="text-sm">Bio</Label>
                <Textarea
                  id="bio"
                  value={profile.bio || ''}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setProfile(prev => ({ ...prev, bio: e.target.value }))}
                  placeholder="Tell us about yourself..."
                  rows={3}
                  maxLength={500}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {(profile.bio || '').length}/500 characters
                </p>
              </div>
            </div>
          </div>

          {/* Error/Success Messages */}
          {error && (
            <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
          
          {success && (
            <div className="flex items-center space-x-2 p-3 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
              <p className="text-sm text-green-700">{success}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-3 pt-4 border-t">
            <Button
              onClick={handleClose}
              variant="outline"
              className="flex-1"
              disabled={isLoading || uploadingAvatar}
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            
            <Button
              onClick={handleSaveProfile}
              className="flex-1"
              disabled={isLoading || uploadingAvatar}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default AvatarSettingsModal
