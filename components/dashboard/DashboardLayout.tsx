'use client'

import React, { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Sidebar from './Sidebar'
import AvatarSettingsModal from './AvatarSettingsModal'
import { useAppSelector } from '@/store/hooks'
import { Menu, X, User, Settings, FileText, Database, Zap, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { API_URL } from '@/lib/config'
import { fetchWithAuth, getAuthHeaders } from '@/lib/api-client'

interface DashboardLayoutProps {
  children: React.ReactNode
  customHeader?: React.ReactNode
  hideDefaultHeader?: boolean
}

interface KnowledgeBaseStats {
  total_vectors: number
  total_word_count: number
  total_word_count_formatted: string
  memory_usage_mb: number
  memory_usage_formatted: string
  average_chunk_size: number
  files_processed: number
  index_utilization_percent: number
  namespace: string
  data_source: string
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children, customHeader, hideDefaultHeader = false }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [avatarSettingsOpen, setAvatarSettingsOpen] = useState(false)
  const [knowledgeBaseStats, setKnowledgeBaseStats] = useState<KnowledgeBaseStats | null>(null)
  const [loadingKBStats, setLoadingKBStats] = useState(false)
  const [projectName, setProjectName] = useState<string>('Dashboard')
  const { user } = useAppSelector((state) => state.auth)
  const pathname = usePathname()
  
  // Extract projectId from URL if we're in a project context
  const projectId = React.useMemo(() => {
    const match = pathname?.match(/\/project\/([^\/]+)/)
    return match ? match[1] : undefined
  }, [pathname])

  // Fetch project/expert name
  const fetchProjectName = async () => {
    if (!projectId) {
      setProjectName('Dashboard')
      return
    }
    
    try {
      const response = await fetchWithAuth(`${API_URL}/experts/${projectId}`, {
        headers: getAuthHeaders(),
      })
      const data = await response.json()
      
      if (data.success && data.expert) {
        setProjectName(data.expert.name || 'Project')
      } else {
        setProjectName('Project')
      }
    } catch (error) {
      console.error('Error fetching project name:', error)
      setProjectName('Project')
    }
  }

  // Fetch knowledge base statistics
  const fetchKnowledgeBaseStats = async () => {
    try {
      setLoadingKBStats(true)
      
      // Build query parameters
      const params = new URLSearchParams()
      if (projectId) {
        params.append('agent_id', projectId)
      }
      
      const response = await fetchWithAuth(`${API_URL}/knowledge-base/knowledge-base-stats?${params.toString()}`, {
        headers: getAuthHeaders(),
      })
      const data = await response.json()
      
      if (data.success) {
        setKnowledgeBaseStats({
          total_vectors: data.stats.total_vectors || 0,
          total_word_count: data.stats.total_word_count || 0,
          total_word_count_formatted: data.stats.total_word_count_formatted || '0',
          memory_usage_mb: data.stats.memory_usage_mb || 0,
          memory_usage_formatted: data.stats.memory_usage_formatted || '0 B',
          average_chunk_size: data.stats.average_chunk_size || 0,
          files_processed: data.stats.files_processed || 0,
          index_utilization_percent: data.stats.index_utilization_percent || 0,
          namespace: data.stats.namespace || '',
          data_source: data.stats.data_source || 'pinecone_only'
        })
      } else {
        setKnowledgeBaseStats(null)
      }
    } catch (error) {
      console.error('Error fetching KB stats:', error)
      setKnowledgeBaseStats(null)
    } finally {
      setLoadingKBStats(false)
    }
  }

  // Fetch project name and stats on mount and when projectId changes
  useEffect(() => {
    fetchProjectName()
    fetchKnowledgeBaseStats()
  }, [projectId])

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <Sidebar onClose={() => setSidebarOpen(false)} projectId={projectId} />
      </div>
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden lg:ml-0">
        {/* Header */}
        {!hideDefaultHeader && (
          <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                {/* Mobile menu button */}
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="lg:hidden p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                >
                  <Menu className="h-6 w-6" />
                </button>
                
                <div className="flex items-center space-x-3">
                  {/* Knowledge Base Statistics */}
                  {knowledgeBaseStats && (
                    <div className="flex items-center gap-3">
                      {/* Word Count Badge */}
                      <div 
                        className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 rounded-lg border border-blue-100 cursor-help hover:bg-blue-100 transition-colors" 
                        title={`Total words in Pinecone: ${knowledgeBaseStats.total_word_count.toLocaleString()} words`}
                      >
                        <FileText className="h-4 w-4 text-blue-600" />
                        <span className="text-blue-700 font-semibold text-sm">{knowledgeBaseStats.total_word_count_formatted}</span>
                        <span className="text-blue-600 text-xs font-medium">words</span>
                      </div>
                      
                      {/* Memory Usage Badge */}
                      <div 
                        className="flex items-center gap-2 px-3 py-1.5 bg-purple-50 rounded-lg border border-purple-100 cursor-help hover:bg-purple-100 transition-colors" 
                        title={`Pinecone storage: ${knowledgeBaseStats.memory_usage_formatted}`}
                      >
                        <Database className="h-4 w-4 text-purple-600" />
                        <span className="text-purple-700 font-semibold text-sm">{knowledgeBaseStats.memory_usage_formatted}</span>
                      </div>
                      
                      {/* Vector Count Badge */}
                      <div 
                        className="flex items-center gap-2 px-3 py-1.5 bg-green-50 rounded-lg border border-green-100 cursor-help hover:bg-green-100 transition-colors" 
                        title={`Total vectors: ${knowledgeBaseStats.total_vectors.toLocaleString()} chunks`}
                      >
                        <Zap className="h-4 w-4 text-green-600" />
                        <span className="text-green-700 font-semibold text-sm">{knowledgeBaseStats.total_vectors.toLocaleString()}</span>
                        <span className="text-green-600 text-xs font-medium">vectors</span>
                      </div>
                    </div>
                  )}
                  
                  {/* Loading indicator for KB stats */}
                  {loadingKBStats && (
                    <div className="hidden md:flex items-center space-x-2 text-sm text-gray-500">
                      <div className="h-6 w-px bg-gray-300"></div>
                      <Loader2 className="h-3 w-3 animate-spin" />
                      <span className="text-xs">Loading stats...</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-4">
                {/* Avatar Settings Button */}
                <Button
                  onClick={() => setAvatarSettingsOpen(true)}
                  variant="ghost"
                  size="sm"
                  className="flex items-center space-x-2 hover:bg-gray-100"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center border border-gray-200">
                    <User className="h-4 w-4 text-blue-600" />
                  </div>
                  <span className="hidden sm:inline text-sm font-medium text-gray-700">
                    {user?.full_name || user?.username || 'User'}
                  </span>
                  <Settings className="h-4 w-4 text-gray-500" />
                </Button>
              </div>
            </div>
          </header>
        )}
        
        {/* Custom Header */}
        {customHeader && (
          <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-6">
            <div className="flex items-center space-x-4">
              {/* Mobile menu button for custom header */}
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              >
                <Menu className="h-6 w-6" />
              </button>
              {customHeader}
            </div>
          </header>
        )}
        
        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          {children}
        </main>
      </div>
      
      {/* Avatar Settings Modal */}
      <AvatarSettingsModal
        isOpen={avatarSettingsOpen}
        onClose={() => setAvatarSettingsOpen(false)}
      />
    </div>
  )
}

export default DashboardLayout
