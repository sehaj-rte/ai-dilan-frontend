'use client'

import { useState, useCallback, useRef, useEffect } from 'react'

interface ChatMessage {
  id: string
  type: 'user' | 'agent'
  text: string
  timestamp: Date
}

interface ChatModeOptions {
  expertId: string
  textOnly?: boolean
  onMessage?: (message: ChatMessage) => void
  onError?: (error: string) => void
  onStatusChange?: (status: 'disconnected' | 'connecting' | 'connected') => void
}

interface UseChatModeReturn {
  messages: ChatMessage[]
  isConnected: boolean
  isConnecting: boolean
  error: string | null
  conversationId: string | null
  startChatSession: () => Promise<void>
  endChatSession: () => void
  sendMessage: (text: string) => void
  clearMessages: () => void
  addMessage: (message: ChatMessage) => void
}

export const useChatMode = (options: ChatModeOptions): UseChatModeReturn => {
  const {
    expertId,
    textOnly = false,
    onMessage,
    onError,
    onStatusChange
  } = options

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const wsRef = useRef<WebSocket | null>(null)

  const createChatSession = async () => {
    try {
      // Use chat-session endpoint for text-only mode, or session endpoint with overrides
      const endpoint = textOnly 
        ? `/conversation/chat-session/${expertId}`
        : `/conversation/session/${expertId}`
      
      const overrides = textOnly ? {} : { conversation: { text_only: true } }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ overrides })
      })

      if (!response.ok) {
        throw new Error(`Failed to create chat session: ${response.statusText}`)
      }

      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to create chat session')
      }

      return data
    } catch (error: any) {
      console.error('Error creating chat session:', error)
      throw error
    }
  }

  const connectWebSocket = (signedUrl: string): Promise<WebSocket> => {
    return new Promise((resolve, reject) => {
      const websocket = new WebSocket(signedUrl)
      
      websocket.onopen = () => {
        console.log('Chat WebSocket connected')
        setIsConnected(true)
        setIsConnecting(false)
        setError(null)
        onStatusChange?.('connected')
        resolve(websocket)
      }

      websocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          console.log('Received WebSocket message:', data)
          
          // Handle different message types from ElevenLabs
          if (data.type === 'agent_response' && data.agent_response) {
            const agentMessage: ChatMessage = {
              id: `agent-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              type: 'agent',
              text: data.agent_response,
              timestamp: new Date()
            }
            
            setMessages(prev => [...prev, agentMessage])
            onMessage?.(agentMessage)
          } else if (data.type === 'user_transcript' && data.user_transcript) {
            // Handle user transcript confirmation (optional)
            console.log('User transcript confirmed:', data.user_transcript)
          } else if (data.type === 'conversation_initiation_metadata') {
            // Handle conversation metadata
            console.log('Conversation metadata:', data)
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error)
        }
      }

      websocket.onerror = (error) => {
        console.error('Chat WebSocket error:', error)
        const errorMessage = 'WebSocket connection error'
        setError(errorMessage)
        onError?.(errorMessage)
        reject(error)
      }

      websocket.onclose = (event) => {
        console.log('Chat WebSocket closed:', event.code, event.reason)
        setIsConnected(false)
        setIsConnecting(false)
        onStatusChange?.('disconnected')
        
        if (event.code !== 1000) { // Not a normal closure
          const errorMessage = 'Connection lost unexpectedly'
          setError(errorMessage)
          onError?.(errorMessage)
        }
      }

      wsRef.current = websocket
    })
  }

  const startChatSession = useCallback(async () => {
    if (isConnecting || isConnected) return

    try {
      setIsConnecting(true)
      setError(null)
      onStatusChange?.('connecting')

      // Create chat session
      const sessionData = await createChatSession()
      setConversationId(sessionData.conversation_id)

      // Connect WebSocket
      const websocket = await connectWebSocket(sessionData.signed_url)
      wsRef.current = websocket

    } catch (error: any) {
      console.error('Failed to start chat session:', error)
      const errorMessage = error.message || 'Failed to start chat session'
      setError(errorMessage)
      onError?.(errorMessage)
      setIsConnecting(false)
      onStatusChange?.('disconnected')
    }
  }, [expertId, textOnly, isConnecting, isConnected])

  const endChatSession = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close(1000, 'User ended session')
      wsRef.current = null
    }
    setIsConnected(false)
    setIsConnecting(false)
    setConversationId(null)
    setError(null)
    onStatusChange?.('disconnected')
  }, [])

  const sendMessage = useCallback((text: string) => {
    if (!text.trim() || !wsRef.current || !isConnected) return

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'user',
      text: text.trim(),
      timestamp: new Date()
    }

    // Add user message to chat immediately
    setMessages(prev => [...prev, userMessage])
    onMessage?.(userMessage)

    // Send message through WebSocket
    try {
      wsRef.current.send(JSON.stringify({
        type: 'user_message',
        text: text.trim()
      }))
    } catch (error) {
      console.error('Error sending message:', error)
      const errorMessage = 'Failed to send message'
      setError(errorMessage)
      onError?.(errorMessage)
    }
  }, [isConnected, onMessage, onError])

  const clearMessages = useCallback(() => {
    setMessages([])
  }, [])

  const addMessage = useCallback((message: ChatMessage) => {
    setMessages(prev => [...prev, message])
    onMessage?.(message)
  }, [onMessage])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close(1000, 'Component unmounted')
      }
    }
  }, [])

  return {
    messages,
    isConnected,
    isConnecting,
    error,
    conversationId,
    startChatSession,
    endChatSession,
    sendMessage,
    clearMessages,
    addMessage
  }
}
