'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import VoiceControls from '@/components/chat/VoiceControls'
import ChatModeInterface from '@/components/chat/ChatModeInterface'
import { ToastContainer, useToast } from '@/components/ui/toast'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { API_URL } from '@/lib/config'
import { fetchWithAuth, getAuthHeaders } from '@/lib/api-client'
import { 
  ArrowLeft, 
  Mic, 
  Phone, 
  User,
  MoreHorizontal,
  Volume2
} from 'lucide-react'

interface Expert {
  id: string
  name: string
  description: string
  avatar_url: string | null
  elevenlabs_agent_id: string
  is_active: boolean
  text_only: boolean
  created_at: string
}

interface Message {
  id: string
  content: string
  isUser: boolean
  timestamp: Date
  type?: 'text' | 'voice' | 'transcription'
}

const ChatPage = () => {
  const params = useParams()
  const router = useRouter()
  const expertId = params.id as string
  
  const [expert, setExpert] = useState<Expert | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isTextOnlyMode, setIsTextOnlyMode] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { toasts, removeToast, error: showError, success: showSuccess, info: showInfo } = useToast()

  useEffect(() => {
    if (expertId) {
      fetchExpert()
      fetchChatHistory()
    }
  }, [expertId])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const convertS3UrlToProxy = (s3Url: string): string => {
    if (!s3Url) return s3Url
    
    const match = s3Url.match(/https:\/\/ai-dilan\.s3\.[^/]+\.amazonaws\.com\/(.+)/)
    if (match) {
      return `${API_URL}/images/avatar/full/${match[1]}`
    }
    return s3Url
  }

  const fetchExpert = async () => {
    try {
      setIsLoading(true)
      const response = await fetchWithAuth(`${API_URL}/experts/${expertId}`, {
        headers: getAuthHeaders(),
      })
      const data = await response.json()
      
      if (data.success && data.expert) {
        const expertWithProxyUrl = {
          ...data.expert,
          avatar_url: data.expert.avatar_url ? convertS3UrlToProxy(data.expert.avatar_url) : null
        }
        setExpert(expertWithProxyUrl)
        // Set default text-only mode based on agent configuration
        setIsTextOnlyMode(data.expert.text_only || false)
      } else {
        console.error('Failed to fetch expert:', data.error)
        router.push('/dashboard')
      }
    } catch (error) {
      console.error('Error fetching expert:', error)
      router.push('/dashboard')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchChatHistory = async () => {
    try {
      const response = await fetchWithAuth(`${API_URL}/chat/${expertId}/history?user_id=anonymous`, {
        headers: getAuthHeaders(),
      })
      const data = await response.json()
      
      if (data.success && data.messages) {
        const historyMessages: Message[] = data.messages.map((msg: any, index: number) => [
          {
            id: `${msg.id || index}-user`,
            content: msg.message,
            isUser: true,
            timestamp: new Date(msg.timestamp || Date.now())
          },
          {
            id: `${msg.id || index}-ai`,
            content: msg.response,
            isUser: false,
            timestamp: new Date(msg.timestamp || Date.now())
          }
        ]).flat().filter((msg: Message) => msg.content)
        
        setMessages(historyMessages)
      }
    } catch (error) {
      console.error('Error fetching chat history:', error)
      // Don't redirect on chat history error, just start with empty messages
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleVoiceMessage = (voiceMessage: any) => {
    const message: Message = {
      id: voiceMessage.id,
      content: voiceMessage.content,
      isUser: voiceMessage.isUser,
      timestamp: voiceMessage.timestamp,
      type: voiceMessage.type === 'transcription' ? 'transcription' : 'voice'
    }
    
    setMessages(prev => [...prev, message])
    
    // Show success notification for first voice message
    if (messages.filter(m => m.type === 'voice' || m.type === 'transcription').length === 0) {
      showSuccess('Voice chat is working! Your conversation is being transcribed.', 'Voice Chat Active')
    }
  }

  const handleVoiceError = (error: string) => {
    console.error('Voice error:', error)
    showError(error, 'Voice Chat Error')
  }


  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Loading expert...</span>
        </div>
      </DashboardLayout>
    )
  }

  if (!expert) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Expert not found</h2>
            <Button onClick={() => router.push('/projects')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Projects
            </Button>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <ToastContainer toasts={toasts} onClose={removeToast} />
      <div className="h-[calc(100vh-120px)] flex flex-col lg:flex-row gap-6">
        {/* Expert Profile Section */}
        <div className="lg:w-1/3 xl:w-1/4">
          <Card className="h-full">
            <CardContent className="p-6 overflow-y-auto">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => router.push(`/project/${expertId}`)}
                  className="p-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" className="p-2">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </div>

              {/* Expert Avatar and Info */}
              <div className="text-center mb-6">
                <div className="relative mx-auto mb-4">
                  {expert.avatar_url ? (
                    <div className="relative">
                      <img
                        src={expert.avatar_url}
                        alt={expert.name}
                        className="w-20 h-20 rounded-full object-cover border-4 border-gray-200 mx-auto"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none'
                          const fallback = e.currentTarget.parentElement?.querySelector('.avatar-fallback') as HTMLElement
                          if (fallback) {
                            fallback.style.display = 'flex'
                          }
                        }}
                      />
                      <div 
                        className="avatar-fallback absolute inset-0 w-20 h-20 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center border-4 border-gray-200 mx-auto"
                        style={{ display: 'none' }}
                      >
                        <User className="h-8 w-8 text-blue-600" />
                      </div>
                    </div>
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center border-4 border-gray-200 mx-auto">
                      <User className="h-8 w-8 text-blue-600" />
                    </div>
                  )}
                </div>
                
                <h2 className="text-xl font-bold text-gray-900 mb-1">{expert.name}</h2>
                <p className="text-sm text-gray-500 mb-4">
                  {expert.is_active ? 'Online' : 'Offline'}
                </p>

                {/* Chat Mode Toggle */}
                <div className="mb-6">
                  <div className="flex items-center justify-center space-x-3 mb-4">
                    <Label htmlFor="chat-mode-toggle" className="text-sm font-medium">
                      Voice
                    </Label>
                    <Switch
                      id="chat-mode-toggle"
                      checked={isTextOnlyMode}
                      onCheckedChange={setIsTextOnlyMode}
                    />
                    <Label htmlFor="chat-mode-toggle" className="text-sm font-medium">
                      Text Chat
                    </Label>
                  </div>
                  
                  {isTextOnlyMode ? (
                    <div className="text-center">
                      <div className="inline-flex items-center space-x-1 text-xs text-green-600 bg-green-100 px-2 py-1 rounded-full mb-2">
                        <span>⚡</span>
                        <span>25x Higher Concurrency</span>
                      </div>
                      <p className="text-xs text-gray-500">
                        Text-only mode active
                      </p>
                    </div>
                  ) : (
                    <VoiceControls
                      expertId={expertId}
                      expertName={expert.name}
                      onVoiceMessage={handleVoiceMessage}
                      onError={handleVoiceError}
                    />
                  )}
                </div>
              </div>

              {/* Description */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Description</h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {expert.description || "No description available for this expert."}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Chat Section */}
        <div className="lg:w-2/3 xl:w-3/4 flex flex-col">
          {isTextOnlyMode ? (
            <ChatModeInterface
              expertId={expertId}
              expertName={expert.name}
              textOnly={true}
              onError={handleVoiceError}
              className="h-full"
            />
          ) : (
            <Card className="flex-1 flex flex-col">
              {/* Chat Header */}
              <div className="border-b border-gray-200 p-4">
                <div className="flex items-center space-x-3">
                  {expert.avatar_url ? (
                    <img
                      src={expert.avatar_url}
                      alt={expert.name}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center">
                      <User className="h-5 w-5 text-blue-600" />
                    </div>
                  )}
                  <div>
                    <h3 className="font-semibold text-gray-900">{expert.name}</h3>
                    <p className="text-sm text-gray-500">
                      {expert.is_active ? 'Active now' : 'Offline'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0 max-h-[calc(100vh-300px)]">
                {messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-center">
                    <div>
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center mx-auto mb-4">
                        <User className="h-8 w-8 text-blue-600" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        Start a conversation with {expert.name}
                      </h3>
                      <p className="text-gray-500 text-sm">
                        Use voice controls to get started!
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                          message.isUser
                            ? 'bg-blue-600 text-white'
                            : message.type === 'transcription'
                            ? 'bg-yellow-50 text-yellow-800 border border-yellow-200'
                            : 'bg-gray-100 text-gray-900'
                        }`}
                        >
                          <p className="text-sm">{message.content}</p>
                          {message.type && message.type !== 'text' && (
                            <span className={`inline-block px-2 py-1 rounded text-xs mt-1 mr-2 ${
                              message.type === 'voice' ? 'bg-green-100 text-green-800' :
                              message.type === 'transcription' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-gray-100 text-gray-600'
                            }`}>
                              {message.type === 'voice' ? '🎤 Voice' : 
                               message.type === 'transcription' ? '📝 Transcript' : message.type}
                            </span>
                          )}
                          <p className={`text-xs mt-1 ${
                            message.isUser ? 'text-blue-100' : 
                            message.type === 'transcription' ? 'text-yellow-600' : 'text-gray-500'
                          }`}>
                            {message.timestamp.toLocaleTimeString([], { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </p>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>

              {/* Voice Mode Info */}
              <div className="border-t border-gray-200 p-4 text-center">
                <p className="text-sm text-gray-600">
                  Voice chat mode active. Use the voice controls in the left panel to start a conversation.
                </p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}

export default ChatPage
