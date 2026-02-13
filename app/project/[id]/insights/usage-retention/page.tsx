'use client'

import { useState } from 'react'
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
  Search,
  Filter,
  ChevronRight,
  TrendingDown,
  Clock,
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  ShieldAlert,
  Calendar,
  Layers,
  Sparkles
} from 'lucide-react'
import {
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Cell,
  CartesianGrid
} from 'recharts'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

const funnelData = [
  { stage: 'First Interaction', value: 100, label: '4,285 users', sub: '100%' },
  { stage: 'Week 1 Active', value: 68, label: '2,913 users', sub: '68% retention' },
  { stage: 'Month 1 Retained', value: 42, label: '1,800 users', sub: '42% retention' },
  { stage: 'Month 3 Retained', value: 28, label: '1,200 users', sub: '28% retention' },
]

const atRiskUsers = [
  {
    name: "Alexander Knight",
    email: "alex.k@venture.com",
    risk: "High",
    lastSeen: "12 days ago",
    trend: "-45%",
    reason: "Declining usage"
  },
  {
    name: "Sarah Jenkins",
    email: "s.jenkins@growth.io",
    risk: "Medium",
    lastSeen: "5 days ago",
    trend: "-22%",
    reason: "Longer session intervals"
  },
  {
    name: "Marcus Aurelius",
    email: "m.aurelius@stoic.co",
    risk: "Medium",
    lastSeen: "8 days ago",
    trend: "-18%",
    reason: "Lower interaction depth"
  },
  {
    name: "Elena Rodriguez",
    email: "elena.r@scaling.net",
    risk: "High",
    lastSeen: "15 days ago",
    trend: "-60%",
    reason: "No return after Week 1"
  },
]

// Mock heatmap data: 12 users x 7 days
const heatmapData = Array.from({ length: 7 }, (_, day) =>
  Array.from({ length: 12 }, (_, user) => ({
    val: Math.floor(Math.random() * 10),
    day,
    user
  }))
).flat()

const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export default function UsageRetentionPage() {
  const params = useParams()
  const [projectId] = useState(params.id as string)

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
              Usage & Retention
              <Badge variant="outline" className="font-semibold text-rose-600 border-rose-200 bg-rose-50/50 uppercase tracking-wider text-[10px]">Churn Defense</Badge>
            </h1>
            <p className="text-muted-foreground mt-1">Deep analysis of user stickiness and predictive churn indicators.</p>
          </div>

          <div className="flex items-center gap-3">
            <Button size="sm" variant="outline" className="h-9 gap-2">
              <Calendar className="h-3.5 w-3.5" /> Date Range
            </Button>
            <Button size="sm" className="h-9 gap-2 bg-rose-600 hover:bg-rose-700 shadow-md shadow-rose-200">
              <ShieldAlert className="h-3.5 w-3.5" /> Run Churn Predictor
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">

          {/* SECTION 1: RETENTION FUNNEL */}
          <div className="xl:col-span-2 space-y-6">
            <Card className="border-slate-200/60 shadow-sm overflow-hidden">
              <CardHeader className="bg-slate-50/30 border-b border-slate-100/50 pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers className="h-5 w-5 text-indigo-500" />
                    <CardTitle className="text-lg font-bold">Retention Funnel</CardTitle>
                  </div>
                  <Badge variant="secondary" className="bg-indigo-50 text-indigo-600 font-bold">Cohorts: 90 Days</Badge>
                </div>
                <CardDescription className="text-xs font-medium">Tracking the progression of users from first touch to long-term loyalty.</CardDescription>
              </CardHeader>
              <CardContent className="pt-8 pb-4">
                <div className="relative h-[300px] w-full max-w-2xl mx-auto space-y-4">
                  {funnelData.map((stage, idx) => (
                    <div key={idx} className="relative flex items-center group">
                      <div className="w-32 text-right pr-6 shrink-0">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-tight leading-none mb-1">Stage {idx + 1}</span>
                        <span className="text-xs font-bold text-slate-700 truncate block">{stage.stage}</span>
                      </div>
                      <div className="relative flex-1 h-12 flex items-center">
                        <div
                          className="h-full rounded-r-full bg-gradient-to-r from-indigo-500 to-indigo-600/80 shadow-sm transition-all duration-1000 ease-out flex items-center justify-end pr-4 text-white font-bold text-sm"
                          style={{ width: `${stage.value}%` }}
                        >
                          <span className="hidden sm:inline opacity-0 group-hover:opacity-100 transition-opacity duration-300">{stage.sub}</span>
                        </div>
                        <div className="ml-4 flex flex-col">
                          <span className="text-sm font-bold text-slate-900 leading-none">{stage.label}</span>
                          <span className="text-[10px] text-slate-400 font-medium">{stage.sub}</span>
                        </div>
                      </div>
                      {idx < funnelData.length - 1 && (
                        <div className="absolute left-[8.5rem] top-12 w-0.5 h-4 bg-slate-100" />
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* SECTION 3: ENGAGEMENT DEPTH (Heatmap) */}
            <Card className="border-slate-200/60 shadow-sm overflow-hidden">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-emerald-500" />
                    <CardTitle className="text-lg font-bold uppercase tracking-tight">Engagement Depth</CardTitle>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded bg-slate-100" />
                      <span className="text-[10px] font-bold text-slate-400">Low</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded bg-emerald-500" />
                      <span className="text-[10px] font-bold text-slate-400">High</span>
                    </div>
                  </div>
                </div>
                <CardDescription className="text-xs">Interaction intensity across your top 12 active users over the last 7 days.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <div className="min-w-[500px] grid grid-cols-[80px_1fr] gap-x-4 gap-y-2">
                    {/* Days column */}
                    <div className="space-y-4 pt-10">
                      {days.map(day => (
                        <div key={day} className="h-8 flex items-center justify-end text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                          {day}
                        </div>
                      ))}
                    </div>
                    {/* Heatmap area */}
                    <div className="space-y-4">
                      {/* User labels */}
                      <div className="flex justify-between px-1">
                        {Array.from({ length: 12 }).map((_, i) => (
                          <div key={i} className="w-8 text-center text-[9px] font-bold text-slate-300 uppercase tracking-tighter">
                            U{i + 1}
                          </div>
                        ))}
                      </div>
                      {/* Grid */}
                      <div className="grid grid-cols-12 gap-2">
                        {heatmapData.map((d, i) => (
                          <TooltipProvider key={i}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div
                                  className={`h-8 rounded-md transition-all cursor-pointer hover:ring-2 hover:ring-indigo-300 hover:scale-110 ${d.val === 0 ? 'bg-slate-50' :
                                      d.val < 3 ? 'bg-emerald-100' :
                                        d.val < 6 ? 'bg-emerald-300' :
                                          d.val < 8 ? 'bg-emerald-500 shadow-sm shadow-emerald-100' :
                                            'bg-emerald-600 shadow-md shadow-emerald-200'
                                    }`}
                                />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="text-xs font-bold">{d.val} Interactions</p>
                                <p className="text-[10px] text-slate-500">{days[d.day]}, User {d.user + 1}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* SECTION 2: AT-RISK USERS */}
          <div className="space-y-6">
            <div className="flex items-center gap-2 px-1">
              <UserMinus className="h-5 w-5 text-rose-500" />
              <h2 className="text-xl font-bold text-slate-900 italic">At-Risk Pulse</h2>
            </div>

            <div className="space-y-4">
              {atRiskUsers.map((user, idx) => (
                <Card key={idx} className="group relative border-slate-200/60 hover:border-rose-200 transition-all hover:shadow-lg overflow-hidden bg-white">
                  <div className="absolute top-0 right-0 p-3 flex flex-col items-end">
                    <Badge variant="outline" className={`font-bold uppercase text-[8px] h-4 mb-1 border-none ${user.risk === 'High' ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'}`}>
                      {user.risk} Risk
                    </Badge>
                  </div>

                  <CardHeader className="pb-3 border-b border-slate-50">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-400 group-hover:bg-rose-50 group-hover:text-rose-500 transition-colors">
                        {user.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <CardTitle className="text-sm font-bold text-slate-900">{user.name}</CardTitle>
                        <CardDescription className="text-[10px] font-medium">{user.email}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-[9px] uppercase font-bold text-slate-400 block mb-1 tracking-wider">Trend</span>
                        <div className="flex items-center gap-1">
                          <TrendingDown className="h-3 w-3 text-rose-500" />
                          <span className="text-xs font-bold text-rose-500">{user.trend}</span>
                        </div>
                      </div>
                      <div>
                        <span className="text-[9px] uppercase font-bold text-slate-400 block mb-1 tracking-wider">Last Interaction</span>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3 text-slate-300" />
                          <span className="text-xs font-bold text-slate-600 tracking-tight">{user.lastSeen}</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-50/80 rounded-lg p-2.5 flex items-start gap-2 border border-slate-100">
                      <ShieldAlert className="h-3.5 w-3.5 text-rose-500 shrink-0 mt-0.5" />
                      <p className="text-[10px] font-semibold text-slate-600 leading-relaxed italic">&ldquo;{user.reason}&rdquo;</p>
                    </div>

                    <div className="flex items-center gap-2 pt-1 border-t border-slate-50">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button size="sm" variant="outline" className="h-8 flex-1 text-[10px] font-bold hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200">
                              <MessageSquare className="h-3 w-3 mr-1.5" /> Message
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Send direct re-engagement</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>

                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button size="sm" variant="outline" className="h-8 w-10 p-0 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200">
                              <Gift className="h-3.5 w-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Offer exclusive content</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>

                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button size="sm" variant="outline" className="h-8 w-10 p-0 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200">
                              <TagIcon className="h-3.5 w-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Tag for follow-up</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </CardContent>
                </Card>
              ))}

              <Button variant="ghost" className="w-full text-[10px] uppercase font-bold tracking-widest text-slate-400 hover:text-rose-500 h-10">
                View All 127 High-Risk Users
              </Button>
            </div>

            <Card className="bg-slate-900 border-none shadow-2xl relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-transparent" />
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                <Sparkles className="h-16 w-16 text-white" />
              </div>
              <CardHeader className="relative z-10">
                <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
                  Loyalty Signal
                </CardTitle>
              </CardHeader>
              <CardContent className="relative z-10 space-y-3">
                <p className="text-xs text-slate-300 font-medium leading-relaxed">
                  Your most loyal cohort (Month 3+) is asking for <span className="text-white font-bold underline decoration-indigo-500 underline-offset-4 tracking-tight">Advanced Systems Design</span>.
                </p>
                <Button className="w-full bg-white text-slate-900 h-9 font-bold text-[11px] hover:bg-indigo-50">
                  Build Loyalty Reward
                </Button>
              </CardContent>
            </Card>
          </div>

        </div>
      </div>
    </DashboardLayout>
  )
}