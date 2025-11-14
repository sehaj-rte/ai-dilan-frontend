
'use client'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { fetchWithAuth, getAuthHeaders } from '@/lib/api-client'
import { API_URL } from '@/lib/config'
import {
    AlertCircle,
    CheckCircle,
    ExternalLink,
    Hash,
    Loader2,
    Lock,
    MessageSquare
} from 'lucide-react'
import React, { useEffect, useState } from 'react'

interface SlackImporterProps {
  defaultFolderId?: string
  hideFolderSelector?: boolean
  agentId?: string
  onImportComplete: () => void
}

interface SlackChannel {
  id: string
  name: string
  is_private: boolean
}

interface ImportResult {
  channel_id: string
  channel_name: string
  file_id: string
  filename: string
  word_count: number
}

const SlackImporter: React.FC<SlackImporterProps> = ({
  defaultFolderId,
  hideFolderSelector = false,
  agentId,
  onImportComplete
}) => {
  const [isConnected, setIsConnected] = useState(false)
  const [channels, setChannels] = useState<SlackChannel[]>([])
  const [selectedChannels, setSelectedChannels] = useState<string[]>([])
  const [dateRange, setDateRange] = useState('last_30_days')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  const [loading, setLoading] = useState(false)
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [importResults, setImportResults] = useState<{
    processed: ImportResult[]
    failed: any[]
  } | null>(null)

  // Check if user is already connected
  useEffect(() => {
    checkConnection()
  }, [])

  const checkConnection = async () => {
    try {
      setLoading(true)
      
      // Use fetchWithAuth with proper auth headers
      const response = await fetchWithAuth(`${API_URL}/slack/channels`, {
        headers: getAuthHeaders()
      })
      
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setIsConnected(true)
          setChannels(data.channels || [])
        }
      } else if (response.status === 400 || response.status === 401) {
        // Not connected yet - this is expected
        setIsConnected(false)
      } else {
        // Other errors
        console.error('Unexpected error checking Slack connection:', response.status)
        setIsConnected(false)
      }
    } catch (error) {
      console.error('Error checking Slack connection:', error)
      setIsConnected(false)
    } finally {
      setLoading(false)
    }
  }

  const connectSlack = () => {
    const clientId = process.env.NEXT_PUBLIC_SLACK_CLIENT_ID
    const redirectUri = process.env.NEXT_PUBLIC_SLACK_REDIRECT_URI
    const scopes = 'channels:read,groups:read,users:read,channels:history,groups:history,im:history,mpim:history,channels:join'
    
    if (!clientId || !redirectUri) {
      setError('Slack configuration missing. Please check environment variables.')
      return
    }
    
    const slackAuthUrl = `https://slack.com/oauth/v2/authorize?` +
      `client_id=${clientId}&` +
      `scope=${scopes}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}`
    
    // Open Slack OAuth in a popup
    const popup = window.open(slackAuthUrl, 'slack-auth', 'width=600,height=600')
    
    // Listen for messages from the popup
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return
      
      if (event.data.type === 'SLACK_AUTH_SUCCESS' && event.data.code) {
        exchangeCodeForToken(event.data.code)
        popup?.close()
        window.removeEventListener('message', handleMessage)
      } else if (event.data.type === 'SLACK_AUTH_ERROR') {
        setError(event.data.error || 'Authentication failed')
        popup?.close()
        window.removeEventListener('message', handleMessage)
      }
    }
    
    window.addEventListener('message', handleMessage)
    
    // Clean up if popup is closed manually
    const checkClosed = setInterval(() => {
      if (popup?.closed) {
        clearInterval(checkClosed)
        window.removeEventListener('message', handleMessage)
      }
    }, 1000)
  }

  const exchangeCodeForToken = async (code: string) => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetchWithAuth(`${API_URL}/slack/oauth/exchange`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ code })
      })
      
      const data = await response.json()
      
      if (data.success) {
        setIsConnected(true)
        // Fetch channels after successful connection
        await checkConnection()
      } else {
        setError(data.error || 'Failed to connect to Slack')
      }
    } catch (error: any) {
      console.error('Error exchanging code:', error)
      setError(error.message || 'Failed to connect to Slack')
    } finally {
      setLoading(false)
    }
  }

  const handleChannelToggle = (channelId: string) => {
    setSelectedChannels(prev => 
      prev.includes(channelId)
        ? prev.filter(id => id !== channelId)
        : [...prev, channelId]
    )
  }

  const handleSelectAll = () => {
    if (selectedChannels.length === channels.length) {
      setSelectedChannels([])
    } else {
      setSelectedChannels(channels.map(ch => ch.id))
    }
  }

  const handleImport = async () => {
    if (selectedChannels.length === 0) {
      setError('Please select at least one channel')
      return
    }

    try {
      setImporting(true)
      setError(null)
      setImportResults(null)

      const importData = {
        channel_ids: selectedChannels,
        date_range_option: dateRange,
        custom_start_date: dateRange === 'custom' ? customStartDate : undefined,
        custom_end_date: dateRange === 'custom' ? customEndDate : undefined,
        agent_id: agentId,
        folder_id: defaultFolderId
      }

      const response = await fetchWithAuth(`${API_URL}/slack/import`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(importData)
      })

      const data = await response.json()

      if (data.success) {
        setImportResults({
          processed: data.processed || [],
          failed: data.failed || []
        })
        
        // Call completion callback after brief delay
        setTimeout(() => {
          onImportComplete()
        }, 1000)
      } else {
        setError(data.error || 'Import failed')
      }
    } catch (error: any) {
      console.error('Error importing Slack data:', error)
      setError(error.message || 'Import failed')
    } finally {
      setImporting(false)
    }
  }

  const dateRangeOptions = [
    { value: 'last_1_day', label: 'Last 24 hours' },
    { value: 'last_7_days', label: 'Last 7 days' },
    { value: 'last_15_days', label: 'Last 15 days' },
    { value: 'last_1_month', label: 'Last 30 days' },
    { value: 'last_3_months', label: 'Last 3 months' },
    { value: 'last_6_months', label: 'Last 6 months' },
    { value: 'custom', label: 'Custom date range' }
  ]

  if (loading && !isConnected) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">Checking Slack connection...</span>
      </div>
    )
  }

  if (!isConnected) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center mx-auto mb-4">
            <MessageSquare className="h-8 w-8 text-purple-600" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Connect to Slack</h3>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            Connect your Slack workspace to import channel conversations into your knowledge base.
          </p>
          
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}
          
          <Button onClick={connectSlack} disabled={loading} className="bg-purple-600 hover:bg-purple-700">
            <ExternalLink className="h-4 w-4 mr-2" />
            {loading ? 'Connecting...' : 'Connect Slack Workspace'}
          </Button>
        </div>
        
       
      </div>
    )
  }

  if (importResults) {
    return (
      <div className="space-y-6">
        <div className="text-center py-6">
          <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Import Complete!</h3>
          <p className="text-gray-600">
            Successfully imported {importResults.processed.length} channel(s) to your knowledge base.
          </p>
        </div>

        {importResults.processed.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-gray-900">Imported Channels</h4>
            <div className="space-y-2">
              {importResults.processed.map((result, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Hash className="h-4 w-4 text-green-600" />
                    <span className="font-medium text-green-900">#{result.channel_name}</span>
                  </div>
                  <span className="text-sm text-green-700">
                    {result.word_count.toLocaleString()} words
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {importResults.failed.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-gray-900">Failed Imports</h4>
            <div className="space-y-2">
              {importResults.failed.map((failure, index) => (
                <div key={index} className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="h-4 w-4 text-red-600" />
                    <span className="font-medium text-red-900">Channel {failure.channel_id}</span>
                  </div>
                  <p className="text-sm text-red-700 mt-1">{failure.error}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Channel Selection */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-base font-medium">Select Channels ({channels.length} available)</Label>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSelectAll}
          >
            {selectedChannels.length === channels.length ? 'Deselect All' : 'Select All'}
          </Button>
        </div>

        <div className="border rounded-lg max-h-64 overflow-y-auto">
          {channels.map((channel) => (
            <div key={channel.id} className="flex items-center space-x-3 p-3 border-b last:border-b-0 hover:bg-gray-50">
              <Checkbox
                checked={selectedChannels.includes(channel.id)}
                onChange={() => handleChannelToggle(channel.id)}
              />
              <div className="flex items-center space-x-2 flex-1">
                {channel.is_private ? (
                  <Lock className="h-4 w-4 text-gray-500" />
                ) : (
                  <Hash className="h-4 w-4 text-gray-500" />
                )}
                <span className="font-medium">#{channel.name}</span>
                {channel.is_private && (
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">Private</span>
                )}
              </div>
            </div>
          ))}
        </div>

        <p className="text-sm text-gray-600">
          Selected {selectedChannels.length} of {channels.length} channels
        </p>
      </div>

      {/* Date Range Selection */}
      <div className="space-y-4">
        <Label className="text-base font-medium">Date Range</Label>
        
        <div className="grid grid-cols-2 gap-2">
          {dateRangeOptions.map((option) => (
            <label key={option.value} className="flex items-center space-x-2 cursor-pointer">
              <input
                type="radio"
                name="dateRange"
                value={option.value}
                checked={dateRange === option.value}
                onChange={(e) => setDateRange(e.target.value)}
                className="text-blue-600"
              />
              <span className="text-sm">{option.label}</span>
            </label>
          ))}
        </div>

        {dateRange === 'custom' && (
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div>
              <Label htmlFor="startDate" className="text-sm">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="endDate" className="text-sm">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
        )}
      </div>

      {/* Import Button */}
      <div className="flex justify-end space-x-3">
        <Button
          onClick={handleImport}
          disabled={importing || selectedChannels.length === 0}
          className="bg-purple-600 hover:bg-purple-700"
        >
          {importing ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Importing...
            </>
          ) : (
            <>
              <MessageSquare className="h-4 w-4 mr-2" />
              Import {selectedChannels.length} Channel{selectedChannels.length !== 1 ? 's' : ''}
            </>
          )}
        </Button>
      </div>

      {importing && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
            <span className="text-blue-800 font-medium">Processing Slack messages...</span>
          </div>
          <p className="text-blue-700 text-sm mt-1">
            This may take a few minutes depending on the amount of data.
          </p>
        </div>
      )}
    </div>
  )
}

export default SlackImporter
