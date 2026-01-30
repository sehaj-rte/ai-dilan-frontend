'use client'

import React, { useState, useEffect, useRef } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Sidebar from './Sidebar'
import AvatarSettingsModal from './AvatarSettingsModal'
import { ExpertProvider, useExpert } from '@/context/ExpertContext'
import { useAppSelector, useAppDispatch } from '@/store/hooks'
import { loadUserFromStorage, fetchCurrentUser, logout } from '@/store/slices/authSlice'
import {
  Menu,
  X,
  User,
  Settings,
  FileText,
  Database,
  Zap,
  Loader2,
  Shield,
  ChevronDown,
  LogOut,
  CreditCard,
  HelpCircle,
  Files
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { API_URL } from '@/lib/config'
import { fetchWithAuth, getAuthHeaders } from '@/lib/api-client'
import OptimizedImage from '@/components/ui/OptimizedImage'

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
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [showProfileModal, setShowProfileModal] = useState(false)
  const { expert, setExpert, kbStats, setKbStats, statusStats, setStatusStats, setIsLoadingExpert } = useExpert()
  const [loadingKBStats, setLoadingKBStats] = useState(false)
  const [loadingStatusStats, setLoadingStatusStats] = useState(false)
  const { user } = useAppSelector((state) => state.auth)
  const dispatch = useAppDispatch()
  const pathname = usePathname()

  // Load user from localStorage, then refresh from API if token exists
  useEffect(() => {
    dispatch(loadUserFromStorage())
    const token = localStorage.getItem('dilan_ai_token')
    if (token) {
      dispatch(fetchCurrentUser())
    }
  }, [dispatch])

  const getUserInitials = () => {
    if (user?.full_name) {
      const names = user.full_name.split(' ')
      return names.length > 1
        ? `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase()
        : names[0][0].toUpperCase()
    }
    return user?.email?.[0]?.toUpperCase() || 'U'
  }

  const handleLogout = () => {
    dispatch(logout())
    localStorage.removeItem('dilan_ai_token')
    localStorage.removeItem('dilan_ai_user')
    router.push('/')
  }

  // Extract projectId from URL if we're in a project context
  const projectId = React.useMemo(() => {
    const match = pathname?.match(/\/project\/([^\/]+)/)
    return match ? match[1] : undefined
  }, [pathname])

  // Fetch project/expert data
  const fetchExpertData = async () => {
    if (!projectId) {
      setExpert(null)
      return
    }

    try {
      setIsLoadingExpert(true)
      const response = await fetchWithAuth(`${API_URL}/experts/${projectId}`, {
        headers: getAuthHeaders(),
      })
      const data = await response.json()

      if (data.success && data.expert) {
        setExpert(data.expert)
      } else {
        setExpert(null)
      }
    } catch (error) {
      console.error('Error fetching expert data:', error)
      setExpert(null)
    } finally {
      setIsLoadingExpert(false)
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
        setKbStats({
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
        setKbStats(null)
      }
    } catch (error) {
      console.error('Error fetching KB stats:', error)
      setKbStats(null)
    } finally {
      setLoadingKBStats(false)
    }
  }

  // Fetch status statistics for document count
  const fetchStatusStats = async () => {
    if (!projectId) {
      setStatusStats({
        queued: 0,
        processing: 0,
        completed: 0,
        failed: 0,
        total: 0,
      })
      return
    }

    try {
      setLoadingStatusStats(true)

      // Build query parameters
      const params = new URLSearchParams()
      params.append('agent_id', projectId)

      const response = await fetchWithAuth(`${API_URL}/knowledge-base/files/stats?${params.toString()}`, {
        headers: getAuthHeaders(),
      })
      const data = await response.json()

      if (data.success) {
        setStatusStats({
          queued: data.stats.queued || 0,
          processing: data.stats.processing || 0,
          completed: data.stats.completed || 0,
          failed: data.stats.failed || 0,
          total: data.total || 0,
        })
      } else {
        console.error('Failed to fetch status stats:', data.error)
        setStatusStats({
          queued: 0,
          processing: 0,
          completed: 0,
          failed: 0,
          total: 0,
        })
      }
    } catch (error) {
      console.error('Error fetching status stats:', error)
      setStatusStats({
        queued: 0,
        processing: 0,
        completed: 0,
        failed: 0,
        total: 0,
      })
    } finally {
      setLoadingStatusStats(false)
    }
  }

  // Fetch project and stats on mount and when projectId changes
  useEffect(() => {
    if (projectId) {
      fetchExpertData()
      fetchKnowledgeBaseStats()
      fetchStatusStats()
    } else {
      setExpert(null)
      setKbStats(null)
      setStatusStats({
        queued: 0,
        processing: 0,
        completed: 0,
        failed: 0,
        total: 0,
      })
    }
  }, [projectId])

  return (
    <div className="flex h-full bg-gray-50">
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
                  {/* Knowledge Base Statistics - Show for all projects with data */}
                  {kbStats && kbStats.total_vectors > 0 && (
                    <div className="flex items-center gap-3">
                      {/* Document Count Badge */}
                      <div
                        className="flex items-center gap-2 px-3 py-1.5 bg-orange-50 rounded-lg border border-orange-100 cursor-help hover:bg-orange-100 transition-colors"
                        title={`Total documents: ${statusStats.completed.toLocaleString()} completed documents`}
                      >
                        <Files className="h-4 w-4 text-orange-600" />
                        <span className="text-orange-700 font-semibold text-sm">{statusStats.completed.toLocaleString()}</span>
                        <span className="text-orange-600 text-xs font-medium">documents</span>
                      </div>

                      {/* Word Count Badge */}
                      <div
                        className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 rounded-lg border border-blue-100 cursor-help hover:bg-blue-100 transition-colors"
                        title={`Total words: ${kbStats.total_word_count.toLocaleString()} words`}
                      >
                        <FileText className="h-4 w-4 text-blue-600" />
                        <span className="text-blue-700 font-semibold text-sm">{kbStats.total_word_count_formatted}</span>
                        <span className="text-blue-600 text-xs font-medium">words</span>
                      </div>

                      {/* Memory Usage Badge */}
                      <div
                        className="flex items-center gap-2 px-3 py-1.5 bg-purple-50 rounded-lg border border-purple-100 cursor-help hover:bg-purple-100 transition-colors"
                        title={`Storage: ${kbStats.memory_usage_formatted}`}
                      >
                        <Database className="h-4 w-4 text-purple-600" />
                        <span className="text-purple-700 font-semibold text-sm">{kbStats.memory_usage_formatted}</span>
                      </div>

                      {/* Vector Count Badge */}
                      <div
                        className="flex items-center gap-2 px-3 py-1.5 bg-green-50 rounded-lg border border-green-100 cursor-help hover:bg-green-100 transition-colors"
                        title={`Total vectors: ${kbStats.total_vectors.toLocaleString()} chunks`}
                      >
                        <Zap className="h-4 w-4 text-green-600" />
                        <span className="text-green-700 font-semibold text-sm">{kbStats.total_vectors.toLocaleString()}</span>
                        <span className="text-green-600 text-xs font-medium">vectors</span>
                      </div>
                    </div>
                  )}

                  {/* Loading indicator for KB stats */}
                  {(loadingKBStats || loadingStatusStats) && (
                    <div className="hidden md:flex items-center space-x-2 text-sm text-gray-500">
                      <div className="h-6 w-px bg-gray-300"></div>
                      <Loader2 className="h-3 w-3 animate-spin" />
                      <span className="text-xs">Loading stats...</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-4">
                {/* Super Admin Text - Only show for super_admin role */}
                {user?.role === 'super_admin' && (
                  <div className="flex items-center space-x-2 px-3 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg cursor-default">
                    <Shield className="h-4 w-4" />
                    <span className="text-sm font-medium">
                      Super Admin
                    </span>
                  </div>
                )}

                {/* Profile Avatar and Settings */}
                <div className="flex items-center gap-3">
                  {/* Avatar */}
                  <div className="relative">
                    {user?.avatar_url ? (
                      <OptimizedImage
                        src={user.avatar_url}
                        alt="Profile"
                        className="w-8 h-8 rounded-full object-cover"
                        fallbackClassName="w-8 h-8 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center"
                        fallbackIcon={
                          <span className="text-blue-600 text-sm font-semibold">
                            {(expert?.name?.charAt(0) || "P").toUpperCase()}
                          </span>
                        }
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center">
                        <span className="text-blue-600 text-sm font-semibold">
                          {(expert?.name?.charAt(0) || "P").toUpperCase()}
                        </span>
                      </div>
                    )}
                    {/* Online indicator */}
                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 border-2 border-white rounded-full"></div>
                  </div>

                  {/* Settings Button */}
                  <Button
                    onClick={() => setShowProfileModal(true)}
                    variant="ghost"
                    size="sm"
                    className="p-2 hover:bg-gray-100 rounded-lg"
                  >
                    <Settings className="h-5 w-5 text-gray-600" />
                  </Button>
                </div>
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

      {/* Profile Settings Modal */}
      <AvatarSettingsModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
      />
    </div>
  )
}

export default DashboardLayout
