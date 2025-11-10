'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { useParams, useRouter } from 'next/navigation'
import { useSelector, useDispatch } from 'react-redux'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import SpeechToTextInput from '@/components/ui/speech-to-text-input'
import { API_URL } from '@/lib/config'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Send, Plus, MessageSquare, MoreHorizontal, X, ArrowLeft, User, LogIn, LogOut, FileText, ChevronDown, ChevronUp, Edit2, Copy, Check, ArrowUp } from 'lucide-react'
import { RootState } from '@/store/store'
import { logout, loadUserFromStorage } from '@/store/slices/authSlice'

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
  is_private: boolean
}

const ExpertChatPage = () => {
  const params = useParams()
  const searchParams = useSearchParams()
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
  const [sessionId, setSessionId] = useState<string | null>(null) // OpenAI session
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [currentConvId, setCurrentConvId] = useState<string | null>(null)
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null)
  const [editingTitleText, setEditingTitleText] = useState('')
  const [isLoadingConversation, setIsLoadingConversation] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [isLoadingExpert, setIsLoadingExpert] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [isWaitingForResponse, setIsWaitingForResponse] = useState(false)
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [expandedCitations, setExpandedCitations] = useState<Set<string>>(new Set())
  
  // Speech Recognition States
  const [isListening, setIsListening] = useState(false)
  const [speechSupported, setSpeechSupported] = useState(false)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const recognitionRef = useRef<any>(null)
  const isListeningRef = useRef<boolean>(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const shouldIgnoreRecognitionRef = useRef<boolean>(false)

  // Load user from storage on mount
  useEffect(() => {
    dispatch(loadUserFromStorage())
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (sessionId) {
        endChatSession()
      }
      if (recognitionRef.current) {
        recognitionRef.current.stop()
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
          
          // Debug logging
          console.log('🔍 Publication data:', {
            is_private: data.publication?.is_private,
            isAuthenticated: isAuthenticated,
            user: user
          })
          
          // Check if publication is private and user is not authenticated
          if (data.publication?.is_private && !isAuthenticated) {
            console.log('🔒 Private publication - authentication required')
            setIsLoadingExpert(false)
            // Don't auto-connect, show auth modal instead
            return
          }
          
          loadConversations(data.expert.id)
          // Auto-connect immediately with OpenAI
          await startOpenAIChatSession(data.expert.id)
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
  }, [slug, isAuthenticated])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Reload conversations when user authentication changes
  useEffect(() => {
    if (expert) {
      loadConversations(expert.id)
    }
  }, [isAuthenticated, user, expert])

  // Restore last active conversation on page load (only for current session)
  useEffect(() => {
    if (expert && isAuthenticated && conversations.length > 0 && !currentConvId) {
      const savedConvId = sessionStorage.getItem(`last_conversation_${expert.id}`)
      if (savedConvId) {
        const savedConv = conversations.find(c => c.id === savedConvId)
        if (savedConv) {
          setIsLoadingConversation(true)
          loadConversation(savedConv).finally(() => {
            setIsLoadingConversation(false)
          })
        }
      }
    }
  }, [expert, isAuthenticated, conversations])
  // Auto-send question from URL parameter
  useEffect(() => {
    const question = searchParams.get('q')
    if (question && sessionId && isConnected && messages.length === 0) {
      // Set the question in input and auto-send
      setInputText(question)
      // Wait a bit for state to update, then send
      setTimeout(() => {
        sendMsg()
      }, 500)
    }
  }, [sessionId, isConnected, searchParams])

  // Initialize Speech Recognition
  useEffect(() => {
    console.log('🎤 Initializing speech recognition...')
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition
      if (SpeechRecognition) {
        console.log('✅ Speech recognition API found')
        setSpeechSupported(true)
        const recognition = new SpeechRecognition()
        
        recognition.continuous = true
        recognition.interimResults = true
        recognition.lang = 'en-US'
        recognition.maxAlternatives = 1

        recognition.onstart = () => {
          console.log('🎤 Recognition started')
          setIsListening(true)
          isListeningRef.current = true
        }

        recognition.onresult = (event: any) => {
          console.log('🎤 Recognition result received')
          
          // Ignore results if we just sent a message
          if (shouldIgnoreRecognitionRef.current) {
            console.log('🎤 Ignoring recognition result (message was just sent)')
            return
          }
          
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
            setInputText(completeTranscript.trim())
            // Auto-resize textarea after speech input
            setTimeout(() => {
              if (textareaRef.current) {
                textareaRef.current.style.height = 'auto'
                textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 128) + 'px'
              }
            }, 0)
          }
        }

        recognition.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error)
          setIsListening(false)
          isListeningRef.current = false
        }

        recognition.onend = () => {
          // Only stop if user manually stopped it
          // If it stopped automatically, restart it
          console.log('Recognition ended, isListeningRef:', isListeningRef.current)
          if (isListeningRef.current) {
            console.log('Auto-restarting recognition...')
            try {
              recognition.start()
            } catch (error) {
              console.log('Recognition restart failed:', error)
              setIsListening(false)
              isListeningRef.current = false
            }
          } else {
            console.log('User stopped recognition')
            setIsListening(false)
          }
        }

        recognitionRef.current = recognition
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
    }
  }, [])

  const toggleListening = () => {
    console.log('🎤 Toggle listening clicked', { 
      hasRecognition: !!recognitionRef.current, 
      speechSupported, 
      isListening 
    })
    
    if (!speechSupported) {
      alert('Speech recognition is not supported in your browser. Please use Chrome, Edge, or Safari.')
      return
    }
    
    if (recognitionRef.current && speechSupported) {
      if (isListening) {
        // User manually stopping - set ref first so onend doesn't restart
        console.log('🛑 User manually stopping recognition')
        isListeningRef.current = false
        setIsListening(false)
        recognitionRef.current.stop()
      } else {
        // User starting - set state and start recognition
        console.log('▶️ User starting recognition')
        isListeningRef.current = true
        setIsListening(true)
        try {
          recognitionRef.current.start()
          console.log('✅ Recognition started successfully')
        } catch (error) {
          console.error('❌ Recognition start failed:', error)
          alert(`Failed to start voice recognition: ${error}`)
          setIsListening(false)
          isListeningRef.current = false
        }
      }
    } else {
      console.error('❌ Recognition not available', {
        hasRecognition: !!recognitionRef.current,
        speechSupported
      })
    }
  }

  const loadConversations = async (expertId: string) => {
    // Only load conversations if user is authenticated
    if (!isAuthenticated || !user) {
      console.log('❌ Cannot load conversations: Not authenticated')
      setConversations([])
      return
    }
    
    try {
      const token = localStorage.getItem('dilan_ai_token')
      console.log('📥 Loading conversations for expert:', expertId)
      console.log('🔑 Token present:', !!token)
      
      const response = await fetch(`${API_URL}/chat-sessions/?expert_id=${expertId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      console.log('📡 Load conversations response status:', response.status)
      
      if (response.ok) {
        const data = await response.json()
        console.log('✅ Loaded conversations:', data.length, 'sessions')
        // Convert API response to frontend format
        setConversations(data.map((session: any) => ({
          id: session.id,
          title: session.title || 'New Conversation',
          timestamp: new Date(session.updated_at),
          messages: [] // Messages loaded separately when conversation is opened
        })))
      } else {
        const errorText = await response.text()
        console.error('❌ Failed to load conversations:', response.status, errorText)
      }
    } catch (error) {
      console.error('❌ Exception in loadConversations:', error)
    }
  }

  const generateSmartTitle = async (userMessage: string, agentResponse: string): Promise<string> => {
    try {
      // Use GPT to generate a concise title based on the conversation
      const response = await fetch(`${API_URL}/openai-chat/generate-title`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_message: userMessage,
          agent_response: agentResponse
        })
      })

      if (response.ok) {
        const data = await response.json()
        return data.title || 'New Conversation'
      }
    } catch (error) {
      console.error('Failed to generate smart title:', error)
    }
    
    // Fallback to first 50 chars of user message
    return userMessage.substring(0, 50) + (userMessage.length > 50 ? '...' : '')
  }

  const updateConversationTitle = async (sessionId: string, newTitle: string) => {
    if (!isAuthenticated || !user) return
    
    try {
      const token = localStorage.getItem('dilan_ai_token')
      const response = await fetch(`${API_URL}/chat-sessions/${sessionId}/title`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ title: newTitle })
      })
      
      if (response.ok) {
        // Update local state
        setConversations(prev => prev.map(conv => 
          conv.id === sessionId ? { ...conv, title: newTitle } : conv
        ))
        console.log('✅ Title updated successfully')
      }
    } catch (error) {
      console.error('Failed to update title:', error)
    }
  }

  const saveConversation = async (title: string, firstMessage: ChatMessage) => {
    // Only save conversations if user is authenticated
    if (!isAuthenticated || !user || !expert) {
      console.log('❌ Cannot save: Not authenticated or missing user/expert', { isAuthenticated, user: !!user, expert: !!expert })
      return null
    }
    
    try {
      const token = localStorage.getItem('dilan_ai_token')
      console.log('💾 Saving conversation:', { title, user_id: user.id, expert_id: expert.id })
      console.log('🔑 Token present:', !!token)
      
      // Create new session
      const sessionResponse = await fetch(`${API_URL}/chat-sessions/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          user_id: user.id,
          expert_id: expert.id,
          title: title
        })
      })
      
      console.log('📡 Session response status:', sessionResponse.status)
      
      if (sessionResponse.ok) {
        const session = await sessionResponse.json()
        console.log('✅ Session created:', session)
        
        // Save first message
        const messageResponse = await fetch(`${API_URL}/chat-sessions/${session.id}/messages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            session_id: session.id,
            role: 'user',
            content: firstMessage.text
          })
        })
        
        console.log('📡 Message response status:', messageResponse.status)
        
        if (messageResponse.ok) {
          console.log('✅ First message saved')
        } else {
          const errorText = await messageResponse.text()
          console.error('❌ Failed to save first message:', errorText)
        }
        
        return session.id
      } else {
        const errorText = await sessionResponse.text()
        console.error('❌ Failed to create session:', sessionResponse.status, errorText)
      }
    } catch (error) {
      console.error('❌ Exception in saveConversation:', error)
    }
    return null
  }
  
  const saveMessage = async (sessionId: string, role: 'user' | 'assistant', content: string) => {
    if (!isAuthenticated || !user) {
      console.log('❌ Cannot save message: Not authenticated')
      return
    }
    
    try {
      const token = localStorage.getItem('dilan_ai_token')
      console.log('💾 Saving message:', { sessionId, role, contentLength: content.length })
      
      const response = await fetch(`${API_URL}/chat-sessions/${sessionId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          session_id: sessionId,
          role: role,
          content: content
        })
      })
      
      if (response.ok) {
        console.log('✅ Message saved successfully')
      } else {
        const errorText = await response.text()
        console.error('❌ Failed to save message:', response.status, errorText)
      }
    } catch (error) {
      console.error('❌ Exception in saveMessage:', error)
    }
  }

  const handleLogout = () => {
    dispatch(logout())
    setConversations([])
    setMessages([])
    setCurrentConvId(null)
    // Clear saved conversation
    if (expert) {
      sessionStorage.removeItem(`last_conversation_${expert.id}`)
    }
  }

  const startOpenAIChatSession = async (expertId?: string) => {
    const id = expertId || expert?.id
    if (!id) return

    try {
      setIsConnecting(true)
      setMessages([])
      setCurrentConvId(null)
      
      // Clear saved conversation when starting new chat
      if (expert) {
        sessionStorage.removeItem(`last_conversation_${expert.id}`)
      }

      const response = await fetch(`${API_URL}/openai-chat/session/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ expert_id: id })
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
      
      console.log('✅ OpenAI chat session created:', data.session_id)

    } catch (error: any) {
      console.error('Error creating OpenAI session:', error)
      setIsConnecting(false)
    }
  }

  const endChatSession = async () => {
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

  const sendMsg = async () => {
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
    
    // Stop voice recognition if active and prevent it from refilling input
    if (isListening && recognitionRef.current) {
      console.log('🛑 Stopping voice recognition after sending message')
      shouldIgnoreRecognitionRef.current = true // Ignore any pending results
      isListeningRef.current = false
      setIsListening(false)
      recognitionRef.current.stop()
      
      // Reset the ignore flag after a short delay
      setTimeout(() => {
        shouldIgnoreRecognitionRef.current = false
      }, 500)
    }
    
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }

    // Save to conversation history (create new session for first message)
    let conversationId = currentConvId // Store current ID or create new one
    
    if (messages.length === 0 && !currentConvId) {
      console.log('💾 Creating new conversation for first message')
      // Use temporary title initially
      const tempTitle = 'New Conversation'
      const newSessionId = await saveConversation(tempTitle, userMessage)
      if (newSessionId) {
        console.log('✅ Conversation created with ID:', newSessionId)
        conversationId = newSessionId // Store in local variable
        setCurrentConvId(newSessionId)
        // Reload conversations to show the new one
        await loadConversations(expert.id)
      } else {
        console.log('❌ Failed to create conversation (user may not be authenticated)')
      }
    } else if (currentConvId) {
      // Save message to existing session
      console.log('💾 Saving user message to existing conversation:', currentConvId)
      await saveMessage(currentConvId, 'user', messageText)
    } else {
      console.log('⚠️ No conversation ID and not first message - message not saved')
    }

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
        const errorData = await response.json().catch(() => ({ detail: response.statusText }))
        console.error('❌ OpenAI API Error:', errorData)
        throw new Error(`Failed to send message: ${errorData.detail || response.statusText}`)
      }

      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to get response')
      }

      // Add agent response with sources
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
      
      // Clear typing indicator immediately
      setIsWaitingForResponse(false)
      
      // Save agent response to database (in background)
      if (conversationId) {
        console.log('💾 Saving agent response to conversation:', conversationId)
        saveMessage(conversationId, 'assistant', data.response).catch(err => 
          console.error('❌ Failed to save agent message:', err)
        )
        
        // Generate and update smart title for first exchange (when there's only 1 message before this response)
        if (messages.length === 1) {
          console.log('🏷️ Generating smart title for first exchange')
          generateSmartTitle(messageText, data.response).then(smartTitle => {
            console.log('✅ Smart title generated:', smartTitle)
            updateConversationTitle(conversationId, smartTitle)
          })
        }
        
        // Update title if knowledge base was searched
        if (data.tool_calls_made && data.tool_calls_made.length > 0) {
          console.log('🔍 Knowledge base was searched, updating title')
          generateSmartTitle(messageText, data.response).then(smartTitle => {
            updateConversationTitle(conversationId, smartTitle)
          })
        }
      } else {
        console.log('⚠️ No conversation ID - agent response not saved to DB')
      }

    } catch (error: any) {
      console.error('Error sending OpenAI message:', error)
      setIsWaitingForResponse(false)
    }
  }

  const loadConversation = async (conv: Conversation) => {
    if (!isAuthenticated || !user) return
    
    try {
      // Set current conversation immediately for instant highlight
      
      // Clear old messages immediately
      setMessages([])
      setCurrentConvId(conv.id)
      
      // Show loading state
      setIsLoadingConversation(true)
      
      const token = localStorage.getItem('dilan_ai_token')
      const response = await fetch(`${API_URL}/chat-sessions/${conv.id}/messages`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        const messagesData = await response.json()
        // Convert API messages to frontend format
        const loadedMessages: ChatMessage[] = messagesData.map((msg: any) => ({
          id: msg.id,
          type: msg.role === 'user' ? 'user' : 'agent',
          text: msg.content,
          timestamp: new Date(msg.created_at)
        }))
        setMessages(loadedMessages)
        
        // Save to sessionStorage for persistence during current session only
        if (expert) {
          sessionStorage.setItem(`last_conversation_${expert.id}`, conv.id)
        }
      }
    } catch (error) {
      console.error('Failed to load conversation:', error)
    } finally {
      // Hide loading state
      setIsLoadingConversation(false)
    }
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

  // Redirect to login for private publications
  if (!isLoadingExpert && publication?.is_private && !isAuthenticated) {
    router.push(`/auth/login?redirect=/expert/${slug}/chat`)
    return (
      <div className="flex h-screen items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    )
  }

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
      {/* Sidebar - Conversation History */}
      <div className="w-64 bg-gray-900 text-white flex flex-col">
        <div className="p-3 border-b border-gray-700">
          <Button 
            onClick={() => startOpenAIChatSession()} 
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
                      className={`p-2 rounded hover:bg-gray-800 flex items-center gap-2 group min-w-0 ${currentConvId === c.id ? '' : ''}`}
                      style={currentConvId === c.id ? { backgroundColor: primaryColor + '40' } : {}}
                    >
                      <MessageSquare className="h-4 w-4 flex-shrink-0" />
                      {editingTitleId === c.id ? (
                        <input
                          type="text"
                          value={editingTitleText}
                          onChange={(e) => setEditingTitleText(e.target.value)}
                          onBlur={() => {
                            if (editingTitleText.trim()) {
                              updateConversationTitle(c.id, editingTitleText.trim())
                            }
                            setEditingTitleId(null)
                          }}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              if (editingTitleText.trim()) {
                                updateConversationTitle(c.id, editingTitleText.trim())
                              }
                              setEditingTitleId(null)
                            }
                          }}
                            className="flex-1 min-w-0 bg-gray-700 text-white text-sm px-2 py-1 rounded outline-none focus:ring-1 focus:ring-gray-500"
                          autoFocus
                        />
                      ) : (
                        <>
                          <span 
                            onClick={() => loadConversation(c)}
                            className="text-sm truncate flex-1 cursor-pointer"
                          >
                            {c.title}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setEditingTitleId(c.id)
                              setEditingTitleText(c.title)
                            }}
                            className="opacity-0 group-hover:opacity-100 ml-2 p-1 hover:bg-gray-700 rounded"
                          >
                            <Edit2 className="h-3 w-3" />
                          </button>
                        </>
                      )}
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
                      className={`p-2 rounded hover:bg-gray-800 flex items-center gap-2 group min-w-0 ${currentConvId === c.id ? '' : ''}`}
                      style={currentConvId === c.id ? { backgroundColor: primaryColor + '40' } : {}}
                    >
                      <MessageSquare className="h-4 w-4 flex-shrink-0" />
                      {editingTitleId === c.id ? (
                        <input
                          type="text"
                          value={editingTitleText}
                          onChange={(e) => setEditingTitleText(e.target.value)}
                          onBlur={() => {
                            if (editingTitleText.trim()) {
                              updateConversationTitle(c.id, editingTitleText.trim())
                            }
                            setEditingTitleId(null)
                          }}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              if (editingTitleText.trim()) {
                                updateConversationTitle(c.id, editingTitleText.trim())
                              }
                              setEditingTitleId(null)
                            }
                          }}
                          className="flex-1 min-w-0 bg-gray-700 text-white text-sm px-2 py-1 rounded outline-none focus:ring-1 focus:ring-gray-500"
                          autoFocus
                        />
                      ) : (
                        <>
                          <span 
                            onClick={() => loadConversation(c)}
                            className="text-sm truncate flex-1 cursor-pointer"
                          >
                            {c.title}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setEditingTitleId(c.id)
                              setEditingTitleText(c.title)
                            }}
                            className="opacity-0 group-hover:opacity-100 ml-2 p-1 hover:bg-gray-700 rounded"
                          >
                            <Edit2 className="h-3 w-3" />
                          </button>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
        
        <div className="p-3 border-t border-gray-700">
          <Button
            onClick={() => router.push(`/project/${expert?.id}/chat`)}
            variant="ghost"
            className="w-full text-white hover:bg-gray-800 hover:text-white"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
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
                {isConnecting ? 'Connecting...' : isConnected ? 'Connected' : 'Disconnected'}
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
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-3xl mx-auto space-y-6">
            {/* Initial greeting when no messages */}
            {messages.length === 0 && !isWaitingForResponse && (
              <div className="flex flex-col items-center justify-center h-full text-center space-y-3">
                {expert?.avatar_url ? (
                  <img
                    src={expert.avatar_url}
                    alt={expert.name}
                    className="h-16 w-16 rounded-full object-cover"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center">
                    <User className="h-8 w-8 text-gray-500" />
                  </div>
                )}
                <div>
                  <p className="text-gray-700 font-medium text-lg">Ask me anything!</p>
                  <p className="text-sm text-gray-500">
                    I'm ready to help with your questions about {expert?.name || 'this expert'}
                  </p>
                </div>
              </div>
            )}

            {/* Loading conversation indicator */}
            {isLoadingConversation && (
              <div className="flex justify-center items-center py-12">
                <div className="flex flex-col items-center gap-3">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2" style={{ borderColor: primaryColor }}></div>
                  <p className="text-sm text-gray-500 font-medium">Loading conversation...</p>
                </div>
              </div>
            )}

            {messages.map(m => (
              <div key={m.id} className="group py-4">
                <div className={`flex items-start gap-3 ${m.type === 'user' ? 'flex-row-reverse' : ''}`}>
                {/* Show avatar for agent messages */}
                {m.type === 'agent' && (
                  <>
                    {expert?.avatar_url ? (
                      <img
                        src={expert.avatar_url}
                        alt={expert.name}
                        className="h-8 w-8 rounded-full object-cover flex-shrink-0"
                        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                        <User className="h-4 w-4 text-gray-500" />
                      </div>
                    )}
                  </>
                )}
                
                <div className={`${m.type === 'user' ? 'flex justify-end' : 'flex-1 min-w-0'}`}>
                  <div 
                    className={`${m.type === 'user' ? 'text-white inline-block' : 'bg-gray-100 text-gray-900 inline-block max-w-[85%]'} px-5 py-3.5`}
                    style={m.type === 'user' ? { 
                      backgroundColor: primaryColor,
                      borderRadius: '1rem 1rem 0 1rem'
                    } : {
                      borderRadius: '1rem 1rem 1rem 0'
                    }}
                  >
                    {m.type === 'user' ? (
                      <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{m.text}</p>
                    ) : (
                    <div className="text-[15px] leading-relaxed prose prose-sm max-w-none prose-gray prose-headings:text-gray-900 prose-p:text-gray-900 prose-strong:text-gray-900 prose-li:text-gray-900 prose-ul:my-2 prose-li:my-0 prose-p:my-0">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {m.text}
                      </ReactMarkdown>
                    </div>
                  )}
                  
                  {/* Show tool calls if any (OpenAI knowledge base search) */}
                  {m.toolCalls && m.toolCalls.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-gray-300">
                      <p className="text-xs text-gray-600 flex items-center gap-1">
                        <MessageSquare className="h-3 w-3" />
                        Searched knowledge base: {m.toolCalls[0].results_count} results found
                      </p>
                    </div>
                  )}
                  
                  {/* Show citations if sources were used */}
                  {m.sources && m.sources.length > 0 && (
                    <div className="mt-2">
                      <button
                        onClick={() => {
                          const newExpanded = new Set(expandedCitations)
                          if (newExpanded.has(m.id)) {
                            newExpanded.delete(m.id)
                          } else {
                            newExpanded.add(m.id)
                          }
                          setExpandedCitations(newExpanded)
                        }}
                        className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-gray-900 transition-colors py-1"
                      >
                        <FileText className="h-3.5 w-3.5" />
                        <span className="font-medium">Citations ({m.sources.length})</span>
                        {expandedCitations.has(m.id) ? (
                          <ChevronUp className="h-3.5 w-3.5" />
                        ) : (
                          <ChevronDown className="h-3.5 w-3.5" />
                        )}
                      </button>
                      
                      {expandedCitations.has(m.id) && (
                        <div className="mt-2 bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                          <div className="divide-y divide-gray-100">
                            {m.sources.map((source, idx) => (
                              <div 
                                key={idx}
                                className="group p-3 hover:bg-gray-50 transition-colors"
                              >
                                <div className="flex items-start justify-between gap-2 mb-1">
                                  <div className="flex-1">
                                    <span className="text-xs font-medium text-gray-900">
                                      {source.source}
                                    </span>
                                    {source.page && (
                                      <span className="text-xs text-gray-500 ml-2">
                                        Page {source.page}
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-xs text-gray-400">
                                    {Math.round(source.score * 100)}%
                                  </span>
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
                  </div>
                  
                  {/* Copy Button - Below message like ChatGPT */}
                  {m.type === 'agent' && (
                    <div className="flex items-center gap-2 mt-2 ml-1">
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(m.text)
                          setCopiedMessageId(m.id)
                          setTimeout(() => setCopiedMessageId(null), 2000)
                        }}
                        className="p-1.5 rounded-lg hover:bg-gray-200 transition-colors group"
                        title="Copy message"
                      >
                        {copiedMessageId === m.id ? (
                          <Check className="h-4 w-4 text-gray-600" />
                        ) : (
                          <Copy className="h-4 w-4 text-gray-500 group-hover:text-gray-700" />
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
          
            {/* Typing Indicator */}
            {isWaitingForResponse && (
              <div className="group py-4">
                <div className="flex items-center gap-3">
                  {expert?.avatar_url ? (
                    <img
                      src={expert.avatar_url}
                      alt={expert.name}
                      className="h-8 w-8 rounded-full object-cover"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                      <User className="h-4 w-4 text-gray-500" />
                    </div>
                  )}
                  <span className="text-sm text-gray-500">Typing...</span>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input */}
        <div className="border-t bg-white px-6 py-4">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center  gap-3 bg-gray-100 rounded-3xl px-5 py-3.5 shadow-sm">
              <textarea
                ref={textareaRef}
                value={inputText}
                onChange={e => {
                  setInputText(e.target.value)
                  // Auto-resize textarea
                  if (textareaRef.current) {
                    textareaRef.current.style.height = 'auto'
                    textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 128) + 'px'
                  }
                }}
                onKeyPress={e => e.key === 'Enter' && !e.shiftKey && !isWaitingForResponse && sendMsg()}
                placeholder={isListening ? '🎤 Listening... speak now' : 'Message...'}
                className="flex-1 border-0 bg-transparent focus:outline-none resize-none min-h-[24px] max-h-32 overflow-y-auto text-[15px] leading-relaxed"
                rows={1}
              />
              {/* Speech Recognition Button */}
              {speechSupported && (
                <Button
                  onClick={toggleListening}
                  size="icon"
                  variant={isListening ? "destructive" : "ghost"}
                  className={`rounded-full h-9 w-9 flex-shrink-0 ${isListening ? "animate-pulse" : ""}`}
                  title={isListening ? "Stop listening" : "Voice input"}
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                </Button>
              )}
              <Button
                onClick={sendMsg}
                disabled={!inputText.trim() || isWaitingForResponse}
                size="icon"
                className="rounded-full h-9 w-9 flex-shrink-0 transition-all"
                style={{ backgroundColor: inputText.trim() && !isWaitingForResponse ? primaryColor : '#D1D5DB', opacity: 1 }}
                onMouseEnter={(e) => inputText.trim() && !isWaitingForResponse && (e.currentTarget.style.backgroundColor = secondaryColor)}
                onMouseLeave={(e) => inputText.trim() && !isWaitingForResponse && (e.currentTarget.style.backgroundColor = primaryColor)}
              >
                <ArrowUp className="h-4 w-4 text-white" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ExpertChatPage
