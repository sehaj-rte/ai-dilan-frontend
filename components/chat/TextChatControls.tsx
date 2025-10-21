'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { useTextChat } from '@/hooks/useTextChat'
import { MessageSquare, Loader2, Wifi, WifiOff } from 'lucide-react'

interface TextChatMessage {
  id: string;
  type: 'user' | 'agent';
  text: string;
  timestamp: Date;
}

interface TextChatControlsProps {
  expertId: string
  onMessage: (message: any) => void
  onError: (error: string) => void
  disabled?: boolean
}

const TextChatControls: React.FC<TextChatControlsProps> = ({
  expertId,
  onMessage,
  onError,
  disabled = false
}) => {
  const [isActive, setIsActive] = useState(false)

  const {
    messages,
    isConnected,
    isConnecting,
    error,
    startTextChat,
    endTextChat,
    sendMessage,
    clearMessages
  } = useTextChat({
    expertId,
    onMessage: (message: TextChatMessage) => {
      // Convert TextChatMessage to the format expected by the chat interface
      const chatMessage = {
        id: message.id,
        content: message.text,
        isUser: message.type === 'user',
        timestamp: message.timestamp,
        type: 'text'
      }
      onMessage(chatMessage)
    },
    onError: (errorMessage: string) => {
      onError(errorMessage)
      setIsActive(false)
    },
    onStatusChange: (status) => {
      console.log('Text chat status:', status)
    }
  })

  const handleStartTextChat = async () => {
    try {
      setIsActive(true)
      await startTextChat()
    } catch (error: any) {
      console.error('Failed to start text chat:', error)
      onError(error.message || 'Failed to start text chat')
      setIsActive(false)
    }
  }

  const handleEndTextChat = async () => {
    try {
      await endTextChat()
      setIsActive(false)
    } catch (error: any) {
      console.error('Failed to end text chat:', error)
      onError(error.message || 'Failed to end text chat')
    }
  }

  const getConnectionStatus = () => {
    if (isConnecting) return 'connecting'
    if (isConnected) return 'connected'
    return 'disconnected'
  }

  const getStatusIcon = () => {
    if (isConnecting) {
      return <Loader2 className="h-4 w-4 animate-spin" />
    }
    if (isConnected) {
      return <Wifi className="h-4 w-4 text-green-500" />
    }
    return <WifiOff className="h-4 w-4 text-gray-400" />
  }

  const getStatusText = () => {
    if (isConnecting) return 'Connecting...'
    if (isConnected) return 'Connected'
    return 'Disconnected'
  }

  const getButtonText = () => {
    if (isConnecting) return 'Connecting...'
    if (isConnected) return 'End Text Chat'
    return 'Start Text Chat'
  }

  const getButtonVariant = () => {
    if (isConnected) return 'destructive' as const
    return 'default' as const
  }

  // Expose sendMessage function to parent component
  useEffect(() => {
    // Store sendMessage function in a way that parent can access it
    if (typeof window !== 'undefined') {
      (window as any).textChatSendMessage = isConnected ? sendMessage : null
    }
  }, [isConnected, sendMessage])

  return (
    <div className="flex flex-col space-y-3">
      {/* Connection Status */}
      <div className="flex items-center space-x-2 text-sm">
        {getStatusIcon()}
        <span className={`font-medium ${
          isConnected ? 'text-green-600' : 
          isConnecting ? 'text-blue-600' : 
          'text-gray-500'
        }`}>
          {getStatusText()}
        </span>
      </div>

      {/* Control Button */}
      <Button
        onClick={isConnected ? handleEndTextChat : handleStartTextChat}
        disabled={disabled || isConnecting}
        variant={getButtonVariant()}
        className="w-full"
      >
        <MessageSquare className="h-4 w-4 mr-2" />
        {getButtonText()}
      </Button>

      {/* Error Display */}
      {error && (
        <div className="text-sm text-red-600 bg-red-50 p-2 rounded-md">
          {error}
        </div>
      )}

      {/* Info Text */}
      <div className="text-xs text-gray-500 text-center">
        {isConnected ? (
          <span className="text-green-600">
            ✅ Real-time chat active with ElevenLabs agent
          </span>
        ) : (
          <span>
            Start text chat for real-time conversation with your expert
          </span>
        )}
      </div>
    </div>
  )
}

export default TextChatControls
