'use client'

import React from 'react'
import Link from 'next/link'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useAppSelector } from '@/store/hooks'
import { 
  Brain, 
  MessageSquare, 
  Users, 
  TrendingUp, 
  Plus,
  Mic,
  BarChart3,
  Clock
} from 'lucide-react'

const DashboardPage = () => {
  const { user } = useAppSelector((state) => state.auth)

  const stats = [
    {
      title: 'AI Experts',
      value: '0',
      description: 'Active digital minds',
      icon: Brain,
      color: 'text-blue-600'
    },
    {
      title: 'Conversations',
      value: '0',
      description: 'Total interactions',
      icon: MessageSquare,
      color: 'text-green-600'
    },
    {
      title: 'Reach',
      value: '0',
      description: 'People helped',
      icon: Users,
      color: 'text-purple-600'
    },
    {
      title: 'Growth',
      value: '0%',
      description: 'This month',
      icon: TrendingUp,
      color: 'text-orange-600'
    }
  ]

  const recentActivity: any[] = []

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-4 sm:p-6 text-white">
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">
            Welcome back, {user?.full_name || user?.username}! 👋
          </h1>
          <p className="text-blue-100 mb-4 text-sm sm:text-base">
            Ready to scale your expertise and connect with your audience?
          </p>
          <Link href="/dashboard/create-expert">
            <Button className="bg-white text-blue-600 hover:bg-blue-50 text-sm sm:text-base">
              <Plus className="mr-2 h-4 w-4" />
              Create New Expert
            </Button>
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {stats.map((stat, index) => {
            const Icon = stat.icon
            return (
              <Card key={index}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {stat.title}
                  </CardTitle>
                  <Icon className={`h-4 w-4 ${stat.color}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <p className="text-xs text-muted-foreground">
                    {stat.description}
                  </p>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Quick Actions */}
          {/* <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>
                Get started with common tasks
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full justify-start" variant="outline">
                <Brain className="mr-2 h-4 w-4" />
                Create AI Expert
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <Mic className="mr-2 h-4 w-4" />
                Train Voice Model
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <MessageSquare className="mr-2 h-4 w-4" />
                Start Conversation
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <BarChart3 className="mr-2 h-4 w-4" />
                View Analytics
              </Button>
            </CardContent>
          </Card> */}

          {/* Recent Activity */}
          {/* <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>
                Your latest interactions and updates
              </CardDescription>
            </CardHeader>
            <CardContent>
              {recentActivity.length > 0 ? (
                <div className="space-y-4">
                  {recentActivity.map((activity, index) => {
                    const Icon = activity.icon
                    return (
                      <div key={index} className="flex items-center space-x-4">
                        <div className="bg-gray-100 p-2 rounded-full">
                          <Icon className="h-4 w-4 text-gray-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">
                            {activity.title}
                          </p>
                          <div className="flex items-center text-xs text-gray-500">
                            <Clock className="mr-1 h-3 w-3" />
                            {activity.time}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Clock className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 text-sm">No recent activity yet</p>
                  <p className="text-gray-400 text-xs mt-1">Your interactions will appear here</p>
                </div>
              )}
            </CardContent>
          </Card> */}
        </div>

        {/* AI Experts Overview */}
        <Card>
          <CardHeader>
            <CardTitle>Your AI Experts</CardTitle>
            <CardDescription>
              Manage and monitor your digital minds
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12">
              <Brain className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No AI Experts Yet</h3>
              <p className="text-gray-500 text-sm mb-6 max-w-md mx-auto">
                Create your first AI expert to start scaling your expertise and connecting with your audience.
              </p>
              <Link href="/dashboard/create-expert">
                <Button className="bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Your First Expert
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}

export default DashboardPage
