'use client'

import React, { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { 
  Zap,
  HelpCircle,
  Brain
} from 'lucide-react'
import { API_URL } from '@/lib/config'
import { fetchWithAuth, getAuthHeaders } from '@/lib/api-client'
import { ToastContainer, useToast } from '@/components/ui/toast'

const SpecializedAPIsPage = () => {
  const params = useParams()
  const projectId = params.id as string
  const { toasts, removeToast, success: showSuccess, error: showError } = useToast()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [specializedApiEnabled, setSpecializedApiEnabled] = useState(false)

  useEffect(() => {
    fetchSpecializedApiSettings()
  }, [projectId])

  const fetchSpecializedApiSettings = async () => {
    try {
      setLoading(true)
      const response = await fetchWithAuth(`${API_URL}/experts/${projectId}/behavior-settings`, {
        headers: getAuthHeaders(),
      })
      const data = await response.json()
      
      if (data.success && data.settings) {
        setSpecializedApiEnabled(data.settings.specialized_api_enabled || false)
      }
    } catch (error) {
      console.error('Error fetching specialized API settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleToggleSpecializedApi = async (enabled: boolean) => {
    if (projectId !== 'ee63ef25-0434-4882-8253-228beb9ad458' && enabled) {
      showError('Get in touch to explore this functionality and confirm fit.', 'Feature Not Available')
      return
    }

    try {
      setSaving(true)
      
      const response = await fetchWithAuth(`${API_URL}/experts/${projectId}/specialized-api?enabled=${enabled}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
      })
      
      const data = await response.json()
      
      if (data.success) {
        setSpecializedApiEnabled(enabled)
        showSuccess(
          enabled ? 'Specialized API access enabled successfully!' : 'Specialized API access disabled.',
          'Settings Updated'
        )
      } else {
        showError(data.error || 'Failed to update specialized API settings', 'Update Failed')
      }
    } catch (error) {
      console.error('Error updating specialized API settings:', error)
      showError('Error updating specialized API settings. Please try again.', 'Unexpected Error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[calc(100vh-200px)]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <ToastContainer toasts={toasts} onClose={removeToast} />
      <div className="max-w-4xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Specialized APIs</h1>
          <p className="text-gray-600 mt-2">Enable deep analysis on images identification and other specialized functionality</p>
        </div>

        {/* Specialized API Toggle Card */}
        <Card className="shadow-lg border-purple-200 bg-gradient-to-br from-purple-50 to-white">
          <CardHeader>
            <CardTitle className="flex items-center text-xl">
              <Brain className="h-5 w-5 mr-2 text-purple-600" />
              Specialized API Configuration
            </CardTitle>
            <CardDescription>
              Enable deep analysis on images identification and other specialized functionality
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold text-base">Specialized API Access</div>
                  <p className="text-sm text-gray-500 mt-1">
                    Enable deep analysis on images identification and other specialized functionality
                  </p>
                </div>
                <button 
                  className="text-gray-400 hover:text-gray-600"
                  title="When enabled, expert can access specialized APIs for deep image analysis"
                >
                  <HelpCircle className="w-4 h-4" />
                </button>
              </div>
              
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200">
                <div className="flex-1">
                  <div className="font-medium text-sm text-gray-900">
                    Specialized API Access
                  </div>
                  <div className="text-xs text-gray-600 mt-1">
                    {specializedApiEnabled 
                      ? 'Expert has access to specialized APIs for deep image analysis and identification'
                      : projectId === 'ee63ef25-0434-4882-8253-228beb9ad458' 
                        ? 'You can enable specialized API access for this expert'
                        : 'Get in touch to explore this functionality and confirm fit'
                    }
                  </div>
                  {!specializedApiEnabled && projectId !== 'ee63ef25-0434-4882-8253-228beb9ad458' && (
                    <div className="text-xs text-purple-600 mt-2 font-medium">
                      Contact support to enable specialized API features
                    </div>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={specializedApiEnabled}
                    disabled={saving || (projectId !== 'ee63ef25-0434-4882-8253-228beb9ad458' && !specializedApiEnabled)}
                    onCheckedChange={handleToggleSpecializedApi}
                  />
                  {saving && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600"></div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}

export default SpecializedAPIsPage