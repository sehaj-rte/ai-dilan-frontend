'use client'

import React, { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Brain,
  HelpCircle,
  RotateCcw,
  Save,
  MessageSquare,
  Settings
} from 'lucide-react'
import { API_URL } from '@/lib/config'
import { fetchWithAuth, getAuthHeaders } from '@/lib/api-client'
import { ToastContainer, useToast } from '@/components/ui/toast'

const BehaviorSettingsPage = () => {
  const params = useParams()
  const projectId = params.id as string
  const { toasts, removeToast, success: showSuccess, error: showError } = useToast()

  const [loading, setLoading] = useState(true)

  // AI Behavior Settings state
  const [behaviorSettings, setBehaviorSettings] = useState({
    kb_mode: 'balanced',
    custom_instructions: '',
    response_length: 1, // 0: Short, 1: Medium, 2: Long
    ask_followup_questions: true,
    first_message: ''
  })
  const [isSavingBehavior, setIsSavingBehavior] = useState(false)

  useEffect(() => {
    fetchBehaviorSettings()
  }, [projectId])

  const fetchBehaviorSettings = async () => {
    try {
      setLoading(true)
      const response = await fetchWithAuth(`${API_URL}/experts/${projectId}/behavior-settings`, {
        headers: getAuthHeaders(),
      })
      const data = await response.json()

      if (data.success && data.settings) {
        setBehaviorSettings({
          kb_mode: data.settings.kb_mode || 'balanced',
          custom_instructions: data.settings.custom_instructions || '',
          response_length: data.settings.response_length ?? 1,
          ask_followup_questions: data.settings.ask_followup_questions ?? true,
          first_message: data.settings.first_message || ''
        })
      }
    } catch (error) {
      console.error('Error fetching behavior settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleBehaviorSettingsSave = async () => {
    try {
      setIsSavingBehavior(true)

      const response = await fetchWithAuth(`${API_URL}/experts/${projectId}/behavior-settings`, {
        method: 'PUT',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(behaviorSettings)
      })

      const data = await response.json()

      if (data.success) {
        showSuccess('AI behavior settings saved successfully.', 'Settings Updated')
      } else {
        showError(data.error || 'Failed to save behavior settings', 'Save Failed')
      }
    } catch (error) {
      console.error('Error saving behavior settings:', error)
      showError('Error saving behavior settings. Please try again.', 'Unexpected Error')
    } finally {
      setIsSavingBehavior(false)
    }
  }

  const resetBehaviorSettings = () => {
    setBehaviorSettings({
      kb_mode: 'balanced',
      custom_instructions: '',
      response_length: 1,
      ask_followup_questions: true,
      first_message: ''
    })
  }

  // Helper functions for response length
  const getResponseLengthLabel = (value: number) => {
    switch (value) {
      case 0: return 'Short'
      case 1: return 'Medium'
      case 2: return 'Long'
      default: return 'Medium'
    }
  }

  const getResponseLengthDescription = (value: number) => {
    switch (value) {
      case 0: return 'Concise answers with minimal explanation'
      case 1: return 'Balanced detail and clarity'
      case 2: return 'In-depth, structured responses'
      default: return 'Balanced detail and clarity'
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
          <h1 className="text-3xl font-bold text-gray-900">AI Behavior Settings</h1>
          <p className="text-gray-600 mt-2">Control how your AI agent uses knowledge base and responds to users</p>
        </div>

        {/* AI Behavior Settings Card */}
        <Card className="shadow-lg border-purple-200 bg-gradient-to-br from-purple-50 to-white">
          <CardHeader>
            <CardTitle className="flex items-center text-xl">
              <Brain className="h-5 w-5 mr-2 text-purple-600" />
              AI Behavior Configuration
            </CardTitle>
            <CardDescription>
              Customize how your AI agent processes information and interacts with users
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">

              {/* Knowledge Base Mode */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">Knowledge Base Mode</Label>
                  <button
                    className="text-gray-400 hover:text-gray-600"
                    title="Controls how your agent uses its knowledge base vs. general knowledge"
                  >
                    <HelpCircle className="w-4 h-4" />
                  </button>
                </div>

                {/* Strict Mode */}
                <label
                  className={`flex items-start space-x-3 p-4 border-2 rounded-lg cursor-pointer transition-colors ${behaviorSettings.kb_mode === 'strict'
                      ? 'border-purple-400 bg-purple-50'
                      : 'border-gray-200 hover:bg-gray-50'
                    }`}
                >
                  <input
                    type="radio"
                    name="kb_mode"
                    value="strict"
                    checked={behaviorSettings.kb_mode === 'strict'}
                    onChange={(e) => setBehaviorSettings({ ...behaviorSettings, kb_mode: e.target.value })}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="font-semibold text-sm">Knowledge Base Only (Strict)</div>
                    <div className="text-xs text-gray-600 mt-1">
                      Only answers from uploaded documents. Refuses questions outside scope.
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded">High Accuracy</span>
                      <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">Compliance-Safe</span>
                    </div>
                  </div>
                </label>

                {/* Balanced Mode - RECOMMENDED */}
                <label
                  className={`flex items-start space-x-3 p-4 border-2 rounded-lg cursor-pointer transition-colors ${behaviorSettings.kb_mode === 'balanced'
                      ? 'border-green-400 bg-green-50'
                      : 'border-gray-200 hover:bg-gray-50'
                    }`}
                >
                  <input
                    type="radio"
                    name="kb_mode"
                    value="balanced"
                    checked={behaviorSettings.kb_mode === 'balanced'}
                    onChange={(e) => setBehaviorSettings({ ...behaviorSettings, kb_mode: e.target.value })}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <div className="font-semibold text-sm">Knowledge Base Priority (Balanced)</div>
                      <span className="text-xs px-2 py-1 bg-green-600 text-white rounded font-medium">Recommended</span>
                    </div>
                    <div className="text-xs text-gray-600 mt-1">
                      Searches KB first, supplements with general knowledge when needed.
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded">Best Balance</span>
                      <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">Helpful</span>
                    </div>
                  </div>
                </label>

                {/* Flexible Mode */}
                <label
                  className={`flex items-start space-x-3 p-4 border-2 rounded-lg cursor-pointer transition-colors ${behaviorSettings.kb_mode === 'flexible'
                      ? 'border-blue-400 bg-blue-50'
                      : 'border-gray-200 hover:bg-gray-50'
                    }`}
                >
                  <input
                    type="radio"
                    name="kb_mode"
                    value="flexible"
                    checked={behaviorSettings.kb_mode === 'flexible'}
                    onChange={(e) => setBehaviorSettings({ ...behaviorSettings, kb_mode: e.target.value })}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="font-semibold text-sm">Mixed Mode (Flexible)</div>
                    <div className="text-xs text-gray-600 mt-1">
                      Blends KB and general knowledge naturally for comprehensive answers.
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded">Most Flexible</span>
                      <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">Conversational</span>
                    </div>
                  </div>
                </label>
              </div>

              {/* Response Length Radio Buttons */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base font-semibold flex items-center">
                      <MessageSquare className="h-4 w-4 mr-2 text-blue-600" />
                      Response Length
                    </Label>
                    <p className="text-xs text-gray-500 mt-1">
                      Control how detailed the AI responses should be
                    </p>
                  </div>
                  <button
                    className="text-gray-400 hover:text-gray-600"
                    title="Adjusts the verbosity and detail level of AI responses"
                  >
                    <HelpCircle className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-3">
                  {/* Short Response */}
                  <label
                    className={`flex items-start space-x-3 p-4 border-2 rounded-lg cursor-pointer transition-colors ${behaviorSettings.response_length === 0
                        ? 'border-blue-400 bg-blue-50'
                        : 'border-gray-200 hover:bg-gray-50'
                      }`}
                  >
                    <input
                      type="radio"
                      name="response_length"
                      value={0}
                      checked={behaviorSettings.response_length === 0}
                      onChange={(e) => setBehaviorSettings({
                        ...behaviorSettings,
                        response_length: parseInt(e.target.value)
                      })}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="font-semibold text-sm">Short</div>
                      <div className="text-xs text-gray-600 mt-1">
                        Concise answers with minimal explanation
                      </div>
                    </div>
                  </label>

                  {/* Medium Response */}
                  <label
                    className={`flex items-start space-x-3 p-4 border-2 rounded-lg cursor-pointer transition-colors ${behaviorSettings.response_length === 1
                        ? 'border-blue-400 bg-blue-50'
                        : 'border-gray-200 hover:bg-gray-50'
                      }`}
                  >
                    <input
                      type="radio"
                      name="response_length"
                      value={1}
                      checked={behaviorSettings.response_length === 1}
                      onChange={(e) => setBehaviorSettings({
                        ...behaviorSettings,
                        response_length: parseInt(e.target.value)
                      })}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="font-semibold text-sm">Medium</div>
                      <div className="text-xs text-gray-600 mt-1">
                        Balanced detail and clarity
                      </div>
                    </div>
                  </label>

                  {/* Long Response */}
                  <label
                    className={`flex items-start space-x-3 p-4 border-2 rounded-lg cursor-pointer transition-colors ${behaviorSettings.response_length === 2
                        ? 'border-blue-400 bg-blue-50'
                        : 'border-gray-200 hover:bg-gray-50'
                      }`}
                  >
                    <input
                      type="radio"
                      name="response_length"
                      value={2}
                      checked={behaviorSettings.response_length === 2}
                      onChange={(e) => setBehaviorSettings({
                        ...behaviorSettings,
                        response_length: parseInt(e.target.value)
                      })}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="font-semibold text-sm">Long</div>
                      <div className="text-xs text-gray-600 mt-1">
                        In-depth, structured responses
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Follow-up Questions Toggle */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base font-semibold flex items-center">
                      <Settings className="h-4 w-4 mr-2 text-green-600" />
                      Follow-up Questions
                    </Label>
                    <p className="text-xs text-gray-500 mt-1">
                      Whether the AI should ask relevant follow-up questions
                    </p>
                  </div>
                  <button
                    className="text-gray-400 hover:text-gray-600"
                    title="When enabled, AI will ask relevant follow-up questions at the end of responses"
                  >
                    <HelpCircle className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium text-sm text-gray-900">
                      Ask follow-up questions
                    </div>
                    <div className="text-xs text-gray-600 mt-1">
                      {behaviorSettings.ask_followup_questions
                        ? 'AI will ask relevant follow-up questions to better understand user needs'
                        : 'AI will provide direct answers without asking additional questions'
                      }
                    </div>
                  </div>
                  <Switch
                    checked={behaviorSettings.ask_followup_questions}
                    onCheckedChange={(checked) => setBehaviorSettings({
                      ...behaviorSettings,
                      ask_followup_questions: checked
                    })}
                  />
                </div>
              </div>

              {/* First Message */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base font-semibold flex items-center">
                      <MessageSquare className="h-4 w-4 mr-2 text-purple-600" />
                      First Message
                    </Label>
                    <p className="text-xs text-gray-500 mt-1">
                      The initial greeting your AI agent sends when a call starts
                    </p>
                  </div>
                  <button
                    className="text-gray-400 hover:text-gray-600"
                    title="This message will be spoken by the AI as soon as the call connects"
                  >
                    <HelpCircle className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-2">
                  <Textarea
                    value={behaviorSettings.first_message || ''}
                    onChange={(e) => setBehaviorSettings({
                      ...behaviorSettings,
                      first_message: e.target.value
                    })}
                    placeholder="e.g., Hi, I'm Dilan. How can I help you today?"
                    rows={2}
                    className="w-full resize-none"
                  />
                  <p className="text-xs text-gray-400 italic">
                    💡 This is specifically for ElevenLabs voice agent calls.
                  </p>
                </div>
              </div>

              {/* Custom Instructions */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base font-semibold">Custom Instructions</Label>
                    <p className="text-xs text-gray-500 mt-1">
                      Add specific instructions for how your AI should behave
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={resetBehaviorSettings}
                    className="text-gray-600 hover:text-gray-900"
                  >
                    <RotateCcw className="w-4 h-4 mr-1" />
                    Reset
                  </Button>
                </div>

                <Textarea
                  value={behaviorSettings.custom_instructions}
                  onChange={(e) => setBehaviorSettings({ ...behaviorSettings, custom_instructions: e.target.value })}
                  placeholder="e.g., Always ask follow-up questions, Keep responses under 3 sentences, Include relevant examples..."
                  rows={6}
                  className="w-full resize-none"
                  maxLength={4000}
                />
                <div className="flex justify-between items-center">
                  <p className="text-xs text-gray-500">
                    💡 Tip: Be specific about communication style, disclaimers, or response format
                  </p>
                  <p className="text-xs text-gray-500">
                    {behaviorSettings.custom_instructions.length} / 4000
                  </p>
                </div>
              </div>

              {/* Current Settings Summary */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start space-x-2">
                  <Brain className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <strong>Current Configuration:</strong>
                    <div className="mt-2 space-y-1">
                      <div>
                        <strong>Knowledge Base Mode:</strong> {
                          behaviorSettings.kb_mode === 'strict' ? 'Knowledge Base Only (Strict)' :
                            behaviorSettings.kb_mode === 'flexible' ? 'Mixed Mode (Flexible)' :
                              'Knowledge Base Priority (Balanced)'
                        }
                      </div>
                      <div>
                        <strong>Response Length:</strong> {getResponseLengthLabel(behaviorSettings.response_length)} - {getResponseLengthDescription(behaviorSettings.response_length)}
                      </div>
                      <div>
                        <strong>Follow-up Questions:</strong> {behaviorSettings.ask_followup_questions ? 'Enabled' : 'Disabled'}
                      </div>
                      {behaviorSettings.first_message && (
                        <div>
                          <strong>First Message:</strong> {behaviorSettings.first_message}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Save Button */}
              <div className="flex justify-end gap-3 pt-4">
                <Button
                  onClick={handleBehaviorSettingsSave}
                  disabled={isSavingBehavior}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  {isSavingBehavior ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save AI Settings
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}

export default BehaviorSettingsPage
