'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import FolderSelector from './FolderSelector'
import { fetchWithAuth, getAuthHeadersForFormData } from '@/lib/api-client'
import { 
  Mic, 
  Square, 
  Play, 
  Pause, 
  Trash2, 
  Upload,
  Loader2,
  CheckCircle,
  AlertCircle
} from 'lucide-react'
import { API_URL } from '@/lib/config'

interface AudioRecorderProps {
  onTranscriptionComplete?: (result: any) => void
}

const AudioRecorder: React.FC<AudioRecorderProps> = ({ onTranscriptionComplete }) => {
  const [isRecording, setIsRecording] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [recordingTime, setRecordingTime] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [transcriptionResult, setTranscriptionResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedFolder, setSelectedFolder] = useState<string>('Uncategorized')
  const [fileName, setFileName] = useState<string>('recording')

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl)
      }
    }
  }, [audioUrl])

  const startRecording = async () => {
    try {
      setError(null)
      setTranscriptionResult(null)
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      
      // Use webm format with opus codec for better compatibility
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm'
      
      const mediaRecorder = new MediaRecorder(stream, { mimeType })
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType })
        setAudioBlob(audioBlob)
        
        const url = URL.createObjectURL(audioBlob)
        setAudioUrl(url)
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop())
      }

      mediaRecorder.start()
      setIsRecording(true)
      setIsPaused(false)
      setRecordingTime(0)

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1)
      }, 1000)
    } catch (err) {
      console.error('Error starting recording:', err)
      setError('Failed to access microphone. Please grant permission and try again.')
    }
  }

  const pauseRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      if (isPaused) {
        mediaRecorderRef.current.resume()
        setIsPaused(false)
        
        // Resume timer
        timerRef.current = setInterval(() => {
          setRecordingTime(prev => prev + 1)
        }, 1000)
      } else {
        mediaRecorderRef.current.pause()
        setIsPaused(true)
        
        // Pause timer
        if (timerRef.current) {
          clearInterval(timerRef.current)
        }
      }
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      setIsPaused(false)
      
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }

  const playAudio = () => {
    if (audioUrl && audioPlayerRef.current) {
      if (isPlaying) {
        audioPlayerRef.current.pause()
        setIsPlaying(false)
      } else {
        audioPlayerRef.current.play()
        setIsPlaying(true)
      }
    }
  }

  const deleteRecording = () => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl)
    }
    setAudioBlob(null)
    setAudioUrl(null)
    setRecordingTime(0)
    setIsPlaying(false)
    setTranscriptionResult(null)
    setError(null)
  }

  const transcribeAudio = async () => {
    if (!audioBlob) return

    setIsTranscribing(true)
    setError(null)

    try {
      const formData = new FormData()
      
      // Convert webm to a more compatible format if needed
      // For now, we'll send the webm file directly
      const audioFile = new File([audioBlob], `${fileName}.webm`, { type: audioBlob.type })
      formData.append('file', audioFile)
      formData.append('folder', selectedFolder)
      formData.append('custom_name', `${fileName}_transcription.txt`)

      const response = await fetchWithAuth(`${API_URL}/knowledge-base/transcribe-audio`, {
        method: 'POST',
        headers: getAuthHeadersForFormData(),
        body: formData,
      })

      const result = await response.json()

      if (result.success) {
        setTranscriptionResult(result)
        
        // Call callback if provided
        if (onTranscriptionComplete) {
          onTranscriptionComplete(result)
        }
      } else {
        setError(result.error || 'Transcription failed')
      }
    } catch (err) {
      console.error('Transcription error:', err)
      setError('Failed to transcribe audio. Please try again.')
    } finally {
      setIsTranscribing(false)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Mic className="h-5 w-5 mr-2" />
          Speech to Text
        </CardTitle>
        {/* <CardDescription>
          Record audio and transcribe it using AI. The transcription will be saved to your knowledge base.
        </CardDescription> */}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Folder Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Save to Folder</label>
          <FolderSelector value={selectedFolder} onChange={setSelectedFolder} />
        </div>

        {/* File Name Input */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">File Name</label>
          <Input
            value={fileName}
            onChange={(e) => setFileName(e.target.value)}
            placeholder="Enter file name (without extension)"
          />
          <p className="text-xs text-gray-500">
            Transcription will be saved as "{fileName}_transcription.txt"
          </p>
        </div>

        {/* Recording Controls */}
        <div className="flex flex-col items-center space-y-4">
          {/* Timer Display */}
          {(isRecording || audioBlob) && (
            <div className="text-3xl font-mono font-bold text-gray-700">
              {formatTime(recordingTime)}
            </div>
          )}

          {/* Recording Indicator */}
          {isRecording && !isPaused && (
            <div className="flex items-center space-x-2 text-red-600">
              <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium">Recording...</span>
            </div>
          )}

          {isPaused && (
            <div className="flex items-center space-x-2 text-yellow-600">
              <Pause className="h-4 w-4" />
              <span className="text-sm font-medium">Paused</span>
            </div>
          )}

          {/* Control Buttons */}
          <div className="flex space-x-3">
            {!isRecording && !audioBlob && (
              <Button onClick={startRecording} size="lg" className="bg-red-600 hover:bg-red-700">
                <Mic className="h-5 w-5 mr-2" />
                Start Recording
              </Button>
            )}

            {isRecording && (
              <>
                <Button onClick={pauseRecording} variant="outline" size="lg">
                  {isPaused ? <Play className="h-5 w-5 mr-2" /> : <Pause className="h-5 w-5 mr-2" />}
                  {isPaused ? 'Resume' : 'Pause'}
                </Button>
                <Button onClick={stopRecording} variant="destructive" size="lg">
                  <Square className="h-5 w-5 mr-2" />
                  Stop
                </Button>
              </>
            )}

            {audioBlob && !isRecording && (
              <>
                <Button onClick={playAudio} variant="outline" size="lg">
                  {isPlaying ? <Pause className="h-5 w-5 mr-2" /> : <Play className="h-5 w-5 mr-2" />}
                  {isPlaying ? 'Pause' : 'Play'}
                </Button>
                <Button onClick={deleteRecording} variant="outline" size="lg">
                  <Trash2 className="h-5 w-5 mr-2" />
                  Delete
                </Button>
                <Button 
                  onClick={transcribeAudio} 
                  disabled={isTranscribing}
                  size="lg"
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isTranscribing ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Transcribing...
                    </>
                  ) : (
                    <>
                      <Upload className="h-5 w-5 mr-2" />
                      Transcribe & Save
                    </>
                  )}
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Audio Player (hidden) */}
        {audioUrl && (
          <audio
            ref={audioPlayerRef}
            src={audioUrl}
            onEnded={() => setIsPlaying(false)}
            className="hidden"
          />
        )}

        {/* Error Message */}
        {error && (
          <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Transcription Progress */}
        {isTranscribing && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Transcribing audio...</span>
            </div>
            <Progress value={undefined} className="h-2" />
          </div>
        )}

        {/* Transcription Result */}
        {transcriptionResult && (
          <div className="space-y-3 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <h4 className="font-medium text-green-900">Transcription Complete!</h4>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Word Count:</span>
                <span className="font-medium">{transcriptionResult.transcription.word_count}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Language:</span>
                <span className="font-medium">{transcriptionResult.transcription.language}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Saved as:</span>
                <span className="font-medium text-blue-600">{transcriptionResult.file.name}</span>
              </div>
            </div>

            <div className="mt-3 p-3 bg-white rounded border border-gray-200">
              <p className="text-sm text-gray-700 whitespace-pre-wrap">
                {transcriptionResult.transcription.preview}
              </p>
            </div>

            <p className="text-xs text-gray-500 mt-2">
              The full transcription has been saved to your knowledge base and can be used by your AI experts.
            </p>
          </div>
        )}

        {/* Info Box - Commented out */}
        {/* <div className="text-xs text-gray-500 p-3 bg-gray-50 rounded-lg">
          <p><strong>Tips:</strong></p>
          <ul className="list-disc list-inside space-y-1 mt-1">
            <li>Speak clearly and at a moderate pace for best results</li>
            <li>Maximum recording length: 10 minutes</li>
            <li>Supported formats: WebM, MP3, WAV, OGG, M4A</li>
            <li>Transcriptions are powered by advanced AI</li>
          </ul>
        </div> */}
      </CardContent>
    </Card>
  )
}

export default AudioRecorder
