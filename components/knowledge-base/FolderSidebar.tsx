'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { 
  Folder, 
  FolderOpen,
  ChevronLeft,
  ChevronRight,
  Search,
  X,
  Plus,
  MoreVertical,
  Trash2,
  Edit
} from 'lucide-react'
import { API_URL } from '@/lib/config'
import { fetchWithAuth, getAuthHeaders } from '@/lib/api-client'

interface FolderInfo {
  id: string
  name: string
  count: number
  file_count?: number  // Backend might return this instead
}

interface FolderSidebarProps {
  selectedFolder: string | null
  onFolderSelect: (folder: string | null) => void
  isCollapsed: boolean
  onToggleCollapse: () => void
  isMobile?: boolean
  onMobileClose?: () => void
  refreshTrigger?: number
  projectId?: string  // Agent ID for isolation
}

const FolderSidebar: React.FC<FolderSidebarProps> = ({
  selectedFolder,
  onFolderSelect,
  isCollapsed,
  onToggleCollapse,
  isMobile = false,
  onMobileClose,
  refreshTrigger,
  projectId
}) => {
  const [folders, setFolders] = useState<FolderInfo[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [isCreatingFolder, setIsCreatingFolder] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<{folderId: string | null, folderName: string, show: boolean}>({
    folderId: null,
    folderName: '',
    show: false
  })
  const [isDeletingFolder, setIsDeletingFolder] = useState(false)
  const [editFolder, setEditFolder] = useState<{folderId: string | null, folderName: string, show: boolean}>({
    folderId: null,
    folderName: '',
    show: false
  })
  const [newFolderNameEdit, setNewFolderNameEdit] = useState('')
  const [isUpdatingFolder, setIsUpdatingFolder] = useState(false)

  // Add request deduplication for folders
  const folderRequestInProgressRef = useRef<boolean>(false)
  const lastFolderFetchTimeRef = useRef<number>(0)

  useEffect(() => {
    // Only fetch folders if not already loading and enough time has passed
    const now = Date.now()
    if (!folderRequestInProgressRef.current && (now - lastFolderFetchTimeRef.current > 1000)) {
      fetchFolders()
    }
  }, [refreshTrigger])

  const fetchFolders = async () => {
    // Prevent duplicate requests
    if (folderRequestInProgressRef.current) {
      console.log('🚫 Skipping duplicate folder request')
      return
    }

    folderRequestInProgressRef.current = true
    lastFolderFetchTimeRef.current = Date.now()
    setIsLoading(true)
    
    try {
      // Build query parameters for agent isolation
      const params = new URLSearchParams()
      if (projectId) {
        params.append('agent_id', projectId)
      }
      
      const url = `${API_URL}/knowledge-base/folders${params.toString() ? `?${params.toString()}` : ''}`
      const response = await fetchWithAuth(url, {
        headers: getAuthHeaders(),
      })
      const data = await response.json()
      
      if (data.success) {
        setFolders(data.folders)
      }
    } catch (error) {
      console.error('Error fetching folders:', error)
    } finally {
      setIsLoading(false)
      folderRequestInProgressRef.current = false
    }
  }

  // Helper function to get folder count (handles both count and file_count)
  const getFolderCount = (folder: FolderInfo): number => {
    return folder.file_count !== undefined ? folder.file_count : (folder.count || 0)
  }

  console.log('Folders data:', folders)
  const filteredFolders = folders.filter(folder =>
    folder.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleFolderClick = (folderId: string) => {
    onFolderSelect(selectedFolder === folderId ? null : folderId)
    if (isMobile && onMobileClose) {
      onMobileClose()
    }
  }

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return
    
    const trimmedName = newFolderName.trim()
    setIsCreatingFolder(true)
    
    try {
      const response = await fetchWithAuth(`${API_URL}/knowledge-base/folders`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: trimmedName,
          agent_id: projectId
        }),
      })
      
      const data = await response.json()
      
      if (data.success) {
        setIsCreateFolderOpen(false)
        setNewFolderName('')
        // Add the new folder to the existing list instead of refetching all
        const newFolder: FolderInfo = {
          id: data.folder?.id || trimmedName,
          name: trimmedName,
          count: 0,
          file_count: 0  // Ensure both count fields are set
        }
        setFolders(prev => [...prev, newFolder])
        console.log('✅ Folder created:', trimmedName)
      } else {
        console.error('Failed to create folder:', data.error)
        alert(data.error || 'Failed to create folder')
      }
    } catch (error) {
      console.error('Error creating folder:', error)
      alert('Failed to create folder. Please try again.')
    } finally {
      setIsCreatingFolder(false)
    }
  }

  const handleDeleteFolder = async () => {
    if (!deleteConfirm.folderId) return
    
    setIsDeletingFolder(true)
    
    try {
      // Build query parameters for agent isolation
      const params = new URLSearchParams()
      if (projectId) {
        params.append('agent_id', projectId)
      }
      
      const url = `${API_URL}/knowledge-base/folders/${deleteConfirm.folderId}${params.toString() ? `?${params.toString()}` : ''}`
      const response = await fetchWithAuth(url, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      })
      
      const data = await response.json()
      
      if (data.success) {
        // Remove folder from local state
        setFolders(prev => prev.filter(f => f.id !== deleteConfirm.folderId))
        
        // If the deleted folder was selected, clear selection
        if (selectedFolder === deleteConfirm.folderId) {
          onFolderSelect(null)
        }
        
        setDeleteConfirm({ folderId: null, folderName: '', show: false })
        alert('Folder deleted successfully!')
      } else {
        alert('Failed to delete folder: ' + data.error)
      }
    } catch (error) {
      console.error('Error deleting folder:', error)
      alert('Failed to delete folder. Please try again.')
    } finally {
      setIsDeletingFolder(false)
    }
  }

  const handleEditFolder = async () => {
    if (!editFolder.folderId || !newFolderNameEdit.trim()) return
    
    setIsUpdatingFolder(true)
    
    try {
      // Build query parameters for agent isolation
      const params = new URLSearchParams()
      if (projectId) {
        params.append('agent_id', projectId)
      }
      
      const url = `${API_URL}/knowledge-base/folders/${editFolder.folderId}${params.toString() ? `?${params.toString()}` : ''}`
      const response = await fetchWithAuth(url, {
        method: 'PUT',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newFolderNameEdit.trim()
        }),
      })
      
      const data = await response.json()
      
      if (data.success) {
        // Update folder in local state
        setFolders(prev => prev.map(f => 
          f.id === editFolder.folderId 
            ? { ...f, name: newFolderNameEdit.trim() }
            : f
        ))
        
        setEditFolder({ folderId: null, folderName: '', show: false })
        setNewFolderNameEdit('')
        alert('Folder renamed successfully!')
      } else {
        alert('Failed to rename folder: ' + data.error)
      }
    } catch (error) {
      console.error('Error renaming folder:', error)
      alert('Failed to rename folder. Please try again.')
    } finally {
      setIsUpdatingFolder(false)
    }
  }

  if (isCollapsed && !isMobile) {
    return (
      <div className="w-16 bg-white border-r flex flex-col items-center py-4 space-y-4 h-full">
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleCollapse}
          className="p-2"
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
        <div className="flex flex-col items-center space-y-2">
          {filteredFolders.slice(0, 5).map((folder) => (
            <button
              key={folder.name}
              onClick={() => handleFolderClick(folder.id)}
              className={`p-2 rounded-lg transition-colors ${
                selectedFolder === folder.id
                  ? 'bg-blue-100 text-blue-600'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
              title={folder.name}
            >
              {selectedFolder === folder.id ? (
                <FolderOpen className="h-5 w-5" />
              ) : (
                <Folder className="h-5 w-5" />
              )}
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-white border-r flex flex-col h-full ${isMobile ? 'w-full' : 'w-64'}`}>
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm uppercase tracking-wider text-gray-500">Folders</h3>
          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsCreateFolderOpen(true)}
              className="p-1 h-6 w-6"
              title="Create new folder"
            >
              <Plus className="h-4 w-4 text-gray-500 hover:text-gray-700" />
            </Button>
            {isMobile && onMobileClose && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onMobileClose}
                className="p-2"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
            {!isMobile && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onToggleCollapse}
                className="p-2"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search folders..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
      </div>

      {/* Folders List */}
      <div className="flex-1 overflow-y-auto p-2">
        {isLoading ? (
          <div className="text-center py-8 text-gray-500 text-sm">
            Loading folders...
          </div>
        ) : filteredFolders.length === 0 ? (
          <div className="text-center py-8 text-gray-500 text-sm">
            {searchQuery ? 'No folders found' : 'No folders yet'}
          </div>
        ) : (
          <div className="space-y-1">
            {/* All Files Option */}
            <button
              onClick={() => onFolderSelect(null)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${
                selectedFolder === null
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center space-x-2">
                {selectedFolder === null ? (
                  <FolderOpen className="h-4 w-4" />
                ) : (
                  <Folder className="h-4 w-4" />
                )}
                <span className="text-sm font-medium">All Files</span>
              </div>
              <Badge variant="secondary" className="text-xs">
                {folders.reduce((sum, f) => sum + getFolderCount(f), 0)}
              </Badge>
            </button>

            {/* Individual Folders */}
            {filteredFolders.map((folder) => (
              <div
                key={folder.name}
                className={`group flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${
                  selectedFolder === folder.id
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <button
                  onClick={() => handleFolderClick(folder.id)}
                  className="flex items-center space-x-2 min-w-0 flex-1"
                >
                  {selectedFolder === folder.id ? (
                    <FolderOpen className="h-4 w-4 flex-shrink-0" />
                  ) : (
                    <Folder className="h-4 w-4 flex-shrink-0" />
                  )}
                  <span className="text-sm font-medium truncate">{folder.name}</span>
                </button>
                
                <div className="flex items-center space-x-1">
                  <Badge variant="secondary" className="text-xs">
                    {getFolderCount(folder)}
                  </Badge>
                  
                  {/* Edit button - show for all folders */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      setEditFolder({
                        folderId: folder.id,
                        folderName: folder.name,
                        show: true
                      })
                      setNewFolderNameEdit(folder.name)
                    }}
                    className="p-1 h-6 w-6 text-gray-400 hover:text-blue-500 opacity-70 hover:opacity-100 transition-opacity"
                    title="Rename folder"
                  >
                    <Edit className="h-3 w-3" />
                  </Button>
                  
                  {/* Delete button - show for empty folders */}
                  {getFolderCount(folder) === 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        setDeleteConfirm({
                          folderId: folder.id,
                          folderName: folder.name,
                          show: true
                        })
                      }}
                      className="p-1 h-6 w-6 text-gray-400 hover:text-red-500 opacity-70 hover:opacity-100 transition-opacity"
                      title="Delete empty folder"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Folder Dialog */}
      <Dialog open={isCreateFolderOpen} onOpenChange={setIsCreateFolderOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Folder</DialogTitle>
            <DialogDescription>
              Enter a name for your new folder to organize your files.
            </DialogDescription>
          </DialogHeader>
          <Input
            placeholder="e.g., Medical, Research, Educational"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && newFolderName.trim() && !isCreatingFolder) {
                handleCreateFolder()
              }
            }}
            disabled={isCreatingFolder}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateFolderOpen(false)} disabled={isCreatingFolder}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateFolder}
              disabled={!newFolderName.trim() || isCreatingFolder}
            >
              {isCreatingFolder ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Folder Confirmation Dialog */}
      <Dialog open={deleteConfirm.show} onOpenChange={(open) => !open && setDeleteConfirm({ folderId: null, folderName: '', show: false })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Folder</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the folder "{deleteConfirm.folderName}"? This action cannot be undone.
              {deleteConfirm.folderName !== 'Uncategorized' && (
                <span className="block mt-2 text-sm text-gray-600">
                  Note: You can only delete empty folders. Make sure all files are moved to other folders first.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setDeleteConfirm({ folderId: null, folderName: '', show: false })}
              disabled={isDeletingFolder}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteFolder}
              disabled={isDeletingFolder}
            >
              {isDeletingFolder ? 'Deleting...' : 'Delete Folder'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Folder Name Dialog */}
      <Dialog open={editFolder.show} onOpenChange={(open) => !open && setEditFolder({ folderId: null, folderName: '', show: false })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Folder</DialogTitle>
            <DialogDescription>
              Enter a new name for the folder "{editFolder.folderName}".
            </DialogDescription>
          </DialogHeader>
          <Input
            placeholder="Enter new folder name"
            value={newFolderNameEdit}
            onChange={(e) => setNewFolderNameEdit(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && newFolderNameEdit.trim() && !isUpdatingFolder) {
                handleEditFolder()
              }
            }}
            disabled={isUpdatingFolder}
          />
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setEditFolder({ folderId: null, folderName: '', show: false })
                setNewFolderNameEdit('')
              }}
              disabled={isUpdatingFolder}
            >
              Cancel
            </Button>
            <Button
              onClick={handleEditFolder}
              disabled={!newFolderNameEdit.trim() || isUpdatingFolder || newFolderNameEdit.trim() === editFolder.folderName}
            >
              {isUpdatingFolder ? 'Renaming...' : 'Rename'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default FolderSidebar
