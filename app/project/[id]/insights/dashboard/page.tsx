'use client'

import { useState, useEffect, useCallback } from 'react'
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
  Sparkles,
  Loader2,
  RefreshCw,
  AlertCircle
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
import { API_URL } from '@/lib/config'
import { fetchWithAuth, getAuthHeaders } from '@/lib/api-client'

interface KPI {
  value: number
  trend: number
  currency?: string
  currency_symbol?: string
}

interface RetentionKPI {
  rate: number
  status: string
  label: string
  total_users_30d: number
  returning_users_7d: number
}

interface EngagementDataPoint {
  name: string
  conversations: number
  messages: number
  voice: number
  timeSpent: number
}

interface InsightItem {
  text: string
  icon: string
}

interface DashboardData {
  success: boolean
  expert_id: string
  timeframe: string
  kpis: {
    monthly_revenue: KPI
    active_subscribers: KPI
    avg_revenue_per_sub: KPI & { currency_symbol: string }
    total_conversations: KPI
    avg_session_minutes: KPI
    retention: RetentionKPI
    total_messages: KPI
  }
  engagement_data: EngagementDataPoint[]
  insights: InsightItem[]
}

function getInsightIcon(iconType: string) {
  switch (iconType) {
    case 'sparkles':
      return <Sparkles className="h-4 w-4 text-amber-500" />
    case 'trending_up':
      return <TrendingUp className="h-4 w-4 text-green-500" />
    case 'mic':
      return <Mic className="h-4 w-4 text-blue-500" />
    default:
      return <Sparkles className="h-4 w-4 text-amber-500" />
  }
}

function TrendIndicator({ value }: { value: number }) {
  if (value === 0) {
    return (
      <div className="flex items-center mt-1 text-xs font-medium text-slate-500 italic">
        Stable
      </div>
    )
  }
  if (value > 0) {
    return (
      <div className="flex items-center mt-1 text-xs font-medium text-green-600">
        <ArrowUpRight className="h-3 w-3 mr-0.5" />
        +{value}%
      </div>
    )
  }
  return (
    <div className="flex items-center mt-1 text-xs font-medium text-red-600">
      <ArrowDownRight className="h-3 w-3 mr-0.5" />
      {value}%
    </div>
  )
}

function formatSessionTime(minutes: number): string {
  if (minutes < 1) return '<1m'
  if (minutes < 60) return `${minutes.toFixed(1)}m`
  const h = Math.floor(minutes / 60)
  const m = Math.round(minutes % 60)
  return `${h}h ${m}m`
}

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
  return num.toLocaleString()
}

function SkeletonCard() {
  return (
    <Card className="overflow-hidden animate-pulse">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
        <div className="h-3 w-20 bg-slate-200 rounded" />
        <div className="h-3.5 w-3.5 bg-slate-200 rounded" />
      </CardHeader>
      <CardContent>
        <div className="h-7 w-16 bg-slate-200 rounded mt-1" />
        <div className="h-3 w-12 bg-slate-200 rounded mt-2" />
      </CardContent>
    </Card>
  )
}

export default function AnalyticsDashboardPage() {
  const params = useParams()
  const projectId = params.id as string
  const [metric, setMetric] = useState('conversations')
  const [timeframe, setTimeframe] = useState('week')
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetchWithAuth(
        `${API_URL}/experts/${projectId}/insights-dashboard?timeframe=${timeframe}`,
        { headers: getAuthHeaders() }
      )

      if (!response.ok) {
        throw new Error(`Failed to fetch dashboard data (${response.status})`)
      }

      const result = await response.json()
      if (result.success) {
        setData(result)
        setLastRefresh(new Date())
      } else {
        throw new Error('API returned unsuccessful response')
      }
    } catch (err: any) {
      console.error('Dashboard fetch error:', err)
      setError(err.message || 'Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }, [projectId, timeframe])

  useEffect(() => {
    fetchDashboard()
  }, [fetchDashboard])




  const retentionBadgeClass = data?.kpis?.retention?.status === 'Healthy'
    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-50'
    : data?.kpis?.retention?.status === 'Moderate'
      ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-50'
      : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-50'

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6 space-y-8 animate-in fade-in duration-500">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">Market Intelligence</h1>
            <p className="text-muted-foreground mt-1">Quick Look: High-level economic & engagement snapshot of your AI persona.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchDashboard}
              disabled={loading}
              className="gap-1.5"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <span className="text-[10px] text-muted-foreground hidden md:inline">
              {mounted ? `Updated ${lastRefresh.toLocaleTimeString()}` : ''}
            </span>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <Card className="border-red-200 bg-red-50/50">
            <CardContent className="flex items-center gap-3 py-4">
              <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-800">{error}</p>
                <p className="text-xs text-red-600 mt-0.5">Dashboard will show data once available.</p>
              </div>
              <Button size="sm" variant="outline" onClick={fetchDashboard} className="shrink-0">
                Retry
              </Button>
            </CardContent>
          </Card>
        )}

        {/* SECTION 1: KPI STRIP */}
        <TooltipProvider>
          <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 transition-opacity duration-300 ${loading ? 'opacity-60 pointer-events-none' : 'opacity-100'}`}>
            {loading && !data ? (
              // Initial skeleton loading state
              <>
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
              </>
            ) : data ? (
              <>
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
                    <div className="text-2xl font-bold">
                      {data.kpis.monthly_revenue.currency_symbol}{formatNumber(data.kpis.monthly_revenue.value)}
                    </div>
                    <TrendIndicator value={data.kpis.monthly_revenue.trend} />
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
                    <div className="text-2xl font-bold">{formatNumber(data.kpis.active_subscribers.value)}</div>
                    <TrendIndicator value={data.kpis.active_subscribers.trend} />
                  </CardContent>
                </Card>

                {/* Avg Revenue per Subscriber */}
                <Card className="hover:shadow-md transition-shadow cursor-default group overflow-hidden">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
                    <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Avg Rev/Sub</CardTitle>
                    <TrendingUp className="h-3.5 w-3.5 text-muted-foreground/50" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {data.kpis.avg_revenue_per_sub.currency_symbol}{data.kpis.avg_revenue_per_sub.value.toFixed(2)}
                    </div>
                    <div className="flex items-center mt-1 text-xs font-medium text-slate-500 italic">
                      Per subscriber
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
                    <div className="text-2xl font-bold">{formatNumber(data.kpis.total_conversations.value)}</div>
                    <TrendIndicator value={data.kpis.total_conversations.trend} />
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
                    <div className="text-2xl font-bold">{formatSessionTime(data.kpis.avg_session_minutes.value)}</div>
                    <TrendIndicator value={data.kpis.avg_session_minutes.trend} />
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
                      <TooltipContent>
                        {data.kpis.retention.returning_users_7d} of {data.kpis.retention.total_users_30d} users returned in last 7 days ({data.kpis.retention.rate}%)
                      </TooltipContent>
                    </Tooltip>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-1.5">
                    <Badge className={`w-fit ${retentionBadgeClass}`}>{data.kpis.retention.status}</Badge>
                    <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-[0.05em]">{data.kpis.retention.label}</p>
                  </CardContent>
                </Card>
              </>
            ) : null}
          </div>
        </TooltipProvider>

        {/* SECTION 2: ENGAGEMENT OVER TIME */}
        <Card className="overflow-hidden border-slate-200 shadow-sm relative">
          {/* Chart Loading Overlay */}
          {loading && data && (
            <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] z-10 flex items-center justify-center transition-opacity duration-300">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                <p className="text-sm font-medium text-slate-600">Updating data...</p>
              </div>
            </div>
          )}

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
              {loading && !data ? (
                <div className="flex items-center justify-center h-full">
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                    <p className="text-sm text-muted-foreground">Loading engagement data...</p>
                  </div>
                </div>
              ) : data && data.engagement_data.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.engagement_data}>
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
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="flex flex-col items-center gap-3 text-center">
                    <BarChart3 className="h-10 w-10 text-slate-300" />
                    <div>
                      <p className="text-sm font-medium text-slate-600">No engagement data yet</p>
                      <p className="text-xs text-muted-foreground mt-1">Data will appear as users interact with your AI persona.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-50">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                  <span className="text-xs font-medium text-slate-600">Current Period</span>
                </div>
                {data && data.kpis.total_messages && (
                  <span className="text-xs text-muted-foreground">
                    {formatNumber(data.kpis.total_messages.value)} total messages
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="capitalize">{timeframe}</span> view
              </div>
            </div>
          </CardContent>
        </Card>

        {/* SECTION 3: INSIGHT ENGINE SUMMARY */}
        <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
          <Card className="bg-gradient-to-br from-indigo-600 to-violet-700 text-white border-none shadow-lg overflow-hidden relative group">
            {/* Insights Loading Overlay */}
            {loading && data && (
              <div className="absolute inset-0 bg-indigo-900/40 backdrop-blur-[1px] z-10 flex items-center justify-center transition-opacity duration-300">
                <Loader2 className="h-8 w-8 animate-spin text-white" />
              </div>
            )}
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
              {loading && !data ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="bg-white/10 backdrop-blur-sm p-4 rounded-xl border border-white/10 animate-pulse">
                      <div className="h-8 w-8 rounded-lg bg-white/10 mb-3" />
                      <div className="h-4 w-full bg-white/10 rounded mb-2" />
                      <div className="h-4 w-3/4 bg-white/10 rounded" />
                    </div>
                  ))}
                </div>
              ) : data ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {data.insights.map((insight, i) => (
                    <div key={i} className="bg-white/10 backdrop-blur-sm p-4 rounded-xl border border-white/10 hover:bg-white/15 transition-colors group/item">
                      <div className="h-8 w-8 rounded-lg bg-indigo-500/30 flex items-center justify-center mb-3 group-hover/item:scale-110 transition-transform">
                        {getInsightIcon(insight.icon)}
                      </div>
                      <p className="text-sm leading-relaxed text-indigo-50 font-medium">{insight.text}</p>
                    </div>
                  ))}
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}