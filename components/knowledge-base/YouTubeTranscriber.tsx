'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { CheckCircle, AlertCircle, Youtube, Loader2 } from 'lucide-react'
import { API_URL } from '@/lib/config'
import { fetchWithAuth, getAuthHeaders } from '@/lib/api-client'
import FolderSelector from './FolderSelector'

interface YouTubeTranscriberProps {
  onTranscriptionComplete?: (result: any) => void
}

const YouTubeTranscriber: React.FC<YouTubeTranscriberProps> = ({ onTranscriptionComplete }) => {
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [transcriptionResult, setTranscriptionResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [currentStep, setCurrentStep] = useState<string>('')
  const [selectedFolder, setSelectedFolder] = useState<string>('Uncategorized')
  const [fileName, setFileName] = useState<string>('youtube_video')

  const isValidYouTubeUrl = (url: string) => {
    const patterns = [
      /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)[\w-]+/,
      /^(https?:\/\/)?(www\.)?youtube\.com\/embed\/[\w-]+/,
    ]
    return patterns.some(pattern => pattern.test(url))
  }

  const transcribeYouTube = async () => {
    if (!youtubeUrl.trim()) {
      setError('Please enter a YouTube URL')
      return
    }

    if (!isValidYouTubeUrl(youtubeUrl)) {
      setError('Please enter a valid YouTube URL')
      return
    }

    setIsTranscribing(true)
    setError(null)
    setTranscriptionResult(null)
    setCurrentStep('Fetching video information...')

    try {
      const response = await fetchWithAuth(`${API_URL}/knowledge-base/transcribe-youtube`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          youtube_url: youtubeUrl,
          folder: selectedFolder,
          custom_name: `${fileName}_transcription.txt`
        }),
      })

      const result = await response.json()

      if (result.success) {
        setTranscriptionResult(result)
        setCurrentStep('Complete!')
        
        // Call callback if provided
        if (onTranscriptionComplete) {
          onTranscriptionComplete(result)
        }
      } else {
        setError(result.error || 'Transcription failed')
        setCurrentStep('')
      }
    } catch (err) {
      console.error('YouTube transcription error:', err)
      setError('Failed to transcribe YouTube video. Please try again.')
      setCurrentStep('')
    } finally {
      setIsTranscribing(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isTranscribing) {
      transcribeYouTube()
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Youtube className="h-5 w-5 mr-2 text-red-600" />
          YouTube Video Transcription
        </CardTitle>
        <CardDescription>
          Paste a YouTube video URL
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Folder Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Save to Folder</label>
          <FolderSelector value={selectedFolder} onChange={setSelectedFolder} />
        </div>

        {/* File Name Input */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">File Name</label>
          <Input
            value={fileName}
            onChange={(e) => setFileName(e.target.value)}
            placeholder="Enter file name (without extension)"
          />
          <p className="text-xs text-gray-500">
            Transcription will be saved as "{fileName}_transcription.txt"
          </p>
        </div>

        {/* URL Input */}
        <div className="space-y-2">
          <label htmlFor="youtube-url" className="text-sm font-medium text-gray-700">
            YouTube Video URL
          </label>
          <div className="flex space-x-2">
            <Input
              id="youtube-url"
              type="text"
              placeholder="https://www.youtube.com/watch?v=..."
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={isTranscribing}
              className="flex-1"
            />
            <Button 
              onClick={transcribeYouTube} 
              disabled={isTranscribing || !youtubeUrl.trim()}
              className="bg-red-600 hover:bg-red-700"
            >
              {isTranscribing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Transcribe
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Progress Indicator */}
        {isTranscribing && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">{currentStep}</span>
            </div>
            <Progress value={undefined} className="h-2" />
            <div className="text-xs text-gray-500 space-y-1">
              <p>⬇️ Downloading audio from YouTube...</p>
              <p>✂️ Splitting into chunks if needed...</p>
              <p>🎙️ Transcribing with AI...</p>
              <p>💾 Saving to knowledge base...</p>
            </div>
          </div>
        )}

        {/* Transcription Result */}
        {transcriptionResult && (
          <div className="space-y-3 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <h4 className="font-medium text-green-900">Transcription Complete!</h4>
            </div>
            
            {/* Video Info */}
            <div className="space-y-2 p-3 bg-white rounded border border-gray-200">
              <div className="flex items-start space-x-2">
                <Youtube className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <h5 className="font-medium text-gray-900 truncate">
                    {transcriptionResult.video.title}
                  </h5>
                  <div className="flex items-center space-x-3 text-sm text-gray-600 mt-1">
                    <span>{transcriptionResult.video.channel}</span>
                    <span>•</span>
                    <span>{transcriptionResult.video.duration}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Transcription Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-white rounded border border-gray-200">
                <div className="text-xs text-gray-600">Word Count</div>
                <div className="text-lg font-semibold text-gray-900">
                  {transcriptionResult.transcription.word_count.toLocaleString()}
                </div>
              </div>
              <div className="p-3 bg-white rounded border border-gray-200">
                <div className="text-xs text-gray-600">Language</div>
                <div className="text-lg font-semibold text-gray-900">
                  {transcriptionResult.transcription.language.toUpperCase()}
                </div>
              </div>
            </div>

            {transcriptionResult.transcription.chunks_processed > 1 && (
              <div className="flex items-center space-x-2 text-sm text-blue-700 bg-blue-50 p-2 rounded">
                <FileText className="h-4 w-4" />
                <span>
                  Processed in {transcriptionResult.transcription.chunks_processed} chunks due to video length
                </span>
              </div>
            )}

            {/* Transcription Preview */}
            <div className="mt-3 p-3 bg-white rounded border border-gray-200">
              <div className="text-xs font-medium text-gray-600 mb-2">Preview:</div>
              <p className="text-sm text-gray-700 whitespace-pre-wrap line-clamp-4">
                {transcriptionResult.transcription.preview}
              </p>
            </div>

            {/* Saved File Info */}
            <div className="flex items-center justify-between text-sm pt-2 border-t border-gray-200">
              <span className="text-gray-600">Saved as:</span>
              <span className="font-medium text-blue-600 truncate ml-2">
                {transcriptionResult.file.name}
              </span>
            </div>

            <p className="text-xs text-gray-500 mt-2">
              The full transcription has been saved to your knowledge base and can be used by your AI experts.
            </p>
          </div>
        )}

        {/* Info Box - Commented out */}
        {/* <div className="text-xs text-gray-500 p-3 bg-gray-50 rounded-lg">
          <p><strong>How it works:</strong></p>
          <ul className="list-disc list-inside space-y-1 mt-1">
            <li>Paste any YouTube video URL</li>
            <li>Audio is automatically extracted from the video</li>
            <li>Long videos are split into 10-minute chunks</li>
            <li>Each chunk is transcribed using advanced AI</li>
            <li>All transcriptions are combined and saved to your knowledge base</li>
          </ul>
          <p className="mt-2 text-yellow-700">
            <strong>Note:</strong> Please respect copyright and only transcribe videos you have permission to use.
          </p>
        </div> */}
      </CardContent>
    </Card>
  )
}

export default YouTubeTranscriber
