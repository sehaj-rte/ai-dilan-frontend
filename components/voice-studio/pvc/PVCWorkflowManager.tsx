'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Loader2, Shield, Zap, CheckCircle } from 'lucide-react'
import { getAuthHeaders } from '@/lib/api-client'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface PVCWorkflowManagerProps {
  voiceId: string
  voiceName: string
  status: string
  onStatusUpdate?: () => void
}

export default function PVCWorkflowManager({ 
  voiceId, 
  voiceName, 
  status,
  onStatusUpdate 
}: PVCWorkflowManagerProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  
  // Step 3 - Verification
  const [extraText, setExtraText] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [verificationRequested, setVerificationRequested] = useState(status === 'verification_requested')

  const handleRequestVerification = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const formData = new FormData()
      if (extraText.trim()) {
        formData.append('extra_text', extraText.trim())
      }

      const response = await fetch(`${API_URL}/pvc/${voiceId}/request-verification`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: formData
      })

      const data = await response.json()

      if (response.ok) {
        setVerificationRequested(true)
        setSuccess('Verification requested! Check ElevenLabs for CAPTCHA.')
        onStatusUpdate?.()
      } else {
        setError(data.detail || 'Failed to request verification')
      }
    } catch (error) {
      setError('Network error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const handleVerifyCaptcha = async () => {
    if (!verificationCode.trim()) return

    setIsLoading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('verification_code', verificationCode.trim())

      const response = await fetch(`${API_URL}/pvc/${voiceId}/verify-captcha`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: formData
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess('CAPTCHA verified! You can now train your voice.')
        onStatusUpdate?.()
      } else {
        setError(data.detail || 'Failed to verify CAPTCHA')
      }
    } catch (error) {
      setError('Network error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const handleStartTraining = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`${API_URL}/pvc/${voiceId}/train`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: new FormData()
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess('Training started! This may take several minutes.')
        onStatusUpdate?.()
      } else {
        setError(data.detail || 'Failed to start training')
      }
    } catch (error) {
      setError('Network error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusBadge = () => {
    switch (status) {
      case 'processing':
        return <Badge variant="secondary">Samples Uploaded</Badge>
      case 'verification_requested':
        return <Badge className="bg-yellow-100 text-yellow-800">Verification Requested</Badge>
      case 'verified':
        return <Badge className="bg-blue-100 text-blue-800">Verified - Ready to Train</Badge>
      case 'training':
        return <Badge className="bg-purple-100 text-purple-800">Training...</Badge>
      case 'completed':
        return <Badge className="bg-green-100 text-green-800">Ready to Use!</Badge>
      default:
        return <Badge variant="secondary">Unknown Status</Badge>
    }
  }

  const renderCurrentStep = () => {
    switch (status) {
      case 'processing':
        return (
          <div className="space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Step 3: Request Verification
            </h3>
            <Textarea
              value={extraText}
              onChange={(e) => setExtraText(e.target.value)}
              placeholder="Describe your use case (optional)"
              rows={3}
              maxLength={200}
            />
            <Button
              onClick={handleRequestVerification}
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Requesting...</>
              ) : (
                <><Shield className="w-4 h-4 mr-2" />Request Verification</>
              )}
            </Button>
          </div>
        )

      case 'verification_requested':
        return (
          <div className="space-y-4">
            <h3 className="font-semibold">Step 3b: Enter CAPTCHA Code</h3>
            <p className="text-sm text-gray-600">
              Check your ElevenLabs dashboard for the verification code.
            </p>
            <Input
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
              placeholder="Enter verification code"
            />
            <Button
              onClick={handleVerifyCaptcha}
              disabled={isLoading || !verificationCode.trim()}
              className="w-full"
            >
              {isLoading ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Verifying...</>
              ) : (
                <><CheckCircle className="w-4 h-4 mr-2" />Verify CAPTCHA</>
              )}
            </Button>
          </div>
        )

      case 'verified':
        return (
          <div className="space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Zap className="w-5 h-5" />
              Step 4: Train Your Voice
            </h3>
            <p className="text-sm text-gray-600">
              Start the fine-tuning process to create your high-quality voice clone.
            </p>
            <Button
              onClick={handleStartTraining}
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Starting Training...</>
              ) : (
                <><Zap className="w-4 h-4 mr-2" />Start Training</>
              )}
            </Button>
          </div>
        )

      case 'training':
        return (
          <div className="text-center py-4">
            <Loader2 className="w-8 h-8 mx-auto animate-spin text-purple-600 mb-2" />
            <h3 className="font-semibold">Training in Progress</h3>
            <p className="text-sm text-gray-600">
              Your voice is being fine-tuned. This usually takes 10-20 minutes.
            </p>
          </div>
        )

      case 'completed':
        return (
          <div className="text-center py-4">
            <CheckCircle className="w-8 h-8 mx-auto text-green-600 mb-2" />
            <h3 className="font-semibold text-green-800">Voice Ready!</h3>
            <p className="text-sm text-gray-600">
              Your professional voice clone is ready to use for text-to-speech.
            </p>
          </div>
        )

      default:
        return (
          <p className="text-gray-600">Status: {status}</p>
        )
    }
  }

  return (
    <div className="border rounded-lg p-4 bg-white">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">{voiceName}</h2>
        {getStatusBadge()}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-800 text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded text-green-800 text-sm">
          {success}
        </div>
      )}

      {renderCurrentStep()}
    </div>
  )
}
