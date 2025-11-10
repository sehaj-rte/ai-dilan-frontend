'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { API_URL } from '@/lib/config'
import { 
  MessageSquare, 
  Send, 
  Loader2, 
  MessageCircle,
  Bot,
  User,
  X,
  Copy,
  Check,
  Sparkles
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
}

interface OpenAIChatInterfaceProps {
  expertId: string
  expertName?: string
  expertAvatarUrl?: string
  onError?: (error: string) => void
  className?: string
  model?: string // OpenAI model to use
}

// Copy Button Component
const CopyButton: React.FC<{ text: string }> = ({ text }) => {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
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

const OpenAIChatInterface: React.FC<OpenAIChatInterfaceProps> = ({
  expertId,
  expertName = 'AI Agent',
  expertAvatarUrl,
  onError,
  className = '',
  model = 'gpt-4o-mini'
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputText, setInputText] = useState('')
  const [isConnected, setIsConnected] = useState(false)
  const [isWaitingForResponse, setIsWaitingForResponse] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const createSession = async () => {
    try {
      setError(null)
      
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
      setMessages([])
      
      console.log('✅ OpenAI chat session created:', data.session_id)

    } catch (error: any) {
      console.error('Error creating session:', error)
      setError(error.message || 'Failed to create session')
      onError?.(error.message || 'Failed to create session')
    }
  }

  const endSession = async () => {
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
      console.error('Error ending session:', error)
    }

    setSessionId(null)
    setIsConnected(false)
    setMessages([])
  }

  const sendMessage = async () => {
    if (!inputText.trim() || !sessionId || isWaitingForResponse) return

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      type: 'user',
      text: inputText.trim(),
      timestamp: new Date()
    }

    // Add user message to chat
    setMessages(prev => [...prev, userMessage])
    const messageText = inputText.trim()
    setInputText('')

    try {
      // Create streaming agent message placeholder
      const agentMessageId = `agent-${Date.now()}`
      const agentMessage: ChatMessage = {
        id: agentMessageId,
        type: 'agent',
        text: 'Thinking...',
        timestamp: new Date()
      }
      
      setMessages(prev => [...prev, agentMessage])
      setIsWaitingForResponse(false)

      // Use streaming endpoint
      const response = await fetch(`${API_URL}/openai-chat/message/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session_id: sessionId,
          message: messageText,
          model: model
        })
      })

      if (!response.ok) {
        throw new Error(`Failed to send message: ${response.statusText}`)
      }

      // Process streaming response
      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('Response body is not readable')
      }

      const decoder = new TextDecoder()
      let fullResponse = ''
      let toolCalls: any[] = []
      let buffer = ''
      let firstContentReceived = false

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (!line.trim()) continue
          
          if (line.startsWith('data: ')) {
            try {
              const jsonStr = line.slice(6).trim()
              if (!jsonStr) continue
              
              const data = JSON.parse(jsonStr)
              
              if (data.type === 'content') {
                fullResponse += data.data
                
                // Clear "Thinking..." on first content
                if (!firstContentReceived) {
                  firstContentReceived = true
                  fullResponse = data.data
                }
                
                setMessages(prev => prev.map(msg => 
                  msg.id === agentMessageId 
                    ? { ...msg, text: fullResponse }
                    : msg
                ))
              } else if (data.type === 'done') {
                toolCalls = data.data.tool_calls_made || []
                setMessages(prev => prev.map(msg => 
                  msg.id === agentMessageId 
                    ? { ...msg, text: fullResponse, toolCalls }
                    : msg
                ))
              } else if (data.type === 'error') {
                throw new Error(data.data.message || 'Streaming error')
              }
            } catch (e) {
              console.error('Error parsing SSE:', e)
            }
          }
        }
      }

    } catch (error: any) {
      console.error('Error sending message:', error)
      setError('Failed to send message')
      onError?.('Failed to send message')
      setIsWaitingForResponse(false)
    }

    inputRef.current?.focus()
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const clearChat = async () => {
    if (!sessionId) return

    try {
      await fetch(`${API_URL}/openai-chat/session/clear`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ session_id: sessionId })
      })
      setMessages([])
    } catch (error) {
      console.error('Error clearing chat:', error)
    }
  }

  const formatTime = (timestamp: Date) => {
    return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <Card className={`flex flex-col h-full max-h-full ${className}`}>
      <CardHeader className="flex-shrink-0 pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Sparkles className="h-5 w-5 text-purple-600" />
            <CardTitle className="text-lg">OpenAI Chat</CardTitle>
            <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-700">
              Powered by {model}
            </Badge>
          </div>
          
          {/* Connection Status */}
          <div className="flex items-center space-x-2">
            <span className={`text-sm font-medium ${
              isConnected ? 'text-green-600' : 'text-gray-500'
            }`}>
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>

        {/* Expert Info */}
        <div className="text-sm text-gray-600">
          Chatting with <span className="font-medium">{expertName}</span>
          {sessionId && (
            <span className="ml-2 text-xs text-gray-400">
              Session: {sessionId.slice(-8)}
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
                  Start a chat with {expertName}
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
                <Bot className="h-12 w-12 text-purple-500" />
              )}
              <div>
                <p className="text-gray-700 font-medium">Ask me anything!</p>
                <p className="text-sm text-gray-500">
                  I can search your knowledge base to provide accurate answers
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
                    ? 'bg-purple-600 text-white'
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
                    <p className="text-sm whitespace-pre-wrap">{message.text}</p>
                    
                    {/* Show tool calls if any */}
                    {message.toolCalls && message.toolCalls.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-gray-300">
                        <p className="text-xs text-gray-600 flex items-center gap-1">
                          <Sparkles className="h-3 w-3" />
                          Searched knowledge base: {message.toolCalls[0].results_count} results found
                        </p>
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between mt-1">
                      <p className={`text-xs ${
                        message.type === 'user' ? 'text-purple-200' : 'text-gray-500'
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
                  <div className="w-2.5 h-2.5 bg-purple-400 rounded-full animate-bounce"></div>
                  <div className="w-2.5 h-2.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.12s' }}></div>
                  <div className="w-2.5 h-2.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.24s' }}></div>
                </div>
                <span className="text-sm text-gray-500">Thinking...</span>
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
                onClick={createSession}
                className="flex-1 bg-purple-600 hover:bg-purple-700"
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Start Chat
              </Button>
            ) : (
              <>
                <Button
                  onClick={endSession}
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
                placeholder="Ask me anything..."
                disabled={!isConnected}
                className="flex-1"
              />
              <Button
                onClick={sendMessage}
                disabled={!inputText.trim() || !isConnected || isWaitingForResponse}
                size="sm"
                className="bg-purple-600 hover:bg-purple-700"
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
        <div className="text-xs pt-1 text-gray-500 text-center">
          {isConnected ? (
            <span className="text-green-600">
              ✅ Using OpenAI {model} • Knowledge base search enabled
            </span>
          ) : (
            <span>
              Cost-effective chat powered by OpenAI with automatic knowledge base search
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default OpenAIChatInterface
