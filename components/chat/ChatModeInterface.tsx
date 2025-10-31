'use client'

import React, { useState, useEffect, useRef } from 'react'

// Web Speech API type declarations
declare global {
  interface Window {
    SpeechRecognition: any
    webkitSpeechRecognition: any
  }
}
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { API_URL } from '@/lib/config'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { 
  MessageSquare, 
  Send, 
  Loader2, 
  Wifi, 
  WifiOff, 
  Settings,
  MessageCircle,
  Bot,
  User,
  X,
  Copy,
  Check,
  FileText,
  ChevronDown,
  ChevronUp
  Mic,
  MicOff
} from 'lucide-react'

interface ChatMessage {
  id: string
  type: 'user' | 'agent'
  text: string
  timestamp: Date
  toolCalls?: Array<{
    function: string
    query: string
    results_count: number
  }>
  sources?: Array<{
    source: string
    score: number
    page?: number
    text?: string
  }>
}

interface ChatModeInterfaceProps {
  expertId: string
  expertName?: string
  expertAvatarUrl?: string
  textOnly?: boolean
  onError?: (error: string) => void
  onStatusChange?: (status: 'disconnected' | 'connecting' | 'connected') => void
  className?: string
}

// Copy Button Component
const CopyButton: React.FC<{ text: string }> = ({ text }) => {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000) // Reset after 2 seconds
    } catch (err) {
      console.error('Failed to copy text: ', err)
    }
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleCopy}
      className="h-6 w-6 p-0 opacity-70 hover:opacity-100 transition-opacity duration-200 hover:bg-gray-100 dark:hover:bg-gray-800"
      title={copied ? "Copied!" : "Copy message"}
    >
      {copied ? (
        <Check className="h-3 w-3 text-green-500" />
      ) : (
        <Copy className="h-3 w-3 text-gray-500" />
      )}
    </Button>
  )
}

const ChatModeInterface: React.FC<ChatModeInterfaceProps> = ({
  expertId,
  expertName = 'AI Agent',
  expertAvatarUrl,
  textOnly = false,
  onError,
  onStatusChange,
  className = ''
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputText, setInputText] = useState('')
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [isWaitingForResponse, setIsWaitingForResponse] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ws, setWs] = useState<WebSocket | null>(null)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null) // For OpenAI chat
  const [expandedCitations, setExpandedCitations] = useState<Set<string>>(new Set())
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null)
  
  // Speech Recognition States
  const [isListening, setIsListening] = useState(false)
  const [speechSupported, setSpeechSupported] = useState(false)
  const [speechError, setSpeechError] = useState<string | null>(null)
  const [interimText, setInterimText] = useState('')
  const [finalText, setFinalText] = useState('')
  const recognitionRef = useRef<any>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Reset textarea height when input is cleared
  useEffect(() => {
    if (inputText === '' && inputRef.current) {
      inputRef.current.style.height = 'auto'
    }
  }, [inputText])

  // Initialize Speech Recognition
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      if (SpeechRecognition) {
        setSpeechSupported(true)
        const recognition = new SpeechRecognition()
        
        // Mobile-specific optimizations from demo
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
            setInputText(completeTranscript.trim())
            
            // Keep cursor at end and auto-resize
            if (inputRef.current) {
              const textarea = inputRef.current
              setTimeout(() => {
                textarea.selectionStart = textarea.selectionEnd = textarea.value.length
                // Auto-resize for speech input
                textarea.style.height = 'auto'
                textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px'
              }, 0)
            }
          }
        }

        recognition.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error)
          setIsListening(false)
          
          // Handle specific errors like in the demo
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
          setInterimText('')
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

  // Cleanup on unmount: clear heartbeat and close WS
  useEffect(() => {
    return () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current)
        heartbeatIntervalRef.current = null
      }
      if (ws && ws.readyState === WebSocket.OPEN) {
        try { ws.close(1000, 'Component unmounted') } catch {}
      }
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
    }
  }, [ws])

  const createChatSession = async () => {
    try {
      setIsConnecting(true)
      setError(null)
      onStatusChange?.('connecting')

      // Use chat-session endpoint for text-only mode, or session endpoint with overrides
      const endpoint = textOnly 
        ? `/conversation/chat-session/${expertId}`
        : `/conversation/session/${expertId}`
      
      // Always send text_only override to ensure text-only mode
      const overrides = { conversation: { text_only: true } }

      console.log(`✅ Creating ${textOnly ? 'text-only' : 'conversation'} session with overrides:`, overrides)

      const response = await fetch(`${API_URL}${endpoint}`, {
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

  const connectWebSocket = (signedUrl: string) => {
    return new Promise<WebSocket>((resolve, reject) => {
      const websocket = new WebSocket(signedUrl)
      
      websocket.onopen = () => {
        console.log('Chat WebSocket connected')
        setIsConnected(true)
        setIsConnecting(false)
        setError(null)
        onStatusChange?.('connected')
        heartbeatIntervalRef.current && clearInterval(heartbeatIntervalRef.current)
        heartbeatIntervalRef.current = setInterval(() => {
          if (websocket.readyState === WebSocket.OPEN) {
            try {
              websocket.send(JSON.stringify({ type: 'ping' }))
            } catch (e) {
              console.error('Heartbeat failed:', e)
            }
          }
        }, 30000)
        resolve(websocket)
      }

      websocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          
          // CRITICAL: Filter out audio events in text-only mode
          if (data.type === 'audio') {
            // Silently ignore audio events - they shouldn't be processed in text-only mode
            // This prevents unnecessary audio transcription costs
            return;
          }
          
          console.log('Received WebSocket message:', data)
          
          // Handle different message types from ElevenLabs
          if (data.type === 'agent_response' && data.agent_response_event?.agent_response) {
            const responseText = data.agent_response_event.agent_response
            
            // Filter out generic greeting messages for better UX
            const isGenericGreeting = responseText.toLowerCase().includes('knowledge') && 
                                    responseText.toLowerCase().includes('assistant') &&
                                    responseText.length < 200 && 
                                    messages.length === 0
            
            if (!isGenericGreeting) {
              // Handle agent response from agent_response_event structure
              const agentMessage: ChatMessage = {
                id: `agent-${Date.now()}`,
                type: 'agent',
                text: responseText,
                timestamp: new Date()
              }
              setMessages(prev => [...prev, agentMessage])
            }
            setIsWaitingForResponse(false)
          } else if (data.type === 'agent_response' && data.agent_response) {
            const responseText = data.agent_response
            
            // Filter out generic greeting messages for better UX
            const isGenericGreeting = responseText.toLowerCase().includes('knowledge') && 
                                    responseText.toLowerCase().includes('assistant') &&
                                    responseText.length < 200 && 
                                    messages.length === 0
            
            if (!isGenericGreeting) {
              // Handle direct agent response structure
              const agentMessage: ChatMessage = {
                id: `agent-${Date.now()}`,
                type: 'agent',
                text: responseText,
                timestamp: new Date()
              }
              setMessages(prev => [...prev, agentMessage])
            }
            setIsWaitingForResponse(false)
          } else if (data.type === 'user_transcript' && data.user_transcript) {
            // Handle user transcript (if needed)
            console.log('User transcript:', data.user_transcript)
          } else {
            console.log('Unhandled message type:', data.type, data)
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error)
          setIsWaitingForResponse(false)
        }
      }

      websocket.onerror = (error) => {
        console.error('Chat WebSocket error:', error)
        setError('Connection error occurred')
        onError?.('WebSocket connection error')
        reject(error)
      }

      websocket.onclose = (event) => {
        console.log('Chat WebSocket closed:', event.code, event.reason)
        setIsConnected(false)
        setIsConnecting(false)
        setIsWaitingForResponse(false)
        onStatusChange?.('disconnected')
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current)
          heartbeatIntervalRef.current = null
        }
        
        if (event.code !== 1000) { // Not a normal closure
          setError('Connection lost')
          onError?.('Connection lost')
          // Attempt a light reconnect once
          setTimeout(() => {
            if (!isConnected && !isConnecting) {
              startChatSession().catch(() => {})
            }
          }, 1000)
        }
      }
    })
  }

  const startOpenAIChatSession = async () => {
    try {
      setIsConnecting(true)
      setError(null)
      onStatusChange?.('connecting')

      const response = await fetch(`${API_URL}/openai-chat/session/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ expert_id: expertId })
      })

      if (!response.ok) {
        throw new Error(`Failed to create session: ${response.statusText}`)
      }

      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to create session')
      }

      setSessionId(data.session_id)
      setIsConnected(true)
      setIsConnecting(false)
      setMessages([])
      onStatusChange?.('connected')
      
      console.log('✅ OpenAI chat session created:', data.session_id)

    } catch (error: any) {
      console.error('Error creating OpenAI session:', error)
      setError(error.message || 'Failed to create session')
      onError?.(error.message || 'Failed to create session')
      setIsConnecting(false)
      onStatusChange?.('disconnected')
    }
  }

  const startChatSession = async () => {
    // Use OpenAI for text-only mode, ElevenLabs for voice
    if (textOnly) {
      return startOpenAIChatSession()
    }

    try {
      setIsConnecting(true)
      setError(null)

      // Create chat session
      const sessionData = await createChatSession()
      setConversationId(sessionData.conversation_id)

      // Connect WebSocket
      const websocket = await connectWebSocket(sessionData.signed_url)
      setWs(websocket)

      // Clear messages - no initial greeting, direct conversation
      setMessages([])
      
      // Send a silent initialization message to prepare the agent
      // This helps avoid the generic greeting response
      setTimeout(() => {
        if (websocket.readyState === WebSocket.OPEN) {
          websocket.send(JSON.stringify({
            type: 'conversation_initiation',
            mode: 'direct'
          }))
        }
      }, 500)

    } catch (error: any) {
      console.error('Failed to start chat session:', error)
      setError(error.message || 'Failed to start chat session')
      onError?.(error.message || 'Failed to start chat session')
      setIsConnecting(false)
      onStatusChange?.('disconnected')
    }
  }

  const endOpenAIChatSession = async () => {
    if (!sessionId) return

    try {
      await fetch(`${API_URL}/openai-chat/session/end`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ session_id: sessionId })
      })
    } catch (error) {
      console.error('Error ending OpenAI session:', error)
    }

    setSessionId(null)
    setIsConnected(false)
    setIsConnecting(false)
    setIsWaitingForResponse(false)
    setMessages([])
    onStatusChange?.('disconnected')
  }

  const endChatSession = () => {
    // Use OpenAI for text-only mode, ElevenLabs for voice
    if (textOnly && sessionId) {
      endOpenAIChatSession()
      return
    }

    if (ws) {
      ws.close(1000, 'User ended session')
      setWs(null)
    }
    setIsConnected(false)
    setIsConnecting(false)
    setIsWaitingForResponse(false)
    setConversationId(null)
    onStatusChange?.('disconnected')
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current)
      heartbeatIntervalRef.current = null
    }
  }

  const sendOpenAIMessage = async () => {
    if (!inputText.trim() || !sessionId || !isConnected || isWaitingForResponse) return

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      type: 'user',
      text: inputText.trim(),
      timestamp: new Date()
    }

    // Add user message to chat
    setMessages(prev => [...prev, userMessage])
    setIsWaitingForResponse(true)
    const messageText = inputText.trim()
    setInputText('')

    try {
      const response = await fetch(`${API_URL}/openai-chat/message/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session_id: sessionId,
          message: messageText,
          model: 'gpt-4o-mini'
        })
      })

      if (!response.ok) {
        throw new Error(`Failed to send message: ${response.statusText}`)
      }

      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to get response')
      }

      console.log('📚 Response data:', data)
      console.log('📄 Sources received:', data.sources)

      // Add agent response
      const agentMessage: ChatMessage = {
        id: `agent-${Date.now()}`,
        type: 'agent',
        text: data.response,
        timestamp: new Date(),
        toolCalls: data.tool_calls_made,
        sources: data.sources || []
      }
      
      console.log('💬 Agent message with sources:', agentMessage)

      setMessages(prev => [...prev, agentMessage])
      setIsWaitingForResponse(false)

    } catch (error: any) {
      console.error('Error sending OpenAI message:', error)
      setError('Failed to send message')
      onError?.('Failed to send message')
      setIsWaitingForResponse(false)
    }

    inputRef.current?.focus()
  }

  const sendMessage = () => {
    // Use OpenAI for text-only mode, ElevenLabs for voice
    if (textOnly && sessionId) {
      sendOpenAIMessage()
      return
    }

    if (!inputText.trim() || !ws || !isConnected || isWaitingForResponse) return

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      type: 'user',
      text: inputText.trim(),
      timestamp: new Date()
    }

    // Add user message to chat
    setMessages(prev => [...prev, userMessage])
    setIsWaitingForResponse(true)

    // Send message through WebSocket
    try {
      ws.send(JSON.stringify({
        type: 'user_message',
        text: inputText.trim()
      }))
    } catch (error) {
      console.error('Error sending message:', error)
      setError('Failed to send message')
      onError?.('Failed to send message')
      setIsWaitingForResponse(false)
    }

    setInputText('')
    inputRef.current?.focus()
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
    // Allow Shift+Enter for new lines in multiline input
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    // Only allow manual typing when not listening
    if (!isListening) {
      setInputText(e.target.value)
      
      // Auto-resize textarea
      const textarea = e.target
      textarea.style.height = 'auto'
      textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px'
    }
  }

  const startListening = async () => {
    if (recognitionRef.current && speechSupported) {
      try {
        // Check microphone permission first like in the demo
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

  const clearChat = () => {
    setMessages([])
  }

  const formatTime = (timestamp: Date) => {
    return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <Card className={`flex flex-col h-full max-h-full ${className}`}>
      <CardHeader className="flex-shrink-0 pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <MessageCircle className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-lg">Chat Mode</CardTitle>
            {textOnly && (
              <Badge variant="secondary" className="text-xs">
                Text Only
              </Badge>
            )}
          </div>
          
          {/* Connection Status */}
          <div className="flex items-center space-x-2">
            {isConnecting && <Loader2 className="h-4 w-4 animate-spin text-blue-500" />}
            {isConnected && <Wifi className="h-4 w-4 text-green-500" />}
            {!isConnected && !isConnecting && <WifiOff className="h-4 w-4 text-gray-400" />}
            <span className={`text-sm font-medium ${
              isConnected ? 'text-green-600' : 
              isConnecting ? 'text-blue-600' : 
              'text-gray-500'
            }`}>
              {isConnecting ? 'Connecting...' : isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>

        {/* Expert Info */}
        <div className="text-sm text-gray-600">
          Chatting with <span className="font-medium">{expertName}</span>
          {conversationId && (
            <span className="ml-2 text-xs text-gray-400">
              Session: {conversationId.slice(-8)}
            </span>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex flex-col flex-1 p-4 min-h-0 overflow-hidden">
        {/* Error Display */}
        {error && (
          <div className="flex items-center justify-between bg-red-50 border border-red-200 rounded-md p-3 mb-4">
            <span className="text-sm text-red-600">{error}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setError(null)}
              className="h-6 w-6 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto space-y-3 min-h-0 mb-4">
          {messages.length === 0 && !isConnected && (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-3">
              <MessageSquare className="h-12 w-12 text-gray-300" />
              <div>
                <p className="text-gray-500 font-medium">Ready to help you</p>
                <p className="text-sm text-gray-400">
                  Connect and ask {expertName} anything directly
                </p>
              </div>
            </div>
          )}
          
          {messages.length === 0 && isConnected && (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-3">
              {expertAvatarUrl ? (
                <img
                  src={expertAvatarUrl}
                  alt={expertName}
                  className="h-12 w-12 rounded-full object-cover"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                />
              ) : (
                <Bot className="h-12 w-12 text-blue-500" />
              )}
              <div>
                <p className="text-gray-700 font-medium">Ask me anything!</p>
                <p className="text-sm text-gray-500">
                  I'm ready to help with your questions about {expertName.toLowerCase()}
                </p>
              </div>
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`group max-w-[80%] rounded-lg px-3 py-2 ${
                  message.type === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                <div className="flex items-start space-x-2">
                  {message.type === 'agent' && (
                    <>
                      {expertAvatarUrl ? (
                        <img
                          src={expertAvatarUrl}
                          alt={expertName}
                          className="h-6 w-6 rounded-full object-cover flex-shrink-0"
                          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                        />
                      ) : (
                        <Bot className="h-6 w-6 flex-shrink-0" />
                      )}
                    </>
                  )}
                  {message.type === 'user' && (
                    <User className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  )}
                  <div className="flex-1">
                    <div className={`text-sm prose prose-sm max-w-none ${
                      message.type === 'user' 
                        ? 'prose-invert prose-headings:text-white prose-p:text-white prose-strong:text-white prose-li:text-white prose-code:text-blue-100' 
                        : 'prose-gray prose-headings:text-gray-900 prose-p:text-gray-900'
                    }`}>
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {message.text}
                      </ReactMarkdown>
                    </div>
                    
                    {/* Show tool calls if any (OpenAI knowledge base search) */}
                    {message.toolCalls && message.toolCalls.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-gray-300">
                        <p className="text-xs text-gray-600 flex items-center gap-1">
                          <MessageSquare className="h-3 w-3" />
                          Searched knowledge base: {message.toolCalls[0].results_count} results found
                        </p>
                      </div>
                    )}
                    
                    {/* Show citations if sources were used */}
                    {message.sources && message.sources.length > 0 && (
                      <div className="mt-2">
                        <button
                          onClick={() => {
                            const newExpanded = new Set(expandedCitations)
                            if (newExpanded.has(message.id)) {
                              newExpanded.delete(message.id)
                            } else {
                              newExpanded.add(message.id)
                            }
                            setExpandedCitations(newExpanded)
                          }}
                          className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-gray-900 transition-colors py-1"
                        >
                          <FileText className="h-3.5 w-3.5" />
                          <span className="font-medium">Citations</span>
                          {expandedCitations.has(message.id) ? (
                            <ChevronUp className="h-3.5 w-3.5" />
                          ) : (
                            <ChevronDown className="h-3.5 w-3.5" />
                          )}
                        </button>
                        
                        {expandedCitations.has(message.id) && (
                          <div className="mt-2 bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                            <div className="divide-y divide-gray-100">
                              {message.sources.map((source, idx) => (
                                <div 
                                  key={idx}
                                  className="group p-3 hover:bg-gray-50 transition-colors"
                                >
                                  <div className="flex items-start justify-between gap-2 mb-1">
                                    <div className="flex-1">
                                      <span className="text-xs font-medium text-gray-900">
                                        {source.source}
                                      </span>
                                    </div>
                                  </div>
                                  {source.text && (
                                    <div className="text-xs text-gray-600 leading-relaxed mt-1.5 line-clamp-2">
                                      {source.text}...
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between mt-1">
                      <p className={`text-xs ${
                        message.type === 'user' ? 'text-blue-200' : 'text-gray-500'
                      }`}>
                        {formatTime(message.timestamp)}
                      </p>
                      <CopyButton text={message.text} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
          
          {/* Loading indicator when waiting for response */}
          {isWaitingForResponse && (
            <div className="flex items-center gap-3">
              {expertAvatarUrl ? (
                <img
                  src={expertAvatarUrl}
                  alt={expertName}
                  className="h-8 w-8 rounded-full object-cover"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                />
              ) : (
                <Bot className="h-8 w-8 text-gray-500" />
              )}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <div className="w-2.5 h-2.5 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2.5 h-2.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.12s' }}></div>
                  <div className="w-2.5 h-2.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.24s' }}></div>
                </div>
                <span className="text-sm text-gray-500">Typing...</span>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Chat Controls */}
        <div className="flex-shrink-0 space-y-3">
          {/* Connection Controls */}
          <div className="flex space-x-2">
            {!isConnected ? (
              <Button
                onClick={startChatSession}
                disabled={isConnecting}
                className="flex-1"
              >
                {isConnecting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <MessageSquare className="h-4 w-4 mr-2" />
                )}
                {isConnecting ? 'Connecting...' : 'Start Chat'}
              </Button>
            ) : (
              <>
                <Button
                  onClick={endChatSession}
                  variant="destructive"
                  className="flex-1"
                >
                  End Chat
                </Button>
                <Button
                  onClick={clearChat}
                  variant="outline"
                  size="sm"
                >
                  Clear
                </Button>
              </>
            )}
          </div>

          {/* Message Input */}
          {isConnected && (
            <div className="flex space-x-2">
              <Textarea
                ref={inputRef}
                value={inputText}
                onChange={handleInputChange}
                onKeyPress={handleKeyPress}
                placeholder={isListening ? "🎤 Listening... speak now" : "Ask me anything directly... (Shift+Enter for new line)"}
                disabled={!isConnected}
                className={`flex-1 min-h-[40px] max-h-[120px] resize-none ${isListening ? 'ring-2 ring-blue-500 bg-blue-50' : ''}`}
                rows={1}
              />
              {speechSupported && (
                <Button
                  onClick={toggleListening}
                  disabled={!isConnected}
                  size="sm"
                  variant={isListening ? "destructive" : "outline"}
                  className={isListening ? "animate-pulse" : ""}
                  title={isListening ? "Stop listening" : "Start voice input"}
                >
                  {isListening ? (
                    <MicOff className="h-4 w-4" />
                  ) : (
                    <Mic className="h-4 w-4" />
                  )}
                </Button>
              )}
              <Button
                onClick={sendMessage}
                disabled={!inputText.trim() || !isConnected || isWaitingForResponse}
                size="sm"
              >
                {isWaitingForResponse ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          )}
        </div>

        {/* Speech Error Display */}
        {speechError && (
          <div className="text-xs text-red-500 text-center py-1">
            {speechError}
          </div>
        )}

        {/* Info Text */}
        <div className="text-xs pt-1 text-gray-500 text-center">
          {isConnected ? (
            textOnly ? (
              <span className="text-green-600">
                ✅ Using OpenAI with knowledge base search • Cost-effective mode
              </span>
            ) : (
              <span className="text-green-600">
                ✅ Connected via ElevenLabs
              </span>
            )
          {isListening ? (
            <span className="text-blue-600 animate-pulse">
              🎤 Listening... Speak now
            </span>
          ) : isConnected ? (
            <span className="text-green-600">
              ✅ Connected {speechSupported && '• Voice input available'}
            </span>
          ) : (
            <span>
              Only fully processed documents (✓ Completed status) will be used to answer your questions
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default ChatModeInterface
