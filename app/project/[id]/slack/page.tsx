'use client'

import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import SlackImporter from '@/components/slack/SlackImporter'
import { fetchWithAuth, getAuthHeaders } from '@/lib/api-client'
import { API_URL } from '@/lib/config'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import FolderSelector from '@/components/knowledge-base/FolderSelector'

export default function SlackIntegrationPage() {
  const params = useParams()
  const projectId = params.id as string
  console.log('Slack page: Project ID from params:', projectId)
  const [expert, setExpert] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedFolderId, setSelectedFolderId] = useState<string>('')

  useEffect(() => {
    const fetchExpert = async () => {
      try {
        console.log('Slack page: Fetching expert with projectId:', projectId)
        setLoading(true)
        const response = await fetchWithAuth(`${API_URL}/experts/${projectId}`, {
          headers: getAuthHeaders()
        })
        console.log('Slack page: API response status:', response.status)
        
        if (response.ok) {
          const data = await response.json()
          console.log('Slack page: Expert data received:', data)
          
          // Extract the expert object from the response
          const expertData = data.expert || data
          console.log('Slack page: Extracted expert data:', expertData)
          console.log('Slack page: Agent ID:', expertData?.elevenlabs_agent_id)
          console.log('Slack page: Expert ID:', expertData?.id)
          
          setExpert(expertData)
        } else {
          const errorText = await response.text()
          console.error('Slack page: Failed to load expert details:', response.status, errorText)
          setError(`Failed to load expert details: ${response.status} ${errorText}`)
        }
      } catch (err) {
        console.error('Slack page: Error fetching expert details:', err)
        setError(`An error occurred while fetching expert details: ${err instanceof Error ? err.message : String(err)}`)
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    if (projectId) {
      fetchExpert()
    }
  }, [projectId])

  // Add effect to log when expert data changes
  useEffect(() => {
    console.log('Slack page: Expert state updated:', expert)
    if (expert) {
      console.log('Slack page: Expert ID from state:', expert.id)
      console.log('Slack page: Agent ID from state:', expert.elevenlabs_agent_id)
      console.log('Slack page: Checking all possible agent ID fields:', {
        agent_id: expert.agent_id,
        elevenlabs_agent_id: expert.elevenlabs_agent_id,
        id: expert.id
      })
    } else {
      console.log('Slack page: Expert data is null or undefined')
    }
  }, [expert])

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

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error Loading Expert</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error}</p>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <Card>
          <CardHeader>
            <CardDescription>
              Import conversations from your Slack workspace to enhance your AI expert's knowledge.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Folder Selection */}
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Select Destination Folder</h3>
                <p className="text-xs text-gray-500">
                  Choose a folder where Slack conversations will be stored in your knowledge base.
                </p>
                {loading ? (
                  <div className="flex items-center space-x-2 py-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"></div>
                    <span className="text-sm text-gray-500">Loading folders...</span>
                  </div>
                ) : expert ? (
                  <FolderSelector 
                    value={selectedFolderId} 
                    onChange={setSelectedFolderId} 
                    className="mt-1"
                    agentId={projectId} // Use projectId directly as the agent_id
                  />
                ) : (
                  <div className="text-sm text-amber-600 p-2 bg-amber-50 rounded border border-amber-200">
                    Expert data not available. Cannot load folders.
                  </div>
                )}
              </div>
              
              {/* Slack Importer */}
              <SlackImporter 
                defaultFolderId={selectedFolderId}
                agentId={projectId} // Use projectId directly as the agent_id
                onImportComplete={handleImportComplete}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
