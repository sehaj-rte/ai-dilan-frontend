'use client'

import { useState } from 'react'
import OpenAIChatInterface from '@/components/chat/OpenAIChatInterface'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Sparkles, Home } from 'lucide-react'
import Link from 'next/link'

export default function TestOpenAIChatPage() {
  const [expertId, setExpertId] = useState('')
  const [expertName, setExpertName] = useState('AI Assistant')
  const [isReady, setIsReady] = useState(false)

  const handleStart = () => {
    if (expertId.trim()) {
      setIsReady(true)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Sparkles className="h-8 w-8 text-purple-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">OpenAI Chat Test</h1>
              <p className="text-gray-600">Test the custom OpenAI chat implementation</p>
            </div>
          </div>
          <Link 
            href="/dashboard"
            className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg border hover:bg-gray-50 transition-colors"
          >
            <Home className="h-4 w-4" />
            Dashboard
          </Link>
        </div>

        {!isReady ? (
          /* Setup Card */
          <Card className="border-purple-200">
            <CardHeader>
              <CardTitle>Setup Test Chat</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Expert/Agent ID</label>
                <Input
                  placeholder="Enter expert ID (e.g., 123)"
                  value={expertId}
                  onChange={(e) => setExpertId(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleStart()}
                />
                <p className="text-xs text-gray-500 mt-1">
                  You can find the expert ID in the URL when viewing a project: /project/[id]
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Expert Name (Optional)</label>
                <Input
                  placeholder="AI Assistant"
                  value={expertName}
                  onChange={(e) => setExpertName(e.target.value)}
                />
              </div>

              <Button 
                onClick={handleStart}
                disabled={!expertId.trim()}
                className="w-full bg-purple-600 hover:bg-purple-700"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Start Chat Test
              </Button>

              <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h3 className="font-semibold text-blue-900 mb-2">📝 Quick Guide:</h3>
                <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                  <li>Enter an expert/agent ID from your dashboard</li>
                  <li>Click "Start Chat Test" to begin</li>
                  <li>Ask questions - the AI will search your knowledge base automatically</li>
                  <li>Watch for the "Searched knowledge base" indicator in responses</li>
                </ol>
              </div>

              <div className="grid md:grid-cols-3 gap-3 mt-4">
                <div className="p-3 bg-purple-50 rounded-lg">
                  <p className="font-semibold text-purple-900 text-sm">💰 Cost Effective</p>
                  <p className="text-xs text-purple-700 mt-1">60-80% cheaper than ElevenLabs</p>
                </div>
                <div className="p-3 bg-green-50 rounded-lg">
                  <p className="font-semibold text-green-900 text-sm">🔍 Smart Search</p>
                  <p className="text-xs text-green-700 mt-1">Auto knowledge base search</p>
                </div>
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="font-semibold text-blue-900 text-sm">⚡ Fast</p>
                  <p className="text-xs text-blue-700 mt-1">Quick GPT-4o-mini responses</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          /* Chat Interface */
          <>
            <Card className="border-purple-200 bg-white/80 backdrop-blur">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">Expert ID:</span>
                      <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">{expertId}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">Model:</span>
                      <span className="text-purple-600">gpt-4o-mini</span>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => setIsReady(false)}
                    size="sm"
                  >
                    Change Expert
                  </Button>
                </div>
              </CardContent>
            </Card>

            <div className="h-[600px]">
              <OpenAIChatInterface
                expertId={expertId}
                expertName={expertName}
                model="gpt-4o-mini"
                onError={(error) => {
                  console.error('Chat error:', error)
                  alert(`Error: ${error}`)
                }}
                className="h-full"
              />
            </div>

            <Card className="border-green-200 bg-green-50/50">
              <CardContent className="pt-6">
                <div className="text-sm space-y-2">
                  <p className="font-semibold text-green-900">✅ Testing Checklist:</p>
                  <ul className="text-green-800 space-y-1 list-disc list-inside">
                    <li>Start a chat session</li>
                    <li>Ask a general question (should respond without KB search)</li>
                    <li>Ask about your uploaded documents (should trigger KB search)</li>
                    <li>Check for "Searched knowledge base: X results found" indicator</li>
                    <li>Test conversation history (ask follow-up questions)</li>
                    <li>Test clear and end session buttons</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  )
}
