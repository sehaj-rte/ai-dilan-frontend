'use client'

import React, { useState, useEffect } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Folder, Plus, Loader2 } from 'lucide-react'
import { API_URL } from '@/lib/config'
import { getAuthHeaders } from '@/lib/auth-headers'
import { ToastContainer, useToast } from '@/components/ui/toast'

interface FolderSelectorProps {
  value: string
  onChange: (folder: string) => void
  className?: string
}

const FolderSelector: React.FC<FolderSelectorProps> = ({ value, onChange, className }) => {
  const [folders, setFolders] = useState<Array<{ name: string; count: number }>>([])
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isFetchingFolders, setIsFetchingFolders] = useState(false)
  const { toasts, removeToast, success, error, warning } = useToast()

  useEffect(() => {
    fetchFolders()
  }, [])

  const fetchFolders = async () => {
    setIsFetchingFolders(true)
    try {
      const response = await fetch(`${API_URL}/knowledge-base/folders`, {
        headers: getAuthHeaders(),
      })
      const data = await response.json()
      
      if (data.success) {
        setFolders(data.folders)
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
        const url = `${API_URL}/knowledge-base/folders?folder_name=${encodeURIComponent(trimmedName)}`
        console.log('🔵 API URL:', url)
        
        const response = await fetch(url, {
          method: 'POST',
          headers: getAuthHeaders(),
        })
        
        console.log('🔵 Response status:', response.status)
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        
        const data = await response.json()
        console.log('🔵 Response data:', data)
        
        if (data.success) {
          // Add the new folder to the list
          setFolders([...folders, { name: trimmedName, count: 0 }])
          
          // Select the new folder
          onChange(trimmedName)
          
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
              {folders.map((folder) => (
                <SelectItem key={folder.name} value={folder.name}>
                  <div className="flex items-center">
                    <Folder className="h-4 w-4 mr-2" />
                    <span>{folder.name}</span>
                    <span className="ml-2 text-xs text-gray-500">({folder.count})</span>
                  </div>
                </SelectItem>
              ))}
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
