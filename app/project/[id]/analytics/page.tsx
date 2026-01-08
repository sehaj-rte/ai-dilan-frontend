'use client'

import React from 'react'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import { useParams } from 'next/navigation'
import ChatMetrics from '@/components/dashboard/ChatMetrics'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, MessageSquare, Users, Clock, MessageCircle, AlertCircle } from 'lucide-react'

export default function AnalyticsPage() {
  const params = useParams()
  const expertId = params.id as string

  return (
    <DashboardLayout>
      <div className="h-full flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
              <p className="text-gray-600">Chat metrics and performance insights</p>
            </div>
          </div>
        </div>

        {/* Chat Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main metrics area */}
          <div className="lg:col-span-2">
            <ChatMetrics expertId={expertId} />
          </div>
          
          {/* Additional insights sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center space-x-2">
                  <MessageSquare className="h-5 w-5" />
                  <span>Quick Stats</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-sm text-gray-600">
                  <p>• Metrics update in real-time</p>
                  <p>• Trends compare current vs previous period</p>
                  <p>• Time Created = total time customers spent in conversations</p>
                  <p>• Unanswered = conversations ending with user messages</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center space-x-2">
                  <AlertCircle className="h-5 w-5" />
                  <span>Tips</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm text-gray-600">
                  <div className="mb-2">
                    <strong>Improve Engagement:</strong>
                  </div>
                  <p>• Check unanswered conversations regularly</p>
                  <p>• Respond to user messages promptly</p>
                  <p>• Longer conversations = more customer time spent</p>
                  <p>• Use different time periods to analyze trends</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}