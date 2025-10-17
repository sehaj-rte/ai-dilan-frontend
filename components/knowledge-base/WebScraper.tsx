'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { 
  Globe, 
  Search, 
  CheckCircle, 
  AlertCircle, 
  Loader2,
  ExternalLink,
  FileText,
  Clock,
  User,
  Hash
} from 'lucide-react'
import FolderSelector from './FolderSelector'
import { API_URL } from '@/lib/config'
import { fetchWithAuth, getAuthHeaders } from '@/lib/api-client'

interface WebScraperProps {
  defaultFolderId?: string
  hideFolderSelector?: boolean
  onScrapingComplete: () => void
  agentId?: string
}

interface WebsitePreview {
  title: string
  description: string
  domain: string
  content_preview: string
  url: string
}

interface ScrapingResult {
  website: {
    title: string
    url: string
    domain: string
    description: string
  }
  content: {
    text: string
    word_count: number
    content_length: number
    preview: string
  }
  file: {
    id: string
    name: string
    url: string
    s3_key: string
  }
}

const WebScraper: React.FC<WebScraperProps> = ({
  defaultFolderId = "uncategorized",
  hideFolderSelector = false,
  onScrapingComplete,
  agentId
}) => {
  const [url, setUrl] = useState('')
  const [customName, setCustomName] = useState('')
  const [selectedFolderId, setSelectedFolderId] = useState(defaultFolderId)
  const [isLoadingPreview, setIsLoadingPreview] = useState(false)
  const [isScraping, setIsScraping] = useState(false)
  const [preview, setPreview] = useState<WebsitePreview | null>(null)
  const [scrapingResult, setScrapingResult] = useState<ScrapingResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const isValidUrl = (url: string) => {
    try {
      new URL(url)
      return url.startsWith('http://') || url.startsWith('https://')
    } catch {
      return false
    }
  }

  const handleGetPreview = async () => {
    if (!url.trim()) {
      setError('Please enter a URL')
      return
    }

    if (!isValidUrl(url.trim())) {
      setError('Please enter a valid URL (must start with http:// or https://)')
      return
    }

    setIsLoadingPreview(true)
    setError(null)
    setPreview(null)

    try {
      const response = await fetchWithAuth(`${API_URL}/knowledge-base/website-preview`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ url: url.trim() }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.detail || 'Failed to get website preview')
      }

      if (data.success) {
        setPreview(data.preview)
        // Auto-fill custom name with page title if not already set
        if (!customName && data.preview.title) {
          setCustomName(data.preview.title)
        }
      } else {
        setError(data.error || 'Failed to get website preview')
      }
    } catch (err) {
      console.error('Preview error:', err)
      setError(err instanceof Error ? err.message : 'Failed to get website preview')
    } finally {
      setIsLoadingPreview(false)
    }
  }

  const handleScrapeAndSave = async () => {
    if (!url.trim()) {
      setError('Please enter a URL')
      return
    }

    if (!isValidUrl(url.trim())) {
      setError('Please enter a valid URL (must start with http:// or https://)')
      return
    }

    setIsScraping(true)
    setError(null)
    setScrapingResult(null)

    try {
      const response = await fetchWithAuth(`${API_URL}/knowledge-base/scrape-website`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          url: url.trim(),
          folder_id: selectedFolderId !== "uncategorized" ? selectedFolderId : null,
          custom_name: customName.trim() || null,
          agent_id: agentId
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.detail || 'Failed to scrape website')
      }

      if (data.success) {
        setScrapingResult(data)
        onScrapingComplete()
      } else {
        setError(data.error || 'Failed to scrape website')
      }
    } catch (err) {
      console.error('Scraping error:', err)
      setError(err instanceof Error ? err.message : 'Failed to scrape website')
    } finally {
      setIsScraping(false)
    }
  }

  const resetForm = () => {
    setUrl('')
    setCustomName('')
    setPreview(null)
    setScrapingResult(null)
    setError(null)
    setSelectedFolderId(defaultFolderId)
  }

  if (scrapingResult) {
    return (
      <div className="space-y-4">
        {/* Success Card */}
        <Card className="p-6 border-green-200 bg-green-50">
          <div className="flex items-start space-x-3">
            <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-green-900 mb-2">Website Scraped Successfully!</h3>
              
              {/* Website Info */}
              <div className="space-y-3 mb-4">
                <div>
                  <h4 className="font-medium text-green-800 mb-1">Website Information</h4>
                  <div className="space-y-1 text-sm text-green-700">
                    <div className="flex items-center space-x-2">
                      <Globe className="h-4 w-4" />
                      <span className="font-medium">{scrapingResult.website.title}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <ExternalLink className="h-4 w-4" />
                      <a 
                        href={scrapingResult.website.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        {scrapingResult.website.domain}
                      </a>
                    </div>
                    {scrapingResult.website.description && (
                      <p className="text-green-600 text-xs mt-1">
                        {scrapingResult.website.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Content Stats */}
                <div>
                  <h4 className="font-medium text-green-800 mb-1">Content Statistics</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm text-green-700">
                    <div className="flex items-center space-x-2">
                      <Hash className="h-4 w-4" />
                      <span>{scrapingResult.content.word_count.toLocaleString()} words</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <FileText className="h-4 w-4" />
                      <span>{(scrapingResult.content.content_length / 1024).toFixed(1)} KB</span>
                    </div>
                  </div>
                </div>

                {/* Content Preview */}
                <div>
                  <h4 className="font-medium text-green-800 mb-1">Content Preview</h4>
                  <div className="bg-white rounded p-3 text-sm text-gray-700 border">
                    {scrapingResult.content.preview}
                  </div>
                </div>

                {/* File Info */}
                <div>
                  <h4 className="font-medium text-green-800 mb-1">Saved File</h4>
                  <div className="flex items-center space-x-2 text-sm text-green-700">
                    <FileText className="h-4 w-4" />
                    <span>{scrapingResult.file.name}</span>
                  </div>
                </div>
              </div>

              <Button 
                onClick={resetForm}
                variant="outline" 
                size="sm"
                className="border-green-300 text-green-700 hover:bg-green-100"
              >
                Scrape Another Website
              </Button>
            </div>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* URL Input */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Website URL</label>
        <div className="flex space-x-2">
          <Input
            type="url"
            placeholder="https://example.com/article"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="flex-1"
          />
          <Button
            onClick={handleGetPreview}
            disabled={isLoadingPreview || !url.trim()}
            variant="outline"
            size="sm"
          >
            {isLoadingPreview ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Custom Name Input */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Custom Name (Optional)</label>
        <Input
          type="text"
          placeholder="Enter custom name for the scraped content"
          value={customName}
          onChange={(e) => setCustomName(e.target.value)}
        />
      </div>

      {/* Folder Selector */}
      {!hideFolderSelector && (
        <div className="space-y-2">
          <label className="text-sm font-medium">Save to Folder</label>
          <FolderSelector
            value={selectedFolderId}
            onChange={setSelectedFolderId}
          />
        </div>
      )}

      {/* Error Display */}
      {error && (
        <Card className="p-4 border-red-200 bg-red-50">
          <div className="flex items-start space-x-2">
            <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </Card>
      )}

      {/* Website Preview */}
      {preview && (
        <Card className="p-4 border-blue-200 bg-blue-50">
          <div className="space-y-3">
            <div className="flex items-start space-x-2">
              <Globe className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-medium text-blue-900">{preview.title}</h3>
                <p className="text-sm text-blue-600 mt-1">{preview.domain}</p>
                {preview.description && (
                  <p className="text-sm text-blue-700 mt-2">{preview.description}</p>
                )}
              </div>
            </div>
            
            {preview.content_preview && (
              <div className="bg-white rounded p-3 text-sm text-gray-700 border">
                <p className="font-medium text-gray-900 mb-1">Content Preview:</p>
                {preview.content_preview}
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex justify-between items-center pt-4">
        <div className="text-xs text-gray-500">
          <div className="flex items-center space-x-1">
            <Clock className="h-3 w-3" />
            <span>Scraping may take 10-30 seconds depending on website size</span>
          </div>
        </div>
        <Button 
          onClick={handleScrapeAndSave}
          disabled={isScraping || !url.trim()}
          className="min-w-[120px]"
        >
          {isScraping ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Scraping...
            </>
          ) : (
            <>
              <Globe className="h-4 w-4 mr-2" />
              Scrape & Save
            </>
          )}
        </Button>
      </div>

      {/* Tips */}
      <Card className="p-4 bg-gray-50 border-gray-200">
        <div className="space-y-2">
          <h4 className="font-medium text-gray-900 text-sm">💡 Tips for Web Scraping</h4>
          <ul className="text-xs text-gray-600 space-y-1">
            <li>• Works best with articles, blog posts, and documentation pages</li>
            <li>• Some websites may block scraping or require login</li>
            <li>• Content is extracted as clean text, removing navigation and ads</li>
            <li>• Use "Get Preview" to check if the website is scrapable before saving</li>
            <li>• Large websites may be truncated to 50KB to prevent timeouts</li>
          </ul>
        </div>
      </Card>
    </div>
  )
}

export default WebScraper
