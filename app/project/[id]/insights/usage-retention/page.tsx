'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Users,
  UserMinus,
  MessageSquare,
  Gift,
  Tag as TagIcon,
  TrendingDown,
  Clock,
  Activity,
  ShieldAlert,
  Layers,
  Sparkles,
  MessageCircle,
  Mail,
  RefreshCw,
  AlertCircle
} from 'lucide-react'
import {
  TooltipProvider,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { API_URL } from '@/lib/config'
import { fetchWithAuth, getAuthHeaders } from '@/lib/api-client'

// ── Types ────────────────────────────────────────────────────────────
interface FunnelStage {
  stage: string
  count: number
  label: string
  value: number
  sub: string
}

interface AtRiskUser {
  name: string
  email: string
  risk: string
  lastSeen: string
  trend: string
  reason: string
}

interface HeatmapCell {
  val: number
  day: number
  user: number
}

interface UsageRetentionData {
  success: boolean
  expert_id: string
  funnel_data: FunnelStage[]
  at_risk_users: AtRiskUser[]
  total_at_risk_count: number
  heatmap_data: HeatmapCell[]
  heatmap_user_names: string[]
  heatmap_day_labels: string[]
  summary: {
    total_users: number
    active_7d: number
    active_30d: number
    retention_rate_7d: number
  }
}

// ── Skeletons ────────────────────────────────────────────────────────
function FunnelSkeleton() {
  return (
    <Card className="border-slate-200/60 shadow-sm overflow-hidden animate-pulse">
      <CardHeader className="bg-slate-50/30 border-b border-slate-100/50 pb-4">
        <div className="h-5 w-40 bg-slate-200 rounded" />
        <div className="h-3 w-64 bg-slate-100 rounded mt-2" />
      </CardHeader>
      <CardContent className="pt-8 pb-4">
        <div className="space-y-6 max-w-2xl mx-auto">
          {[100, 75, 50, 35].map((w, i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="w-32 bg-slate-100 h-8 rounded ml-auto" />
              <div className="flex-1 h-12 rounded-r-full bg-slate-200" style={{ width: `${w}%` }} />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function HeatmapSkeleton() {
  return (
    <Card className="border-slate-200/60 shadow-sm overflow-hidden animate-pulse">
      <CardHeader className="pb-4">
        <div className="h-5 w-44 bg-slate-200 rounded" />
        <div className="h-3 w-64 bg-slate-100 rounded mt-2" />
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-12 gap-2">
          {Array.from({ length: 84 }).map((_, i) => (
            <div key={i} className="h-8 rounded-md bg-slate-100" />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function AtRiskSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map(i => (
        <Card key={i} className="animate-pulse border-slate-200/60">
          <CardHeader className="pb-3"><div className="h-12 w-full bg-slate-100 rounded" /></CardHeader>
          <CardContent><div className="h-24 w-full bg-slate-50 rounded" /></CardContent>
        </Card>
      ))}
    </div>
  )
}

export default function UsageRetentionPage() {
  const params = useParams()
  const projectId = params.id as string
  const [data, setData] = useState<UsageRetentionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    setLastRefresh(new Date())
  }, [])

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetchWithAuth(
        `${API_URL}/experts/${projectId}/usage-retention`,
        { headers: getAuthHeaders() }
      )
      if (!response.ok) throw new Error(`HTTP ${response.status}: Failed to load data`)
      const result = await response.json()
      if (result.success) {
        setData(result)
        setLastRefresh(new Date())
      } else throw new Error(result.error || 'Server returned unsuccessful')
    } catch (err: any) {
      console.error('Retention fetch error:', err)
      setError(err.message || 'Failed to sync with intelligence engine')
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => { fetchData() }, [fetchData])

  return (
    <DashboardLayout>
      <TooltipProvider>
        <div className="container mx-auto p-6 space-y-8 animate-in fade-in duration-700">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-6">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
                Usage & Retention
                <Badge variant="outline" className="font-semibold text-rose-600 border-rose-200 bg-rose-50/50 uppercase tracking-wider text-[10px]">Churn Defense</Badge>
              </h1>
              <p className="text-muted-foreground mt-1">Deep analysis of user stickiness and predictive churn indicators.</p>
            </div>
            <div className="flex items-center gap-3">
              <Button size="sm" variant="outline" className="h-9 gap-2" onClick={fetchData} disabled={loading}>
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                {loading ? 'Analyzing...' : 'Refresh Intel'}
              </Button>
              {mounted && lastRefresh && (
                <div className="text-[10px] text-muted-foreground hidden md:block">
                  Last updated: {lastRefresh.toLocaleTimeString()}
                </div>
              )}
            </div>
          </div>

          {error && (
            <Card className="border-rose-200 bg-rose-50/50 animate-in slide-in-from-top-2">
              <CardContent className="flex items-center gap-3 py-4">
                <AlertCircle className="h-5 w-5 text-rose-500 shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-bold text-rose-900">{error}</p>
                  <p className="text-xs text-rose-700/80">Check your connection or try again in a few moments.</p>
                </div>
                <Button size="sm" variant="outline" onClick={fetchData} className="h-8 border-rose-200 text-rose-700 bg-white">Retry</Button>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            {/* LEFT COLUMN: FUNNEL & HEATMAP */}
            <div className="xl:col-span-2 space-y-8">
              {loading && !data ? <FunnelSkeleton /> : (
                <Card className="border-slate-200/60 shadow-sm overflow-hidden flex flex-col">
                  <CardHeader className="bg-slate-50/30 border-b border-slate-100/50 pb-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Layers className="h-5 w-5 text-indigo-500" />
                        <CardTitle className="text-lg font-bold">Retention Funnel</CardTitle>
                      </div>
                      <Badge variant="secondary" className="bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5">
                        {data?.summary?.total_users ?? 0} Total Interactors
                      </Badge>
                    </div>
                    <CardDescription className="text-xs font-medium">Lifecycle progression from first touch to long-term loyalty.</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-10 pb-6 flex-1">
                    {data && data.funnel_data.length > 0 ? (
                      <div className="relative h-[300px] w-full max-w-2xl mx-auto space-y-4">
                        {data.funnel_data.map((stage, idx) => (
                          <div key={idx} className="relative flex items-center group">
                            <div className="w-32 text-right pr-6 shrink-0">
                              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-tight leading-none mb-1">Stage {idx + 1}</span>
                              <span className="text-xs font-bold text-slate-700 truncate block">{stage.stage}</span>
                            </div>
                            <div className="relative flex-1 h-12 flex items-center">
                              <div
                                className="h-full rounded-r-full bg-gradient-to-r from-indigo-500 to-indigo-600/80 shadow-sm transition-all duration-1000 ease-out flex items-center justify-end pr-4 text-white font-bold text-sm"
                                style={{ width: `${Math.max(stage.value, 8)}%` }}
                              >
                                <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">{stage.sub}</span>
                              </div>
                              <div className="ml-4 flex flex-col">
                                <span className="text-sm font-bold text-slate-900 leading-none">{stage.label}</span>
                                <span className="text-[10px] text-slate-400 font-medium">{stage.sub}</span>
                              </div>
                            </div>
                            {idx < data.funnel_data.length - 1 && (
                              <div className="absolute left-[8.5rem] top-12 w-0.5 h-4 bg-slate-100" />
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="h-[300px] flex flex-col items-center justify-center text-center">
                        <Activity className="h-10 w-10 text-slate-200 mb-2" />
                        <p className="text-sm font-bold text-slate-400">Intelligence gathering in progress...</p>
                        <p className="text-xs text-slate-300">Interact with your AI to see retention patterns.</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {loading && !data ? <HeatmapSkeleton /> : (
                <Card className="border-slate-200/60 shadow-sm overflow-hidden">
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Activity className="h-5 w-5 text-emerald-500" />
                        <CardTitle className="text-lg font-bold uppercase tracking-tight">Engagement Depth</CardTitle>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded bg-slate-100" /><span className="text-[10px] font-bold text-slate-400">Low</span></div>
                        <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded bg-emerald-500" /><span className="text-[10px] font-bold text-slate-400">High</span></div>
                      </div>
                    </div>
                    <CardDescription className="text-xs">Daily interaction density for your top 12 users over the last 7 days.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {data && data.heatmap_data.length > 0 ? (
                      <div className="overflow-x-auto pb-2">
                        <div className="min-w-[500px] grid grid-cols-[80px_1fr] gap-x-4">
                          <div className="space-y-4 pt-[44px]">
                            {data.heatmap_day_labels.map((day, dIdx) => (
                              <div key={dIdx} className="h-8 flex items-center justify-end text-[11px] font-bold text-slate-400 uppercase tracking-wider">{day}</div>
                            ))}
                          </div>
                          <div className="space-y-4">
                            <div className="flex justify-between px-1">
                              {data.heatmap_user_names.map((name, uIdx) => (
                                <Tooltip key={uIdx}>
                                  <TooltipTrigger asChild>
                                    <div className="w-8 text-center text-[9px] font-black text-slate-300 uppercase tracking-tighter truncate cursor-default">
                                      {name.length > 3 ? name.substring(0, 2).toUpperCase() : name}
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent><p className="text-xs font-bold">{name}</p></TooltipContent>
                                </Tooltip>
                              ))}
                            </div>
                            <div className="grid grid-cols-12 gap-2">
                              {data.heatmap_data.map((cell, idx) => (
                                <Tooltip key={idx}>
                                  <TooltipTrigger asChild>
                                    <div className={`h-8 rounded-md transition-all cursor-pointer hover:ring-2 hover:ring-indigo-300 hover:scale-110 active:scale-95 ${cell.val === 0 ? 'bg-slate-50' : cell.val < 2 ? 'bg-emerald-100' :
                                      cell.val < 5 ? 'bg-emerald-300' : cell.val < 10 ? 'bg-emerald-500' : 'bg-emerald-600 shadow-sm'
                                      }`} />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p className="font-bold text-xs">{cell.val} Sessions</p>
                                    <p className="text-[10px] text-slate-500">{data.heatmap_day_labels[cell.day]}, {data.heatmap_user_names[cell.user]}</p>
                                  </TooltipContent>
                                </Tooltip>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="h-[200px] flex items-center justify-center bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                        <p className="text-xs font-medium text-slate-400">Heating up engagement engine...</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>

            {/* RIGHT COLUMN: AT-RISK PULSE */}
            <div className="space-y-6">
              <div className="flex items-center gap-2 px-1">
                <UserMinus className="h-5 w-5 text-rose-500" />
                <h2 className="text-xl font-bold text-slate-900 italic">Predictive Churn</h2>
              </div>

              {loading && !data ? <AtRiskSkeleton /> : (
                <div className="space-y-4">
                  {data && data.at_risk_users.length > 0 ? (
                    data.at_risk_users.map((user, idx) => (
                      <Card key={idx} className="group relative border-slate-200/60 hover:border-rose-200 transition-all hover:shadow-lg bg-white overflow-hidden">
                        <div className="absolute top-0 right-0 p-3">
                          <Badge className={`font-black uppercase text-[8px] h-4 border-none ${user.risk === 'High' ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'}`}>
                            {user.risk} Risk
                          </Badge>
                        </div>
                        <CardHeader className="pb-3 border-b border-slate-50">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-slate-100 group-hover:bg-rose-50 group-hover:text-rose-500 transition-colors flex items-center justify-center font-bold text-slate-400">
                              {user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                            </div>
                            <div className="overflow-hidden">
                              <CardTitle className="text-sm font-bold text-slate-900 truncate">{user.name}</CardTitle>
                              <CardDescription className="text-[10px] truncate">{user.email}</CardDescription>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div><span className="text-[9px] uppercase font-bold text-slate-400 block mb-1">Momentum</span>
                              <div className="flex items-center gap-1"><TrendingDown className="h-3 w-3 text-rose-500" /><span className="text-xs font-bold text-rose-500">{user.trend}</span></div>
                            </div>
                            <div><span className="text-[9px] uppercase font-bold text-slate-400 block mb-1">Last Seen</span>
                              <div className="flex items-center gap-1"><Clock className="h-3 w-3 text-slate-300" /><span className="text-xs font-bold text-slate-600">{user.lastSeen}</span></div>
                            </div>
                          </div>
                          <div className="bg-slate-50/80 rounded-lg p-2.5 flex items-start gap-2 border border-slate-100">
                            <ShieldAlert className="h-3.5 w-3.5 text-rose-500 shrink-0 mt-0.5" />
                            <p className="text-[10px] font-semibold text-slate-600 leading-tight italic">"{user.reason}"</p>
                          </div>
                          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-50">
                            <Button size="sm" variant="outline" className="h-8 text-[10px] font-bold hover:bg-blue-50 hover:text-blue-600" onClick={() => window.open(`mailto:${user.email}`)}><Mail className="h-3 w-3 mr-1.5" /> Email</Button>
                            <Button size="sm" variant="outline" className="h-8 text-[10px] font-bold hover:bg-emerald-50 hover:text-emerald-600"><MessageCircle className="h-3 w-3 mr-1.5" /> WhatsApp</Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <Card className="border-slate-100 bg-slate-50/30">
                      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                        <div className="h-12 w-12 rounded-full bg-emerald-50 flex items-center justify-center mb-3"><Activity className="h-6 w-6 text-emerald-400" /></div>
                        <p className="text-sm font-bold text-slate-700 italic">Optimal Retention Detected</p>
                        <p className="text-xs text-slate-400 max-w-[200px] mt-1">No users are currently exhibiting churn patterns. Excellent work!</p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}

              <Card className="bg-slate-900 border-none shadow-2xl relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/15 to-transparent" />
                <div className="absolute -top-4 -right-4 p-8 opacity-20 rotate-12 group-hover:scale-110 transition-transform"><Sparkles className="h-24 w-24 text-indigo-400" /></div>
                <CardHeader className="relative z-10">
                  <CardTitle className="text-sm font-black text-white flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-rose-500 animate-pulse shadow-[0_0_8px_rgba(244,63,94,0.6)]" />
                    INTELLIGENCE SUMMARY
                  </CardTitle>
                </CardHeader>
                <CardContent className="relative z-10 space-y-4">
                  <div className="text-xs text-slate-300 font-medium leading-relaxed">
                    {data ? (
                      <p>
                        Current 7-day retention is <span className="text-white font-black underline decoration-indigo-500 underline-offset-4">{data.summary.retention_rate_7d}%</span>.
                        Your audience includes <span className="text-white font-bold">{data.summary.active_30d}</span> active users this month.
                      </p>
                    ) : <p className="animate-pulse">Loading audience metrics...</p>}
                  </div>
                  <Button className="w-full bg-white text-slate-900 h-9 font-black text-[10px] hover:bg-indigo-50 transition-all active:scale-95 shadow-lg" onClick={fetchData}>
                    RUN DEEP RETENTION SCAN
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </TooltipProvider>
    </DashboardLayout>
  )
}