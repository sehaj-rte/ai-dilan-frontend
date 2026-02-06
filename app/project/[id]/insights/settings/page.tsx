'use client'

import { useParams } from 'next/navigation'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Settings, Bell, Shield, Database, Download } from 'lucide-react'

export default function AnalyticsSettingsPage() {
  const params = useParams()
  const projectId = params.id as string

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analytics Settings</h1>
          <p className="text-gray-600 mt-2">Configure your analytics preferences and data collection</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Settings className="h-5 w-5" />
              <span>General Settings</span>
            </CardTitle>
            <CardDescription>Configure basic analytics preferences</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="timezone">Timezone</Label>
              <select 
                id="timezone"
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="UTC">UTC (Coordinated Universal Time)</option>
                <option value="America/New_York">Eastern Time (ET)</option>
                <option value="America/Chicago">Central Time (CT)</option>
                <option value="America/Denver">Mountain Time (MT)</option>
                <option value="America/Los_Angeles">Pacific Time (PT)</option>
                <option value="Europe/London">London (GMT)</option>
                <option value="Europe/Paris">Paris (CET)</option>
                <option value="Asia/Tokyo">Tokyo (JST)</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="date-range">Default Date Range</Label>
              <select 
                id="date-range"
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="7">Last 7 days</option>
                <option value="30">Last 30 days</option>
                <option value="90">Last 90 days</option>
                <option value="365">Last year</option>
                <option value="all">All time</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="refresh-interval">Auto-refresh Interval</Label>
              <select 
                id="refresh-interval"
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="0">Manual only</option>
                <option value="30">Every 30 seconds</option>
                <option value="60">Every minute</option>
                <option value="300">Every 5 minutes</option>
                <option value="900">Every 15 minutes</option>
              </select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Bell className="h-5 w-5" />
              <span>Notifications</span>
            </CardTitle>
            <CardDescription>Configure analytics alerts and notifications</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Daily Summary Email</Label>
                <p className="text-sm text-gray-500">Receive daily analytics summary</p>
              </div>
              <Switch />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Weekly Report</Label>
                <p className="text-sm text-gray-500">Weekly performance report</p>
              </div>
              <Switch />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Anomaly Detection</Label>
                <p className="text-sm text-gray-500">Alert on unusual activity patterns</p>
              </div>
              <Switch defaultChecked />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Revenue Milestones</Label>
                <p className="text-sm text-gray-500">Notify when reaching revenue goals</p>
              </div>
              <Switch defaultChecked />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notification-email">Notification Email</Label>
              <Input 
                id="notification-email"
                type="email"
                placeholder="your-email@example.com"
                defaultValue="user@example.com"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Database className="h-5 w-5" />
              <span>Data Collection</span>
            </CardTitle>
            <CardDescription>Control what data is collected and stored</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>User Behavior Tracking</Label>
                <p className="text-sm text-gray-500">Track user interactions and patterns</p>
              </div>
              <Switch defaultChecked />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Conversation Analytics</Label>
                <p className="text-sm text-gray-500">Analyze conversation content and quality</p>
              </div>
              <Switch defaultChecked />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Performance Metrics</Label>
                <p className="text-sm text-gray-500">Collect response time and system metrics</p>
              </div>
              <Switch defaultChecked />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Geographic Data</Label>
                <p className="text-sm text-gray-500">Track user locations for insights</p>
              </div>
              <Switch />
            </div>

            <div className="space-y-2">
              <Label htmlFor="retention-period">Data Retention Period</Label>
              <select 
                id="retention-period"
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="30">30 days</option>
                <option value="90">90 days</option>
                <option value="365">1 year</option>
                <option value="730">2 years</option>
                <option value="unlimited">Unlimited</option>
              </select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Shield className="h-5 w-5" />
              <span>Privacy & Security</span>
            </CardTitle>
            <CardDescription>Manage privacy settings and data security</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Anonymize User Data</Label>
                <p className="text-sm text-gray-500">Remove personally identifiable information</p>
              </div>
              <Switch defaultChecked />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>IP Address Masking</Label>
                <p className="text-sm text-gray-500">Mask the last octet of IP addresses</p>
              </div>
              <Switch defaultChecked />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>GDPR Compliance Mode</Label>
                <p className="text-sm text-gray-500">Enable GDPR-compliant data handling</p>
              </div>
              <Switch defaultChecked />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Data Encryption</Label>
                <p className="text-sm text-gray-500">Encrypt analytics data at rest</p>
              </div>
              <Switch defaultChecked />
            </div>

            <div className="pt-4 border-t">
              <Button variant="outline" className="w-full">
                <Shield className="h-4 w-4 mr-2" />
                View Privacy Policy
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Download className="h-5 w-5" />
            <span>Data Export</span>
          </CardTitle>
          <CardDescription>Export your analytics data for external analysis</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Export Format</Label>
              <select className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                <option value="csv">CSV</option>
                <option value="json">JSON</option>
                <option value="xlsx">Excel (XLSX)</option>
                <option value="pdf">PDF Report</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Date Range</Label>
              <select className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                <option value="7">Last 7 days</option>
                <option value="30">Last 30 days</option>
                <option value="90">Last 90 days</option>
                <option value="365">Last year</option>
                <option value="all">All time</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Data Type</Label>
              <select className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                <option value="all">All Data</option>
                <option value="conversations">Conversations</option>
                <option value="users">User Data</option>
                <option value="revenue">Revenue</option>
                <option value="engagement">Engagement</option>
              </select>
            </div>
          </div>
          <div className="mt-6 flex space-x-4">
            <Button>
              <Download className="h-4 w-4 mr-2" />
              Export Data
            </Button>
            <Button variant="outline">
              Schedule Export
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Advanced Settings</CardTitle>
          <CardDescription>Advanced configuration options for power users</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Debug Mode</Label>
              <p className="text-sm text-gray-500">Enable detailed logging for troubleshooting</p>
            </div>
            <Switch />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Real-time Updates</Label>
              <p className="text-sm text-gray-500">Enable real-time analytics updates</p>
            </div>
            <Switch defaultChecked />
          </div>

          <div className="space-y-2">
            <Label htmlFor="api-key">Analytics API Key</Label>
            <div className="flex space-x-2">
              <Input 
                id="api-key"
                type="password"
                placeholder="••••••••••••••••"
                readOnly
                className="flex-1"
              />
              <Button variant="outline">Regenerate</Button>
            </div>
            <p className="text-sm text-gray-500">Use this key to access analytics data via API</p>
          </div>

          <div className="pt-4 border-t">
            <div className="flex space-x-4">
              <Button>Save Settings</Button>
              <Button variant="outline">Reset to Defaults</Button>
            </div>
          </div>
        </CardContent>
      </Card>
      </div>
    </DashboardLayout>
  )
}