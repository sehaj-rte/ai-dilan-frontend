'use client'

import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import SlackImporter from '@/components/slack/SlackImporter'
import { fetchWithAuth, getAuthHeaders } from '@/lib/api-client'
import { API_URL } from '@/lib/config'
import DashboardLayout from '@/components/dashboard/DashboardLayout'

export default function SlackIntegrationPage() {
  const params = useParams()
  const projectId = params.id as string
  const [expert, setExpert] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [defaultFolderId, setDefaultFolderId] = useState<string>('Slack')

  useEffect(() => {
    const fetchExpert = async () => {
      try {
        setLoading(true)
        const response = await fetchWithAuth(`${API_URL}/experts/${projectId}`, {
          headers: getAuthHeaders()
        })
        
        if (response.ok) {
          const data = await response.json()
          setExpert(data)
        } else {
          setError('Failed to load expert details')
        }
      } catch (err) {
        setError('An error occurred while fetching expert details')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    if (projectId) {
      fetchExpert()
    }
  }, [projectId])

  const handleImportComplete = () => {
    // Could refresh knowledge base stats or show a notification
    console.log('Import completed')
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto py-6 space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              {expert?.name ? `${expert.name} - Slack Integration` : 'Slack Integration'}
              {loading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"></span>}
            </h1>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardDescription>
              Import conversations from your Slack workspace to enhance your AI expert's knowledge.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SlackImporter 
              defaultFolderId={defaultFolderId}
              agentId={expert?.elevenlabs_agent_id}
              onImportComplete={handleImportComplete}
            />
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
