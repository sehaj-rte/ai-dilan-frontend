'use client'
import { API_URL } from '@/lib/config'

import React, { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import VoiceControls from '@/components/chat/VoiceControls'
import { ToastContainer, useToast } from '@/components/ui/toast'
import { 
  X, 
  Phone, 
  PhoneOff,
  User,
  Settings,
  Mic,
  MessageSquare
} from 'lucide-react'

interface Expert {
  id: string
  name: string
  description: string
  avatar_url: string | null
  elevenlabs_agent_id: string
  is_active: boolean
  created_at: string
}

interface ExpertProfileModalProps {
  expert: Expert | null
  isOpen: boolean
  onClose: () => void
}

const ExpertProfileModal: React.FC<ExpertProfileModalProps> = ({ expert, isOpen, onClose }) => {
  const [isLoading, setIsLoading] = useState(false)
  const [isVoiceChatActive, setIsVoiceChatActive] = useState(false)
  const [voiceMessages, setVoiceMessages] = useState<any[]>([])
  const { toasts, removeToast, error: showError, success: showSuccess, info: showInfo } = useToast()

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  const convertS3UrlToProxy = (s3Url: string): string => {
    if (!s3Url) return s3Url
    
    const match = s3Url.match(/https:\/\/ai-dilan\.s3\.[^/]+\.amazonaws\.com\/(.+)/)
    if (match) {
      return `${API_URL}/images/avatar/full/${match[1]}`
    }
    return s3Url
  }

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    console.log('Image failed to load:', avatarUrl)
    e.currentTarget.style.display = 'none'
    const fallback = e.currentTarget.parentElement?.querySelector('.avatar-fallback') as HTMLElement
    if (fallback) {
      fallback.style.display = 'flex'
    }
  }

  const handleVoiceMessage = (voiceMessage: any) => {
    setVoiceMessages(prev => [...prev, voiceMessage])
    
    // Show success notification for first voice message
    if (voiceMessages.length === 0) {
      showSuccess('Voice chat is active! Your conversation is being transcribed.', 'Voice Chat Started')
    }
  }

  const handleVoiceError = (error: string) => {
    console.error('Voice error:', error)
    showError(error, 'Voice Chat Error')
  }

  const handleStartVoiceChat = () => {
    setIsVoiceChatActive(true)
    showInfo('Voice chat mode activated. Use the controls below to start speaking.', 'Voice Chat Ready')
  }

  const handleEndVoiceChat = () => {
    setIsVoiceChatActive(false)
    setVoiceMessages([])
    showInfo('Voice chat ended', 'Chat Ended')
  }

  if (!isOpen || !expert) return null

  const avatarUrl = expert.avatar_url ? convertS3UrlToProxy(expert.avatar_url) : null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <ToastContainer toasts={toasts} onClose={removeToast} />
      <div className={`relative ${isVoiceChatActive ? 'max-w-md' : 'max-w-sm'} w-full transition-all duration-300`} onClick={(e) => e.stopPropagation()}>
        <Card className="bg-white shadow-2xl rounded-2xl overflow-hidden">
          <CardContent className="p-6 relative">
            {/* Close Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="absolute top-3 right-3 p-1.5 hover:bg-gray-100 rounded-full z-10"
            >
              <X className="h-4 w-4 text-gray-600" />
            </Button>

            {/* Settings Button */}
            <Button
              variant="ghost"
              size="sm"
              className="absolute top-3 right-12 p-1.5 hover:bg-gray-100 rounded-full z-10"
            >
              <Settings className="h-4 w-4 text-gray-600" />
            </Button>

            {/* Expert Profile */}
            <div className="text-center pt-4">
              {/* Avatar */}
              <div className="relative mx-auto mb-4">
                {avatarUrl ? (
                  <div className="relative">
                    <img
                      src={avatarUrl}
                      alt={expert.name}
                      className="w-24 h-24 rounded-full object-cover border-4 border-white mx-auto shadow-lg"
                      onError={handleImageError}
                      onLoad={() => console.log('Avatar loaded successfully:', avatarUrl)}
                    />
                    <div 
                      className="avatar-fallback absolute inset-0 w-24 h-24 rounded-full bg-gradient-to-br from-green-100 to-blue-100 flex items-center justify-center border-4 border-white mx-auto shadow-lg"
                      style={{ display: 'none' }}
                    >
                      <User className="h-12 w-12 text-green-600" />
                    </div>
                  </div>
                ) : (
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-green-100 to-blue-100 flex items-center justify-center mx-auto shadow-lg border-4 border-white">
                    <User className="h-12 w-12 text-green-600" />
                  </div>
                )}
              </div>
              
              {/* Name */}
              <h2 className="text-xl font-bold text-gray-900 mb-2">{expert.name}</h2>
              
              {/* Description */}
              <p className="text-gray-600 text-sm mb-6 leading-relaxed px-4">
                {expert.description || "AI Expert ready to help you with your questions and provide valuable insights."}
              </p>

              {/* Voice Chat Controls */}
              {!isVoiceChatActive ? (
                <div className="mb-6 flex justify-center space-x-3">
                  <Button
                    onClick={handleStartVoiceChat}
                    disabled={isLoading}
                    className="px-6 py-2 bg-green-500 hover:bg-green-600 text-white shadow-lg hover:shadow-xl transition-all duration-200 flex items-center"
                  >
                    <Mic className="mr-2 h-4 w-4" />
                    Start Voice Chat
                  </Button>
                </div>
              ) : (
                <div className="mb-6">
                  <div className="flex justify-center mb-4">
                    <Button
                      onClick={handleEndVoiceChat}
                      className="px-6 py-2 bg-red-500 hover:bg-red-600 text-white shadow-lg hover:shadow-xl transition-all duration-200 flex items-center"
                    >
                      <PhoneOff className="mr-2 h-4 w-4" />
                      End Voice Chat
                    </Button>
                  </div>
                  
                  {/* Voice Controls Component */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <VoiceControls
                      expertId={expert.id}
                      expertName={expert.name}
                      onVoiceMessage={handleVoiceMessage}
                      onError={handleVoiceError}
                    />
                  </div>
                </div>
              )}

              {/* Status */}
              <div className="text-center mb-4">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                  expert.is_active 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {expert.is_active ? 'Online' : 'Offline'}
                </span>
              </div>

              {/* Voice Messages - Show when voice chat is active - COMMENTED OUT */}
              {/*
              {isVoiceChatActive && voiceMessages.length > 0 && (
                <div className="mb-4 max-h-32 overflow-y-auto bg-white rounded-lg border p-3">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Conversation:</h4>
                  <div className="space-y-2">
                    {voiceMessages.slice(-3).map((message, index) => (
                      <div key={index} className={`text-xs p-2 rounded ${
                        message.isUser 
                          ? 'bg-blue-100 text-blue-800 ml-4' 
                          : 'bg-gray-100 text-gray-800 mr-4'
                      }`}>
                        <span className="font-medium">
                          {message.isUser ? 'You' : expert.name}:
                        </span>
                        <span className="ml-1">{message.content}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              */}

              {/* Additional Info */}
              <div className="text-xs text-gray-500 space-y-1">
                <div>
                  <span className="font-medium">Created:</span>{' '}
                  {new Date(expert.created_at).toLocaleDateString()}
                </div>
                <div>
                  <span className="font-medium">Agent ID:</span>{' '}
                  <span className="font-mono">
                    {expert.elevenlabs_agent_id.slice(0, 12)}...
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default ExpertProfileModal
