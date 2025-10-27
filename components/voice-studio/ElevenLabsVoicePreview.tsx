'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Play, Pause, Volume2, Loader2, Search, Filter } from 'lucide-react'
import { API_URL } from '@/lib/config'
import { fetchWithAuth, getAuthHeaders } from '@/lib/api-client'

interface Voice {
  voice_id: string
  name: string
  category: string
  description?: string
  labels?: { [key: string]: string }
  preview_url?: string
  samples?: Array<{
    sample_id: string
    file_name: string
    mime_type: string
    size_bytes: number
    hash: string
  }>
}

export default function ElevenLabsVoicePreview() {
  const [voices, setVoices] = useState<Voice[]>([])
  const [loading, setLoading] = useState(true)
  const [playingId, setPlayingId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('cloned')
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    fetchVoices()
  }, [categoryFilter])

  const fetchVoices = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (searchQuery) params.append('search', searchQuery)
      if (categoryFilter) params.append('category', categoryFilter)
      params.append('page_size', '50')

      const response = await fetchWithAuth(
        `${API_URL}/voice-clone/elevenlabs/voices?${params.toString()}`,
        {
          headers: getAuthHeaders(),
        }
      )

      const data = await response.json()
      if (data.success) {
        setVoices(data.voices || [])
      }
    } catch (error) {
      console.error('Error fetching ElevenLabs voices:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = () => {
    fetchVoices()
  }

  const handlePlayPreview = async (voice: Voice) => {
    try {
      // If already playing this voice, pause it
      if (playingId === voice.voice_id && audioRef.current) {
        audioRef.current.pause()
        setPlayingId(null)
        return
      }

      // Stop any currently playing audio
      if (audioRef.current) {
        audioRef.current.pause()
      }

      // Get preview URL from first sample if available
      if (voice.samples && voice.samples.length > 0) {
        // Use ElevenLabs API to get sample audio
        const sampleId = voice.samples[0].sample_id
        const previewUrl = `https://api.elevenlabs.io/v1/voices/${voice.voice_id}/samples/${sampleId}/audio`
        
        audioRef.current = new Audio(previewUrl)
        audioRef.current.play()
        setPlayingId(voice.voice_id)

        audioRef.current.onended = () => {
          setPlayingId(null)
        }
      } else if (voice.preview_url) {
        audioRef.current = new Audio(voice.preview_url)
        audioRef.current.play()
        setPlayingId(voice.voice_id)

        audioRef.current.onended = () => {
          setPlayingId(null)
        }
      }
    } catch (error) {
      console.error('Error playing preview:', error)
      setPlayingId(null)
    }
  }

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
    }
  }, [])

  return (
    <div className="space-y-4">
      {/* Search and Filter */}
      <div className="space-y-3">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search voices..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={handleSearch}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Search
          </button>
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-500" />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Categories</option>
            <option value="cloned">Cloned</option>
            <option value="premade">Premade</option>
            <option value="generated">Generated</option>
            <option value="professional">Professional</option>
          </select>
        </div>
      </div>

      {/* Voices List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        </div>
      ) : voices.length === 0 ? (
        <div className="text-center py-12">
          <Volume2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No voices found</p>
          <p className="text-sm text-gray-400 mt-1">
            Try adjusting your search or filters
          </p>
        </div>
      ) : (
        <div className="space-y-3 max-h-[600px] overflow-y-auto">
          {voices.map((voice) => (
            <div
              key={voice.voice_id}
              className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{voice.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
                      {voice.category}
                    </span>
                    {voice.labels && Object.keys(voice.labels).length > 0 && (
                      <span className="text-xs text-gray-500">
                        {Object.entries(voice.labels).map(([key, value]) => value).join(', ')}
                      </span>
                    )}
                  </div>
                  {voice.description && (
                    <p className="text-sm text-gray-600 mt-2">{voice.description}</p>
                  )}
                  {voice.samples && voice.samples.length > 0 && (
                    <p className="text-xs text-gray-500 mt-1">
                      {voice.samples.length} sample{voice.samples.length !== 1 ? 's' : ''}
                    </p>
                  )}
                </div>

                {/* Play Button */}
                {(voice.samples?.length || voice.preview_url) && (
                  <button
                    onClick={() => handlePlayPreview(voice)}
                    className={`p-2 rounded-lg transition-colors ${
                      playingId === voice.voice_id
                        ? 'bg-blue-100 text-blue-600'
                        : 'hover:bg-gray-100 text-gray-600'
                    }`}
                    title={playingId === voice.voice_id ? 'Pause' : 'Play preview'}
                  >
                    {playingId === voice.voice_id ? (
                      <Pause className="w-5 h-5" />
                    ) : (
                      <Play className="w-5 h-5" />
                    )}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Total Count */}
      {!loading && voices.length > 0 && (
        <div className="text-center text-sm text-gray-500 pt-2 border-t">
          Showing {voices.length} voice{voices.length !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  )
}
