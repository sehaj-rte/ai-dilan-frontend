import { useState, useCallback, useRef, useEffect } from 'react'
import { Conversation } from '@elevenlabs/client'

export interface VoiceMessage {
  id: string
  content: string
  isUser: boolean
  timestamp: Date
  type: 'transcription' | 'response' | 'tentative'
}

export interface VoiceConversationState {
  isConnected: boolean
  isConnecting: boolean
  isSpeaking: boolean
  isListening: boolean
  canSendFeedback: boolean
  inputVolume: number
  outputVolume: number
  error: string | null
}

export interface UseVoiceConversationOptions {
  expertId: string
  onMessage?: (message: VoiceMessage) => void
  onError?: (error: string) => void
  onStatusChange?: (status: 'connected' | 'connecting' | 'disconnected') => void
}

export const useVoiceConversation = (options: UseVoiceConversationOptions) => {
  const { expertId, onMessage, onError, onStatusChange } = options
  
  const [state, setState] = useState<VoiceConversationState>({
    isConnected: false,
    isConnecting: false,
    isSpeaking: false,
    isListening: false,
    canSendFeedback: false,
    inputVolume: 0,
    outputVolume: 0,
    error: null
  })
  
  const conversationRef = useRef<Conversation | null>(null)
  const volumeIntervalRef = useRef<NodeJS.Timeout | null>(null)
  
  const updateState = useCallback((updates: Partial<VoiceConversationState>) => {
    setState(prev => ({ ...prev, ...updates }))
  }, [])
  
  const getSignedUrl = useCallback(async (): Promise<string> => {
    try {
      const response = await fetch(`http://localhost:8000/conversation/signed-url/${expertId}`)
      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to get signed URL')
      }
      
      return data.signed_url
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to get signed URL'
      throw new Error(errorMessage)
    }
  }, [expertId])
  
  const startConversation = useCallback(async () => {
    if (conversationRef.current || state.isConnecting) {
      return
    }
    
    try {
      updateState({ isConnecting: true, error: null })
      
      // Request microphone permission
      await navigator.mediaDevices.getUserMedia({ audio: true })
      
      // Get signed URL from backend
      const signedUrl = await getSignedUrl()
      
      // Start ElevenLabs conversation
      const conversation = await Conversation.startSession({
        signedUrl,
        connectionType: 'websocket',
        onConnect: () => {
          console.log('Voice conversation connected')
          updateState({ isConnected: true, isConnecting: false })
          onStatusChange?.('connected')
        },
        onDisconnect: () => {
          console.log('Voice conversation disconnected')
          updateState({ 
            isConnected: false, 
            isConnecting: false, 
            isSpeaking: false, 
            isListening: false 
          })
          onStatusChange?.('disconnected')
        },
        onMessage: (message) => {
          console.log('Voice message received:', message)
          
          // Create voice message object
          const voiceMessage: VoiceMessage = {
            id: Date.now().toString(),
            content: typeof message === 'string' ? message : (message as any).message || '',
            isUser: (message as any).source === 'user',
            timestamp: new Date(),
            type: (message as any).type === 'user_transcript' ? 'transcription' : 'response'
          }
          
          onMessage?.(voiceMessage)
        },
        onError: (error) => {
          console.error('Voice conversation error:', error)
          const errorMessage = (error as any)?.message || 'Voice conversation error'
          updateState({ error: errorMessage })
          onError?.(errorMessage)
        },
        onStatusChange: (status) => {
          console.log('Voice conversation status:', status)
          const statusValue = (status as any).status || status
          updateState({ 
            isConnected: statusValue === 'connected',
            isConnecting: statusValue === 'connecting'
          })
          onStatusChange?.(statusValue)
        },
        onModeChange: (mode) => {
          console.log('Voice conversation mode:', mode)
          updateState({
            isSpeaking: mode.mode === 'speaking',
            isListening: mode.mode === 'listening'
          })
        },
        onCanSendFeedbackChange: (canSend) => {
          updateState({ canSendFeedback: Boolean(canSend) })
        }
      })
      
      conversationRef.current = conversation
      
      // Start volume monitoring
      volumeIntervalRef.current = setInterval(async () => {
        if (conversation) {
          try {
            const inputVol = await conversation.getInputVolume()
            const outputVol = await conversation.getOutputVolume()
            updateState({ inputVolume: inputVol, outputVolume: outputVol })
          } catch (error) {
            // Ignore volume errors
          }
        }
      }, 100)
      
    } catch (error) {
      console.error('Failed to start voice conversation:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to start voice conversation'
      updateState({ 
        error: errorMessage, 
        isConnecting: false, 
        isConnected: false 
      })
      onError?.(errorMessage)
    }
  }, [expertId, state.isConnecting, updateState, getSignedUrl, onMessage, onError, onStatusChange])
  
  const endConversation = useCallback(async () => {
    if (conversationRef.current) {
      try {
        await conversationRef.current.endSession()
      } catch (error) {
        console.error('Error ending conversation:', error)
      }
      conversationRef.current = null
    }
    
    if (volumeIntervalRef.current) {
      clearInterval(volumeIntervalRef.current)
      volumeIntervalRef.current = null
    }
    
    updateState({
      isConnected: false,
      isConnecting: false,
      isSpeaking: false,
      isListening: false,
      canSendFeedback: false,
      inputVolume: 0,
      outputVolume: 0
    })
  }, [updateState])
  
  const setVolume = useCallback(async (volume: number) => {
    if (conversationRef.current) {
      try {
        await conversationRef.current.setVolume({ volume })
      } catch (error) {
        console.error('Error setting volume:', error)
      }
    }
  }, [])
  
  const setMicMuted = useCallback(async (muted: boolean) => {
    if (conversationRef.current) {
      try {
        await conversationRef.current.setMicMuted(muted)
      } catch (error) {
        console.error('Error setting mic mute:', error)
      }
    }
  }, [])
  
  const sendFeedback = useCallback((positive: boolean) => {
    if (conversationRef.current && state.canSendFeedback) {
      try {
        conversationRef.current.sendFeedback(positive)
      } catch (error) {
        console.error('Error sending feedback:', error)
      }
    }
  }, [state.canSendFeedback])
  
  const sendUserMessage = useCallback((message: string) => {
    if (conversationRef.current) {
      try {
        conversationRef.current.sendUserMessage(message)
      } catch (error) {
        console.error('Error sending user message:', error)
      }
    }
  }, [])
  
  const sendUserActivity = useCallback(() => {
    if (conversationRef.current) {
      try {
        conversationRef.current.sendUserActivity()
      } catch (error) {
        console.error('Error sending user activity:', error)
      }
    }
  }, [])
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      endConversation()
    }
  }, [endConversation])
  
  return {
    state,
    startConversation,
    endConversation,
    setVolume,
    setMicMuted,
    sendFeedback,
    sendUserMessage,
    sendUserActivity
  }
}
