'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useAppSelector, useAppDispatch } from '@/store/hooks'
import { logout, fetchCurrentUser } from '@/store/slices/authSlice'
import { API_URL } from '@/lib/config'
import { fetchWithAuth, getAuthHeaders } from '@/lib/api-client'
import { 
  Brain, 
  Plus,
  User,
  Settings,
  Play,
  Trash2,
  AlertTriangle,
  Search,
  Calendar,
  Folder,
  LogOut,
  FileText,
  Database,
  Zap,
  BarChart3,
  Globe,
  Share2
} from 'lucide-react'

interface Project {
  id: string
  name: string
  description: string
  avatar_url: string | null
  elevenlabs_agent_id: string
  is_active: boolean
  created_at: string
  is_published?: boolean
  publication_slug?: string
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

const ProjectsPage = () => {
  const { user } = useAppSelector((state) => state.auth)
  const dispatch = useAppDispatch()
  const router = useRouter()
  const [projects, setProjects] = useState<Project[]>([])
  const [loadingProjects, setLoadingProjects] = useState(true)
  const [deletingProject, setDeletingProject] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [knowledgeBaseStats, setKnowledgeBaseStats] = useState<KnowledgeBaseStats | null>(null)
  const [loadingKBStats, setLoadingKBStats] = useState(false)
  const [publishingProject, setPublishingProject] = useState<string | null>(null)
  const [publications, setPublications] = useState<{[key: string]: any}>({})
  const [showPublishModal, setShowPublishModal] = useState<string | null>(null)

  useEffect(() => {
    // Fetch fresh user data on page load
    dispatch(fetchCurrentUser())
    fetchProjects()
    fetchKnowledgeBaseStats()
  }, [dispatch])
  
  console.log('user ::::',user)
  const fetchKnowledgeBaseStats = async () => {
    try {
      setLoadingKBStats(true)
      
      const response = await fetchWithAuth(`${API_URL}/knowledge-base/knowledge-base-stats`, {
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
        console.error('Failed to fetch KB stats:', data.error)
        setKnowledgeBaseStats(null)
      }
    } catch (error) {
      console.error('Error fetching KB stats:', error)
      setKnowledgeBaseStats(null)
    } finally {
      setLoadingKBStats(false)
    }
  }

  const handleLogout = () => {
    dispatch(logout())
    router.push('/auth/login')
  }

  const convertS3UrlToProxy = (s3Url: string): string => {
    if (!s3Url) return s3Url
    
    // Convert S3 URL to proxy URL
    const match = s3Url.match(/https:\/\/ai-dilan\.s3\.[^/]+\.amazonaws\.com\/(.+)/)
    if (match) {
      return `${API_URL}/images/avatar/full/${match[1]}`
    }
    return s3Url
  }

  const fetchProjects = async () => {
    try {
      setLoadingProjects(true)
      const response = await fetchWithAuth(`${API_URL}/experts/`, {
        headers: getAuthHeaders(),
      })
      const data = await response.json()
      
      if (data.success && data.experts) {
        // Convert S3 URLs to proxy URLs
        const projectsWithProxyUrls = data.experts.map((project: Project) => ({
          ...project,
          avatar_url: project.avatar_url ? convertS3UrlToProxy(project.avatar_url) : null
        }))
        setProjects(projectsWithProxyUrls)
      } else {
        console.error('Failed to fetch projects:', data.error)
        setProjects([])
      }
    } catch (error) {
      console.error('Error fetching projects:', error)
      setProjects([])
    } finally {
      setLoadingProjects(false)
    }
  }

  const handleDeleteProject = async (projectId: string) => {
    try {
      setDeletingProject(projectId)
      const response = await fetchWithAuth(`${API_URL}/experts/${projectId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      })
      const data = await response.json()
      
      if (data.success) {
        setProjects(projects.filter(project => project.id !== projectId))
        setShowDeleteConfirm(null)
        console.log('Project deleted successfully:', data.message)
      } else {
        console.error('Failed to delete project:', data.error)
        alert('Failed to delete project: ' + data.error)
      }
    } catch (error) {
      console.error('Error deleting project:', error)
      alert('Error deleting project. Please try again.')
    } finally {
      setDeletingProject(null)
    }
  }

  const handleProjectClick = (projectId: string) => {
    router.push(`/project/${projectId}`)
  }

  // Fetch publication status for a project
  const fetchPublicationStatus = async (projectId: string) => {
    try {
      const response = await fetchWithAuth(`${API_URL}/publishing/experts/${projectId}/publication`, {
        headers: getAuthHeaders(),
      })
      const data = await response.json()
      
      if (data.success && data.publication) {
        setPublications(prev => ({
          ...prev,
          [projectId]: data.publication
        }))
        return data.publication
      }
      return null
    } catch (error) {
      console.error('Error fetching publication status:', error)
      return null
    }
  }

  // Handle publishing a project
  const handlePublishProject = async (projectId: string) => {
    try {
      setPublishingProject(projectId)
      
      // First check if publication exists
      const existingPublication = await fetchPublicationStatus(projectId)
      
      if (existingPublication) {
        // If publication exists, just publish it
        const response = await fetchWithAuth(`${API_URL}/publishing/experts/${projectId}/publish`, {
          method: 'POST',
          headers: getAuthHeaders(),
        })
        const data = await response.json()
        
        if (data.success) {
          // Update local state
          setPublications(prev => ({
            ...prev,
            [projectId]: { ...prev[projectId], is_published: true }
          }))
          alert('Project published successfully!')
        } else {
          alert('Failed to publish project: ' + data.error)
        }
      } else {
        // If no publication exists, redirect to publishing setup
        router.push(`/dashboard/experts/${projectId}/publish`)
      }
    } catch (error) {
      console.error('Error publishing project:', error)
      alert('Error publishing project. Please try again.')
    } finally {
      setPublishingProject(null)
      setShowPublishModal(null)
    }
  }

  // Handle unpublishing a project
  const handleUnpublishProject = async (projectId: string) => {
    try {
      setPublishingProject(projectId)
      
      const response = await fetchWithAuth(`${API_URL}/publishing/experts/${projectId}/unpublish`, {
        method: 'POST',
        headers: getAuthHeaders(),
      })
      const data = await response.json()
      
      if (data.success) {
        // Update local state
        setPublications(prev => ({
          ...prev,
          [projectId]: { ...prev[projectId], is_published: false }
        }))
        alert('Project unpublished successfully!')
      } else {
        alert('Failed to unpublish project: ' + data.error)
      }
    } catch (error) {
      console.error('Error unpublishing project:', error)
      alert('Error unpublishing project. Please try again.')
    } finally {
      setPublishingProject(null)
    }
  }

  // Load publication statuses when projects are loaded
  useEffect(() => {
    if (projects.length > 0) {
      projects.forEach(project => {
        fetchPublicationStatus(project.id)
      })
    }
  }, [projects])

  // Filter projects based on search term
  const filteredProjects = projects.filter(project =>
    project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    project.description?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-8">
        {/* Top Bar with Logout */}
        <div className="flex justify-end mb-6">
          <Button
            onClick={handleLogout}
            variant="outline"
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 border-gray-300 hover:border-gray-400"
          >
            <LogOut className="h-4 w-4" />
            <span>Logout</span>
          </Button>
        </div>

        {/* Header */}
        <div className="text-center mb-12">
          {/* User Avatar */}
          <div className="mb-6 flex justify-center">
            {user?.avatar_url ? (
              <div className="relative w-24 h-24">
                <img
                  
                  src={user.avatar_url}
                  alt={user.full_name || user.username || 'User'}
                  className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-lg"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none'
                    const fallback = e.currentTarget.parentElement?.querySelector('.avatar-fallback') as HTMLElement
                    if (fallback) {
                      fallback.style.display = 'flex'
                    }
                  }}
                />
                <div 
                  className="avatar-fallback absolute inset-0 w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center border-4 border-white shadow-lg"
                  style={{ display: 'none' }}
                >
                  <span className="text-white font-bold text-2xl">
                    {user.username?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase() || 'U'}
                  </span>
                </div>
              </div>
            ) : (
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center border-4 border-white shadow-lg">
                <span className="text-white font-bold text-2xl">
                  {user?.username?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'U'}
                </span>
              </div>
            )}
          </div>
          
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Welcome back, {user?.full_name || user?.username}! 👋
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Manage your AI projects and digital avatars
          </p>
          
          {/* Search Bar */}
          {projects.length > 0 && (
            <div className="max-w-md mx-auto mb-8">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Search projects..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          )}
        </div>

    

        {/* Create New Project Button */}
        <div className="text-center mb-12">
          <Link href="/projects/create">
            <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all duration-200">
              <Plus className="mr-3 h-6 w-6" />
              Create New Avatar
            </Button>
          </Link>
        </div>

        {/* Projects Grid */}
        {loadingProjects ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <span className="ml-4 text-gray-600 text-lg">Loading projects...</span>
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="text-center py-20">
            {projects.length === 0 ? (
              <>
                <Brain className="h-24 w-24 text-gray-300 mx-auto mb-6" />
                <h3 className="text-2xl font-bold text-gray-900 mb-4">No Projects Yet</h3>
                <p className="text-gray-600 text-lg mb-8 max-w-2xl mx-auto">
                  Create your first AI project to get started. Each project contains a digital avatar with its own voice, knowledge base, and personality.
                </p>
                <Link href="/projects/create">
                  <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all duration-200">
                    <Plus className="mr-3 h-6 w-6" />
                    Create Your First Avatar
                  </Button>
                </Link>
              </>
            ) : (
              <>
                <Search className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-medium text-gray-900 mb-2">No projects found</h3>
                <p className="text-gray-600">Try adjusting your search terms</p>
              </>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProjects.map((project) => (
              <Card 
                key={project.id} 
                className="hover:shadow-xl transition-all duration-300 cursor-pointer group border-2 hover:border-blue-200"
                onClick={() => handleProjectClick(project.id)}
              >
                <CardContent className="p-6">
                  <div className="text-center">
                    {/* Avatar */}
                    <div className="mb-4">
                      {project.avatar_url ? (
                        <div className="relative mx-auto w-20 h-20">
                          <img
                            src={project.avatar_url}
                            alt={project.name}
                            className="w-20 h-20 rounded-full object-cover border-4 border-gray-200 group-hover:border-blue-300 transition-colors"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none'
                              const fallback = e.currentTarget.parentElement?.querySelector('.avatar-fallback') as HTMLElement
                              if (fallback) {
                                fallback.style.display = 'flex'
                              }
                            }}
                          />
                          <div 
                            className="avatar-fallback absolute inset-0 w-20 h-20 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center border-4 border-gray-200 group-hover:border-blue-300 transition-colors"
                            style={{ display: 'none' }}
                          >
                            <User className="h-8 w-8 text-blue-600" />
                          </div>
                        </div>
                      ) : (
                        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center mx-auto border-4 border-gray-200 group-hover:border-blue-300 transition-colors">
                          <User className="h-8 w-8 text-blue-600" />
                        </div>
                      )}
                    </div>
                    
                    {/* Project Info */}
                    <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                      {project.name}
                    </h3>
                    {project.description && (
                      <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                        {project.description}
                      </p>
                    )}
                    
                    {/* Status */}
                    <div className="flex items-center justify-center mb-4">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                        project.is_active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {project.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    
                    {/* Created Date */}
                    <div className="flex items-center justify-center text-xs text-gray-500 mb-4">
                      <Calendar className="h-3 w-3 mr-1" />
                      {new Date(project.created_at).toLocaleDateString()}
                    </div>
                    
                    {/* Publication Status */}
                    {publications[project.id] && (
                      <div className="flex items-center justify-center mb-3">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          publications[project.id].is_published 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          <Globe className="h-3 w-3 mr-1" />
                          {publications[project.id].is_published ? 'Published' : 'Draft'}
                        </span>
                      </div>
                    )}
                    
                    {/* Action Buttons */}
                    <div className="grid grid-cols-2 gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleProjectClick(project.id)
                        }}
                      >
                        <Play className="h-3 w-3 mr-1" />
                        Open
                      </Button>
                      
                      {/* Publish/Unpublish Button */}
                      <Button 
                        variant={publications[project.id]?.is_published ? "outline" : "default"}
                        size="sm"
                        className={`w-full ${
                          publications[project.id]?.is_published 
                            ? 'text-orange-600 hover:text-orange-700 hover:bg-orange-50' 
                            : 'bg-green-600 hover:bg-green-700 text-white'
                        }`}
                        onClick={(e) => {
                          e.stopPropagation()
                          if (publications[project.id]?.is_published) {
                            handleUnpublishProject(project.id)
                          } else {
                            handlePublishProject(project.id)
                          }
                        }}
                        disabled={publishingProject === project.id}
                      >
                        {publishingProject === project.id ? (
                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current"></div>
                        ) : publications[project.id]?.is_published ? (
                          <>
                            <Share2 className="h-3 w-3 mr-1" />
                            Unpublish
                          </>
                        ) : (
                          <>
                            <Globe className="h-3 w-3 mr-1" />
                            Publish
                          </>
                        )}
                      </Button>
                      
                      {/* Settings Button */}
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="w-full"
                        onClick={(e) => {
                          e.stopPropagation()
                          router.push(`/dashboard/agents/${project.id}/settings`)
                        }}
                      >
                        <Settings className="h-3 w-3 mr-1" />
                        Settings
                      </Button>
                      
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          setShowDeleteConfirm(project.id)
                        }}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 w-full"
                        disabled={deletingProject === project.id}
                      >
                        {deletingProject === project.id ? (
                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-red-600"></div>
                        ) : (
                          <>
                            <Trash2 className="h-3 w-3 mr-1" />
                            Delete
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Quick Stats */}
        {projects.length > 0 && (
          <div className="mt-16 text-center">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-2xl mx-auto">
              <div className="bg-white rounded-lg p-6 shadow-sm border">
                <div className="text-2xl font-bold text-blue-600 mb-2">{projects.length}</div>
                <div className="text-sm text-gray-600">Total Projects</div>
              </div>
              <div className="bg-white rounded-lg p-6 shadow-sm border">
                <div className="text-2xl font-bold text-green-600 mb-2">
                  {projects.filter(p => p.is_active).length}
                </div>
                <div className="text-sm text-gray-600">Active Projects</div>
              </div>
              <div className="bg-white rounded-lg p-6 shadow-sm border">
                <div className="text-2xl font-bold text-purple-600 mb-2">
                  {new Date().toLocaleDateString('en-US', { month: 'long' })}
                </div>
                <div className="text-sm text-gray-600">Current Month</div>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
          onClick={() => setShowDeleteConfirm(null)}
        >
          <div 
            className="bg-white rounded-lg p-6 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start space-x-3">
              <AlertTriangle className="h-6 w-6 text-red-600 flex-shrink-0 mt-1" />
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Delete Project
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Are you sure you want to delete this project? This will permanently remove:
                </p>
                <ul className="text-sm text-gray-600 mb-6 space-y-1">
                  <li>• The digital avatar and all settings</li>
                  <li>• ElevenLabs voice agent</li>
                  <li>• Knowledge base associations</li>
                  <li>• All project data</li>
                </ul>
                <p className="text-sm text-red-600 font-medium mb-6">
                  This action cannot be undone.
                </p>
                <div className="flex space-x-3">
                  <Button 
                    variant="destructive"
                    onClick={() => {
                      const projectToDelete = projects.find(p => p.id === showDeleteConfirm)
                      if (projectToDelete) {
                        handleDeleteProject(projectToDelete.id)
                      }
                    }}
                    disabled={deletingProject !== null}
                    className="flex-1"
                  >
                    {deletingProject ? 'Deleting...' : 'Delete Project'}
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => setShowDeleteConfirm(null)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ProjectsPage
