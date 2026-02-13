'use client'

import { useState } from 'react'
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
  DollarSign,
  ArrowUpRight,
  MessageSquare,
  Search,
  ChevronRight,
  MoreHorizontal,
  Star,
  Users,
  Target,
  Rocket
} from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

const powerUsers = [
  {
    id: "U-8421",
    name: "Sarah Johnson",
    ltv: "$1,450",
    sessionsMonth: 42,
    themes: ["Growth Architecture", "Venture Debt"],
    avatar: "SJ",
    rank: 1
  },
  {
    id: "U-3290",
    name: "Michael Chen",
    ltv: "$980",
    sessionsMonth: 38,
    themes: ["B2B SaaS Pricing", "Scaling Ops"],
    avatar: "MC",
    rank: 2
  },
  {
    id: "U-1102",
    name: "Emily Rodriguez",
    ltv: "$850",
    sessionsMonth: 31,
    themes: ["Team Psychology", "Hiring"],
    avatar: "ER",
    rank: 3
  },
  {
    id: "U-5542",
    name: "David Kim",
    ltv: "$720",
    sessionsMonth: 28,
    themes: ["Exit Strategy", "M&A"],
    avatar: "DK",
    rank: 4
  },
  {
    id: "U-2109",
    name: "Lisa Thompson",
    ltv: "$640",
    sessionsMonth: 25,
    themes: ["Personal Branding", "Content"],
    avatar: "LT",
    rank: 5
  }
]

const upgradeCandidates = [
  {
    name: "Alexander Knight",
    engagement: "98%",
    depth: "9.4/10",
    probability: 92,
    plan: "Free",
    triggers: ["Asked about Pricing 4x", "Daily Voice interactions"]
  },
  {
    name: "Elena Rodriguez",
    engagement: "95%",
    depth: "8.9/10",
    probability: 88,
    plan: "Pro",
    triggers: ["Deep-dive on Venture Debt", "High LTV potential"]
  },
  {
    name: "Marcus Aurelius",
    engagement: "92%",
    depth: "8.5/10",
    probability: 84,
    plan: "Free",
    triggers: ["Frequent framework requests", "Session length > 20min"]
  }
]

export default function TopUsersPage() {
  const params = useParams()
  const [projectId] = useState(params.id as string)

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
              Top Users
              <Badge variant="outline" className="font-semibold text-amber-600 border-amber-200 bg-amber-50/50 uppercase tracking-wider text-[10px]">Economic Leverage</Badge>
            </h1>
            <p className="text-muted-foreground mt-1">Identify your most valuable users and high-conversion targets.</p>
          </div>

          <div className="flex items-center gap-3">
            <Button size="sm" variant="outline" className="h-9 gap-2">
              <Search className="h-3.5 w-3.5" /> Export Data
            </Button>
            <Button size="sm" className="h-9 gap-2 bg-slate-900 hover:bg-slate-800 text-white shadow-xl">
              <Zap className="h-3.5 w-3.5 text-amber-400" /> Lead Gen Sync
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">

          {/* SECTION 1: POWER USERS */}
          <div className="xl:col-span-2 space-y-6">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-amber-500" />
                <h2 className="text-xl font-bold text-slate-800 tracking-tight">Power Users Leaderboard</h2>
              </div>
              <Badge variant="secondary" className="bg-slate-100 text-slate-500 font-bold">Top 5.2% of Audience</Badge>
            </div>

            <Card className="border-slate-200/60 shadow-sm overflow-hidden bg-white/50 backdrop-blur-sm">
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
                          <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-400 group-hover:bg-white transition-colors border border-transparent group-hover:border-slate-200">
                            {user.avatar}
                          </div>
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
                          {user.themes.map((theme, i) => (
                            <Badge key={i} variant="secondary" className="bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border-none text-[9px] py-0.5 px-2 font-bold uppercase tracking-tight">
                              {theme}
                            </Badge>
                          ))}
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
            </Card>

          </div>

          {/* SECTION 2: UPGRADE CANDIDATES */}
          <div className="space-y-6">
            <div className="flex items-center gap-2 px-1">
              <Sparkles className="h-5 w-5 text-violet-500" />
              <h2 className="text-xl font-bold text-slate-800 italic">Upgrade Candidates</h2>
            </div>

            <div className="space-y-4">
              {upgradeCandidates.map((candidate, idx) => (
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
              ))}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}