'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DollarSign,
  TrendingUp,
  Target,
  Zap,
  BarChart3,
  PieChart as PieChartIcon,
  ArrowUpRight,
  Lightbulb,
  Gem,
  Coins,
  ShieldCheck,
  RefreshCw,
  AlertCircle
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie
} from 'recharts'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { API_URL } from '@/lib/config'
import { fetchWithAuth, getAuthHeaders } from '@/lib/api-client'

// ── Types ────────────────────────────────────────────────────────────
interface ThemeRevenue {
  theme: string
  revenue: number
  sessions: number
  users: number
  color: string
}

interface InteractionMode {
  name: string
  value: number
  revenue: number
  count: number
  color: string
}

interface RevenueInteraction {
  theme: string
  avgRevenue: string
  avgRevenueRaw: number
  conversion: string
  conversionRaw: number
  trend: string
  trendRaw: number
  type: string
  sessions: number
  users: number
}

interface OpportunitySignal {
  title: string
  description: string
  recommendation: string
  impact: string
  estRevenue: string
  iconType: string
}

interface RevenueHealth {
  conversion_efficiency: number
  total_sessions: number
  paid_sessions: number
  active_subscribers: number
  tip: string
}

interface RevenueIntelligenceData {
  success: boolean
  expert_id: string
  timeframe: string
  currency: string
  currency_symbol: string
  total_revenue: number
  total_revenue_prev: number
  revenue_trend: number
  revenue_by_theme: ThemeRevenue[]
  interaction_mode: InteractionMode[]
  total_interaction_revenue: number
  revenue_per_interaction: RevenueInteraction[]
  opportunity_signals: OpportunitySignal[]
  revenue_health: RevenueHealth
}

// ── Skeletons ────────────────────────────────────────────────────────
function ChartSkeleton() {
  return (
    <Card className="border-slate-200/60 shadow-sm animate-pulse">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="h-4 w-32 bg-slate-200 rounded" />
          <div className="h-4 w-4 bg-slate-100 rounded" />
        </div>
        <div className="h-3 w-48 bg-slate-100 rounded mt-2" />
      </CardHeader>
      <CardContent>
        <div className="h-[240px] flex items-end gap-3 pt-8">
          {[60, 45, 35, 25, 15].map((h, i) => (
            <div key={i} className="flex-1 bg-slate-100 rounded-t-md" style={{ height: `${h}%` }} />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function PieSkeleton() {
  return (
    <Card className="border-slate-200/60 shadow-sm animate-pulse">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="h-4 w-32 bg-slate-200 rounded" />
          <div className="h-4 w-4 bg-slate-100 rounded" />
        </div>
        <div className="h-3 w-48 bg-slate-100 rounded mt-2" />
      </CardHeader>
      <CardContent className="flex items-center justify-center pt-4">
        <div className="h-[180px] w-[180px] rounded-full bg-slate-100" />
      </CardContent>
    </Card>
  )
}

function TableSkeleton() {
  return (
    <Card className="border-slate-200/60 shadow-sm overflow-hidden animate-pulse">
      <CardHeader className="bg-slate-50/30 border-b border-slate-100/50">
        <div className="h-5 w-48 bg-slate-200 rounded" />
        <div className="h-3 w-64 bg-slate-100 rounded mt-2" />
      </CardHeader>
      <CardContent className="p-0">
        <div className="p-6 space-y-4">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="flex items-center gap-4">
              <div className="h-8 flex-1 bg-slate-100 rounded" />
              <div className="h-8 w-20 bg-slate-50 rounded" />
              <div className="h-8 w-24 bg-slate-50 rounded" />
              <div className="h-8 w-16 bg-slate-50 rounded" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function SignalSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2].map(i => (
        <Card key={i} className="animate-pulse border-slate-200/60">
          <CardHeader className="pb-2">
            <div className="h-4 w-20 bg-slate-100 rounded mb-2" />
            <div className="h-5 w-48 bg-slate-200 rounded" />
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="h-12 w-full bg-slate-50 rounded" />
            <div className="h-10 w-full bg-slate-100 rounded" />
            <div className="h-8 w-full bg-slate-50 rounded" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

// ── Icon helper ──────────────────────────────────────────────────────
function SignalIcon({ type }: { type: string }) {
  if (type === 'zap') return <Zap className="h-4 w-4 text-amber-500" />
  return <Target className="h-4 w-4 text-blue-500" />
}

export default function RevenueIntelligencePage() {
  const params = useParams()
  const projectId = params.id as string
  const [timeRange, setTimeRange] = useState('30d')
  const [data, setData] = useState<RevenueIntelligenceData | null>(null)
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
        `${API_URL}/experts/${projectId}/revenue-intelligence?timeframe=${timeRange}`,
        { headers: getAuthHeaders() }
      )
      if (!response.ok) throw new Error(`HTTP ${response.status}: Failed to load data`)
      const result = await response.json()
      if (result.success) {
        setData(result)
        setLastRefresh(new Date())
      } else throw new Error(result.error || 'Server returned unsuccessful')
    } catch (err: any) {
      console.error('Revenue intelligence fetch error:', err)
      setError(err.message || 'Failed to sync with revenue engine')
    } finally {
      setLoading(false)
    }
  }, [projectId, timeRange])

  useEffect(() => { fetchData() }, [fetchData])

  const sym = data?.currency_symbol || '£'

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
              Revenue Intelligence
              <Badge variant="outline" className="font-semibold text-emerald-600 border-emerald-200 bg-emerald-50/50">Alpha Live</Badge>
            </h1>
            <p className="text-muted-foreground mt-1">Tying knowledge interactions directly to your bottom line.</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-[140px] h-9 text-xs font-semibold">
                <SelectValue placeholder="Last 30 Days" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 Days</SelectItem>
                <SelectItem value="30d">Last 30 Days</SelectItem>
                <SelectItem value="90d">Last 90 Days</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" variant="outline" className="h-9 gap-2 shadow-sm" onClick={fetchData} disabled={loading}>
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

          {/* SECTION 1: REVENUE BREAKDOWN */}
          <div className="xl:col-span-2 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {loading && !data ? <ChartSkeleton /> : (
                <Card className="border-slate-200/60 shadow-sm">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-bold flex items-center gap-2">
                        <Gem className="h-4 w-4 text-blue-500" /> Revenue by Theme
                      </CardTitle>
                      <PieChartIcon className="h-4 w-4 text-slate-300" />
                    </div>
                    <CardDescription className="text-[11px]">Correlation of topics to subscriber revenue.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {data && data.revenue_by_theme.length > 0 ? (
                      <div className="h-[240px] mt-4">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={data.revenue_by_theme} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis
                              dataKey="theme"
                              axisLine={false}
                              tickLine={false}
                              tick={{ fill: '#64748b', fontSize: 10, fontWeight: 600 }}
                            />
                            <YAxis hide />
                            <RechartsTooltip
                              cursor={{ fill: '#f8fafc' }}
                              contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                              formatter={(value: any) => [`${sym}${Number(value || 0).toLocaleString()}`, 'Revenue']}
                            />
                            <Bar dataKey="revenue" radius={[6, 6, 0, 0]} barSize={40}>
                              {data.revenue_by_theme.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="h-[240px] flex flex-col items-center justify-center text-center mt-4">
                        <BarChart3 className="h-10 w-10 text-slate-200 mb-2" />
                        <p className="text-sm font-bold text-slate-400">No theme data yet</p>
                        <p className="text-xs text-slate-300">Interactions will populate revenue themes.</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {loading && !data ? <PieSkeleton /> : (
                <Card className="border-slate-200/60 shadow-sm">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-bold flex items-center gap-2">
                        <Coins className="h-4 w-4 text-emerald-500" /> Interaction Mode
                      </CardTitle>
                      <TrendingUp className="h-4 w-4 text-slate-300" />
                    </div>
                    <CardDescription className="text-[11px]">Revenue split between Text and Voice sessions.</CardDescription>
                  </CardHeader>
                  <CardContent className="flex items-center justify-center pt-4">
                    <div className="h-[180px] w-full relative">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={data?.interaction_mode || []}
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {(data?.interaction_mode || []).map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <RechartsTooltip
                            formatter={(value: any, name: any) => [`${value}%`, name]}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-xl font-bold">
                          {data ? `${sym}${(data.total_interaction_revenue / 1000).toFixed(1)}k` : '—'}
                        </span>
                        <span className="text-[10px] text-slate-400 font-bold uppercase">Total</span>
                      </div>
                    </div>
                    <div className="space-y-2 ml-4">
                      {(data?.interaction_mode || []).map((mode, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full" style={{ backgroundColor: mode.color }} />
                          <span className="text-[11px] font-bold text-slate-600">
                            {mode.name}: {mode.value}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* SECTION 2: REVENUE PER INTERACTION */}
            {loading && !data ? <TableSkeleton /> : (
              <Card className="border-slate-200/60 shadow-sm overflow-hidden">
                <CardHeader className="bg-slate-50/30 border-b border-slate-100/50">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg font-bold">Revenue Per Interaction</CardTitle>
                      <CardDescription>Valuing themes by their average transaction impact.</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {data && data.revenue_per_interaction.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="bg-slate-50/50 border-b border-slate-100 italic">
                            <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">Interaction / Theme</th>
                            <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">Avg Revenue</th>
                            <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">Conv Likelihood</th>
                            <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">Trend</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {data.revenue_per_interaction.map((item, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/50 transition-colors group">
                              <td className="px-6 py-4">
                                <div className="flex flex-col">
                                  <span className="text-sm font-bold text-slate-700">{item.theme}</span>
                                  <span className="text-[10px] font-medium text-slate-400">{item.type}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <span className="text-sm font-heavy text-slate-900 font-mono tracking-tight">{item.avgRevenue}</span>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-2">
                                  <div className="w-16 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                    <div className="bg-blue-500 h-full" style={{ width: `${Math.min(item.conversionRaw, 100)}%` }} />
                                  </div>
                                  <span className="text-xs font-bold text-slate-600">{item.conversion}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <span className={`text-xs font-bold ${item.trendRaw >= 0 ? 'text-emerald-500' : 'text-slate-400'}`}>
                                  {item.trend}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <BarChart3 className="h-10 w-10 text-slate-200 mb-2" />
                      <p className="text-sm font-bold text-slate-400">No interaction data yet</p>
                      <p className="text-xs text-slate-300">Revenue per interaction will appear as usage grows.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* SECTION 3: OPPORTUNITY SIGNALS */}
          <div className="space-y-6">
            <div className="flex items-center gap-2 px-1">
              <Lightbulb className="h-5 w-5 text-amber-500" />
              <h2 className="text-xl font-bold text-slate-900 italic">Opportunity Signals</h2>
            </div>

            {loading && !data ? <SignalSkeleton /> : (
              <>
                {(data?.opportunity_signals || []).map((sig, idx) => (
                  <Card key={idx} className="group border-slate-200/60 hover:border-amber-200 transition-all hover:shadow-md bg-gradient-to-br from-white to-slate-50/50">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant="outline" className={`text-[9px] font-bold uppercase ${sig.impact === 'High' ? 'text-amber-600 border-amber-200 bg-amber-50' : 'text-blue-600 border-blue-200 bg-blue-50'}`}>
                          {sig.impact} Impact
                        </Badge>
                        <SignalIcon type={sig.iconType} />
                      </div>
                      <CardTitle className="text-md font-bold leading-tight group-hover:text-amber-600 transition-colors">{sig.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-xs text-slate-500 leading-relaxed font-medium">
                        {sig.description}
                      </p>

                      <div className="bg-white p-3 rounded-lg border border-slate-200/60 shadow-sm italic text-xs font-bold text-slate-800 flex items-center gap-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
                        &ldquo;{sig.recommendation}&rdquo;
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                        <div className="flex flex-col">
                          <span className="text-[9px] uppercase font-bold text-slate-400">Est. Revenue</span>
                          <span className="text-xs font-bold text-slate-900">{sig.estRevenue}</span>
                        </div>
                        <Button size="sm" className="bg-slate-900 h-8 text-[10px] font-bold px-4">
                          Deploy Offer
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </>
            )}

            <Card className="bg-indigo-600 text-white border-none shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <DollarSign className="h-20 w-20" />
              </div>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4" />
                  Revenue Health
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] font-bold">
                      <span>Conversion Efficiency</span>
                      <span>{data?.revenue_health?.conversion_efficiency ?? 0}%</span>
                    </div>
                    <div className="w-full bg-indigo-800 rounded-full h-1.5">
                      <div
                        className="bg-white h-full rounded-full transition-all duration-1000"
                        style={{ width: `${data?.revenue_health?.conversion_efficiency ?? 0}%` }}
                      />
                    </div>
                  </div>
                  <p className="text-[10px] text-indigo-100 font-medium">
                    {data?.revenue_health?.tip || 'Loading revenue health analysis...'}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

        </div>
      </div>
    </DashboardLayout>
  )
}