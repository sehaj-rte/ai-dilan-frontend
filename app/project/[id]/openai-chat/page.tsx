'use client'

import { useParams } from 'next/navigation'
import OpenAIChatInterface from '@/components/chat/OpenAIChatInterface'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { API_URL } from '@/lib/config'

export default function OpenAIChatTestPage() {
  const params = useParams()
  const expertId = params.id as string
  const [expertData, setExpertData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchExpert = async () => {
      try {
        const response = await fetch(`${API_URL}/experts/${expertId}`)
        const data = await response.json()
        if (data.success) {
          setExpertData(data.expert)
        }
      } catch (error) {
        console.error('Error fetching expert:', error)
      } finally {
        setLoading(false)
      }
    }

    if (expertId) {
      fetchExpert()
    }
  }, [expertId])

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link 
              href={`/project/${expertId}`}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
              Back to Project
            </Link>
          </div>
        </div>

        {/* Info Card */}
        <Card className="border-purple-200 bg-white/80 backdrop-blur">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Sparkles className="h-6 w-6 text-purple-600" />
              <div>
                <CardTitle className="text-2xl">OpenAI Chat Test</CardTitle>
                <p className="text-sm text-gray-600 mt-1">
                  Testing custom OpenAI chat with knowledge base search
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-4">
                <p className="text-gray-500">Loading expert data...</p>
              </div>
            ) : expertData ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">Expert:</span>
                  <span>{expertData.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">Description:</span>
                  <span className="text-gray-600">{expertData.description || 'No description'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">Model:</span>
                  <span className="text-purple-600">gpt-4o-mini</span>
                </div>
                <div className="mt-4 p-3 bg-purple-50 rounded-lg border border-purple-200">
                  <p className="text-sm text-purple-900">
                    <strong>💡 Features:</strong> This chat uses OpenAI with automatic knowledge base search. 
                    When you ask questions, it will search your uploaded documents and provide accurate answers.
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-red-500">Expert not found</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Chat Interface */}
        <div className="h-[600px]">
          {expertData && (
            <OpenAIChatInterface
              expertId={expertId}
              expertName={expertData.name}
              expertAvatarUrl={expertData.avatar_url}
              model="gpt-4o-mini"
              onError={(error) => console.error('Chat error:', error)}
              className="h-full"
            />
          )}
        </div>

        {/* Info Footer */}
        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="pt-6">
            <div className="grid md:grid-cols-3 gap-4 text-sm">
              <div>
                <h3 className="font-semibold text-blue-900 mb-2">💰 Cost Effective</h3>
                <p className="text-blue-700">60-80% cheaper than ElevenLabs for text chat</p>
              </div>
              <div>
                <h3 className="font-semibold text-blue-900 mb-2">🔍 Smart Search</h3>
                <p className="text-blue-700">Automatically searches your knowledge base when needed</p>
              </div>
              <div>
                <h3 className="font-semibold text-blue-900 mb-2">⚡ Fast Responses</h3>
                <p className="text-blue-700">Quick responses with GPT-4o-mini model</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
