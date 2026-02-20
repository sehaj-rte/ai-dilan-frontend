'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  MessageSquare,
  TrendingUp,
  Clock,
  ArrowUpRight,
  Search,
  Filter,
  Mic,
  FileText,
  Users,
  BrainCircuit,
  Lightbulb,
  Plus,
  Tag,
  ChevronRight,
  RefreshCw,
  AlertCircle,
  Activity
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Cell
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
interface TopQuestion {
  question: string
  frequency: number
  avgSession: string
  influence: string
  color: string
}

interface ThemeItem {
  name: string
  value: number
  growth: string
  depth: string
}

interface AiInsight {
  headline: string
  explanation: string
  confidence: number
  tags: string[]
}

interface LiveOpportunity {
  topic: string
  audience_pct: number
  spike_pct: number
}

interface AudienceInsightsData {
  success: boolean
  expert_id: string
  timeframe: string
  top_questions: TopQuestion[]
  theme_data: ThemeItem[]
  total_themes_identified: number
  ai_insights: AiInsight[]
  live_opportunity: LiveOpportunity | null
  summary: {
    total_sessions: number
    total_user_messages: number
    unique_users: number
    avg_session_minutes: number
  }
}

// ── Skeletons ────────────────────────────────────────────────────────
function ThemesSkeleton() {
  return (
    <Card className="border-slate-200/60 shadow-sm border-l-4 border-l-blue-500 animate-pulse">
      <CardHeader>
        <div className="h-5 w-32 bg-slate-200 rounded" />
        <div className="h-3 w-56 bg-slate-100 rounded mt-2" />
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          <div className="md:col-span-3 h-[280px] bg-slate-100 rounded-lg" />
          <div className="md:col-span-2 space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-slate-50 rounded-lg p-3 border border-slate-100 h-16" />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function QuestionsSkeleton() {
  return (
    <Card className="border-slate-200/60 shadow-sm overflow-hidden animate-pulse">
      <CardHeader className="bg-slate-50/30 border-b border-slate-100/50">
        <div className="h-5 w-36 bg-slate-200 rounded" />
        <div className="h-3 w-64 bg-slate-100 rounded mt-2" />
      </CardHeader>
      <CardContent className="p-0">
        <div className="space-y-0 divide-y divide-slate-100">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="px-6 py-4 flex items-center gap-4">
              <div className="h-4 w-6 bg-slate-100 rounded" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-full bg-slate-100 rounded" />
              </div>
              <div className="h-4 w-12 bg-slate-100 rounded" />
              <div className="h-4 w-16 bg-slate-100 rounded" />
              <div className="h-5 w-14 bg-slate-100 rounded" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function InsightsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 px-1">
        <div className="h-5 w-5 bg-slate-200 rounded" />
        <div className="h-6 w-48 bg-slate-200 rounded" />
      </div>
      {[1, 2, 3].map(i => (
        <Card key={i} className="border-slate-200/60 animate-pulse">
          <CardHeader className="pb-2">
            <div className="flex gap-1.5 mb-2">
              <div className="h-4 w-16 bg-slate-100 rounded" />
              <div className="h-4 w-20 bg-slate-100 rounded" />
            </div>
            <div className="h-5 w-48 bg-slate-200 rounded" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="h-12 w-full bg-slate-100 rounded" />
            <div className="flex items-center gap-2 pt-2">
              <div className="h-8 flex-1 bg-slate-200 rounded" />
              <div className="h-8 w-10 bg-slate-100 rounded" />
            </div>
          </CardContent>
          <div className="h-1 w-full bg-slate-100" />
        </Card>
      ))}
    </div>
  )
}

export default function AudienceInsightsPage() {
  const params = useParams()
  const projectId = params.id as string
  const [timeRange, setTimeRange] = useState('30d')
  const [data, setData] = useState<AudienceInsightsData | null>(null)
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
        `${API_URL}/experts/${projectId}/audience-insights?timeframe=${timeRange}`,
        { headers: getAuthHeaders() }
      )
      if (!response.ok) throw new Error(`HTTP ${response.status}: Failed to load data`)
      const result = await response.json()
      if (result.success) {
        setData(result)
        setLastRefresh(new Date())
      } else throw new Error(result.error || 'Server returned unsuccessful')
    } catch (err: any) {
      console.error('Audience insights fetch error:', err)
      setError(err.message || 'Failed to sync with intelligence engine')
    } finally {
      setLoading(false)
    }
  }, [projectId, timeRange])

  useEffect(() => { fetchData() }, [fetchData])

  const topQuestions = data?.top_questions || []
  const themeData = data?.theme_data || []
  const aiInsights = data?.ai_insights || []
  const liveOpp = data?.live_opportunity

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
              Audience Insights
              <Badge variant="outline" className="font-semibold text-blue-600 border-blue-200 bg-blue-50/50">Pro AI</Badge>
            </h1>
            <p className="text-muted-foreground mt-1">Extracting deeper meaning from user interactions and intents.</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-[140px] h-9 text-xs">
                <SelectValue placeholder="Last 30 Days" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 Days</SelectItem>
                <SelectItem value="30d">Last 30 Days</SelectItem>
                <SelectItem value="90d">Last 90 Days</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" variant="outline" className="h-9 gap-2" onClick={fetchData} disabled={loading}>
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Analyzing...' : 'Refresh'}
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

          {/* SECTION 1: TOP THEMES & QUESTIONS */}
          <div className="xl:col-span-2 space-y-6">
            {/* SECTION 1: TOP THEMES */}
            {loading && !data ? <ThemesSkeleton /> : (
              <Card className="border-slate-200/60 shadow-sm border-l-4 border-l-blue-500">
                <CardHeader>
                  <div className="flex items-center gap-2 mb-1">
                    <Tag className="h-4 w-4 text-blue-500" />
                    <CardTitle className="text-lg font-bold">Top Themes</CardTitle>
                  </div>
                  <CardDescription>Core interest areas identified by AI sentiment analysis.</CardDescription>
                </CardHeader>
                <CardContent>
                  {themeData.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                      <div className="md:col-span-3 h-[280px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={themeData} layout="vertical" margin={{ left: -20 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                            <XAxis type="number" hide />
                            <YAxis
                              dataKey="name"
                              type="category"
                              axisLine={false}
                              tickLine={false}
                              tick={{ fill: '#475569', fontSize: 12, fontWeight: 600 }}
                            />
                            <RechartsTooltip
                              cursor={{ fill: '#f8fafc' }}
                              contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            />
                            <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={24}>
                              {themeData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={index === 0 ? '#3b82f6' : '#94a3b8'} fillOpacity={1 - (index * 0.1)} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="md:col-span-2 space-y-4 flex flex-col justify-center">
                        {themeData.slice(0, 3).map((theme, i) => (
                          <div key={i} className="bg-slate-50 rounded-lg p-3 border border-slate-100 flex items-center justify-between group cursor-pointer hover:border-blue-200 hover:bg-white transition-all">
                            <div>
                              <p className="text-xs font-bold text-slate-800">{theme.name}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className={`text-[10px] font-bold ${theme.growth.startsWith('-') ? 'text-red-500' : 'text-green-600'}`}>{theme.growth} Growth</span>
                                <span className="text-[10px] text-slate-400">•</span>
                                <span className="text-[10px] text-slate-500 font-medium">{theme.depth} Depth</span>
                              </div>
                            </div>
                            <div className="h-7 w-7 rounded-full bg-white border border-slate-200 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <Plus className="h-3 w-3 text-blue-500" />
                            </div>
                          </div>
                        ))}
                        <Button variant="ghost" size="sm" className="w-full text-[10px] uppercase font-bold tracking-widest text-slate-400 hover:text-blue-500">
                          View All {data?.total_themes_identified || 0} Themes
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <div className="h-12 w-12 rounded-full bg-blue-50 flex items-center justify-center mb-3">
                        <Tag className="h-6 w-6 text-blue-400" />
                      </div>
                      <p className="text-sm font-bold text-slate-700 italic">No Themes Detected Yet</p>
                      <p className="text-xs text-slate-400 max-w-[250px] mt-1">As your audience interacts more, themes will emerge automatically.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* SECTION 2: TOP QUESTIONS */}
            {loading && !data ? <QuestionsSkeleton /> : (
              <Card className="border-slate-200/60 shadow-sm overflow-hidden">
                <CardHeader className="bg-slate-50/30 border-b border-slate-100/50">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg font-bold">Top Questions</CardTitle>
                      <CardDescription>The most frequent queries ranking by impact.</CardDescription>
                    </div>
                    <Button variant="ghost" size="sm" className="text-blue-600 text-xs font-semibold gap-1">
                      Export List <ChevronRight className="h-3 w-3" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {topQuestions.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="bg-slate-50/50 border-b border-slate-100 italic">
                            <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">Ranked Question</th>
                            <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">Freq</th>
                            <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">Avg Session</th>
                            <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">Rev Influence</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {topQuestions.map((item, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/50 transition-colors group">
                              <td className="px-6 py-4">
                                <div className="flex items-start gap-3">
                                  <span className="text-xs font-bold text-slate-300 group-hover:text-blue-500 transition-colors pt-1">0{idx + 1}</span>
                                  <span className="text-sm font-semibold text-slate-700 leading-tight pr-4">{item.question}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <span className="text-xs font-medium text-slate-600">{item.frequency.toLocaleString()}</span>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-1.5">
                                  <Clock className="h-3 w-3 text-slate-400" />
                                  <span className="text-xs font-medium text-slate-600">{item.avgSession}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <Badge variant="secondary" className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0 h-5 border-none ${item.color}`}>
                                  {item.influence}
                                </Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <div className="h-12 w-12 rounded-full bg-slate-50 flex items-center justify-center mb-3">
                        <MessageSquare className="h-6 w-6 text-slate-400" />
                      </div>
                      <p className="text-sm font-bold text-slate-700 italic">No Questions Detected Yet</p>
                      <p className="text-xs text-slate-400 max-w-[250px] mt-1">User questions will appear here once there are enough interactions.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* SECTION 3: READ BETWEEN THE LINES INSIGHTS */}
          {loading && !data ? <InsightsSkeleton /> : (
            <div className="space-y-6">
              <div className="flex items-center gap-2 px-1">
                <BrainCircuit className="h-5 w-5 text-indigo-600" />
                <h2 className="text-xl font-bold text-slate-900 italic">Read Between the Lines</h2>
              </div>

              {aiInsights.length > 0 ? (
                aiInsights.map((insight, idx) => (
                  <Card key={idx} className="group relative border-slate-200/60 transition-all hover:shadow-lg hover:border-indigo-200 overflow-hidden">
                    <div className="absolute top-0 right-0 p-3">
                      <div className="flex items-center flex-col">
                        <span className="text-[10px] font-bold text-indigo-600">{insight.confidence}%</span>
                        <span className="text-[8px] uppercase font-bold text-slate-400">Confidence</span>
                      </div>
                    </div>
                    <CardHeader className="pb-2">
                      <div className="flex gap-1.5 mb-2">
                        {insight.tags.map((tag, i) => (
                          <span key={i} className="text-[8px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-bold uppercase">{tag}</span>
                        ))}
                      </div>
                      <CardTitle className="text-md font-bold group-hover:text-indigo-600 transition-colors">{insight.headline}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-sm text-slate-600 leading-relaxed font-medium">
                        &ldquo;{insight.explanation}&rdquo;
                      </p>
                      <div className="flex items-center gap-2 pt-2">
                        <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 h-8 text-xs font-bold w-full rounded-lg">
                          Create content for this
                        </Button>
                        <Button variant="outline" size="sm" className="h-8 w-10 p-0 border-slate-200 hover:bg-slate-50">
                          <Plus className="h-3.5 w-3.5 text-slate-500" />
                        </Button>
                      </div>
                    </CardContent>
                    <div className="h-1 w-full bg-slate-100">
                      <div
                        className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 transition-all duration-1000"
                        style={{ width: `${insight.confidence}%` }}
                      />
                    </div>
                  </Card>
                ))
              ) : (
                <Card className="border-slate-100 bg-slate-50/30">
                  <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="h-12 w-12 rounded-full bg-indigo-50 flex items-center justify-center mb-3">
                      <BrainCircuit className="h-6 w-6 text-indigo-400" />
                    </div>
                    <p className="text-sm font-bold text-slate-700 italic">Building Intelligence</p>
                    <p className="text-xs text-slate-400 max-w-[250px] mt-1">More interactions will unlock deeper behavioral pattern analysis.</p>
                  </CardContent>
                </Card>
              )}

              {/* LIVE OPPORTUNITY */}
              {loading && !data ? (
                <Card className="bg-slate-900 border-none shadow-xl overflow-hidden relative animate-pulse">
                  <CardContent className="p-6 space-y-3">
                    <div className="h-4 w-32 bg-slate-700 rounded" />
                    <div className="h-3 w-full bg-slate-800 rounded" />
                    <div className="h-8 w-full bg-slate-700 rounded mt-2" />
                  </CardContent>
                </Card>
              ) : liveOpp ? (
                <Card className="bg-slate-900 text-white border-none shadow-xl overflow-hidden relative">
                  <div className="absolute top-0 right-0 p-4 opacity-10">
                    <Lightbulb className="h-20 w-20" />
                  </div>
                  <CardHeader>
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                      Live Opportunity
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-xs text-slate-300 font-medium">
                      {liveOpp.audience_pct > 0 ? `${liveOpp.audience_pct}%` : 'A growing segment'} of your AUDIENCE is currently asking about <span className="text-white font-bold underline decoration-blue-500 underline-offset-4">{liveOpp.topic}</span>.
                    </p>
                    <Button className="w-full bg-white text-slate-900 border-none h-8 text-[11px] font-bold hover:bg-blue-50">
                      Draft Newsletter Segment
                    </Button>
                  </CardContent>
                </Card>
              ) : !loading ? (
                <Card className="bg-slate-900 text-white border-none shadow-xl overflow-hidden relative">
                  <div className="absolute top-0 right-0 p-4 opacity-10">
                    <Activity className="h-20 w-20" />
                  </div>
                  <CardHeader>
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                      Trending Analysis
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-xs text-slate-300 font-medium">
                      No trending spikes detected yet. As more sessions accumulate, live opportunities will surface here automatically.
                    </p>
                  </CardContent>
                </Card>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}