'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Mic, MicOff } from 'lucide-react'

// Web Speech API type declarations
declare global {
  interface Window {
    SpeechRecognition: any
    webkitSpeechRecognition: any
  }
}

interface SpeechToTextInputProps {
  value: string
  onChange: (value: string) => void
  onKeyPress?: (e: React.KeyboardEvent) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  showMicButton?: boolean
}

const SpeechToTextInput: React.FC<SpeechToTextInputProps> = ({
  value,
  onChange,
  onKeyPress,
  placeholder = "Type your message...",
  disabled = false,
  className = "",
  showMicButton = true
}) => {
  // Speech Recognition States
  const [isListening, setIsListening] = useState(false)
  const [speechSupported, setSpeechSupported] = useState(false)
  const [speechError, setSpeechError] = useState<string | null>(null)
  const recognitionRef = useRef<any>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Initialize Speech Recognition
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      if (SpeechRecognition) {
        console.log('Speech Recognition supported')
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
        }

        recognition.onresult = (event: any) => {
          let interimTranscript = ''
          let finalTranscript = ''

          // Process all results to get both final and interim text
          for (let i = 0; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript
            if (event.results[i].isFinal) {
              finalTranscript += transcript
            } else {
              interimTranscript += transcript
            }
          }

          // Combine final and interim for real-time display
          const completeTranscript = finalTranscript + interimTranscript

          if (completeTranscript.trim()) {
            // Update input immediately with both final and interim results
            onChange(completeTranscript.trim())
            
            // Keep cursor at end
            if (inputRef.current) {
              const input = inputRef.current
              setTimeout(() => {
                input.selectionStart = input.selectionEnd = input.value.length
              }, 0)
            }
          }
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
          setIsListening(false)
        }

        recognitionRef.current = recognition
      } else {
        setSpeechSupported(false)
        console.warn('Speech Recognition not supported in this browser')
      }
    } else {
      console.warn('Window not available (SSR)')
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
    }
  }, [onChange])

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

        recognitionRef.current.start()
        setSpeechError(null)
      } catch (error) {
        console.error('Error starting speech recognition:', error)
        setSpeechError('Failed to start speech recognition')
      }
    }
  }

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      try {
        recognitionRef.current.stop()
      } catch (error) {
        console.log('Speech recognition already stopped')
      }
    }
  }

  const toggleListening = () => {
    if (isListening) {
      stopListening()
    } else {
      startListening()
    }
  }

  // Debug logging
  console.log('SpeechToTextInput render:', { speechSupported, showMicButton, isListening })

  return (
    <div className="w-full space-y-2">
      <div className="relative w-full">
        <Input
          ref={inputRef}
          value={value}
          onChange={(e) => {
            // Only allow manual typing when not listening
            if (!isListening) {
              onChange(e.target.value)
            }
          }}
          onKeyPress={onKeyPress}
          placeholder={isListening ? "🎤 Listening... speak now" : placeholder}
          disabled={disabled}
          className={`w-full ${showMicButton && speechSupported ? 'pr-12' : 'pr-4'} ${isListening ? 'ring-2 ring-blue-500 bg-blue-50' : ''} ${className}`}
        />
        {showMicButton && (
          <Button
            onClick={toggleListening}
            disabled={disabled}
            size="sm"
            variant={isListening ? "destructive" : "outline"}
            className={`absolute right-1 top-1/2 transform -translate-y-1/2 h-9 w-9 p-0 z-10 ${isListening ? "animate-pulse" : ""}`}
            title={isListening ? "Stop listening" : "Start voice input"}
          >
            {isListening ? (
              <MicOff className="h-4 w-4" />
            ) : (
              <Mic className="h-4 w-4" />
            )}
          </Button>
        )}
      </div>

      {/* Speech Error Display */}
      {speechError && (
        <div className="text-xs text-red-500 text-center py-1">
          {speechError}
        </div>
      )}

      {/* Status Display */}
      {isListening && (
        <div className="text-xs text-blue-600 text-center animate-pulse">
          🎤 Listening... Speak now
        </div>
      )}
    </div>
  )
}

export default SpeechToTextInput
