'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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
  X
} from 'lucide-react'

interface ChatMessage {
  id: string
  type: 'user' | 'agent'
  text: string
  timestamp: Date
}

interface ChatModeInterfaceProps {
  expertId: string
  expertName?: string
  textOnly?: boolean
  onError?: (error: string) => void
  onStatusChange?: (status: 'disconnected' | 'connecting' | 'connected') => void
  className?: string
}

const ChatModeInterface: React.FC<ChatModeInterfaceProps> = ({
  expertId,
  expertName = 'AI Agent',
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
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const createChatSession = async () => {
    try {
      setIsConnecting(true)
      setError(null)
      onStatusChange?.('connecting')

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

  const connectWebSocket = (signedUrl: string) => {
    return new Promise<WebSocket>((resolve, reject) => {
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
        
        if (event.code !== 1000) { // Not a normal closure
          setError('Connection lost')
          onError?.('Connection lost')
        }
      }
    })
  }

  const startChatSession = async () => {
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

  const endChatSession = () => {
    if (ws) {
      ws.close(1000, 'User ended session')
      setWs(null)
    }
    setIsConnected(false)
    setIsConnecting(false)
    setIsWaitingForResponse(false)
    setConversationId(null)
    onStatusChange?.('disconnected')
  }

  const sendMessage = () => {
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
  }

  const clearChat = () => {
    setMessages([])
  }

  const formatTime = (timestamp: Date) => {
    return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <Card className={`flex flex-col h-full ${className}`}>
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

      <CardContent className="flex flex-col flex-1 p-4 space-y-4">
        {/* Error Display */}
        {error && (
          <div className="flex items-center justify-between bg-red-50 border border-red-200 rounded-md p-3">
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
        <div className="flex-1 overflow-y-auto space-y-3 min-h-0">
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
              <Bot className="h-12 w-12 text-blue-500" />
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
                className={`max-w-[80%] rounded-lg px-3 py-2 ${
                  message.type === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                <div className="flex items-start space-x-2">
                  {message.type === 'agent' && (
                    <Bot className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  )}
                  {message.type === 'user' && (
                    <User className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  )}
                  <div className="flex-1">
                    <p className="text-sm whitespace-pre-wrap">{message.text}</p>
                    <p className={`text-xs mt-1 ${
                      message.type === 'user' ? 'text-blue-200' : 'text-gray-500'
                    }`}>
                      {formatTime(message.timestamp)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
          
          {/* Loading indicator when waiting for response */}
          {isWaitingForResponse && (
            <div className="flex justify-start">
              <div className="bg-gray-100 rounded-lg px-3 py-2">
                <div className="flex items-center space-x-2">
                  <Bot className="h-4 w-4 text-gray-500" />
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                  <span className="text-xs text-gray-500">Thinking...</span>
                </div>
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
              <Input
                ref={inputRef}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask me anything directly..."
                disabled={!isConnected}
                className="flex-1"
              />
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

        {/* Info Text */}
        <div className="text-xs text-gray-500 text-center">
          {isConnected ? (
            <span className="text-green-600">
              ✅ Text-only chat active • 25x higher concurrency limits
            </span>
          ) : (
            <span>
              Chat mode provides text-only conversations with enhanced performance
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default ChatModeInterface
