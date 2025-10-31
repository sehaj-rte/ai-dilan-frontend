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
  AlertCircle,
  MicOff
} from 'lucide-react'
import { API_URL } from '@/lib/config'

// Web Speech API type declarations
declare global {
  interface Window {
    SpeechRecognition: any
    webkitSpeechRecognition: any
  }
}

interface AudioRecorderProps {
  onTranscriptionComplete?: (result: any) => void
  defaultFolderId?: string
  hideFolderSelector?: boolean
  agentId?: string
}

const AudioRecorder: React.FC<AudioRecorderProps> = ({ onTranscriptionComplete, defaultFolderId, hideFolderSelector = false, agentId }) => {
  const [isRecording, setIsRecording] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [recordingTime, setRecordingTime] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [transcriptionResult, setTranscriptionResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedFolderId, setSelectedFolderId] = useState<string>(defaultFolderId || '')
  const [fileName, setFileName] = useState<string>('recording')

  // Speech Recognition States
  const [isListening, setIsListening] = useState(false)
  const [shouldKeepListening, setShouldKeepListening] = useState(false) // Track user intent
  const [speechSupported, setSpeechSupported] = useState(false)
  const [speechError, setSpeechError] = useState<string | null>(null)
  const [interimText, setInterimText] = useState('')
  const [finalText, setFinalText] = useState('')
  const [transcriptionText, setTranscriptionText] = useState('')

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null)
  const recognitionRef = useRef<any>(null)
  const accumulatedTextRef = useRef<string>('') // Track accumulated text across sessions
  const lastProcessedResultRef = useRef<number>(0) // Track last processed result index

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl)
      }
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
    }
  }, [audioUrl])

  // Initialize Speech Recognition
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      if (SpeechRecognition) {
        setSpeechSupported(true)
        const recognition = new SpeechRecognition()
        
        // Mobile-specific optimizations
        const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
        
        if (isMobile) {
          recognition.continuous = false  // Better for mobile battery
          recognition.interimResults = true  // Still show real-time results
        } else {
          recognition.continuous = true   // Keep listening continuously on desktop
          recognition.interimResults = true
        }
        
        recognition.lang = 'en-US'
        recognition.maxAlternatives = 1

        recognition.onstart = () => {
          setIsListening(true)
          setSpeechError(null)
          setInterimText('')
          setFinalText('')
          lastProcessedResultRef.current = 0 // Reset result index for new session
          // DON'T clear transcriptionText - keep existing text when restarting
        }

        recognition.onresult = (event: any) => {
          let interimTranscript = ''
          let newFinalTranscript = ''

          // Process only NEW results to avoid duplicates
          for (let i = lastProcessedResultRef.current; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript
            if (event.results[i].isFinal) {
              newFinalTranscript += transcript
              lastProcessedResultRef.current = i + 1 // Update last processed index
            } else {
              interimTranscript += transcript
            }
          }

          // Only add NEW final results to avoid duplicates
          if (newFinalTranscript.trim()) {
            console.log('🎤 Adding new final transcript:', newFinalTranscript.trim())
            
            // Use ref to get current accumulated text
            const existingText = accumulatedTextRef.current || ''
            const updatedText = existingText 
              ? `${existingText} ${newFinalTranscript.trim()}`
              : newFinalTranscript.trim()
            
            // Update both ref and state
            accumulatedTextRef.current = updatedText
            setTranscriptionText(updatedText)
            
            console.log('🎤 Total accumulated text:', updatedText)
          }
          
          // Show interim results separately for real-time feedback
          setInterimText(interimTranscript)
        }

        recognition.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error)
          setIsListening(false)
          
          // Handle specific errors
          switch (event.error) {
            case 'not-allowed':
              setSpeechError('Microphone access denied. Please allow microphone access and try again.')
              break
            case 'no-speech':
              setSpeechError('No speech detected. Please speak clearly into your microphone.')
              break
            case 'network':
              setSpeechError('Network error. Please check your internet connection and try again.')
              break
            case 'aborted':
              setSpeechError('')
              break
            default:
              setSpeechError('Voice recognition error. Please try again.')
          }
        }

        recognition.onend = () => {
          console.log('Speech recognition ended')
          setIsListening(false)
          setInterimText('')
          
          // Auto-restart if user wants to keep listening (for continuous listening)
          // Only restart if no error occurred and user hasn't manually stopped
          if (!speechError && shouldKeepListening) {
            console.log('Auto-restarting speech recognition...')
            setTimeout(() => {
              if (recognitionRef.current && !speechError && shouldKeepListening) {
                try {
                  recognitionRef.current.start()
                } catch (error) {
                  console.log('Could not restart recognition:', error)
                  setShouldKeepListening(false) // Stop trying if restart fails
                }
              }
            }, 100) // Small delay before restart
          }
        }

        recognitionRef.current = recognition
      } else {
        setSpeechSupported(false)
        console.warn('Speech Recognition not supported in this browser')
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
    }
  }, [])

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
    setTranscriptionText('')
    accumulatedTextRef.current = '' // Clear the ref too
    lastProcessedResultRef.current = 0 // Reset result index
    setError(null)
  }

  const startListening = async () => {
    if (recognitionRef.current && speechSupported) {
      try {
        // Check microphone permission first
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
          // Stop the stream immediately as we'll use Speech Recognition API
          stream.getTracks().forEach(track => track.stop())
        } catch (permissionError) {
          console.error('Microphone permission denied:', permissionError)
          setSpeechError('Microphone access is required for voice recording. Please allow microphone access and try again.')
          return
        }

        setShouldKeepListening(true) // User wants to keep listening
        recognitionRef.current.start()
        setSpeechError(null)
      } catch (error) {
        console.error('Error starting speech recognition:', error)
        setSpeechError('Failed to start speech recognition')
        setShouldKeepListening(false)
      }
    }
  }

  const stopListening = () => {
    setShouldKeepListening(false) // User wants to stop listening
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop()
      } catch (error) {
        console.log('Speech recognition already stopped')
      }
      setInterimText('')
    }
  }

  const toggleListening = () => {
    if (isListening) {
      stopListening()
    } else {
      startListening()
    }
  }

  // Comment out the old ElevenLabs transcription function
  // const transcribeAudio = async () => {
  //   if (!audioBlob) return

  //   setIsTranscribing(true)
  //   setError(null)

  //   try {
  //     const formData = new FormData()
      
  //     // Convert webm to a more compatible format if needed
  //     // For now, we'll send the webm file directly
  //     const audioFile = new File([audioBlob], `${fileName}.webm`, { type: audioBlob.type })
  //     formData.append('file', audioFile)
  //     if (selectedFolderId) {
  //       formData.append('folder_id', selectedFolderId)
  //     }
  //     if (agentId) {
  //       formData.append('agent_id', agentId)
  //     }

  //     const response = await fetchWithAuth(`${API_URL}/knowledge-base/transcribe-audio`, {
  //       method: 'POST',
  //       headers: getAuthHeadersForFormData(),
  //       body: formData,
  //     })

  //     const result = await response.json()

  //     if (result.success) {
  //       setTranscriptionResult(result)
        
  //       // Call callback if provided
  //       if (onTranscriptionComplete) {
  //         onTranscriptionComplete(result)
  //       }
  //     } else {
  //       setError(result.error || 'Transcription failed')
  //     }
  //   } catch (err) {
  //     console.error('Transcription error:', err)
  //     setError('Failed to transcribe audio. Please try again.')
  //   } finally {
  //     setIsTranscribing(false)
  //   }
  // }

  const saveTranscription = async () => {
    if (!transcriptionText.trim()) {
      setError('No transcription text available. Please use voice input first.')
      return
    }

    setIsTranscribing(true)
    setError(null)

    try {
      console.log('🎤 Starting speech transcription save process...')
      
      // Replicate ElevenLabs flow: Create the same structured data
      const textContent = transcriptionText.trim()
      const word_count = textContent.split(/\s+/).length
      const language_code = 'en-US' // Browser speech recognition language
      
      console.log(`📊 Transcription stats: ${textContent.length} characters, ${word_count} words`)
      
      // Create the same metadata structure as ElevenLabs
      const extraction_result = {
        success: true,
        text: textContent,
        content_type: "audio/transcription",
        filename: `${fileName}_transcription.txt`,
        word_count: word_count,
        metadata: {
          document_type: "audio_transcription",
          language: language_code,
          page_count: 1,
          has_images: false,
          has_tables: false,
          extracted_text_preview: textContent.length > 500 ? textContent.substring(0, 500) + "..." : textContent,
          transcription_source: "browser_speech_recognition", // Instead of "elevenlabs"
          original_audio_type: "browser_speech_input"
        }
      }

      // Create a text file with the transcription (same as ElevenLabs flow)
      const textBlob = new Blob([textContent], { type: 'text/plain' })
      const transcription_filename = fileName.endsWith('.txt') ? fileName : `${fileName}_transcription.txt`
      const textFile = new File([textBlob], transcription_filename, { type: 'text/plain' })

      const formData = new FormData()
      formData.append('file', textFile)
      if (selectedFolderId) {
        formData.append('folder_id', selectedFolderId)
      }
      if (agentId) {
        formData.append('agent_id', agentId)
      }
      // Add custom name to match ElevenLabs flow
      formData.append('custom_name', fileName)

      console.log('💾 Saving transcription to knowledge base...')

      const response = await fetchWithAuth(`${API_URL}/knowledge-base/upload`, {
        method: 'POST',
        headers: getAuthHeadersForFormData(),
        body: formData,
      })

      const result = await response.json()

      if (result.success) {
        console.log('✅ Transcription saved successfully')
        
        // Create the same response structure as ElevenLabs backend
        const transcriptionResult = {
          success: true,
          message: "Audio transcribed and saved successfully",
          transcription: {
            text: textContent,
            word_count: word_count,
            language: language_code,
            preview: textContent.length > 200 ? textContent.substring(0, 200) + "..." : textContent
          },
          file: {
            id: result.file?.id || result.id,
            name: transcription_filename,
            url: result.file?.url || result.url,
            s3_key: result.file?.s3_key || result.s3_key
          },
          processing: result.processing || { queued: true }
        }
        
        setTranscriptionResult(transcriptionResult)
        
        // Call callback to refresh file list - pass the server response (same as ElevenLabs)
        if (onTranscriptionComplete) {
          console.log('🔄 AudioRecorder: Calling onTranscriptionComplete with result:', result)
          onTranscriptionComplete(result)
        }
        
        // Clear the transcription text after successful save
        setTimeout(() => {
          setTranscriptionText('')
          accumulatedTextRef.current = '' // Clear the ref too
          lastProcessedResultRef.current = 0 // Reset result index
        }, 3000)
      } else {
        setError(result.error || 'Failed to save transcription')
      }
    } catch (err) {
      console.error('Save transcription error:', err)
      setError('Failed to save transcription. Please try again.')
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
          Voice Input
        </CardTitle>
        <CardDescription>
          Use your voice to create text notes. Speak naturally and your words will be transcribed in real-time using your browser's speech recognition.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Folder Selection */}
        {!hideFolderSelector && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Save to Folder</label>
            <FolderSelector value={selectedFolderId} onChange={setSelectedFolderId} />
          </div>
        )}

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

        {/* Voice Input Controls */}
        <div className="flex flex-col items-center space-y-4">

          {/* Speech Recognition Indicator */}
          {isListening && (
            <div className="flex items-center space-x-2 text-blue-600">
              <div className="w-3 h-3 bg-blue-600 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium">🎤 Listening... Speak now</span>
            </div>
          )}

     

          {/* Real-time Transcription Display */}
          {(isListening || transcriptionText) && (
            <div className="w-full max-w-2xl mx-auto p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">
                  {isListening ? 'Live Transcription:' : 'Transcription:'}
                </span>
                {transcriptionText && (
                  <span className="text-xs text-gray-500">
                    {transcriptionText.split(/\s+/).length} words
                  </span>
                )}
              </div>
              <div className={`min-h-[60px] p-3 bg-white rounded border ${isListening ? 'ring-2 ring-blue-500' : ''}`}>
                <p className="text-sm text-gray-800 whitespace-pre-wrap">
                  {transcriptionText}
                  {interimText && (
                    <span className="text-gray-500 italic">
                      {transcriptionText ? ' ' : ''}{interimText}
                    </span>
                  )}
                  {!transcriptionText && !interimText && (isListening ? 'Speak now...' : 'No transcription yet')}
                </p>
              </div>
            </div>
          )}

          {/* Control Buttons */}
          <div className="flex space-x-3">
            {/* Speech Recognition Button */}
            {speechSupported && (
              <Button 
                onClick={toggleListening} 
                size="lg" 
                variant={isListening ? "destructive" : "default"}
                className={isListening ? "bg-red-600 hover:bg-red-700 animate-pulse" : "bg-blue-600 hover:bg-blue-700"}
              >
                {isListening ? (
                  <>
                    <MicOff className="h-5 w-5 mr-2" />
                    Stop Listening
                  </>
                ) : (
                  <>
                    <Mic className="h-5 w-5 mr-2" />
                    Start Voice Input
                  </>
                )}
              </Button>
            )}

            {/* Save Transcription Button - Only show after user stops listening */}
            {transcriptionText && !isListening && (
              <Button 
                onClick={saveTranscription} 
                disabled={isTranscribing}
                size="lg"
                className="bg-green-600 hover:bg-green-700"
              >
                {isTranscribing ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Upload className="h-5 w-5 mr-2" />
                    Save Transcription
                  </>
                )}
              </Button>
            )}

            {/* Clear Button */}
            {transcriptionText && !isListening && (
              <Button 
                onClick={() => {
                  setTranscriptionText('')
                  accumulatedTextRef.current = '' // Clear the ref too
                  lastProcessedResultRef.current = 0 // Reset result index
                  setTranscriptionResult(null)
                  setError(null)
                }} 
                variant="outline" 
                size="lg"
              >
                <Trash2 className="h-5 w-5 mr-2" />
                Clear
              </Button>
            )}
          </div>
        </div>

        {/* Error Messages */}
        {error && (
          <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Speech Error Display */}
        {speechError && (
          <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <p className="text-sm text-red-700">{speechError}</p>
          </div>
        )}

        {/* Browser Support Warning */}
        {!speechSupported && (
          <div className="flex items-center space-x-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <AlertCircle className="h-5 w-5 text-yellow-600" />
            <p className="text-sm text-yellow-700">
              Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari for voice input.
            </p>
          </div>
        )}

        {/* Transcription Progress */}
        {isTranscribing && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Processing transcription and saving to knowledge base...</span>
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
              The transcription has been saved to your knowledge base and will be processed for AI search. Your experts can now use this content in conversations.
            </p>
          </div>
        )}

    
      </CardContent>
    </Card>
  )
}

export default AudioRecorder
