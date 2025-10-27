'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Mic, Square, Play, Trash2, Loader2, CheckCircle } from 'lucide-react'
import { API_URL } from '@/lib/config'
import { fetchWithAuth } from '@/lib/api-client'

interface VoiceRecorderProps {
  userId: string
  expertId?: string
  expertName?: string
  onSuccess?: () => void
}

interface Recording {
  id: string
  blob: Blob
  url: string
  duration: number
}

export default function VoiceRecorder({ userId, expertId, expertName, onSuccess }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [recordings, setRecordings] = useState<Recording[]>([])
  const [recordingTime, setRecordingTime] = useState(0)
  const [voiceName, setVoiceName] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // Set default voice name from expert name
  // useEffect(() => {
  //   if (expertName && !voiceName) {
  //     setVoiceName(`${expertName} Voice Clone`)
  //   }
  // }, [expertName, voiceName])

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data)
        }
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        const url = URL.createObjectURL(blob)
        const newRecording: Recording = {
          id: Date.now().toString(),
          blob,
          url,
          duration: recordingTime
        }
        setRecordings(prev => [...prev, newRecording])
        setRecordingTime(0)
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop())
      }

      mediaRecorder.start()
      setIsRecording(true)

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1)
      }, 1000)
    } catch (error) {
      console.error('Error starting recording:', error)
      alert('Could not access microphone. Please grant permission.')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }

  const deleteRecording = (id: string) => {
    setRecordings(prev => prev.filter(r => r.id !== id))
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleCreateVoiceClone = async () => {
    if (!voiceName.trim()) {
      alert('Please enter a voice name')
      return
    }

    if (recordings.length === 0) {
      alert('Please record at least one sample')
      return
    }

    setLoading(true)
    setSuccess(false)

    try {
      // Upload each recording
      for (const recording of recordings) {
        const reader = new FileReader()
        
        await new Promise((resolve, reject) => {
          reader.onloadend = async () => {
            try {
              const base64Audio = (reader.result as string).split(',')[1]
              
              const response = await fetchWithAuth(`${API_URL}/voice-clone/samples/record`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  user_id: userId,
                  expert_id: expertId || null,
                  audio_base64: base64Audio,
                  filename: `recording_${recording.id}.webm`,
                  name: voiceName,
                  description: `Voice clone recording`
                })
              })

              const data = await response.json()
              if (!data.success) {
                throw new Error(data.error || 'Failed to save recording')
              }
              resolve(data)
            } catch (error) {
              reject(error)
            }
          }
          reader.onerror = reject
          reader.readAsDataURL(recording.blob)
        })
      }

      // Don't automatically create voice clone - let user do it manually
      // This allows creating multiple voices from different sample sets
      
      setSuccess(true)
      setVoiceName('')
      setRecordings([])
      
      setTimeout(() => {
        setSuccess(false)
        onSuccess?.()
      }, 2000)

    } catch (error: any) {
      console.error('Error creating voice clone:', error)
      alert(error.message || 'Failed to create voice clone')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Expert Info (if provided) */}
      {expertName && (
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-gray-600">Creating voice for:</p>
          <p className="text-lg font-semibold text-blue-900">{expertName}</p>
        </div>
      )}

      {/* Voice Name Input */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Voice Name *
        </label>
        <input
          type="text"
          value={voiceName}
          onChange={(e) => setVoiceName(e.target.value)}
          placeholder="e.g., My Voice, Professional Voice"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Recording Controls */}
      <div className="flex flex-col items-center space-y-4">
        {!isRecording ? (
          <button
            onClick={startRecording}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-full hover:from-red-600 hover:to-red-700 transition-all shadow-lg"
          >
            <Mic className="w-5 h-5" />
            Start Recording
          </button>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
              <span className="text-2xl font-mono font-bold text-gray-900">
                {formatTime(recordingTime)}
              </span>
            </div>
            <button
              onClick={stopRecording}
              className="flex items-center gap-2 px-6 py-3 bg-gray-800 text-white rounded-full hover:bg-gray-900 transition-all shadow-lg"
            >
              <Square className="w-5 h-5" />
              Stop Recording
            </button>
          </div>
        )}
      </div>

      {/* Recordings List */}
      {recordings.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold text-gray-900">
            Recordings ({recordings.length})
          </h3>
          {recordings.map((recording, index) => (
            <div
              key={recording.id}
              className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
            >
              <span className="text-sm font-medium text-gray-700">
                Sample {index + 1}
              </span>
              <audio src={recording.url} controls className="flex-1" />
              <button
                onClick={() => deleteRecording(recording.id)}
                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Create Button */}
      <button
        onClick={handleCreateVoiceClone}
        disabled={loading || !voiceName.trim() || recordings.length === 0}
        className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Creating Voice Clone...
          </>
        ) : success ? (
          <>
            <CheckCircle className="w-5 h-5" />
            Voice Clone Created!
          </>
        ) : (
          <>Create Voice Clone ({recordings.length} sample{recordings.length !== 1 ? 's' : ''})</>
        )}
      </button>
    </div>
  )
}
