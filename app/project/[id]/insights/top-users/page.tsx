'use client'

import { useParams } from 'next/navigation'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Crown, MessageSquare, Clock, DollarSign } from 'lucide-react'

export default function TopUsersPage() {
  const params = useParams()
  const projectId = params.id as string

  const topUsers = [
    {
      id: 1,
      name: "Sarah Johnson",
      email: "sarah.j@example.com",
      avatar: "SJ",
      messages: 1247,
      sessions: 89,
      totalTime: "42h 15m",
      revenue: "$145.00",
      plan: "Premium",
      joinDate: "Dec 2023",
      lastActive: "2 hours ago",
      engagement: 95
    },
    {
      id: 2,
      name: "Michael Chen",
      email: "m.chen@example.com",
      avatar: "MC",
      messages: 1089,
      sessions: 76,
      totalTime: "38h 42m",
      revenue: "$87.00",
      plan: "Basic",
      joinDate: "Jan 2024",
      lastActive: "5 hours ago",
      engagement: 92
    },
    {
      id: 3,
      name: "Emily Rodriguez",
      email: "emily.r@example.com",
      avatar: "ER",
      messages: 967,
      sessions: 68,
      totalTime: "35h 28m",
      revenue: "$196.00",
      plan: "Pro",
      joinDate: "Nov 2023",
      lastActive: "1 hour ago",
      engagement: 89
    },
    {
      id: 4,
      name: "David Kim",
      email: "david.kim@example.com",
      avatar: "DK",
      messages: 834,
      sessions: 62,
      totalTime: "31h 56m",
      revenue: "$58.00",
      plan: "Basic",
      joinDate: "Jan 2024",
      lastActive: "3 hours ago",
      engagement: 87
    },
    {
      id: 5,
      name: "Lisa Thompson",
      email: "lisa.t@example.com",
      avatar: "LT",
      messages: 756,
      sessions: 54,
      totalTime: "28h 33m",
      revenue: "$174.00",
      plan: "Premium",
      joinDate: "Dec 2023",
      lastActive: "30 minutes ago",
      engagement: 84
    }
  ]

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Top Users</h1>
          <p className="text-gray-600 mt-2">Your most engaged and valuable users</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">VIP Users</CardTitle>
            <Crown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">47</div>
            <p className="text-xs text-muted-foreground">Users with 90+ engagement score</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top User Messages</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1,247</div>
            <p className="text-xs text-muted-foreground">Highest message count</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Longest Session</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">42h 15m</div>
            <p className="text-xs text-muted-foreground">Total time by top user</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top User Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$196</div>
            <p className="text-xs text-muted-foreground">Highest lifetime value</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Top Users Leaderboard</CardTitle>
          <CardDescription>Ranked by engagement score and activity</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {topUsers.map((user, index) => (
              <div key={user.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-3">
                    <div className="text-lg font-bold text-gray-500 w-6">
                      #{index + 1}
                    </div>
                    <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                      <span className="text-white font-semibold text-sm">{user.avatar}</span>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <p className="font-medium text-gray-900">{user.name}</p>
                      {index < 3 && <Crown className="h-4 w-4 text-yellow-500" />}
                    </div>
                    <p className="text-sm text-gray-500">{user.email}</p>
                    <div className="flex items-center space-x-4 mt-1">
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                        {user.plan}
                      </span>
                      <span className="text-xs text-gray-500">
                        Joined {user.joinDate}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div>
                    <div className="text-lg font-bold text-gray-900">{user.messages}</div>
                    <div className="text-xs text-gray-500">Messages</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-gray-900">{user.sessions}</div>
                    <div className="text-xs text-gray-500">Sessions</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-gray-900">{user.totalTime}</div>
                    <div className="text-xs text-gray-500">Total Time</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-green-600">{user.revenue}</div>
                    <div className="text-xs text-gray-500">Revenue</div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="flex items-center space-x-2">
                    <div className="text-lg font-bold text-blue-600">{user.engagement}%</div>
                    <div className="w-12 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{ width: `${user.engagement}%` }}
                      ></div>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Last active: {user.lastActive}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>User Tiers</CardTitle>
            <CardDescription>Distribution of users by engagement level</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <Crown className="h-4 w-4 text-yellow-500" />
                    <span className="text-sm font-medium">VIP Users (90-100%)</span>
                  </div>
                  <span className="text-sm text-gray-500">47 users</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-yellow-500 h-2 rounded-full" style={{ width: '12%' }}></div>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">High Engagement (70-89%)</span>
                  <span className="text-sm text-gray-500">156 users</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-green-600 h-2 rounded-full" style={{ width: '39%' }}></div>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Medium Engagement (50-69%)</span>
                  <span className="text-sm text-gray-500">134 users</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-blue-600 h-2 rounded-full" style={{ width: '34%' }}></div>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Low Engagement (0-49%)</span>
                  <span className="text-sm text-gray-500">63 users</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-gray-600 h-2 rounded-full" style={{ width: '15%' }}></div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Users by Plan</CardTitle>
            <CardDescription>Premium users drive the most engagement</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Premium Plan Users</p>
                  <p className="text-sm text-gray-500">Average 87% engagement</p>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-blue-600">23</div>
                  <div className="text-xs text-gray-500">in top 50</div>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Pro Plan Users</p>
                  <p className="text-sm text-gray-500">Average 82% engagement</p>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-purple-600">15</div>
                  <div className="text-xs text-gray-500">in top 50</div>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Basic Plan Users</p>
                  <p className="text-sm text-gray-500">Average 74% engagement</p>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-green-600">12</div>
                  <div className="text-xs text-gray-500">in top 50</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>User Insights</CardTitle>
          <CardDescription>Key patterns from your top users</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <MessageSquare className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-blue-600">23.4</div>
              <p className="text-sm text-gray-600">Avg. messages per session</p>
              <p className="text-xs text-gray-500 mt-1">Top users send 40% more messages</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <Clock className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-green-600">18m 42s</div>
              <p className="text-sm text-gray-600">Avg. session duration</p>
              <p className="text-xs text-gray-500 mt-1">28% longer than average users</p>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <Crown className="h-8 w-8 text-purple-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-purple-600">4.2x</div>
              <p className="text-sm text-gray-600">Return frequency</p>
              <p className="text-xs text-gray-500 mt-1">More likely to return daily</p>
            </div>
          </div>
        </CardContent>
      </Card>
      </div>
    </DashboardLayout>
  )
}