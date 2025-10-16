'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import VoiceDetailsModal from '@/components/voice/VoiceDetailsModal'
import VoiceTestingModal from '@/components/voice/VoiceTestingModal'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useAppSelector } from '@/store/hooks'
import { API_URL } from '@/lib/config'
import { fetchWithAuth, getAuthHeaders } from '@/lib/api-client'
import { 
  Search, 
  Filter, 
  Play, 
  Pause, 
  Volume2, 
  Heart,
  Star,
  User,
  Globe,
  Mic,
  Settings,
  ChevronDown,
  ChevronRight,
  Loader2,
  AlertCircle,
  Info,
  ArrowLeft,
  Check,
  CheckCircle2
} from 'lucide-react'

interface Voice {
  voice_id: string
  name: string
  category: string
  description?: string
  preview_url?: string
  gender: string
  age: string
  accent: string
  use_case: string
  descriptive: string
  is_owner: boolean
  is_legacy: boolean
  is_mixed: boolean
  available_for_tiers: string[]
  created_at_unix?: number
  favorited_at_unix?: number
  samples?: any[]
  settings?: any
  sharing?: any
  fine_tuning?: any
  voice_verification?: any
  high_quality_base_model_ids: string[]
  verified_languages: any[]
}

interface VoicesResponse {
  success: boolean
  voices: Voice[]
  total_count: number
  has_more: boolean
  next_page_token?: string
  error?: string
}

interface Expert {
  id: string
  name: string
  voice_id?: string
  voice_name?: string
}

const ProjectVoicePage = () => {
  const params = useParams()
  const router = useRouter()
  const expertId = params.id as string
  
  const { user } = useAppSelector((state) => state.auth)
  const [expert, setExpert] = useState<Expert | null>(null)
  const [voices, setVoices] = useState<Voice[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [selectedVoiceType, setSelectedVoiceType] = useState<string>('')
  const [sortBy, setSortBy] = useState<string>('name')
  const [sortDirection, setSortDirection] = useState<string>('asc')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [nextPageToken, setNextPageToken] = useState<string | null>(null)
  const [playingVoice, setPlayingVoice] = useState<string | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [pageSize] = useState(24)
  const [selectedVoice, setSelectedVoice] = useState<Voice | null>(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [selectedTestVoice, setSelectedTestVoice] = useState<Voice | null>(null)
  const [showTestingModal, setShowTestingModal] = useState(false)
  const [isAssigning, setIsAssigning] = useState(false)
  const [currentVoiceId, setCurrentVoiceId] = useState<string | null>(null)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [voiceToAssign, setVoiceToAssign] = useState<Voice | null>(null)
  
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const categories = [
    { value: '', label: 'All Categories' },
    { value: 'premade', label: 'Premade' },
    { value: 'cloned', label: 'Cloned' },
    { value: 'generated', label: 'Generated' },
    { value: 'professional', label: 'Professional' }
  ]

  const voiceTypes = [
    { value: '', label: 'All Types' },
    { value: 'personal', label: 'Personal' },
    { value: 'community', label: 'Community' },
    { value: 'default', label: 'Default' },
    { value: 'workspace', label: 'Workspace' }
  ]

  const sortOptions = [
    { value: 'name', label: 'Name' },
    { value: 'created_at_unix', label: 'Date Created' }
  ]

  useEffect(() => {
    if (expertId) {
      fetchExpert()
    }
  }, [expertId])

  // Debounced search effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchVoices(true)
    }, searchTerm ? 500 : 0)

    return () => clearTimeout(timeoutId)
  }, [searchTerm, selectedCategory, selectedVoiceType, sortBy, sortDirection])

  const fetchExpert = async () => {
    try {
      const response = await fetchWithAuth(`${API_URL}/experts/${expertId}`, {
        headers: getAuthHeaders(),
      })
      const data = await response.json()
      
      if (data.success && data.expert) {
        setExpert(data.expert)
        setCurrentVoiceId(data.expert.voice_id || null)
      }
    } catch (error) {
      console.error('Error fetching expert:', error)
    }
  }

  const fetchVoices = async (reset = false) => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams()
      if (searchTerm) params.append('search', searchTerm)
      if (selectedCategory) params.append('category', selectedCategory)
      if (selectedVoiceType) params.append('voice_type', selectedVoiceType)
      if (sortBy) params.append('sort', sortBy)
      if (sortDirection) params.append('sort_direction', sortDirection)
      params.append('page_size', pageSize.toString())
      
      if (!reset && nextPageToken) {
        params.append('next_page_token', nextPageToken)
      }

      const response = await fetchWithAuth(`${API_URL}/voice/elevenlabs-voices?${params}`, {
        headers: getAuthHeaders(),
      })
      
      const data: VoicesResponse = await response.json()
      
      if (data.success) {
        if (reset) {
          setVoices(data.voices)
          setCurrentPage(1)
        } else {
          setVoices(prev => [...prev, ...data.voices])
        }
        
        setTotalCount(data.total_count)
        setHasMore(data.has_more)
        setNextPageToken(data.next_page_token || null)
      } else {
        setError(data.error || 'Failed to fetch voices')
      }
    } catch (error) {
      console.error('Error fetching voices:', error)
      setError('Failed to fetch voices. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const loadMore = () => {
    if (hasMore && !loading) {
      fetchVoices(false)
    }
  }

  const handleSelectVoice = (voice: Voice) => {
    setVoiceToAssign(voice)
    setShowConfirmModal(true)
  }

  const assignVoiceToExpert = async () => {
    if (!voiceToAssign) return
    
    try {
      setIsAssigning(true)
      
      const response = await fetchWithAuth(`${API_URL}/experts/${expertId}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          voice_id: voiceToAssign.voice_id,
          voice_name: voiceToAssign.name
        }),
      })

      const data = await response.json()

      if (data.success) {
        setCurrentVoiceId(voiceToAssign.voice_id)
        setExpert(prev => prev ? { ...prev, voice_id: voiceToAssign.voice_id, voice_name: voiceToAssign.name } : null)
        setShowConfirmModal(false)
        setVoiceToAssign(null)
        
        // Navigate back to project page after 1 second to show success
        setTimeout(() => {
          router.push(`/project/${expertId}`)
        }, 1000)
      } else {
        setError('Failed to assign voice: ' + (data.error || 'Unknown error'))
      }
    } catch (error) {
      console.error('Error assigning voice:', error)
      setError('Failed to assign voice. Please try again.')
    } finally {
      setIsAssigning(false)
    }
  }

  const playVoice = async (voice: Voice) => {
    if (!voice.preview_url) return

    if (playingVoice === voice.voice_id) {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
      setPlayingVoice(null)
      return
    }

    if (audioRef.current) {
      audioRef.current.pause()
    }

    try {
      const audio = new Audio(voice.preview_url)
      audioRef.current = audio
      setPlayingVoice(voice.voice_id)

      audio.onended = () => {
        setPlayingVoice(null)
        audioRef.current = null
      }

      audio.onerror = () => {
        setPlayingVoice(null)
        audioRef.current = null
        console.error('Error playing audio for voice:', voice.name)
      }

      await audio.play()
    } catch (error) {
      console.error('Error playing voice preview:', error)
      setPlayingVoice(null)
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'premade': return 'bg-blue-100 text-blue-800'
      case 'cloned': return 'bg-green-100 text-green-800'
      case 'generated': return 'bg-purple-100 text-purple-800'
      case 'professional': return 'bg-orange-100 text-orange-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getVoiceIcon = (voice: Voice) => {
    if (voice.is_owner) return <User className="h-4 w-4" />
    if (voice.sharing) return <Globe className="h-4 w-4" />
    return <Mic className="h-4 w-4" />
  }

  const openVoiceDetails = (voice: Voice) => {
    setSelectedVoice(voice)
    setShowDetailsModal(true)
  }

  const openVoiceTesting = (voice: Voice) => {
    setSelectedTestVoice(voice)
    setShowTestingModal(true)
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => router.push(`/project/${expertId}`)}
              className="p-2"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Voice Studio</h1>
              <p className="text-gray-600 mt-1">
                {expert ? `Select a voice for ${expert.name}` : 'Select a voice for your AI agent'}
              </p>
              {expert?.voice_name && (
                <p className="text-sm text-green-600 mt-1 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  Current voice: {expert.voice_name}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Info className="h-4 w-4" />
            <span>{totalCount} voices available</span>
          </div>
        </div>

        {/* Search and Filters */}
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search voices by name, description, or characteristics..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Filter Toggle */}
              <div className="flex items-center justify-between">
                <Button
                  variant="outline"
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center gap-2"
                >
                  <Filter className="h-4 w-4" />
                  Filters
                  <ChevronDown className={`h-4 w-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
                </Button>
                
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">Sort by:</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="text-sm border rounded px-2 py-1"
                  >
                    {sortOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
                  >
                    {sortDirection === 'asc' ? '↑' : '↓'}
                  </Button>
                </div>
              </div>

              {/* Filters */}
              {showFilters && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Category
                    </label>
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="w-full border rounded px-3 py-2"
                    >
                      {categories.map(category => (
                        <option key={category.value} value={category.value}>
                          {category.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Voice Type
                    </label>
                    <select
                      value={selectedVoiceType}
                      onChange={(e) => setSelectedVoiceType(e.target.value)}
                      className="w-full border rounded px-3 py-2"
                    >
                      {voiceTypes.map(type => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Error State */}
        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 text-red-800">
                <AlertCircle className="h-5 w-5" />
                <span>{error}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Voices Grid */}
        {loading && voices.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <span className="ml-2 text-gray-600">Loading voices...</span>
          </div>
        ) : voices.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Mic className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No voices found</h3>
              <p className="text-gray-500">
                Try adjusting your search terms or filters to find voices.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {voices.map((voice) => (
              <Card 
                key={voice.voice_id} 
                className={`hover:shadow-lg transition-shadow duration-200 ${
                  currentVoiceId === voice.voice_id ? 'ring-2 ring-green-500 bg-green-50' : ''
                }`}
              >
                <CardContent className="p-6">
                  <div className="space-y-4">
                    {/* Voice Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-gray-900 truncate">
                            {voice.name}
                          </h3>
                          {currentVoiceId === voice.voice_id && (
                            <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          {getVoiceIcon(voice)}
                          <Badge className={getCategoryColor(voice.category)}>
                            {voice.category}
                          </Badge>
                        </div>
                      </div>
                      
                      {voice.favorited_at_unix && (
                        <Heart className="h-4 w-4 text-red-500 fill-current" />
                      )}
                    </div>

                    {/* Voice Description */}
                    {voice.description && (
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {voice.description}
                      </p>
                    )}

                    {/* Voice Characteristics */}
                    <div className="space-y-2">
                      {voice.gender && voice.gender !== 'unknown' && (
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-500">Gender:</span>
                          <span className="font-medium capitalize">{voice.gender}</span>
                        </div>
                      )}
                      {voice.age && voice.age !== 'unknown' && (
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-500">Age:</span>
                          <span className="font-medium capitalize">{voice.age}</span>
                        </div>
                      )}
                      {voice.accent && voice.accent !== 'unknown' && (
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-500">Accent:</span>
                          <span className="font-medium capitalize">{voice.accent}</span>
                        </div>
                      )}
                    </div>

                    {/* Use Case */}
                    {voice.use_case && (
                      <div className="text-xs">
                        <span className="text-gray-500">Use case: </span>
                        <span className="font-medium">{voice.use_case}</span>
                      </div>
                    )}

                    {/* Quality Indicators */}
                    <div className="flex items-center gap-2">
                      {voice.high_quality_base_model_ids.length > 0 && (
                        <Badge variant="outline" className="text-xs">
                          <Star className="h-3 w-3 mr-1" />
                          High Quality
                        </Badge>
                      )}
                      {voice.verified_languages.length > 0 && (
                        <Badge variant="outline" className="text-xs">
                          {voice.verified_languages.length} Lang
                        </Badge>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="space-y-2 pt-2">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => playVoice(voice)}
                          disabled={!voice.preview_url}
                          className="flex-1"
                        >
                          {playingVoice === voice.voice_id ? (
                            <>
                              <Pause className="h-4 w-4 mr-1" />
                              Stop
                            </>
                          ) : (
                            <>
                              <Play className="h-4 w-4 mr-1" />
                              Preview
                            </>
                          )}
                        </Button>
                        
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => openVoiceTesting(voice)}
                          title="Test Voice"
                        >
                          <Volume2 className="h-4 w-4" />
                        </Button>
                        
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => openVoiceDetails(voice)}
                          title="Voice Details"
                        >
                          <Settings className="h-4 w-4" />
                        </Button>
                        
                        {/* Select Voice Button - Inline */}
                        {currentVoiceId === voice.voice_id ? (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled
                            className="border-green-500 text-green-600 bg-green-50"
                            title="Currently Selected"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSelectVoice(voice)}
                            disabled={isAssigning}
                            className="hover:bg-blue-50 hover:border-blue-500 hover:text-blue-600"
                            title="Select this voice"
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Load More */}
        {hasMore && (
          <div className="flex justify-center pt-6">
            <Button
              onClick={loadMore}
              disabled={loading}
              variant="outline"
              className="flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  Load More Voices
                  <ChevronRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        )}
      </div>

      {/* Voice Details Modal */}
      <VoiceDetailsModal
        voice={selectedVoice}
        isOpen={showDetailsModal}
        onClose={() => {
          setShowDetailsModal(false)
          setSelectedVoice(null)
        }}
      />

      {/* Voice Testing Modal */}
      <VoiceTestingModal
        voice={selectedTestVoice}
        isOpen={showTestingModal}
        onClose={() => {
          setShowTestingModal(false)
          setSelectedTestVoice(null)
        }}
      />

      {/* Confirmation Modal */}
      {showConfirmModal && voiceToAssign && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                    <Mic className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Confirm Voice Selection</h3>
                    <p className="text-sm text-gray-500">This will update your AI agent's voice</p>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Expert:</span>
                    <span className="font-medium text-gray-900">{expert?.name}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">New Voice:</span>
                    <span className="font-medium text-gray-900">{voiceToAssign.name}</span>
                  </div>
                  {voiceToAssign.gender && voiceToAssign.gender !== 'unknown' && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Gender:</span>
                      <span className="font-medium text-gray-900 capitalize">{voiceToAssign.gender}</span>
                    </div>
                  )}
                  {voiceToAssign.accent && voiceToAssign.accent !== 'unknown' && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Accent:</span>
                      <span className="font-medium text-gray-900 capitalize">{voiceToAssign.accent}</span>
                    </div>
                  )}
                </div>

                <p className="text-sm text-gray-600">
                  Are you sure you want to assign this voice to {expert?.name}? This will update the voice used in conversations.
                </p>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowConfirmModal(false)
                      setVoiceToAssign(null)
                    }}
                    disabled={isAssigning}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={assignVoiceToExpert}
                    disabled={isAssigning}
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                  >
                    {isAssigning ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Assigning...
                      </>
                    ) : (
                      <>
                        <Check className="h-4 w-4 mr-2" />
                        Confirm
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </DashboardLayout>
  )
}

export default ProjectVoicePage
