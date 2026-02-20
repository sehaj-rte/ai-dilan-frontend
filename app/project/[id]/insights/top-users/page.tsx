'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Crown,
  TrendingUp,
  Zap,
  Sparkles,
  ChevronRight,
  MoreHorizontal,
  Star,
  Rocket,
  RefreshCw,
  AlertCircle,
  Users,
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
interface PowerUser {
  id: string
  name: string
  email: string
  ltv: string
  ltvRaw: number
  sessionsMonth: number
  totalSessions: number
  activeDays: number
  themes: string[]
  avatar: string
  rank: number
}

interface UpgradeCandidate {
  name: string
  email: string
  engagement: string
  engagementRaw: number
  depth: string
  depthRaw: number
  probability: number
  plan: string
  triggers: string[]
}

interface TopUsersData {
  success: boolean
  expert_id: string
  power_users: PowerUser[]
  upgrade_candidates: UpgradeCandidate[]
  summary: {
    total_users: number
    power_user_count: number
    power_user_pct: number
    upgrade_candidate_count: number
    currency: string
    currency_symbol: string
  }
}

// ── Skeletons ────────────────────────────────────────────────────────
function LeaderboardSkeleton() {
  return (
    <Card className="border-slate-200/60 shadow-sm overflow-hidden animate-pulse bg-white/50">
      <div className="p-4 bg-slate-50/50 border-b border-slate-100">
        <div className="h-5 w-48 bg-slate-200 rounded" />
      </div>
      <div className="p-0">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="flex items-center gap-3 p-4 border-b border-slate-50">
            <div className="h-6 w-6 bg-slate-100 rounded-full" />
            <div className="h-10 w-10 bg-slate-100 rounded-full" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3.5 w-28 bg-slate-200 rounded" />
              <div className="h-2.5 w-16 bg-slate-100 rounded" />
            </div>
            <div className="h-4 w-14 bg-slate-100 rounded" />
            <div className="h-6 w-10 bg-slate-100 rounded-full" />
            <div className="h-4 w-24 bg-slate-100 rounded" />
          </div>
        ))}
      </div>
    </Card>
  )
}

function CandidatesSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map(i => (
        <Card key={i} className="animate-pulse border-slate-200/60">
          <div className="h-1.5 bg-slate-200" />
          <CardHeader className="pb-3">
            <div className="h-4 w-32 bg-slate-200 rounded" />
            <div className="h-3 w-20 bg-slate-100 rounded mt-2" />
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div className="h-10 bg-slate-50 rounded" />
              <div className="h-10 bg-slate-50 rounded" />
            </div>
            <div className="h-16 bg-slate-50 rounded" />
            <div className="h-9 bg-slate-100 rounded" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export default function TopUsersPage() {
  const params = useParams()
  const projectId = params.id as string
  const [data, setData] = useState<TopUsersData | null>(null)
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
        `${API_URL}/experts/${projectId}/top-users`,
        { headers: getAuthHeaders() }
      )
      if (!response.ok) throw new Error(`HTTP ${response.status}: Failed to load data`)
      const result = await response.json()
      if (result.success) {
        setData(result)
        setLastRefresh(new Date())
      } else throw new Error(result.error || 'Server returned unsuccessful')
    } catch (err: any) {
      console.error('Top users fetch error:', err)
      setError(err.message || 'Failed to sync with intelligence engine')
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => { fetchData() }, [fetchData])

  const powerUsers = data?.power_users ?? []
  const upgradeCandidates = data?.upgrade_candidates ?? []

  return (
    <DashboardLayout>
      <TooltipProvider>
        <div className="container mx-auto p-6 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-6">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
                Top Subscribers & Targets
                <Badge variant="outline" className="font-semibold text-amber-600 border-amber-200 bg-amber-50/50 uppercase tracking-wider text-[10px]">Economic Leverage</Badge>
              </h1>
              <p className="text-muted-foreground mt-1">Identify your most valuable users and high-conversion targets.</p>
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

            {/* SECTION 1: POWER USERS */}
            <div className="xl:col-span-2 space-y-6">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <Crown className="h-5 w-5 text-amber-500" />
                  <h2 className="text-xl font-bold text-slate-800 tracking-tight">Power Users Leaderboard</h2>
                </div>
                <Badge variant="secondary" className="bg-slate-100 text-slate-500 font-bold">
                  {data ? `Top ${data.summary.power_user_pct}% of Audience` : 'Loading...'}
                </Badge>
              </div>

              {loading && !data ? <LeaderboardSkeleton /> : (
                <Card className="border-slate-200/60 shadow-sm overflow-hidden bg-white/50 backdrop-blur-sm">
                  {powerUsers.length > 0 ? (
                    <>
                      <Table>
                        <TableHeader className="bg-slate-50/50">
                          <TableRow className="hover:bg-transparent">
                            <TableHead className="w-12 text-center text-[10px] font-bold uppercase text-slate-400 tracking-widest">Rank</TableHead>
                            <TableHead className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">User / ID</TableHead>
                            <TableHead className="text-[10px] font-bold uppercase text-slate-400 tracking-widest text-center">LTV (Lifetime)</TableHead>
                            <TableHead className="text-[10px] font-bold uppercase text-slate-400 tracking-widest text-center">Sessions/Mo</TableHead>
                            <TableHead className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Favorite Themes</TableHead>
                            <TableHead className="text-right"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {powerUsers.map((user) => (
                            <TableRow key={user.id} className="group hover:bg-slate-50/80 transition-colors border-slate-100 italic font-medium">
                              <TableCell className="text-center font-bold text-slate-400">
                                {user.rank === 1 ? <Star className="h-4 w-4 text-amber-500 mx-auto fill-amber-500" /> : user.rank}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-3">
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-400 group-hover:bg-white transition-colors border border-transparent group-hover:border-slate-200 cursor-default">
                                        {user.avatar}
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent><p className="text-xs">{user.email}</p></TooltipContent>
                                  </Tooltip>
                                  <div className="flex flex-col">
                                    <span className="text-sm font-bold text-slate-900">{user.name}</span>
                                    <span className="text-[10px] text-slate-400 font-medium">{user.id}</span>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="text-center font-bold text-emerald-600 tabular-nums">
                                {user.ltv}
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge variant="outline" className="border-slate-200 font-bold text-slate-600 text-[11px] h-6 px-2">
                                  {user.sessionsMonth}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-wrap gap-1.5">
                                  {user.themes.length > 0 ? user.themes.map((theme, i) => (
                                    <Badge key={i} variant="secondary" className="bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border-none text-[9px] py-0.5 px-2 font-bold uppercase tracking-tight max-w-[120px] truncate">
                                      {theme}
                                    </Badge>
                                  )) : (
                                    <span className="text-[10px] text-slate-300 italic">No themes yet</span>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="text-right">
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-white">
                                  <MoreHorizontal className="h-4 w-4 text-slate-400" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      <div className="p-4 bg-slate-50/50 border-t border-slate-100 text-center">
                        <Button variant="link" className="text-xs font-bold text-slate-500 hover:text-slate-900 uppercase tracking-widest">
                          View Full Ranked Audit <ChevronRight className="ml-1 h-3 w-3" />
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className="h-[300px] flex flex-col items-center justify-center text-center p-6">
                      <div className="h-14 w-14 rounded-full bg-amber-50 flex items-center justify-center mb-3">
                        <Users className="h-7 w-7 text-amber-300" />
                      </div>
                      <p className="text-sm font-bold text-slate-500 italic">No power users detected yet</p>
                      <p className="text-xs text-slate-400 max-w-[280px] mt-1">User activity will populate this leaderboard as interactions grow.</p>
                    </div>
                  )}
                </Card>
              )}

            </div>

            {/* SECTION 2: UPGRADE CANDIDATES */}
            <div className="space-y-6">
              <div className="flex items-center gap-2 px-1">
                <Sparkles className="h-5 w-5 text-violet-500" />
                <h2 className="text-xl font-bold text-slate-800 italic">Upgrade Candidates</h2>
              </div>

              {loading && !data ? <CandidatesSkeleton /> : (
                <div className="space-y-4">
                  {upgradeCandidates.length > 0 ? (
                    upgradeCandidates.map((candidate, idx) => (
                      <Card key={idx} className="group border-slate-200/60 hover:border-violet-200 transition-all hover:shadow-xl bg-white overflow-hidden">
                        <div className="h-1.5 bg-gradient-to-r from-violet-500 to-indigo-500" />
                        <CardHeader className="pb-3 border-b border-slate-50 flex flex-row items-center justify-between">
                          <div>
                            <CardTitle className="text-sm font-bold text-slate-900">{candidate.name}</CardTitle>
                            <div className="text-[10px] font-bold text-slate-400 flex items-center gap-2 mt-1">
                              Current: <Badge variant="secondary" className="text-[9px] h-4 bg-slate-100">{candidate.plan}</Badge>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] font-bold text-violet-600 block mb-0.5">probability</span>
                            <div className="text-lg font-black text-slate-900 leading-none">{candidate.probability}%</div>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <span className="text-[9px] uppercase font-bold text-slate-400 block mb-1 tracking-wider">Engagement</span>
                              <div className="flex items-center gap-1">
                                <TrendingUp className="h-3 w-3 text-emerald-500" />
                                <span className="text-xs font-bold text-slate-700 tracking-tighter">{candidate.engagement}</span>
                              </div>
                            </div>
                            <div>
                              <span className="text-[9px] uppercase font-bold text-slate-400 block mb-1 tracking-wider">Question Depth</span>
                              <div className="flex items-center gap-1 text-slate-700">
                                <Zap className="h-3 w-3 text-amber-500" />
                                <span className="text-xs font-bold tracking-tighter">{candidate.depth}</span>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-2 pt-2 border-t border-slate-50">
                            <span className="text-[9px] uppercase font-bold text-slate-400 block tracking-widest">AI Triggers</span>
                            <div className="space-y-1.5">
                              {candidate.triggers.map((trigger, i) => (
                                <div key={i} className="flex items-center gap-2 text-[10px] font-semibold text-slate-600">
                                  <div className="h-1 w-1 rounded-full bg-violet-400" />
                                  {trigger}
                                </div>
                              ))}
                            </div>
                          </div>

                          <Button className="w-full bg-violet-50 hover:bg-violet-100 text-violet-700 h-9 font-bold text-[11px] border border-violet-100 shadow-sm shadow-violet-50 group">
                            Personalize Offer
                            <Rocket className="ml-2 h-3.5 w-3.5 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-transform" />
                          </Button>
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <Card className="border-slate-100 bg-slate-50/30">
                      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                        <div className="h-12 w-12 rounded-full bg-violet-50 flex items-center justify-center mb-3">
                          <Activity className="h-6 w-6 text-violet-300" />
                        </div>
                        <p className="text-sm font-bold text-slate-500 italic">No upgrade candidates detected</p>
                        <p className="text-xs text-slate-400 max-w-[220px] mt-1">Candidates will appear as user engagement patterns emerge.</p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}

              {/* Intelligence Summary Card */}
              <Card className="bg-slate-900 border-none shadow-2xl relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-amber-500/15 to-transparent" />
                <div className="absolute -top-4 -right-4 p-8 opacity-20 rotate-12 group-hover:scale-110 transition-transform"><Crown className="h-24 w-24 text-amber-400" /></div>
                <CardHeader className="relative z-10">
                  <CardTitle className="text-sm font-black text-white flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.6)]" />
                    AUDIENCE INTELLIGENCE
                  </CardTitle>
                </CardHeader>
                <CardContent className="relative z-10 space-y-4">
                  <div className="text-xs text-slate-300 font-medium leading-relaxed">
                    {data ? (
                      <p>
                        Your top <span className="text-white font-black underline decoration-amber-500 underline-offset-4">{data.summary.power_user_count}</span> power users
                        represent <span className="text-white font-bold">{data.summary.power_user_pct}%</span> of your
                        {' '}<span className="text-white font-bold">{data.summary.total_users}</span> total audience.
                        {data.summary.upgrade_candidate_count > 0 && (
                          <> There are <span className="text-amber-400 font-bold">{data.summary.upgrade_candidate_count}</span> high-potential upgrade targets.</>
                        )}
                      </p>
                    ) : <p className="animate-pulse">Loading audience metrics...</p>}
                  </div>
                  <Button className="w-full bg-white text-slate-900 h-9 font-black text-[10px] hover:bg-amber-50 transition-all active:scale-95 shadow-lg" onClick={fetchData}>
                    RUN AUDIENCE ANALYSIS
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