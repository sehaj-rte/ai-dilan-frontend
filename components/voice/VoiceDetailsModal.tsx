'use client'

import React, { useState, useRef } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { 
  Play, 
  Pause, 
  Volume2, 
  Heart,
  Star,
  User,
  Globe,
  Mic,
  Calendar,
  Languages,
  Settings as SettingsIcon,
  Info,
  Shield,
  Zap
} from 'lucide-react'

interface Voice {
  voice_id: string
  name: string
  category: string
  description?: string
  preview_url?: string
  gender: string
  age: string
  accent: string
  use_case: string
  descriptive: string
  is_owner: boolean
  is_legacy: boolean
  is_mixed: boolean
  available_for_tiers: string[]
  created_at_unix?: number
  favorited_at_unix?: number
  samples?: any[]
  settings?: any
  sharing?: any
  fine_tuning?: any
  voice_verification?: any
  high_quality_base_model_ids: string[]
  verified_languages: any[]
}

interface VoiceDetailsModalProps {
  voice: Voice | null
  isOpen: boolean
  onClose: () => void
}

const VoiceDetailsModal: React.FC<VoiceDetailsModalProps> = ({ voice, isOpen, onClose }) => {
  const [isPlaying, setIsPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  if (!voice) return null

  const playVoice = async () => {
    if (!voice.preview_url) return

    if (isPlaying) {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
      setIsPlaying(false)
      return
    }

    try {
      const audio = new Audio(voice.preview_url)
      audioRef.current = audio
      setIsPlaying(true)

      audio.onended = () => {
        setIsPlaying(false)
        audioRef.current = null
      }

      audio.onerror = () => {
        setIsPlaying(false)
        audioRef.current = null
        console.error('Error playing audio for voice:', voice.name)
      }

      await audio.play()
    } catch (error) {
      console.error('Error playing voice preview:', error)
      setIsPlaying(false)
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'premade': return 'bg-blue-100 text-blue-800'
      case 'cloned': return 'bg-green-100 text-green-800'
      case 'generated': return 'bg-purple-100 text-purple-800'
      case 'professional': return 'bg-orange-100 text-orange-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getVoiceIcon = () => {
    if (voice.is_owner) return <User className="h-5 w-5" />
    if (voice.sharing) return <Globe className="h-5 w-5" />
    return <Mic className="h-5 w-5" />
  }

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return 'Unknown'
    return new Date(timestamp * 1000).toLocaleDateString()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            {getVoiceIcon()}
            <span>{voice.name}</span>
            <Badge className={getCategoryColor(voice.category)}>
              {voice.category}
            </Badge>
            {voice.favorited_at_unix && (
              <Heart className="h-5 w-5 text-red-500 fill-current" />
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Voice Preview */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Voice Preview</h3>
                <Button
                  onClick={playVoice}
                  disabled={!voice.preview_url}
                  className="flex items-center gap-2"
                >
                  {isPlaying ? (
                    <>
                      <Pause className="h-4 w-4" />
                      Stop Preview
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4" />
                      Play Preview
                    </>
                  )}
                </Button>
              </div>
              
              {voice.description && (
                <p className="text-gray-600 mb-4">{voice.description}</p>
              )}

              {!voice.preview_url && (
                <p className="text-gray-500 text-sm">No preview available for this voice</p>
              )}
            </CardContent>
          </Card>

          {/* Voice Characteristics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Info className="h-5 w-5" />
                  Characteristics
                </h3>
                <div className="space-y-3">
                  {voice.gender && voice.gender !== 'unknown' && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Gender:</span>
                      <span className="font-medium capitalize">{voice.gender}</span>
                    </div>
                  )}
                  {voice.age && voice.age !== 'unknown' && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Age:</span>
                      <span className="font-medium capitalize">{voice.age}</span>
                    </div>
                  )}
                  {voice.accent && voice.accent !== 'unknown' && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Accent:</span>
                      <span className="font-medium capitalize">{voice.accent}</span>
                    </div>
                  )}
                  {voice.use_case && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Use Case:</span>
                      <span className="font-medium">{voice.use_case}</span>
                    </div>
                  )}
                  {voice.descriptive && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Style:</span>
                      <span className="font-medium">{voice.descriptive}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <SettingsIcon className="h-5 w-5" />
                  Technical Details
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Voice ID:</span>
                    <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                      {voice.voice_id.slice(0, 8)}...
                    </code>
                  </div>
                  {voice.created_at_unix && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Created:</span>
                      <span className="font-medium">{formatDate(voice.created_at_unix)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-500">Owner:</span>
                    <span className="font-medium">{voice.is_owner ? 'You' : 'ElevenLabs'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Legacy:</span>
                    <span className="font-medium">{voice.is_legacy ? 'Yes' : 'No'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Mixed:</span>
                    <span className="font-medium">{voice.is_mixed ? 'Yes' : 'No'}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quality & Features */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Star className="h-5 w-5" />
                Quality & Features
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* High Quality Models */}
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <Zap className="h-8 w-8 mx-auto mb-2 text-yellow-500" />
                  <div className="text-2xl font-bold text-gray-900">
                    {voice.high_quality_base_model_ids.length}
                  </div>
                  <div className="text-sm text-gray-500">High Quality Models</div>
                </div>

                {/* Verified Languages */}
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <Languages className="h-8 w-8 mx-auto mb-2 text-blue-500" />
                  <div className="text-2xl font-bold text-gray-900">
                    {voice.verified_languages.length}
                  </div>
                  <div className="text-sm text-gray-500">Verified Languages</div>
                </div>

                {/* Available Tiers */}
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <Shield className="h-8 w-8 mx-auto mb-2 text-green-500" />
                  <div className="text-2xl font-bold text-gray-900">
                    {voice.available_for_tiers.length}
                  </div>
                  <div className="text-sm text-gray-500">Available Tiers</div>
                </div>
              </div>

              {/* Available Tiers List */}
              {voice.available_for_tiers.length > 0 && (
                <div className="mt-4">
                  <h4 className="font-medium mb-2">Available for tiers:</h4>
                  <div className="flex flex-wrap gap-2">
                    {voice.available_for_tiers.map((tier, index) => (
                      <Badge key={index} variant="outline">
                        {tier}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Verified Languages */}
          {voice.verified_languages.length > 0 && (
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Languages className="h-5 w-5" />
                  Verified Languages
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {voice.verified_languages.map((lang, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <div className="font-medium">{lang.language}</div>
                        {lang.accent && (
                          <div className="text-sm text-gray-500">Accent: {lang.accent}</div>
                        )}
                        {lang.locale && (
                          <div className="text-sm text-gray-500">Locale: {lang.locale}</div>
                        )}
                      </div>
                      {lang.preview_url && (
                        <Button variant="outline" size="sm">
                          <Play className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Voice Settings */}
          {voice.settings && (
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <SettingsIcon className="h-5 w-5" />
                  Voice Settings
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {voice.settings.stability !== undefined && (
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-900">
                        {Math.round(voice.settings.stability * 100)}%
                      </div>
                      <div className="text-sm text-gray-500">Stability</div>
                    </div>
                  )}
                  {voice.settings.similarity_boost !== undefined && (
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-900">
                        {Math.round(voice.settings.similarity_boost * 100)}%
                      </div>
                      <div className="text-sm text-gray-500">Similarity</div>
                    </div>
                  )}
                  {voice.settings.style !== undefined && (
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-900">
                        {Math.round(voice.settings.style * 100)}%
                      </div>
                      <div className="text-sm text-gray-500">Style</div>
                    </div>
                  )}
                  {voice.settings.use_speaker_boost !== undefined && (
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-900">
                        {voice.settings.use_speaker_boost ? 'ON' : 'OFF'}
                      </div>
                      <div className="text-sm text-gray-500">Speaker Boost</div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            <Button>
              Use This Voice
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default VoiceDetailsModal
