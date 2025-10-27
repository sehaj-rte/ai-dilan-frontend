'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Trash2, Edit2, Check, X, Play, Pause, Volume2, Sparkles } from 'lucide-react'
import { API_URL } from '@/lib/config'
import { fetchWithAuth, getAuthHeaders } from '@/lib/api-client'

interface VoiceCloneLibraryProps {
  voiceClones: any[]
  onDelete?: () => void
  onUpdate?: () => void
}

export default function VoiceCloneLibrary({ voiceClones, onDelete, onUpdate }: VoiceCloneLibraryProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [playingId, setPlayingId] = useState<string | null>(null)
  const [loadingAudio, setLoadingAudio] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string>('')
  const [creatingVoice, setCreatingVoice] = useState<string | null>(null)
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null)
  const [loadingPreview, setLoadingPreview] = useState<string | null>(null)

  // Get user ID from first sample
  useEffect(() => {
    if (voiceClones.length > 0 && voiceClones[0].samples?.length > 0) {
      setCurrentUserId(voiceClones[0].samples[0].user_id)
    }
  }, [voiceClones])

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
    }
  }, [])

  const handleStartEdit = (clone: any) => {
    setEditingId(clone.expert_id)
    setEditName(clone.name)
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditName('')
  }

  const handleSaveEdit = async (expertId: string, userId: string) => {
    if (!editName.trim()) {
      alert('Voice name cannot be empty')
      return
    }

    try {
      const response = await fetchWithAuth(
        `${API_URL}/voice-clone/${expertId}/name?user_id=${userId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: editName })
        }
      )

      const data = await response.json()
      if (data.success) {
        setEditingId(null)
        setEditName('')
        onUpdate?.()
      } else {
        alert(data.error || 'Failed to update name')
      }
    } catch (error) {
      console.error('Error updating name:', error)
      alert('Failed to update name')
    }
  }

  const handleDelete = async (expertId: string, userId: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"? This will also delete all associated samples.`)) {
      return
    }

    try {
      const response = await fetchWithAuth(
        `${API_URL}/voice-clone/${expertId}?user_id=${userId}`,
        { method: 'DELETE' }
      )

      const data = await response.json()
      if (data.success) {
        onDelete?.()
      } else {
        alert(data.error || 'Failed to delete voice clone')
      }
    } catch (error) {
      console.error('Error deleting voice clone:', error)
      alert('Failed to delete voice clone')
    }
  }

  const handleCreateVoice = async (expertId: string, userId: string, name: string) => {
    if (!confirm(`Create voice clone "${name}" from these samples?`)) {
      return
    }

    setCreatingVoice(expertId)
    try {
      const response = await fetchWithAuth(
        `${API_URL}/voice-clone/create`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: userId,
            expert_id: expertId,
            name: name
          })
        }
      )

      const data = await response.json()
      if (data.success) {
        alert(`Voice clone created successfully! Voice ID: ${data.voice_id}`)
        onUpdate?.()
      } else {
        alert(data.error || 'Failed to create voice clone')
      }
    } catch (error) {
      console.error('Error creating voice clone:', error)
      alert('Failed to create voice clone')
    } finally {
      setCreatingVoice(null)
    }
  }

  const handlePlayVoicePreview = async (voiceId: string) => {
    try {
      // If already playing this voice, pause it
      if (playingVoiceId === voiceId && audioRef.current) {
        audioRef.current.pause()
        setPlayingVoiceId(null)
        return
      }

      // Stop any currently playing audio
      if (audioRef.current) {
        audioRef.current.pause()
      }

      setLoadingPreview(voiceId)

      // Fetch voice details from ElevenLabs to get preview_url
      const response = await fetchWithAuth(
        `${API_URL}/voice-clone/elevenlabs/voices/${voiceId}`,
        {
          headers: getAuthHeaders(),
        }
      )

      const data = await response.json()
      
      if (data.success && data.voice) {
        const voice = data.voice
        
        // Try to get preview URL
        let previewUrl = voice.preview_url
        
        // If no preview_url, try to get first sample
        if (!previewUrl && voice.samples && voice.samples.length > 0) {
          const firstSample = voice.samples[0]
          // Use ElevenLabs API to get sample audio
          previewUrl = `https://api.elevenlabs.io/v1/voices/${voiceId}/samples/${firstSample.sample_id}/audio`
        }

        if (previewUrl) {
          audioRef.current = new Audio(previewUrl)
          audioRef.current.play()
          setPlayingVoiceId(voiceId)

          audioRef.current.onended = () => {
            setPlayingVoiceId(null)
          }

          audioRef.current.onerror = () => {
            console.error('Error playing audio')
            setPlayingVoiceId(null)
            alert('Failed to play voice preview')
          }
        } else {
          alert('No preview available for this voice')
        }
      }
    } catch (error) {
      console.error('Error playing voice preview:', error)
      alert('Failed to load voice preview')
    } finally {
      setLoadingPreview(null)
    }
  }

  const handlePlaySample = async (sampleId: string, userId: string) => {
    try {
      // If already playing this sample, pause it
      if (playingId === sampleId && audioRef.current) {
        audioRef.current.pause()
        setPlayingId(null)
        return
      }

      // Stop any currently playing audio
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }

      setLoadingAudio(sampleId)

      // Fetch audio from backend
      const response = await fetchWithAuth(
        `${API_URL}/voice-clone/samples/${sampleId}/audio?user_id=${userId}`,
        { headers: getAuthHeaders() }
      )

      if (!response.ok) {
        throw new Error('Failed to load audio')
      }

      // Create blob URL from response
      const blob = await response.blob()
      const audioUrl = URL.createObjectURL(blob)

      // Create and play audio
      const audio = new Audio(audioUrl)
      audioRef.current = audio

      audio.onended = () => {
        setPlayingId(null)
        URL.revokeObjectURL(audioUrl)
      }

      audio.onerror = () => {
        setPlayingId(null)
        setLoadingAudio(null)
        alert('Error playing audio')
        URL.revokeObjectURL(audioUrl)
      }

      await audio.play()
      setPlayingId(sampleId)
      setLoadingAudio(null)

    } catch (error) {
      console.error('Error playing sample:', error)
      alert('Failed to play audio sample')
      setPlayingId(null)
      setLoadingAudio(null)
    }
  }

  if (voiceClones.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Play className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Voice Clones Yet</h3>
        <p className="text-gray-500">
          Create your first voice clone by recording or uploading audio samples
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {voiceClones.map((clone) => (
        <div
          key={clone.expert_id || clone.voice_id}
          className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
        >
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              {editingId === clone.expert_id ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="flex-1 px-3 py-1 border border-blue-500 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    autoFocus
                  />
                  <button
                    onClick={() => handleSaveEdit(clone.expert_id, clone.samples[0]?.user_id)}
                    className="p-1 text-green-600 hover:bg-green-50 rounded"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    className="p-1 text-red-600 hover:bg-red-50 rounded"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold text-gray-900">{clone.name}</h3>
                  <button
                    onClick={() => handleStartEdit(clone)}
                    className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>
              )}
              <div className="flex items-center gap-3 mt-1">
                <span className={`text-xs px-2 py-1 rounded-full ${
                  clone.status === 'ready' 
                    ? 'bg-green-100 text-green-700'
                    : clone.status === 'processing'
                    ? 'bg-yellow-100 text-yellow-700'
                    : 'bg-red-100 text-red-700'
                }`}>
                  {clone.status || 'unknown'}
                </span>
                <span className="text-xs text-gray-500">
                  {clone.category || 'instant'}
                </span>
                <span className="text-xs text-gray-500">
                  {clone.samples?.length || 0} sample{clone.samples?.length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Play Preview Button - Only show if voice_id exists */}
              {clone.voice_id && (
                <button
                  onClick={() => handlePlayVoicePreview(clone.voice_id)}
                  disabled={loadingPreview === clone.voice_id}
                  className={`p-2 rounded-lg transition-colors ${
                    playingVoiceId === clone.voice_id
                      ? 'bg-blue-100 text-blue-600'
                      : 'hover:bg-gray-100 text-gray-600'
                  }`}
                  title={playingVoiceId === clone.voice_id ? 'Pause preview' : 'Play preview'}
                >
                  {loadingPreview === clone.voice_id ? (
                    <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                  ) : playingVoiceId === clone.voice_id ? (
                    <Pause className="w-5 h-5" />
                  ) : (
                    <Play className="w-5 h-5" />
                  )}
                </button>
              )}
              
              {/* Create Voice Button - Only show if no voice_id */}
              {!clone.voice_id && (
                <button
                  onClick={() => handleCreateVoice(clone.expert_id, clone.samples[0]?.user_id, clone.name)}
                  disabled={creatingVoice === clone.expert_id}
                  className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-1"
                  title="Create voice clone from samples"
                >
                  {creatingVoice === clone.expert_id ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Create Voice</span>
                    </>
                  )}
                </button>
              )}
              
              <button
                onClick={() => handleDelete(clone.expert_id, clone.samples[0]?.user_id, clone.name)}
                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Delete voice clone"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Voice ID */}
          {clone.voice_id && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <p className="text-xs text-gray-500">
                Voice ID: <code className="bg-gray-100 px-1 py-0.5 rounded text-xs">{clone.voice_id}</code>
              </p>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
