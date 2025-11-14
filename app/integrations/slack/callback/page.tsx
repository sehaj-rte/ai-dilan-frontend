'use client'

import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'

export default function SlackCallbackPage() {
  const searchParams = useSearchParams()
  
  useEffect(() => {
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    
    if (code) {
      // Send message to parent window (the popup opener)
      if (window.opener) {
        window.opener.postMessage({
          type: 'SLACK_AUTH_SUCCESS',
          code
        }, window.location.origin)
        
        // Close this popup window after sending the message
        setTimeout(() => {
          window.close()
        }, 1000)
      } else {
        // If no opener (direct navigation), show success but don't close
        console.log('Slack authorization successful, but no opener window found')
      }
    } else {
      // Handle error
      const error = searchParams.get('error')
      if (window.opener) {
        window.opener.postMessage({
          type: 'SLACK_AUTH_ERROR',
          error: error || 'No authorization code received'
        }, window.location.origin)
        
        setTimeout(() => {
          window.close()
        }, 1000)
      } else {
        console.error('Slack authorization error:', error || 'No authorization code received')
      }
    }
  }, [searchParams])

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
      <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600 mb-4 mx-auto" />
        <h2 className="text-xl font-medium text-gray-900">Processing Slack Authorization</h2>
        <p className="text-gray-500 mt-3">Please wait while we complete your Slack integration...</p>
        <p className="text-sm text-gray-400 mt-6">This window will close automatically.</p>
      </div>
    </div>
  )
}
