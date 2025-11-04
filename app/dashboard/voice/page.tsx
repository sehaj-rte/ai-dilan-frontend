'use client'

import React, { useState, useEffect, useRef } from 'react'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import VoiceDetailsModal from '@/components/voice/VoiceDetailsModal'
import VoiceTestingModal from '@/components/voice/VoiceTestingModal'
import PVCTestModal from '@/components/voice/PVCTestModal'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  Info
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

const VoiceStudioPage = () => {
  const { user } = useAppSelector((state) => state.auth)
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
  const [showPVCModal, setShowPVCModal] = useState(false)
  
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

  // Debounced search effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchVoices(true)
    }, searchTerm ? 500 : 0) // 500ms delay for search, immediate for other filters

    return () => clearTimeout(timeoutId)
  }, [searchTerm, selectedCategory, selectedVoiceType, sortBy, sortDirection])

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

  const playVoice = async (voice: Voice) => {
    if (!voice.preview_url) return

    if (playingVoice === voice.voice_id) {
      // Stop current audio
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
      setPlayingVoice(null)
      return
    }

    // Stop any currently playing audio
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
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Voice Studio</h1>
            <p className="text-gray-600 mt-1">
              Discover and manage voices for your digital avatars
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={() => setShowPVCModal(true)}
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
            >
              <Mic className="h-4 w-4 mr-2" />
              Professional Clone
            </Button>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Info className="h-4 w-4" />
              <span>{totalCount} voices</span>
            </div>
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
              <Card key={voice.voice_id} className="hover:shadow-lg transition-shadow duration-200">
                <CardContent className="p-6">
                  <div className="space-y-4">
                    {/* Voice Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 truncate">
                          {voice.name}
                        </h3>
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
                    <div className="flex items-center gap-2 pt-2">
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

      {/* Professional Voice Clone Modal */}
      <PVCTestModal
        isOpen={showPVCModal}
        onClose={() => setShowPVCModal(false)}
        onSuccess={(voiceId, voiceName) => {
          console.log('✅ PVC Created:', voiceId, voiceName)
          // Refresh voices list
          fetchVoices(true)
        }}
      />
    </DashboardLayout>
  )
}

export default VoiceStudioPage
