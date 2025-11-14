'use client'

import React, { useState, useEffect } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Folder, Plus, Loader2 } from 'lucide-react'
import { API_URL } from '@/lib/config'
import { getAuthHeaders } from '@/lib/api-client'
import { ToastContainer, useToast } from '@/components/ui/toast'

interface FolderSelectorProps {
  value: string
  onChange: (folderId: string) => void
  className?: string
  agentId?: string
}

const FolderSelector: React.FC<FolderSelectorProps> = ({ value, onChange, className, agentId }) => {
  const [folders, setFolders] = useState<Array<{ name: string; count: number; id: string }>>([])
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isFetchingFolders, setIsFetchingFolders] = useState(false)
  const { toasts, removeToast, success, error, warning } = useToast()

  useEffect(() => {
    console.log('FolderSelector: agentId changed:', agentId)
    if (agentId) {
      console.log('FolderSelector: Calling fetchFolders with agentId:', agentId)
      fetchFolders()
    } else {
      console.log('FolderSelector: No agentId available, skipping folder fetch')
    }
  }, [agentId])

  // Function to create the default Uncategorized folder if it doesn't exist
  const createDefaultFolder = async () => {
    if (!agentId) {
      console.error('Agent ID is required for creating default folder')
      return
    }
    
    try {
      console.log('FolderSelector: Creating default Uncategorized folder')
      const url = `${API_URL}/knowledge-base/folders`
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: 'Uncategorized',
          agent_id: agentId
        })
      })
      
      const data = await response.json()
      console.log('FolderSelector: Default folder creation response:', data)
      
      if (data.success) {
        // Add the new folder to the list
        const newFolder = { name: 'Uncategorized', count: 0, id: data.folder.id }
        setFolders([...folders, newFolder])
        
        // Select the new folder
        onChange(data.folder.id)
        
        return data.folder.id
      }
    } catch (error) {
      console.error('Failed to create default folder:', error)
    }
    
    return null
  }

  const fetchFolders = async () => {
    if (!agentId) {
      console.error('Agent ID is required for fetching folders')
      return
    }
    
    setIsFetchingFolders(true)
    try {
      // GET requests can use query parameters
      const url = `${API_URL}/knowledge-base/folders?agent_id=${agentId}`
      console.log('FolderSelector: Fetching folders with URL:', url)
      
      const headers = getAuthHeaders()
      console.log('FolderSelector: Using headers:', headers)
      
      const response = await fetch(url, {
        headers: headers,
      })
      console.log('FolderSelector: Response status:', response.status)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error(`FolderSelector: HTTP error! status: ${response.status}, response:`, errorText)
        error(`Failed to fetch folders: ${response.status} ${errorText}`)
        return
      }
      
      const data = await response.json()
      console.log('FolderSelector: Response data:', data)
      
      // Check if there's an error about agent_id
      if (data.detail && Array.isArray(data.detail)) {
        const agentIdError = data.detail.find((err: any) => 
          err.loc && Array.isArray(err.loc) && err.loc.includes('agent_id')
        )
        
        if (agentIdError) {
          console.error('FolderSelector: API requires agent_id parameter:', agentIdError)
          error('Failed to fetch folders: API requires agent_id parameter')
          return
        }
      }
      
      if (data.success) {
        // If no folders returned or empty array, create a default "Uncategorized" folder
        if (!data.folders || data.folders.length === 0) {
          console.log('FolderSelector: No folders returned, creating default Uncategorized folder')
          // Call function to create default folder on the backend
          createDefaultFolder()
        } else {
          console.log('FolderSelector: Setting folders from API:', data.folders)
          setFolders(data.folders)
          
          // If no folder is selected yet, select the first folder
          if (!value && data.folders.length > 0) {
            onChange(data.folders[0].id)
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch folders:', error)
    } finally {
      setIsFetchingFolders(false)
    }
  }

  const handleCreateFolder = async () => {
    console.log('🔵 handleCreateFolder called, newFolderName:', newFolderName)
    
    if (newFolderName.trim()) {
      const trimmedName = newFolderName.trim()
      console.log('🔵 Trimmed name:', trimmedName)
      
      // Check if folder already exists
      if (folders.find(f => f.name === trimmedName)) {
        console.log('⚠️ Folder already exists!')
        warning('Folder already exists!')
        return
      }
      
      setIsLoading(true)
      console.log('🔵 Making API call to create folder...')
      
      try {
        // Call API to validate/create folder
        if (!agentId) {
          console.error('Agent ID is required for creating folders')
          error('Missing agent ID. Cannot create folder.')
          return
        }
        
        const url = `${API_URL}/knowledge-base/folders`
        console.log('🔵 API URL:', url)
        
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            ...getAuthHeaders(),
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: trimmedName,
            agent_id: agentId
          })
        })
        
        console.log('🔵 Response status:', response.status)
        
        if (!response.ok) {
          const errorText = await response.text()
          console.error(`HTTP error! status: ${response.status}, response:`, errorText)
          throw new Error(`HTTP error! status: ${response.status}, response: ${errorText}`)
        }
        
        const data = await response.json()
        console.log('🔵 Response data:', data)
        
        if (data.success) {
          // Add the new folder to the list
          const newFolder = { name: trimmedName, count: 0, id: data.folder.id }
          setFolders([...folders, newFolder])
          
          // Select the new folder by ID
          onChange(data.folder.id)
          
          // Close dialog and reset
          setIsCreateDialogOpen(false)
          setNewFolderName('')
          
          success(`Folder "${trimmedName}" created successfully!`)
        } else {
          error(data.error || 'Failed to create folder')
        }
      } catch (err) {
        console.error('Failed to create folder:', err)
        error('Failed to create folder. Please try again.')
      } finally {
        setIsLoading(false)
      }
    }
  }

  return (
    <>
      <ToastContainer toasts={toasts} onClose={removeToast} />
      <div className={`flex items-center space-x-2 ${className}`}>
        <div className="flex-1">
          <Select value={value} onValueChange={onChange} disabled={isFetchingFolders}>
            <SelectTrigger>
              {isFetchingFolders ? (
                <div className="flex items-center">
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  <span>Loading folders...</span>
                </div>
              ) : (
                <SelectValue placeholder="Select folder" />
              )}
            </SelectTrigger>
            <SelectContent>
              {folders.length > 0 ? (
                folders.map((folder) => (
                  <SelectItem key={folder.id} value={folder.id}>
                    <div className="flex items-center">
                      <Folder className="h-4 w-4 mr-2" />
                      <span>{folder.name}</span>
                      <span className="ml-2 text-xs text-gray-500">({folder.count})</span>
                    </div>
                  </SelectItem>
                ))
              ) : (
                <div className="p-2 text-sm text-gray-500">
                  No folders found. Click + to create one.
                </div>
              )}
            </SelectContent>
          </Select>
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => setIsCreateDialogOpen(true)}
          title="Create new folder"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Create Folder Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Folder</DialogTitle>
            <DialogDescription>
              Enter a name for your new folder. You can organize your files by topic, type, or any category you prefer.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Input
              placeholder="e.g., Medical, Research, Educational"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleCreateFolder()
                }
              }}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button onClick={handleCreateFolder} disabled={!newFolderName.trim() || isLoading}>
              {isLoading ? 'Creating...' : 'Create Folder'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default FolderSelector
