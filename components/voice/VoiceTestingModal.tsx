'use client'

import React, { useState, useRef } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { 
  Play, 
  Pause, 
  Volume2, 
  Download,
  Mic,
  Settings as SettingsIcon,
  Loader2,
  AlertCircle,
  RefreshCw
} from 'lucide-react'
import { API_URL } from '@/lib/config'
import { fetchWithAuth, getAuthHeaders } from '@/lib/api-client'

interface Voice {
  voice_id: string
  name: string
  category: string
  description?: string
  preview_url?: string
  settings?: {
    stability?: number
    similarity_boost?: number
    style?: number
    use_speaker_boost?: boolean
  }
}

interface VoiceTestingModalProps {
  voice: Voice | null
  isOpen: boolean
  onClose: () => void
}

const VoiceTestingModal: React.FC<VoiceTestingModalProps> = ({ voice, isOpen, onClose }) => {
  const [testText, setTestText] = useState("Hello! This is a test of the voice synthesis. How do you think it sounds?")
  const [isGenerating, setIsGenerating] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [generatedAudio, setGeneratedAudio] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  
  // Voice settings
  const [stability, setStability] = useState(voice?.settings?.stability ? voice.settings.stability * 100 : 50)
  const [similarityBoost, setSimilarityBoost] = useState(voice?.settings?.similarity_boost ? voice.settings.similarity_boost * 100 : 75)
  const [style, setStyle] = useState(voice?.settings?.style ? voice.settings.style * 100 : 0)
  const [useSpeakerBoost, setUseSpeakerBoost] = useState(voice?.settings?.use_speaker_boost ?? true)
  
  const audioRef = useRef<HTMLAudioElement | null>(null)

  if (!voice) return null

  const sampleTexts = [
    "Hello! This is a test of the voice synthesis. How do you think it sounds?",
    "Welcome to our AI-powered voice studio. Here you can test and customize voices for your digital avatars.",
    "The quick brown fox jumps over the lazy dog. This sentence contains every letter of the alphabet.",
    "In a hole in the ground there lived a hobbit. Not a nasty, dirty, wet hole filled with the ends of worms and an oozy smell.",
    "To be or not to be, that is the question. Whether 'tis nobler in the mind to suffer the slings and arrows of outrageous fortune."
  ]

  const generateSpeech = async () => {
    if (!testText.trim()) {
      setError('Please enter some text to generate speech')
      return
    }

    try {
      setIsGenerating(true)
      setError(null)
      setGeneratedAudio(null)

      // Stop any currently playing audio
      if (audioRef.current) {
        audioRef.current.pause()
        setIsPlaying(false)
      }

      const response = await fetchWithAuth(`${API_URL}/voice/synthesize-elevenlabs`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: testText,
          voice_id: voice.voice_id,
          settings: {
            stability: stability / 100,
            similarity_boost: similarityBoost / 100,
            style: style / 100,
            use_speaker_boost: useSpeakerBoost
          }
        })
      })

      const data = await response.json()

      if (data.success && data.audio) {
        // Convert base64 to blob URL for audio playback
        const audioBlob = new Blob(
          [Uint8Array.from(atob(data.audio.content), c => c.charCodeAt(0))], 
          { type: 'audio/mpeg' }
        )
        const audioUrl = URL.createObjectURL(audioBlob)
        setGeneratedAudio(audioUrl)
      } else {
        setError(data.error || 'Failed to generate speech')
      }
    } catch (error) {
      console.error('Error generating speech:', error)
      setError('Failed to generate speech. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }

  const playGeneratedAudio = async () => {
    if (!generatedAudio) return

    if (isPlaying) {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
      setIsPlaying(false)
      return
    }

    try {
      const audio = new Audio(generatedAudio)
      audioRef.current = audio
      setIsPlaying(true)

      audio.onended = () => {
        setIsPlaying(false)
        audioRef.current = null
      }

      audio.onerror = () => {
        setIsPlaying(false)
        audioRef.current = null
        setError('Error playing generated audio')
      }

      await audio.play()
    } catch (error) {
      console.error('Error playing generated audio:', error)
      setIsPlaying(false)
      setError('Error playing generated audio')
    }
  }

  const downloadAudio = () => {
    if (!generatedAudio) return

    const link = document.createElement('a')
    link.href = generatedAudio
    link.download = `${voice.name.replace(/\s+/g, '_')}_test.mp3`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const resetSettings = () => {
    setStability(voice?.settings?.stability ? voice.settings.stability * 100 : 50)
    setSimilarityBoost(voice?.settings?.similarity_boost ? voice.settings.similarity_boost * 100 : 75)
    setStyle(voice?.settings?.style ? voice.settings.style * 100 : 0)
    setUseSpeakerBoost(voice?.settings?.use_speaker_boost ?? true)
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Mic className="h-5 w-5" />
            <span>Test Voice: {voice.name}</span>
            <Badge className={getCategoryColor(voice.category)}>
              {voice.category}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Text Input */}
          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Test Text</h3>
                  <div className="text-sm text-gray-500">
                    {testText.length} characters
                  </div>
                </div>
                
                <Textarea
                  placeholder="Enter the text you want to convert to speech..."
                  value={testText}
                  onChange={(e) => setTestText(e.target.value)}
                  rows={4}
                  className="resize-none"
                />

                {/* Sample Texts */}
                <div>
                  <Label className="text-sm font-medium mb-2 block">Sample Texts:</Label>
                  <div className="grid grid-cols-1 gap-2">
                    {sampleTexts.map((sample, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        size="sm"
                        onClick={() => setTestText(sample)}
                        className="text-left justify-start h-auto p-3"
                      >
                        <div className="truncate">{sample}</div>
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Voice Settings */}
          <Card>
            <CardContent className="p-6">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <SettingsIcon className="h-5 w-5" />
                    Voice Settings
                  </h3>
                  <Button variant="outline" size="sm" onClick={resetSettings}>
                    <RefreshCw className="h-4 w-4 mr-1" />
                    Reset
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Stability */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Stability</Label>
                      <span className="text-sm text-gray-500">{stability}%</span>
                    </div>
                    <Slider
                      value={[stability]}
                      onValueChange={(value) => setStability(value[0])}
                      min={0}
                      max={100}
                      step={1}
                      className="w-full"
                    />
                    <p className="text-xs text-gray-500">
                      Higher values make the voice more stable but less expressive
                    </p>
                  </div>

                  {/* Similarity Boost */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Similarity Boost</Label>
                      <span className="text-sm text-gray-500">{similarityBoost}%</span>
                    </div>
                    <Slider
                      value={[similarityBoost]}
                      onValueChange={(value) => setSimilarityBoost(value[0])}
                      min={0}
                      max={100}
                      step={1}
                      className="w-full"
                    />
                    <p className="text-xs text-gray-500">
                      Higher values make the voice more similar to the original
                    </p>
                  </div>

                  {/* Style */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Style</Label>
                      <span className="text-sm text-gray-500">{style}%</span>
                    </div>
                    <Slider
                      value={[style]}
                      onValueChange={(value) => setStyle(value[0])}
                      min={0}
                      max={100}
                      step={1}
                      className="w-full"
                    />
                    <p className="text-xs text-gray-500">
                      Higher values add more character and emotion to the voice
                    </p>
                  </div>

                  {/* Speaker Boost */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Speaker Boost</Label>
                      <Switch
                        checked={useSpeakerBoost}
                        onCheckedChange={setUseSpeakerBoost}
                      />
                    </div>
                    <p className="text-xs text-gray-500">
                      Enhances the voice for better clarity and presence
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Generation Controls */}
          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Generate & Test</h3>
                
                <div className="flex items-center gap-3">
                  <Button
                    onClick={generateSpeech}
                    disabled={isGenerating || !testText.trim()}
                    className="flex-1"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Volume2 className="h-4 w-4 mr-2" />
                        Generate Speech
                      </>
                    )}
                  </Button>

                  {generatedAudio && (
                    <>
                      <Button
                        variant="outline"
                        onClick={playGeneratedAudio}
                        disabled={isGenerating}
                      >
                        {isPlaying ? (
                          <>
                            <Pause className="h-4 w-4 mr-1" />
                            Stop
                          </>
                        ) : (
                          <>
                            <Play className="h-4 w-4 mr-1" />
                            Play
                          </>
                        )}
                      </Button>

                      <Button
                        variant="outline"
                        onClick={downloadAudio}
                        disabled={isGenerating}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>

                {error && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-sm">{error}</span>
                  </div>
                )}

                {generatedAudio && !error && (
                  <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-800">
                    <Volume2 className="h-4 w-4" />
                    <span className="text-sm">Speech generated successfully! Click play to listen.</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            <Button disabled={!generatedAudio}>
              Use This Voice
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default VoiceTestingModal
