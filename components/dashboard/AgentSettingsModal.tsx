'use client'

import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { API_URL } from '@/lib/config'
import { fetchWithAuth, getAuthHeaders } from '@/lib/api-client'
import { Settings, Save, X, Loader2, AlertCircle, CheckCircle } from 'lucide-react'

interface Expert {
  id: string
  name: string
  description: string
  avatar_url: string | null
  elevenlabs_agent_id: string
  is_active: boolean
  created_at: string
}

interface AgentSettingsModalProps {
  expert: Expert | null
  isOpen: boolean
  onClose: () => void
  onExpertUpdate?: (updatedExpert: Expert) => void
}

const AgentSettingsModal: React.FC<AgentSettingsModalProps> = ({ 
  expert, 
  isOpen, 
  onClose, 
  onExpertUpdate 
}) => {
  const [name, setName] = useState(expert?.name || '')
  const [description, setDescription] = useState(expert?.description || '')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  React.useEffect(() => {
    if (expert) {
      setName(expert.name)
      setDescription(expert.description)
    }
  }, [expert])

  const handleSave = async () => {
    if (!expert) return

    try {
      setIsLoading(true)
      setError(null)

      const response = await fetchWithAuth(`${API_URL}/experts/${expert.id}`, {
        method: 'PUT',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          description,
        }),
      })

      const data = await response.json()

      if (data.success) {
        setSuccess('Agent settings updated!')
        if (onExpertUpdate && data.expert) {
          onExpertUpdate(data.expert)
        }
        setTimeout(() => onClose(), 1500)
      } else {
        setError(data.error || 'Failed to update settings')
      }
    } catch (error) {
      setError('Failed to update settings')
    } finally {
      setIsLoading(false)
    }
  }

  if (!expert) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Settings className="h-5 w-5" />
            <span>Agent Settings</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="agent-name">Agent Name</Label>
            <Input
              id="agent-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter agent name"
            />
          </div>

          <div>
            <Label htmlFor="agent-description">Description</Label>
            <Textarea
              id="agent-description"
              value={description}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
              placeholder="Describe your agent..."
              rows={4}
            />
          </div>

          {error && (
            <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {success && (
            <div className="flex items-center space-x-2 p-3 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <p className="text-sm text-green-700">{success}</p>
            </div>
          )}

          <div className="flex space-x-3 pt-4">
            <Button onClick={onClose} variant="outline" className="flex-1">
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isLoading} className="flex-1">
              {isLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default AgentSettingsModal
