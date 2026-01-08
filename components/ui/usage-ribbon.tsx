'use client'

import React, { useState, useEffect } from 'react'
import { API_URL } from '@/lib/config'
import { AlertTriangle, MessageSquare, Phone } from 'lucide-react'

interface UsageStats {
  messages: {
    used: number
    limit: number
    percentage: number
    remaining: number
  }
  minutes: {
    used: number
    limit: number
    percentage: number
    remaining: number
  }
  is_expert_owner: boolean
  last_updated: string
}

interface UsageRibbonProps {
  expertId: string
  userId: string
  isVisible: boolean
  refreshTrigger?: number  // Add refresh trigger prop
  className?: string
}

const UsageRibbon: React.FC<UsageRibbonProps> = ({ 
  expertId, 
  userId, 
  isVisible,
  refreshTrigger = 0,  // Default value
  className = '' 
}) => {
  const [usageStats, setUsageStats] = useState<UsageStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchUsageStats = async () => {
    if (!expertId || !userId || !isVisible) return

    try {
      setLoading(true)
      setError(null)

      const response = await fetch(
        `${API_URL}/expert-owner-usage/stats/${expertId}/${userId}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('dilan_ai_token')}`,
            'Content-Type': 'application/json'
          }
        }
      )

      if (!response.ok) {
        if (response.status === 404) {
          // Not an expert owner, don't show ribbon
          setUsageStats(null)
          return
        }
        throw new Error(`HTTP ${response.status}`)
      }

      const data = await response.json()
      
      if (data.success && data.usage_stats) {
        setUsageStats(data.usage_stats)
      } else {
        setUsageStats(null)
      }
    } catch (err) {
      console.error('Failed to fetch usage stats:', err)
      setError(err instanceof Error ? err.message : 'Failed to load usage stats')
      setUsageStats(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsageStats()
  }, [expertId, userId, isVisible, refreshTrigger])  // Add refreshTrigger to dependencies

  // Don't render if not visible, loading, error, or no stats
  if (!isVisible || loading || error || !usageStats) {
    return null
  }

  const messagePercentage = usageStats.messages.percentage
  const minutePercentage = usageStats.minutes.percentage
  
  // Determine warning level based on highest usage percentage
  const maxPercentage = Math.max(messagePercentage, minutePercentage)
  const isWarning = maxPercentage >= 80
  const isCritical = maxPercentage >= 95

  const ribbonColor = isCritical 
    ? 'bg-red-100 border-red-200 text-red-800' 
    : isWarning 
    ? 'bg-yellow-100 border-yellow-200 text-yellow-800'
    : 'bg-blue-100 border-blue-200 text-blue-800'

  const iconColor = isCritical 
    ? 'text-red-600' 
    : isWarning 
    ? 'text-yellow-600'
    : 'text-blue-600'

  return (
    <div className={`border-b ${ribbonColor} ${className}`}>
      <div className="max-w-7xl px-4 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {(isWarning || isCritical) && (
              <AlertTriangle className={`h-4 w-4 ${iconColor}`} />
            )}
            
            <div className="flex items-center space-x-6">
              {/* Messages Usage */}
              <div className="flex items-center space-x-2">
                <MessageSquare className={`h-4 w-4 ${iconColor}`} />
                <span className="text-sm font-medium">
                  {usageStats.messages.remaining} messages left
                </span>
                <span className="text-xs opacity-75">
                  ({usageStats.messages.used}/{usageStats.messages.limit})
                </span>
              </div>

              {/* Voice Minutes Usage */}
              <div className="flex items-center space-x-2">
                <Phone className={`h-4 w-4 ${iconColor}`} />
                <span className="text-sm font-medium">
                  {usageStats.minutes.remaining} voice left
                </span>
                <span className="text-xs opacity-75">
                  ({usageStats.minutes.used}/{usageStats.minutes.limit})
                </span>
              </div>
            </div>
          </div>

          {/* Usage Bars */}
          <div className="flex items-center space-x-4">
            {/* Message Usage Bar */}
            <div className="flex items-center space-x-2">
              <span className="text-xs font-medium">Messages</span>
              <div className="w-16 h-2 bg-white bg-opacity-50 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-300 ${
                    isCritical ? 'bg-red-600' : isWarning ? 'bg-yellow-600' : 'bg-blue-600'
                  }`}
                  style={{ width: `${Math.min(messagePercentage, 100)}%` }}
                />
              </div>
              <span className="text-xs font-medium">{Math.round(messagePercentage)}%</span>
            </div>

            {/* Voice Usage Bar */}
            <div className="flex items-center space-x-2">
              <span className="text-xs font-medium">Voice</span>
              <div className="w-16 h-2 bg-white bg-opacity-50 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-300 ${
                    isCritical ? 'bg-red-600' : isWarning ? 'bg-yellow-600' : 'bg-blue-600'
                  }`}
                  style={{ width: `${Math.min(minutePercentage, 100)}%` }}
                />
              </div>
              <span className="text-xs font-medium">{Math.round(minutePercentage)}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default UsageRibbon