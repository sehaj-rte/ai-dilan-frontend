'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Slider } from '../ui/slider'
import { 
  Mic, 
  MicOff, 
  Phone, 
  PhoneOff, 
  Volume2, 
  VolumeX,
  ThumbsUp,
  ThumbsDown,
  Activity
} from 'lucide-react'
import { useVoiceConversation, VoiceConversationState } from '@/hooks/useVoiceConversation'

interface VoiceControlsProps {
  expertId: string
  expertName: string
  onVoiceMessage?: (message: any) => void
  onError?: (error: string) => void
}

const VoiceControls: React.FC<VoiceControlsProps> = ({
  expertId,
  expertName,
  onVoiceMessage,
  onError
}) => {
  const [volume, setVolume] = useState([0.8])
  const [isMicMuted, setIsMicMuted] = useState(false)
  
  const {
    state,
    startConversation,
    endConversation,
    setVolume: setConversationVolume,
    setMicMuted,
    sendFeedback,
    sendUserActivity
  } = useVoiceConversation({
    expertId,
    onMessage: onVoiceMessage,
    onError,
    onStatusChange: (status) => {
      console.log('Voice status changed:', status)
    }
  })
  
  const handleVolumeChange = async (newVolume: number[]) => {
    setVolume(newVolume)
    await setConversationVolume(newVolume[0])
  }
  
  const handleMicToggle = async () => {
    const newMutedState = !isMicMuted
    setIsMicMuted(newMutedState)
    await setMicMuted(newMutedState)
  }
  
  const handleStartCall = async () => {
    try {
      // Check for microphone permission first
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        onError?.('Your browser does not support microphone access. Please use a modern browser.')
        return
      }
      
      await startConversation()
    } catch (error) {
      console.error('Failed to start voice conversation:', error)
      if (error instanceof Error) {
        if (error.message.includes('Permission denied')) {
          onError?.('Microphone access denied. Please allow microphone access and try again.')
        } else if (error.message.includes('NotFoundError')) {
          onError?.('No microphone found. Please connect a microphone and try again.')
        } else {
          onError?.(error.message)
        }
      }
    }
  }
  
  const handleEndCall = async () => {
    try {
      await endConversation()
      setIsMicMuted(false)
    } catch (error) {
      console.error('Failed to end voice conversation:', error)
    }
  }
  
  const getConnectionStatusColor = () => {
    if (state.isConnected) return 'bg-green-500'
    if (state.isConnecting) return 'bg-yellow-500'
    return 'bg-gray-400'
  }
  
  const getConnectionStatusText = () => {
    if (state.isConnected) return 'Connected'
    if (state.isConnecting) return 'Connecting...'
    return 'Disconnected'
  }
  
  const getModeText = () => {
    if (state.isSpeaking) return `${expertName} is speaking...`
    if (state.isListening) return 'Listening...'
    return 'Ready'
  }
  
  return (
    <Card className="w-full">
      <CardContent className="p-4 space-y-4">
        {/* Connection Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${getConnectionStatusColor()}`} />
            <span className="text-sm font-medium">{getConnectionStatusText()}</span>
          </div>
          {state.isConnected && (
            <div className="text-sm text-gray-600">
              {getModeText()}
            </div>
          )}
        </div>
        
        {/* Error Display */}
        {state.error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-700">{state.error}</p>
          </div>
        )}
        
        {/* Main Controls */}
        <div className="flex items-center justify-center space-x-4">
          {!state.isConnected ? (
            <Button
              onClick={handleStartCall}
              disabled={state.isConnecting}
              className="bg-green-500 hover:bg-green-600 text-white px-6 py-3"
              size="lg"
            >
              <Phone className="mr-2 h-5 w-5" />
              {state.isConnecting ? 'Connecting...' : 'Start Voice Chat'}
            </Button>
          ) : (
            <Button
              onClick={handleEndCall}
              className="bg-red-500 hover:bg-red-600 text-white px-6 py-3"
              size="lg"
            >
              <PhoneOff className="mr-2 h-5 w-5" />
              End Call
            </Button>
          )}
        </div>
        
        {/* Voice Controls - Only show when connected */}
        {state.isConnected && (
          <>
            <div className="grid grid-cols-2 gap-4">
              {/* Microphone Control */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Microphone</label>
                <Button
                  onClick={handleMicToggle}
                  variant={isMicMuted ? "destructive" : "default"}
                  className="w-full"
                >
                  {isMicMuted ? (
                    <>
                      <MicOff className="mr-2 h-4 w-4" />
                      Muted
                    </>
                  ) : (
                    <>
                      <Mic className="mr-2 h-4 w-4" />
                      Active
                    </>
                  )}
                </Button>
              </div>
              
              {/* Volume Control */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Volume</label>
                <div className="flex items-center space-x-2">
                  {volume[0] === 0 ? (
                    <VolumeX className="h-4 w-4 text-gray-500" />
                  ) : (
                    <Volume2 className="h-4 w-4 text-gray-500" />
                  )}
                  <Slider
                    value={volume}
                    onValueChange={handleVolumeChange}
                    max={1}
                    min={0}
                    step={0.1}
                    className="flex-1"
                  />
                  <span className="text-sm text-gray-500 w-8">
                    {Math.round(volume[0] * 100)}%
                  </span>
                </div>
              </div>
            </div>
            
            {/* Volume Indicators */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs text-gray-500">Input Level</label>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full transition-all duration-100"
                    style={{ width: `${state.inputVolume * 100}%` }}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-gray-500">Output Level</label>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full transition-all duration-100"
                    style={{ width: `${state.outputVolume * 100}%` }}
                  />
                </div>
              </div>
            </div>
            
            {/* Feedback Controls */}
            {state.canSendFeedback && (
              <div className="flex items-center justify-center space-x-2 pt-2 border-t">
                <span className="text-sm text-gray-600">Rate response:</span>
                <Button
                  onClick={() => sendFeedback(true)}
                  variant="outline"
                  size="sm"
                  className="text-green-600 hover:text-green-700 hover:bg-green-50"
                >
                  <ThumbsUp className="h-4 w-4" />
                </Button>
                <Button
                  onClick={() => sendFeedback(false)}
                  variant="outline"
                  size="sm"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <ThumbsDown className="h-4 w-4" />
                </Button>
              </div>
            )}
            
            {/* Activity Indicator */}
            <div className="flex items-center justify-center">
              <Button
                onClick={sendUserActivity}
                variant="ghost"
                size="sm"
                className="text-gray-500 hover:text-gray-700"
              >
                <Activity className="mr-2 h-4 w-4" />
                Signal Activity
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

export default VoiceControls
