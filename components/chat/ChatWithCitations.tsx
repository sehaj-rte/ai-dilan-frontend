'use client'

import React, { useState } from 'react'
import ChatModeInterface from './ChatModeInterface'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface Citation {
  id: number
  filename: string
  chunk_index: number
  relevance: number
}

interface ChatWithCitationsProps {
  expertId: string
  expertName?: string
  textOnly?: boolean
  onError?: (error: string) => void
  onStatusChange?: (status: 'disconnected' | 'connecting' | 'connected') => void
  className?: string
}

const ChatWithCitations: React.FC<ChatWithCitationsProps> = ({
  expertId,
  expertName = 'AI Agent',
  textOnly = false,
  onError,
  onStatusChange,
  className = ''
}) => {
  const [citationsEnabled, setCitationsEnabled] = useState(false)

  // Example citation data - this would typically come from your knowledge base search
  const sampleCitations: Citation[] = [
    { id: 1, filename: "5 Awwak final .pdf", relevance: 57, chunk_index: 0 },
    { id: 2, filename: "5 Awwak final .pdf", relevance: 57, chunk_index: 0 },
    { id: 3, filename: "5 Awwak final .pdf", relevance: 57, chunk_index: 0 }
  ]

  // Create dynamic variables for ElevenLabs agent
  const dynamicVariables = citationsEnabled ? {
    CITATIONS_DATA: JSON.stringify(sampleCitations)
  } : undefined

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Citation Controls */}
      <Card className="mb-4">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Citation Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Enable Citations</p>
              <p className="text-xs text-gray-500">
                Send citation data as dynamic variables to the agent
              </p>
            </div>
            <Button
              variant={citationsEnabled ? "default" : "outline"}
              size="sm"
              onClick={() => setCitationsEnabled(!citationsEnabled)}
            >
              {citationsEnabled ? "Enabled" : "Disabled"}
            </Button>
          </div>
          
          {citationsEnabled && (
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs font-medium text-gray-700 mb-2">
                Dynamic Variable Preview:
              </p>
              <pre className="text-xs text-gray-600 overflow-x-auto">
                {JSON.stringify({ CITATIONS_DATA: JSON.stringify(sampleCitations) }, null, 2)}
              </pre>
            </div>
          )}
          
          <div className="text-xs text-gray-500">
            <p><strong>How it works:</strong></p>
            <ul className="list-disc list-inside space-y-1 mt-1">
              <li>Citation data is sent as <code className="bg-gray-100 px-1 rounded">{'{{CITATIONS_DATA}}'}</code> variable</li>
              <li>Agent can reference citations in responses using the variable</li>
              <li>Citations appear in agent responses with proper formatting</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Chat Interface */}
      <div className="flex-1 min-h-0">
        <ChatModeInterface
          expertId={expertId}
          expertName={expertName}
          textOnly={textOnly}
          onError={onError}
          onStatusChange={onStatusChange}
          dynamicVariables={dynamicVariables}
          className="h-full"
        />
      </div>
    </div>
  )
}

export default ChatWithCitations
