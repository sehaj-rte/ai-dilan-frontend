'use client'

import { useParams } from 'next/navigation'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Activity, Users, Clock, RotateCcw } from 'lucide-react'

export default function UsageRetentionPage() {
  const params = useParams()
  const projectId = params.id as string

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Usage & Retention</h1>
          <p className="text-gray-600 mt-2">Monitor user engagement and retention patterns</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Daily Active Users</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1,247</div>
            <p className="text-xs text-muted-foreground">+12% from yesterday</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">7-Day Retention</CardTitle>
            <RotateCcw className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">68%</div>
            <p className="text-xs text-muted-foreground">+3% from last week</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Session Duration</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">14m 32s</div>
            <p className="text-xs text-muted-foreground">+2m 15s from last week</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Active Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3,892</div>
            <p className="text-xs text-muted-foreground">+18% from last month</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Retention Cohort Analysis</CardTitle>
            <CardDescription>User retention by signup week</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Week 1 (Jan 22-28)</span>
                  <span className="text-sm text-gray-500">72% retained</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-green-600 h-2 rounded-full" style={{ width: '72%' }}></div>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Week 2 (Jan 15-21)</span>
                  <span className="text-sm text-gray-500">68% retained</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-blue-600 h-2 rounded-full" style={{ width: '68%' }}></div>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Week 3 (Jan 8-14)</span>
                  <span className="text-sm text-gray-500">65% retained</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-purple-600 h-2 rounded-full" style={{ width: '65%' }}></div>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Week 4 (Jan 1-7)</span>
                  <span className="text-sm text-gray-500">61% retained</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-orange-600 h-2 rounded-full" style={{ width: '61%' }}></div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Usage Patterns</CardTitle>
            <CardDescription>When users are most active</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-3">Peak Hours (UTC)</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">9:00 AM - 11:00 AM</span>
                    <span className="text-sm text-gray-500">28% of daily traffic</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">2:00 PM - 4:00 PM</span>
                    <span className="text-sm text-gray-500">24% of daily traffic</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">7:00 PM - 9:00 PM</span>
                    <span className="text-sm text-gray-500">19% of daily traffic</span>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="font-medium mb-3">Peak Days</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Tuesday</span>
                    <span className="text-sm text-gray-500">18% of weekly traffic</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Wednesday</span>
                    <span className="text-sm text-gray-500">17% of weekly traffic</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Thursday</span>
                    <span className="text-sm text-gray-500">16% of weekly traffic</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>User Segments</CardTitle>
            <CardDescription>Activity-based user categories</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">Power Users</span>
                  <span className="text-sm text-gray-500">15%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-green-600 h-2 rounded-full" style={{ width: '15%' }}></div>
                </div>
                <p className="text-xs text-gray-500 mt-1">Daily active, 30+ messages/week</p>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">Regular Users</span>
                  <span className="text-sm text-gray-500">45%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-blue-600 h-2 rounded-full" style={{ width: '45%' }}></div>
                </div>
                <p className="text-xs text-gray-500 mt-1">3-5 times/week, 10-30 messages</p>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">Casual Users</span>
                  <span className="text-sm text-gray-500">40%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-yellow-600 h-2 rounded-full" style={{ width: '40%' }}></div>
                </div>
                <p className="text-xs text-gray-500 mt-1">1-2 times/week, &lt;10 messages</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Feature Usage</CardTitle>
            <CardDescription>Most popular features</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Text Chat</span>
                <span className="text-sm text-gray-500">95%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Voice Messages</span>
                <span className="text-sm text-gray-500">67%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">File Upload</span>
                <span className="text-sm text-gray-500">43%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Voice Calls</span>
                <span className="text-sm text-gray-500">28%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Screen Share</span>
                <span className="text-sm text-gray-500">12%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Churn Risk Analysis</CardTitle>
            <CardDescription>Users at risk of leaving</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">127</div>
                <p className="text-sm text-gray-500">High risk users</p>
                <p className="text-xs text-gray-400">No activity in 14+ days</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">284</div>
                <p className="text-sm text-gray-500">Medium risk users</p>
                <p className="text-xs text-gray-400">Declining activity trend</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">2,341</div>
                <p className="text-sm text-gray-500">Healthy users</p>
                <p className="text-xs text-gray-400">Regular engagement</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Engagement Trends</CardTitle>
          <CardDescription>User activity over the past 30 days</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">4.2</div>
              <p className="text-sm text-gray-500">Avg. sessions per user</p>
              <p className="text-xs text-green-600">+8% vs last month</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">23.4</div>
              <p className="text-sm text-gray-500">Avg. messages per session</p>
              <p className="text-xs text-green-600">+12% vs last month</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">87%</div>
              <p className="text-sm text-gray-500">Session completion rate</p>
              <p className="text-xs text-green-600">+3% vs last month</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">2.8</div>
              <p className="text-sm text-gray-500">Avg. days between sessions</p>
              <p className="text-xs text-red-600">+0.3 vs last month</p>
            </div>
          </div>
        </CardContent>
      </Card>
      </div>
    </DashboardLayout>
  )
}