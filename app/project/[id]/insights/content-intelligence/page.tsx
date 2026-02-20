'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  BookOpen,
  AlertCircle,
  Zap,
  FilePlus,
  Mic,
  Puzzle,
  ArrowRight,
  Sparkles,
  Search,
  CheckCircle2,
  Clock,
  ExternalLink,
  ChevronRight,
  BrainCircuit,
  Settings,
  Flame,
  FileText,
  Upload,
  Mail,
  MessageCircle,
  RefreshCw,
  Activity
} from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { API_URL } from '@/lib/config'
import { fetchWithAuth, getAuthHeaders } from '@/lib/api-client'

// ── Types ────────────────────────────────────────────────────────────
interface ContentGap {
  topic: string
  issue: string
  count: number
  impact: string
  sessions: string
  color: string
}

interface DropoffWarning {
  topic: string
  drop_pct: number
  session_count: number
  message: string
}

interface TrainingSuggestion {
  id: number
  label: string
  desc: string
  iconType: string
  completed: boolean
}

interface ContentIntelligenceData {
  success: boolean
  expert_id: string
  content_gaps: ContentGap[]
  total_gaps: number
  dropoff_warning: DropoffWarning | null
  training_suggestions: TrainingSuggestion[]
  optimization_tips: string[]
  summary: {
    total_sessions_30d: number
    total_messages_30d: number
    avg_response_length: number
    gap_count: number
  }
}

// ── Icon mapper ──────────────────────────────────────────────────────
function SuggestionIcon({ type }: { type: string }) {
  switch (type) {
    case 'filePlus': return <FilePlus className="h-4 w-4" />
    case 'mic': return <Mic className="h-4 w-4" />
    case 'puzzle': return <Puzzle className="h-4 w-4" />
    case 'settings': return <Settings className="h-4 w-4" />
    default: return <FilePlus className="h-4 w-4" />
  }
}

// ── Skeletons ────────────────────────────────────────────────────────
function GapsSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3, 4].map(i => (
        <Card key={i} className="animate-pulse border-slate-200/60">
          <div className="flex flex-col md:flex-row">
            <div className="flex-1 p-5 space-y-3">
              <div className="flex items-start justify-between">
                <div className="space-y-2 flex-1">
                  <div className="h-5 w-48 bg-slate-200 rounded" />
                  <div className="h-3 w-full bg-slate-100 rounded" />
                </div>
                <div className="h-5 w-20 bg-slate-100 rounded ml-4" />
              </div>
              <div className="flex gap-4 pt-3 border-t border-slate-50">
                <div className="h-4 w-32 bg-slate-100 rounded" />
                <div className="h-4 w-28 bg-slate-100 rounded" />
              </div>
            </div>
            <div className="bg-slate-50/50 md:w-32 p-4 flex items-center justify-center gap-3 border-t md:border-t-0 md:border-l border-slate-100">
              <div className="h-8 w-8 bg-slate-100 rounded-full" />
              <div className="h-8 w-8 bg-slate-100 rounded-full" />
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}

function TrainingSkeleton() {
  return (
    <Card className="border-slate-200/60 shadow-sm border-t-4 border-t-indigo-500 animate-pulse">
      <CardHeader className="pb-4">
        <div className="h-4 w-32 bg-slate-200 rounded" />
        <div className="h-3 w-48 bg-slate-100 rounded mt-2" />
      </CardHeader>
      <CardContent className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="flex items-start gap-3 p-3 rounded-xl border border-slate-100">
            <div className="h-5 w-5 bg-slate-200 rounded-md" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-full bg-slate-100 rounded" />
              <div className="h-3 w-2/3 bg-slate-50 rounded" />
            </div>
            <div className="h-8 w-8 bg-slate-100 rounded-lg" />
          </div>
        ))}
        <div className="pt-4 space-y-3">
          <div className="h-2 w-full bg-slate-100 rounded-full" />
          <div className="h-10 w-full bg-slate-200 rounded-md" />
        </div>
      </CardContent>
    </Card>
  )
}

export default function ContentIntelligencePage() {
  const params = useParams()
  const projectId = params.id as string
  const [data, setData] = useState<ContentIntelligenceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)
  const [mounted, setMounted] = useState(false)
  const [completedItems, setCompletedItems] = useState<Set<number>>(new Set())

  useEffect(() => {
    setMounted(true)
    setLastRefresh(new Date())
  }, [])

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetchWithAuth(
        `${API_URL}/experts/${projectId}/content-intelligence`,
        { headers: getAuthHeaders() }
      )
      if (!response.ok) throw new Error(`HTTP ${response.status}: Failed to load data`)
      const result = await response.json()
      if (result.success) {
        setData(result)
        setLastRefresh(new Date())
        // Reset completed items on fresh data
        const initialCompleted = new Set<number>()
        result.training_suggestions?.forEach((s: TrainingSuggestion) => {
          if (s.completed) initialCompleted.add(s.id)
        })
        setCompletedItems(initialCompleted)
      } else throw new Error(result.error || 'Server returned unsuccessful')
    } catch (err: any) {
      console.error('Content intelligence fetch error:', err)
      setError(err.message || 'Failed to sync with intelligence engine')
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => { fetchData() }, [fetchData])

  const toggleItem = (id: number) => {
    setCompletedItems(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const suggestions = data?.training_suggestions || []
  const completedCount = completedItems.size
  const totalCount = suggestions.length
  const readinessPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  return (
    <DashboardLayout>
      <TooltipProvider>
        <div className="container mx-auto p-6 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-6">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
                Content Analysis
                <Badge variant="outline" className="font-semibold text-violet-600 border-violet-200 bg-violet-50/50 uppercase tracking-wider text-[10px]">Deep Analysis</Badge>
              </h1>
              <p className="text-muted-foreground mt-1">Analyzing knowledge voids and optimizing your AI's expertise.</p>
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

            {/* SECTION 1: CONTENT GAPS */}
            <div className="xl:col-span-2 space-y-6">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-red-500" />
                  <h2 className="text-xl font-bold text-slate-800">Knowledge Gaps</h2>
                </div>
                <Badge variant="secondary" className="bg-slate-100 text-slate-500 font-bold">
                  {data ? `${data.total_gaps} Active Gap${data.total_gaps !== 1 ? 's' : ''}` : '—'}
                </Badge>
              </div>

              {loading && !data ? <GapsSkeleton /> : (
                <div className="grid grid-cols-1 gap-4">
                  {data && data.content_gaps.length > 0 ? (
                    data.content_gaps.map((gap, idx) => (
                      <Card key={idx} className="group overflow-hidden border-slate-200/60 hover:border-violet-200 transition-all hover:shadow-md">
                        <div className="flex flex-col md:flex-row">
                          <div className="flex-1 p-5">
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <h3 className="text-lg font-bold text-slate-900 group-hover:text-violet-600 transition-colors uppercase tracking-tight">{gap.topic}</h3>
                                <p className="text-sm text-slate-500 font-medium mt-1 leading-relaxed">
                                  {gap.issue}
                                </p>
                              </div>
                              <Badge variant="outline" className={`font-bold uppercase text-[9px] px-2 py-0.5 border-none ${gap.color}`}>
                                {gap.impact} Priority
                              </Badge>
                            </div>

                            <div className="flex flex-wrap items-center gap-4 pt-3 border-t border-slate-50 mt-2">
                              <div className="flex items-center gap-1.5">
                                <BrainCircuit className="h-3.5 w-3.5 text-slate-300" />
                                <span className="text-xs font-bold text-slate-600">{gap.count} Unresolved Queries</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <Clock className="h-3.5 w-3.5 text-slate-300" />
                                <span className="text-xs font-bold text-slate-400 italic">{gap.sessions}</span>
                              </div>
                            </div>
                          </div>
                          <div className="bg-slate-50/50 md:w-32 flex flex-row md:flex-col items-center justify-center p-4 gap-3 border-t md:border-t-0 md:border-l border-slate-100">
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0 rounded-full hover:bg-white hover:text-violet-600">
                              <Search className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0 rounded-full hover:bg-white hover:text-green-600">
                              <FilePlus className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))
                  ) : (
                    <Card className="border-slate-100 bg-slate-50/30">
                      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                        <div className="h-12 w-12 rounded-full bg-emerald-50 flex items-center justify-center mb-3"><Activity className="h-6 w-6 text-emerald-400" /></div>
                        <p className="text-sm font-bold text-slate-700 italic">No Knowledge Gaps Detected</p>
                        <p className="text-xs text-slate-400 max-w-[250px] mt-1">Your persona is performing well across all topics. Keep enriching to stay ahead.</p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}

              {/* SESSION DROP-OFF WARNING */}
              {loading && !data ? (
                <Card className="bg-slate-900 border-none shadow-xl overflow-hidden relative animate-pulse">
                  <CardContent className="p-8">
                    <div className="flex flex-col md:flex-row items-center gap-6">
                      <div className="h-16 w-16 rounded-2xl bg-slate-700" />
                      <div className="space-y-3 flex-1">
                        <div className="h-5 w-48 bg-slate-700 rounded" />
                        <div className="h-3 w-full bg-slate-800 rounded" />
                        <div className="h-3 w-3/4 bg-slate-800 rounded" />
                      </div>
                      <div className="h-10 w-32 bg-slate-700 rounded" />
                    </div>
                  </CardContent>
                </Card>
              ) : data?.dropoff_warning ? (
                <Card className="bg-slate-900 text-white border-none shadow-xl overflow-hidden relative">
                  <div className="absolute top-0 right-0 p-6 opacity-10">
                    <Flame className="h-24 w-24 text-orange-500" />
                  </div>
                  <CardContent className="p-8">
                    <div className="flex flex-col md:flex-row items-center gap-6">
                      <div className="h-16 w-16 rounded-2xl bg-orange-500/20 flex items-center justify-center shrink-0 border border-orange-500/30">
                        <AlertCircle className="h-8 w-8 text-orange-500" />
                      </div>
                      <div className="space-y-4 flex-1">
                        <div>
                          <h3 className="text-xl font-bold">Session Drop-off Warning</h3>
                          <p className="text-slate-400 text-sm font-medium">
                            Users asking about <span className="text-white underline decoration-orange-500 underline-offset-4">{data.dropoff_warning.topic}</span> are ending sessions {data.dropoff_warning.drop_pct}% faster than average. This indicates a significant knowledge failure.
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button size="sm" variant="outline" className="bg-white/5 border-white/10 hover:bg-white/10 text-white text-[10px] font-bold">
                            <Mail className="h-3 w-3 mr-1.5" /> Message Cohort (Email)
                          </Button>
                          <Button size="sm" variant="outline" className="bg-white/5 border-white/10 hover:bg-white/10 text-white text-[10px] font-bold">
                            <MessageCircle className="h-3 w-3 mr-1.5" /> Message Cohort (WhatsApp)
                          </Button>
                        </div>
                      </div>
                      <Button className="bg-white text-slate-900 hover:bg-orange-50 font-bold">
                        Train on Topic
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : !loading ? (
                <Card className="bg-slate-900 text-white border-none shadow-xl overflow-hidden relative">
                  <div className="absolute top-0 right-0 p-6 opacity-10">
                    <Sparkles className="h-24 w-24 text-emerald-400" />
                  </div>
                  <CardContent className="p-8">
                    <div className="flex flex-col md:flex-row items-center gap-6">
                      <div className="h-16 w-16 rounded-2xl bg-emerald-500/20 flex items-center justify-center shrink-0 border border-emerald-500/30">
                        <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                      </div>
                      <div className="space-y-2 flex-1">
                        <h3 className="text-xl font-bold">No Session Drop-off Detected</h3>
                        <p className="text-slate-400 text-sm font-medium">
                          Session engagement is healthy across all topics. Continue enriching your knowledge base to maintain this.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : null}
            </div>

            {/* SECTION 2: SUGGESTED TRAINING INPUTS */}
            <div className="space-y-6">
              <div className="flex items-center gap-2 px-1">
                <CheckCircle2 className="h-5 w-5 text-indigo-500" />
                <h2 className="text-xl font-bold text-slate-800 italic">Training Pipeline</h2>
              </div>

              {loading && !data ? <TrainingSkeleton /> : (
                <Card className="border-slate-200/60 shadow-sm border-t-4 border-t-indigo-500">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-sm font-bold uppercase tracking-widest text-slate-400">Next-Step Inputs</CardTitle>
                    <CardDescription className="text-xs font-semibold">Creator tasks to bridge the identified gaps.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {suggestions.length > 0 ? (
                      suggestions.map((item) => {
                        const isCompleted = completedItems.has(item.id)
                        return (
                          <div
                            key={item.id}
                            onClick={() => toggleItem(item.id)}
                            className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer group ${isCompleted ? 'bg-indigo-50/50 border-indigo-100 opacity-60' : 'bg-white border-slate-100 hover:border-indigo-200 hover:shadow-sm'}`}
                          >
                            <div className={`mt-0.5 h-5 w-5 rounded-md border flex items-center justify-center transition-colors ${isCompleted ? 'bg-indigo-500 border-indigo-500' : 'border-slate-300 group-hover:border-indigo-400 bg-white'}`}>
                              {isCompleted && <CheckCircle2 className="h-3.5 w-3.5 text-white" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className={`text-xs font-bold leading-none ${isCompleted ? 'text-indigo-900 line-through' : 'text-slate-700'}`}>{item.label}</span>
                                {!isCompleted && <div className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-pulse" />}
                              </div>
                              <p className="text-[10px] text-slate-400 mt-1 font-medium truncate">{item.desc}</p>
                            </div>
                            <div className={`p-1.5 rounded-lg ${isCompleted ? 'bg-indigo-100 text-indigo-500' : 'bg-slate-50 text-slate-400 group-hover:text-indigo-500 group-hover:bg-indigo-50'} transition-colors`}>
                              <SuggestionIcon type={item.iconType} />
                            </div>
                          </div>
                        )
                      })
                    ) : (
                      <div className="text-center py-6">
                        <p className="text-xs text-slate-400 font-medium italic">No training actions needed right now.</p>
                      </div>
                    )}

                    <div className="pt-4 space-y-3">
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 px-1">
                        <span>Retraining Readiness</span>
                        <span>{readinessPercent}%</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden shadow-inner">
                        <div
                          className="bg-indigo-600 h-full transition-all duration-700"
                          style={{ width: `${readinessPercent}%` }}
                        />
                      </div>
                      <Button className="w-full bg-indigo-600 hover:bg-indigo-700 h-10 font-bold group shadow-xl shadow-indigo-100 mt-2">
                        Retrain Persona Now
                        <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card className="border-slate-200/60 shadow-sm bg-indigo-50/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-bold uppercase text-indigo-600 flex items-center gap-2">
                    <BrainCircuit className="h-4 w-4" /> Pro Optimization Tips
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {data && data.optimization_tips.length > 0 ? (
                    data.optimization_tips.map((tip, idx) => (
                      <div key={idx} className="flex gap-3">
                        <div className="h-6 w-6 rounded bg-white shadow-sm flex items-center justify-center shrink-0 border border-slate-100">
                          <span className="text-[10px] font-bold text-indigo-600">{String(idx + 1).padStart(2, '0')}</span>
                        </div>
                        <p className="text-[11px] text-slate-600 font-medium italic leading-relaxed">
                          {tip}
                        </p>
                      </div>
                    ))
                  ) : (
                    <>
                      <div className="flex gap-3">
                        <div className="h-6 w-6 rounded bg-white shadow-sm flex items-center justify-center shrink-0 border border-slate-100">
                          <span className="text-[10px] font-bold text-indigo-600">01</span>
                        </div>
                        <p className="text-[11px] text-slate-600 font-medium italic leading-relaxed">
                          Voice notes create higher engagement for complex topics than text alone.
                        </p>
                      </div>
                      <div className="flex gap-3">
                        <div className="h-6 w-6 rounded bg-white shadow-sm flex items-center justify-center shrink-0 border border-slate-100">
                          <span className="text-[10px] font-bold text-indigo-600">02</span>
                        </div>
                        <p className="text-[11px] text-slate-600 font-medium italic leading-relaxed">
                          Setting clear boundaries on topics improves compliance and trust.
                        </p>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>

          </div>
        </div>
      </TooltipProvider>
    </DashboardLayout>
  )
}