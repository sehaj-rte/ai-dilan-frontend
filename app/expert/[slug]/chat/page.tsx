'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSelector, useDispatch } from 'react-redux'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { API_URL } from '@/lib/config'
import { Send, Plus, MessageSquare, MoreHorizontal, X, ArrowLeft, User, LogIn, LogOut } from 'lucide-react'
import { RootState } from '@/store/store'
import { logout, loadUserFromStorage } from '@/store/slices/authSlice'

interface ChatMessage {
  id: string
  type: 'user' | 'agent'
  text: string
  timestamp: Date
}

interface Conversation {
  id: string
  title: string
  timestamp: Date
  messages: ChatMessage[]
}

interface Publication {
  primary_color: string
  secondary_color: string
  theme: string
}

const ExpertChatPage = () => {
  const params = useParams()
  const router = useRouter()
  const dispatch = useDispatch()
  const slug = params.slug as string
  
  const convertS3UrlToProxy = (s3Url: string): string => {
    if (!s3Url) return s3Url as any
    const match = s3Url.match(/https:\/\/ai-dilan\.s3\.[^/]+\.amazonaws\.com\/(.+)/)
    if (match) {
      return `${API_URL}/images/avatar/full/${match[1]}`
    }
    return s3Url
  }

  // Auth state from Redux
  const { user, isAuthenticated } = useSelector((state: RootState) => state.auth)
  
  const [expert, setExpert] = useState<any>(null)
  const [publication, setPublication] = useState<Publication | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputText, setInputText] = useState('')
  const [ws, setWs] = useState<WebSocket | null>(null)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [currentConvId, setCurrentConvId] = useState<string | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [isLoadingExpert, setIsLoadingExpert] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [isWaitingForResponse, setIsWaitingForResponse] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [reconnectAttempts, setReconnectAttempts] = useState(0)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Load user from storage on mount
  useEffect(() => {
    dispatch(loadUserFromStorage())
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current)
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [])

  // Auto-connect when expert is loaded
  useEffect(() => {
    const loadExpert = async () => {
      try {
        setIsLoadingExpert(true)
        const res = await fetch(`${API_URL}/publishing/public/expert/${slug}`)
        const data = await res.json()
        if (data.success) {
          setExpert({
            ...data.expert,
            avatar_url: data.expert?.avatar_url ? convertS3UrlToProxy(data.expert.avatar_url) : null
          })
          setPublication(data.publication)
          loadConversations(data.expert.id)
          // Auto-connect immediately
          await startNewChat(data.expert.id)
          setIsLoadingExpert(false)
        } else {
          setLoadError(true)
          setIsLoadingExpert(false)
        }
      } catch (error) {
        console.error('Failed to load expert:', error)
        setLoadError(true)
        setIsLoadingExpert(false)
      }
    }
    loadExpert()
  }, [slug])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Reload conversations when user authentication changes
  useEffect(() => {
    if (expert) {
      loadConversations(expert.id)
    }
  }, [isAuthenticated, user, expert])

  const loadConversations = (expertId: string) => {
    // Only load conversations if user is authenticated
    if (!isAuthenticated || !user) {
      setConversations([])
      return
    }
    
    const storageKey = `chat_history_${user.id}_${expertId}`
    const stored = localStorage.getItem(storageKey)
    if (stored) {
      const parsed = JSON.parse(stored)
      setConversations(parsed.map((c: any) => ({
        ...c,
        timestamp: new Date(c.timestamp),
        messages: c.messages?.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) })) || []
      })))
    }
  }

  const saveConversations = (convos: Conversation[]) => {
    // Only save conversations if user is authenticated
    if (!isAuthenticated || !user || !expert) return
    
    const storageKey = `chat_history_${user.id}_${expert.id}`
    localStorage.setItem(storageKey, JSON.stringify(convos))
  }

  const handleLogout = () => {
    dispatch(logout())
    setConversations([])
    setMessages([])
  }

  const startNewChat = async (expertId?: string) => {
    const id = expertId || expert?.id
    if (!id) return
    
    setIsConnecting(true)
    setMessages([])
    setCurrentConvId(null)
    
    try {
      const res = await fetch(`${API_URL}/conversation/chat-session/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ overrides: { conversation: { text_only: true } } })
      })
      const data = await res.json()
      if (data.success) {
        connectWS(data.signed_url, data.conversation_id)
      }
    } catch (error) {
      console.error('Failed to start chat:', error)
      setIsConnecting(false)
    }
  }

  const connectWS = (url: string, convId: string) => {
    // Clear any existing connection
    if (wsRef.current) {
      wsRef.current.close()
    }
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current)
    }

    const websocket = new WebSocket(url)
    wsRef.current = websocket
    
    websocket.onopen = () => {
      console.log('WebSocket connected')
      setIsConnected(true)
      setIsConnecting(false)
      setCurrentConvId(convId)
      setReconnectAttempts(0)
      
      // Start heartbeat to keep connection alive
      heartbeatIntervalRef.current = setInterval(() => {
        if (websocket.readyState === WebSocket.OPEN) {
          try {
            websocket.send(JSON.stringify({ type: 'ping' }))
          } catch (error) {
            console.error('Heartbeat failed:', error)
          }
        }
      }, 30000) // Send ping every 30 seconds
      
      // Trigger the agent to send its first greeting message
      setTimeout(() => {
        if (websocket.readyState === WebSocket.OPEN) {
          // Send empty message to trigger agent's first response (greeting)
          websocket.send(JSON.stringify({ 
            type: 'conversation_initiation',
            mode: 'greeting'
          }))
        }
      }, 500)
    }
    
    websocket.onmessage = (e) => {
      try {
        const d = JSON.parse(e.data)
        
        // Ignore audio and pong messages
        if (d.type === 'audio' || d.type === 'pong') return
        
        if (d.type === 'agent_response' && d.agent_response_event?.agent_response) {
          const text = d.agent_response_event.agent_response
          
          // Check if this is a greeting message
          const lowerText = text.toLowerCase()
          const isGreeting = (lowerText.includes('hi') || lowerText.includes('hello')) && 
                            (lowerText.includes('how can i') || lowerText.includes('assist') || lowerText.includes('help you')) &&
                            text.length < 200
          
          // ALWAYS show the first message (greeting)
          // Skip greeting messages ONLY if there are already messages
          if (messages.length === 0) {
            // First message - always show it (this is the greeting)
            addMessage('agent', text)
          } else if (!isGreeting) {
            // Subsequent messages - only show if it's NOT a greeting
            addMessage('agent', text)
          }
          // If messages.length > 0 AND isGreeting = true, skip it (don't show duplicate greeting)
          
          setIsWaitingForResponse(false)
        } else if (d.type === 'agent_response' && d.agent_response) {
          const text = d.agent_response
          
          // Check if this is a greeting message
          const lowerText = text.toLowerCase()
          const isGreeting = (lowerText.includes('hi') || lowerText.includes('hello')) && 
                            (lowerText.includes('how can i') || lowerText.includes('assist') || lowerText.includes('help you')) &&
                            text.length < 200
          
          // ALWAYS show the first message (greeting)
          // Skip greeting messages ONLY if there are already messages
          if (messages.length === 0) {
            // First message - always show it (this is the greeting)
            addMessage('agent', text)
          } else if (!isGreeting) {
            // Subsequent messages - only show if it's NOT a greeting
            addMessage('agent', text)
          }
          // If messages.length > 0 AND isGreeting = true, skip it (don't show duplicate greeting)
          
          setIsWaitingForResponse(false)
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error)
      }
    }
    
    websocket.onerror = (error) => {
      console.error('WebSocket error:', error)
      setIsWaitingForResponse(false)
    }
    
    websocket.onclose = (event) => {
      console.log('WebSocket closed:', event.code, event.reason)
      setIsConnected(false)
      setIsConnecting(false)
      setIsWaitingForResponse(false)
      
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current)
      }
      
      // Attempt to reconnect if not a normal closure and under max attempts
      if (event.code !== 1000 && reconnectAttempts < 5) {
        console.log(`Attempting to reconnect... (${reconnectAttempts + 1}/5)`)
        setReconnectAttempts(prev => prev + 1)
        
        reconnectTimeoutRef.current = setTimeout(() => {
          if (expert?.id) {
            startNewChat(expert.id)
          }
        }, Math.min(1000 * Math.pow(2, reconnectAttempts), 10000)) // Exponential backoff, max 10s
      }
    }
    
    setWs(websocket)
  }

  const addMessage = (type: 'user' | 'agent', text: string) => {
    const msg: ChatMessage = {
      id: Date.now().toString(),
      type,
      text,
      timestamp: new Date()
    }
    setMessages(prev => [...prev, msg])
  }

  const sendMsg = () => {
    if (!inputText.trim() || !ws || !isConnected || isWaitingForResponse) return
    
    // Check WebSocket state before sending
    if (ws.readyState !== WebSocket.OPEN) {
      console.error('WebSocket is not open. Current state:', ws.readyState)
      setIsConnected(false)
      return
    }
    
    try {
      setIsWaitingForResponse(true)
      ws.send(JSON.stringify({ type: 'user_message', text: inputText }))
      addMessage('user', inputText)
      
      // Save to conversation history (only save first user message as title)
      if (currentConvId && messages.length <= 1) { // 1 because greeting message exists
        const newConv: Conversation = {
          id: currentConvId,
          title: inputText.substring(0, 30) + (inputText.length > 30 ? '...' : ''),
          timestamp: new Date(),
          messages: [{ id: Date.now().toString(), type: 'user', text: inputText, timestamp: new Date() }]
        }
        const updated = [newConv, ...conversations]
        setConversations(updated)
        saveConversations(updated)
      }
      
      setInputText('')
    } catch (error) {
      console.error('Error sending message:', error)
      setIsWaitingForResponse(false)
      setIsConnected(false)
    }
  }

  const loadConversation = (conv: Conversation) => {
    setMessages(conv.messages)
    setCurrentConvId(conv.id)
  }

  const groupConversations = () => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    const last7days = new Date(today)
    last7days.setDate(last7days.getDate() - 7)

    return {
      today: conversations.filter(c => c.timestamp >= today),
      yesterday: conversations.filter(c => c.timestamp >= yesterday && c.timestamp < today),
      last7days: conversations.filter(c => c.timestamp >= last7days && c.timestamp < yesterday),
      older: conversations.filter(c => c.timestamp < last7days)
    }
  }

  const grouped = groupConversations()

  // Apply theme colors
  const primaryColor = publication?.primary_color || '#3B82F6'
  const secondaryColor = publication?.secondary_color || '#1E40AF'

  // Show loading screen while loading expert or connecting
  if (isLoadingExpert || (isConnecting && !isConnected)) {
    return (
      <div className="flex h-screen items-center justify-center bg-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            {isLoadingExpert ? 'Loading expert...' : `Connecting to ${expert?.name || 'expert'}...`}
          </h2>
          <p className="text-gray-500">Please wait while we establish the connection</p>
        </div>
      </div>
    )
  }

  // Show error screen if failed to load
  if (loadError) {
    return (
      <div className="flex h-screen items-center justify-center bg-white">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Failed to load expert</h2>
          <p className="text-gray-500 mb-4">The expert could not be found or is not published</p>
          <Button onClick={() => router.push(`/expert/${slug}`)} className="bg-gray-900 hover:bg-gray-800">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Profile
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar - Hidden for now */}
      <div className="w-64 bg-gray-900 text-white flex-col hidden">
        <div className="p-3 border-b border-gray-700">
          <Button 
            onClick={() => startNewChat()} 
            className="w-full text-white border"
            style={{ 
              backgroundColor: 'transparent', 
              borderColor: primaryColor 
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = primaryColor}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <Plus className="mr-2 h-4 w-4" />
            New Conversation
          </Button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          {!isAuthenticated ? (
            <div className="text-center p-4 text-gray-400 text-sm">
              <LogIn className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="mb-2">Login to save your chat history</p>
              <Button
                onClick={() => router.push('/auth/login')}
                size="sm"
                className="w-full"
                style={{ backgroundColor: primaryColor }}
              >
                Login / Sign Up
              </Button>
            </div>
          ) : (
            <>
              {grouped.today.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-gray-400 mb-2 px-2">Today</div>
                  {grouped.today.map(c => (
                    <div
                      key={c.id}
                      onClick={() => loadConversation(c)}
                      className={`p-2 rounded cursor-pointer hover:bg-gray-800 flex items-center ${currentConvId === c.id ? '' : ''}`}
                      style={currentConvId === c.id ? { backgroundColor: primaryColor + '40' } : {}}
                    >
                      <MessageSquare className="h-4 w-4 mr-2 flex-shrink-0" />
                      <span className="text-sm truncate">{c.title}</span>
                    </div>
                  ))}
                </div>
              )}
              
              {grouped.yesterday.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-gray-400 mb-2 px-2">Yesterday</div>
                  {grouped.yesterday.map(c => (
                    <div
                      key={c.id}
                      onClick={() => loadConversation(c)}
                      className={`p-2 rounded cursor-pointer hover:bg-gray-800 flex items-center ${currentConvId === c.id ? '' : ''}`}
                      style={currentConvId === c.id ? { backgroundColor: primaryColor + '40' } : {}}
                    >
                      <MessageSquare className="h-4 w-4 mr-2 flex-shrink-0" />
                      <span className="text-sm truncate">{c.title}</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
        
        <div className="p-3 border-t border-gray-700">
          <Button
            onClick={() => router.push(`/expert/${slug}`)}
            variant="ghost"
            className="w-full text-white hover:bg-gray-800"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Profile
          </Button>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-white">
        {/* Header */}
        <div className="border-b bg-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {expert?.avatar_url ? (
              <img 
                src={expert.avatar_url} 
                className="w-10 h-10 rounded-full object-cover" 
                alt={expert.name} 
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                <User className="h-5 w-5 text-gray-500" />
              </div>
            )}
            <div>
              <h2 className="font-semibold text-gray-900">{expert?.name}</h2>
              <p className="text-xs flex items-center" style={{ color: isConnected ? primaryColor : '#9CA3AF' }}>
                <span 
                  className={`w-2 h-2 rounded-full mr-2 ${isConnected ? 'animate-pulse' : ''}`}
                  style={{ backgroundColor: isConnected ? primaryColor : '#9CA3AF' }}
                ></span>
                {isConnecting ? 'Connecting...' : isConnected ? 'Online' : 'Disconnected'}
              </p>
            </div>
          </div>
          
          {/* User Profile / Login */}
          <div className="flex items-center space-x-3">
            {isAuthenticated && user ? (
              <div className="flex items-center space-x-3">
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{user.full_name || user.username}</p>
                  <p className="text-xs text-gray-500">{user.email}</p>
                </div>
                {user.avatar_url ? (
                  <img 
                    src={user.avatar_url.startsWith('http') ? user.avatar_url : `${API_URL}${user.avatar_url}`} 
                    className="w-10 h-10 rounded-full object-cover border-2 border-gray-200" 
                    alt={user.username}
                    onError={(e) => {
                      e.currentTarget.style.display = 'none'
                      e.currentTarget.nextElementSibling?.classList.remove('hidden')
                    }}
                  />
                ) : null}
                <div className={`w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center ${user.avatar_url ? 'hidden' : ''}`}>
                  <User className="h-5 w-5 text-gray-500" />
                </div>
                <Button
                  onClick={handleLogout}
                  variant="ghost"
                  size="sm"
                  className="text-gray-600 hover:text-gray-900"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Button
                onClick={() => router.push('/auth/login')}
                size="sm"
                style={{ backgroundColor: primaryColor }}
              >
                <LogIn className="mr-2 h-4 w-4" />
                Login
              </Button>
            )}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.map(m => (
            <div key={m.id} className={`flex ${m.type === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div 
                className={`max-w-2xl ${m.type === 'user' ? 'text-white' : 'bg-gray-100 text-gray-900'} rounded-2xl px-4 py-3`}
                style={m.type === 'user' ? { backgroundColor: primaryColor } : {}}
              >
                <p className="text-sm whitespace-pre-wrap">{m.text}</p>
              </div>
            </div>
          ))}
          
          {/* Typing Indicator */}
          {isWaitingForResponse && (
            <div className="flex justify-start">
              <div className="bg-gray-100 rounded-2xl px-4 py-3">
                <div className="flex space-x-2">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t bg-white px-6 py-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-3 bg-gray-100 rounded-full px-4 py-2">
              <Input
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                onKeyPress={e => e.key === 'Enter' && !e.shiftKey && sendMsg()}
                placeholder={isWaitingForResponse ? 'Waiting for response...' : 'Type...'}
                disabled={isWaitingForResponse}
                className="flex-1 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
              />
              <Button
                onClick={sendMsg}
                disabled={!inputText.trim() || isWaitingForResponse}
                size="icon"
                className="rounded-full"
                style={{ backgroundColor: primaryColor, opacity: isWaitingForResponse ? 0.5 : 1 }}
                onMouseEnter={(e) => !isWaitingForResponse && (e.currentTarget.style.backgroundColor = secondaryColor)}
                onMouseLeave={(e) => !isWaitingForResponse && (e.currentTarget.style.backgroundColor = primaryColor)}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ExpertChatPage
