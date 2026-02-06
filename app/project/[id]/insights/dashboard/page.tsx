'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  BarChart3,
  TrendingUp,
  Users,
  Clock,
  MessageSquare,
  Mic,
  ArrowUpRight,
  ArrowDownRight,
  Info,
  ChevronRight,
  Sparkles
} from 'lucide-react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

// Mock data for the engagement graph
const engagementData = [
  { name: 'Mon', conversations: 400, messages: 2400, voice: 400, timeSpent: 300 },
  { name: 'Tue', conversations: 300, messages: 1398, voice: 210, timeSpent: 200 },
  { name: 'Wed', conversations: 200, messages: 9800, voice: 229, timeSpent: 500 },
  { name: 'Thu', conversations: 278, messages: 3908, voice: 200, timeSpent: 280 },
  { name: 'Fri', conversations: 189, messages: 4800, voice: 218, timeSpent: 230 },
  { name: 'Sat', conversations: 239, messages: 3800, voice: 250, timeSpent: 340 },
  { name: 'Sun', conversations: 349, messages: 4300, voice: 210, timeSpent: 400 },
]

const insightItems = [
  { text: "Your Persona performs best when users ask implementation questions.", icon: <Sparkles className="h-4 w-4 text-amber-500" /> },
  { text: "Interest in leadership topics is rising week-over-week.", icon: <TrendingUp className="h-4 w-4 text-green-500" /> },
  { text: "Voice interactions correlate with longer sessions.", icon: <Mic className="h-4 w-4 text-blue-500" /> },
]

export default function AnalyticsDashboardPage() {
  const params = useParams()
  const projectId = params.id as string
  const [metric, setMetric] = useState('conversations')
  const [timeframe, setTimeframe] = useState('week')

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6 space-y-8 animate-in fade-in duration-500">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">Creator Economics</h1>
            <p className="text-muted-foreground mt-1">High-level economic & engagement snapshot of your AI persona.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">Export Data</Button>
            <Button size="sm">Download Report</Button>
          </div>
        </div>

        {/* SECTION 1: KPI STRIP */}
        <TooltipProvider>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            {/* Monthly Revenue */}
            <Card className="hover:shadow-md transition-shadow cursor-default group overflow-hidden border-blue-100/50 bg-gradient-to-br from-white to-blue-50/20">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Monthly Revenue</CardTitle>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3.5 w-3.5 text-muted-foreground/50 hover:text-blue-500 transition-colors" />
                  </TooltipTrigger>
                  <TooltipContent>Revenue generated via your AI Persona</TooltipContent>
                </Tooltip>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">£4,285</div>
                <div className="flex items-center mt-1 text-xs font-medium text-green-600">
                  <ArrowUpRight className="h-3 w-3 mr-0.5" />
                  +12.5%
                </div>
              </CardContent>
              <div className="absolute bottom-0 left-0 w-full h-1 bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
            </Card>

            {/* Active Subscribers */}
            <Card className="hover:shadow-md transition-shadow cursor-default group overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Active Subs</CardTitle>
                <Users className="h-3.5 w-3.5 text-muted-foreground/50" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">152</div>
                <div className="flex items-center mt-1 text-xs font-medium text-green-600">
                  <ArrowUpRight className="h-3 w-3 mr-0.5" />
                  +8.2%
                </div>
              </CardContent>
            </Card>

            {/* Avg Revenue per Subscriber */}
            <Card className="hover:shadow-md transition-shadow cursor-default group overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Avg Rev/Sub</CardTitle>
                <TrendingUp className="h-3.5 w-3.5 text-muted-foreground/50" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">£28.19</div>
                <div className="flex items-center mt-1 text-xs font-medium text-slate-500 italic">
                  Stable
                </div>
              </CardContent>
            </Card>

            {/* Total Conversations */}
            <Card className="hover:shadow-md transition-shadow cursor-default group overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Convos</CardTitle>
                <MessageSquare className="h-3.5 w-3.5 text-muted-foreground/50" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">8,432</div>
                <div className="flex items-center mt-1 text-xs font-medium text-green-600">
                  <ArrowUpRight className="h-3 w-3 mr-0.5" />
                  +24.3%
                </div>
              </CardContent>
            </Card>

            {/* Avg Session Length */}
            <Card className="hover:shadow-md transition-shadow cursor-default group overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Avg Session</CardTitle>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Clock className="h-3.5 w-3.5 text-muted-foreground/50" />
                  </TooltipTrigger>
                  <TooltipContent>Time spent engaging with your Persona</TooltipContent>
                </Tooltip>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">12.4m</div>
                <div className="flex items-center mt-1 text-xs font-medium text-red-600">
                  <ArrowDownRight className="h-3 w-3 mr-0.5" />
                  -2.1%
                </div>
              </CardContent>
            </Card>

            {/* Retention Health */}
            <Card className="hover:shadow-md transition-shadow cursor-default group overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Retention</CardTitle>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3.5 w-3.5 text-muted-foreground/50" />
                  </TooltipTrigger>
                  <TooltipContent>Churn risk analysis based on subscription patterns</TooltipContent>
                </Tooltip>
              </CardHeader>
              <CardContent className="flex flex-col gap-1.5">
                <Badge className="w-fit bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-50">Healthy</Badge>
                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-[0.05em]">Low churn risk</p>
              </CardContent>
            </Card>
          </div>
        </TooltipProvider>

        {/* SECTION 2: ENGAGEMENT OVER TIME */}
        <Card className="overflow-hidden border-slate-200 shadow-sm">
          <CardHeader className="pb-2 border-b border-slate-50">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  Engagement Over Time
                  <Badge variant="secondary" className="font-normal text-[10px] px-1.5 py-0 h-5">Live</Badge>
                </CardTitle>
                <CardDescription>Track how users interact with your AI </CardDescription>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Tabs value={metric} onValueChange={setMetric} className="w-fit">
                  <TabsList className="h-8 p-0.5 bg-slate-100">
                    <TabsTrigger value="conversations" className="text-[11px] h-7 px-2.5">Conversations</TabsTrigger>
                    <TabsTrigger value="messages" className="text-[11px] h-7 px-2.5">Messages</TabsTrigger>
                    <TabsTrigger value="voice" className="text-[11px] h-7 px-2.5">Voice</TabsTrigger>
                    <TabsTrigger value="timeSpent" className="text-[11px] h-7 px-2.5">Time Spent</TabsTrigger>
                  </TabsList>
                </Tabs>
                <div className="h-6 w-[1px] bg-slate-200 mx-1 hidden md:block" />
                <Tabs value={timeframe} onValueChange={setTimeframe} className="w-fit">
                  <TabsList className="h-8 p-0.5 bg-slate-100">
                    <TabsTrigger value="day" className="text-[11px] h-7 px-2.5">Day</TabsTrigger>
                    <TabsTrigger value="week" className="text-[11px] h-7 px-2.5">Week</TabsTrigger>
                    <TabsTrigger value="month" className="text-[11px] h-7 px-2.5">Month</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={engagementData}>
                  <defs>
                    <linearGradient id="colorMetric" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#64748b', fontSize: 12 }}
                    dy={10}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#64748b', fontSize: 12 }}
                    dx={-10}
                  />
                  <RechartsTooltip
                    contentStyle={{
                      borderRadius: '8px',
                      border: 'none',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                      fontSize: '12px',
                      fontWeight: '500'
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey={metric}
                    stroke="#3b82f6"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorMetric)"
                    animationDuration={1500}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-50">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                  <span className="text-xs font-medium text-slate-600">Current Period</span>
                </div>
                <div className="flex items-center gap-1.5 opacity-40">
                  <div className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                  <span className="text-xs font-medium text-slate-600 text-slate-400">Previous Period</span>
                </div>
              </div>
              <Button variant="ghost" size="sm" className="text-[11px] h-7 gap-1 text-slate-500">
                Compare Settings <ChevronRight className="h-3 w-3" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* SECTION 3: INSIGHT ENGINE SUMMARY */}
        <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
          <Card className="bg-gradient-to-br from-indigo-600 to-violet-700 text-white border-none shadow-lg overflow-hidden relative group">
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-700">
              <Sparkles className="h-32 w-32" />
            </div>
            <CardHeader>
              <div className="flex items-center gap-2 mb-1">
                <div className="h-6 w-6 rounded-full bg-white/20 flex items-center justify-center">
                  <Sparkles className="h-3.5 w-3.5 text-white" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-100">Insight Engine</span>
              </div>
              <CardTitle className="text-2xl font-bold">What&apos;s happening right now</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {insightItems.map((insight, i) => (
                  <div key={i} className="bg-white/10 backdrop-blur-sm p-4 rounded-xl border border-white/10 hover:bg-white/15 transition-colors group/item">
                    <div className="h-8 w-8 rounded-lg bg-indigo-500/30 flex items-center justify-center mb-3 group-hover/item:scale-110 transition-transform">
                      {insight.icon}
                    </div>
                    <p className="text-sm leading-relaxed text-indigo-50 font-medium">{insight.text}</p>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-3 mt-6 pt-4">
                <Button className="bg-white text-indigo-600 hover:bg-indigo-50 font-bold px-6">
                  Apply Suggested Action
                </Button>
                <Button variant="ghost" className="text-white hover:bg-white/10 font-bold border border-white/20">
                  View Full Details
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}