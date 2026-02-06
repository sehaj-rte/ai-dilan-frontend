'use client'

import { useState } from 'react'
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
  Search,
  ArrowUpRight,
  ChevronRight,
  Lightbulb,
  Gem,
  Coins,
  ShieldCheck,
  Smartphone,
  Mic,
  FileText
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
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

const revenueByTheme = [
  { theme: 'Growth', revenue: 4200, color: '#3b82f6' },
  { theme: 'Leadership', revenue: 3100, color: '#6366f1' },
  { theme: 'Operations', revenue: 2400, color: '#8b5cf6' },
  { theme: 'Strategy', revenue: 1800, color: '#a855f7' },
  { theme: 'Health', revenue: 900, color: '#d946ef' },
]

const interactionModeData = [
  { name: 'Text', value: 65, color: '#3b82f6' },
  { name: 'Voice', value: 35, color: '#10b981' },
]

const revenuePerInteraction = [
  { theme: 'Growth Strategies', avgRevenue: '$84.20', conversion: '6.8%', trend: '+12%', type: 'Strategic' },
  { theme: 'Operational Scaling', avgRevenue: '$62.50', conversion: '5.2%', trend: '+8%', type: 'Tactical' },
  { theme: 'Executive Burnout', avgRevenue: '$112.00', conversion: '4.1%', trend: '+15%', type: 'Urgent' },
  { theme: 'Team Management', avgRevenue: '$45.10', conversion: '3.5%', trend: '-2%', type: 'Tactical' },
  { theme: 'Pricing Optimization', avgRevenue: '$98.30', conversion: '8.4%', trend: '+22%', type: 'Strategic' },
]

const opportunitySignals = [
  {
    title: "High-Intent Workshop Opportunity",
    description: "42 users asked complex questions about 'Pricing Optimization' in the last 7 days. This specific cohort has a 22% higher LTV than average.",
    recommendation: "Launch a 90-minute 'High-Ticket Scaling' Workshop",
    impact: "High",
    estRevenue: "$4,500 - $6,000",
    icon: <Zap className="h-4 w-4 text-amber-500" />
  },
  {
    title: "1:Many Coaching Signal",
    description: "Repeat queries about 'Team Burnout' are peaking within your Mid-Tier subscribers. They are seeking group-level validation.",
    recommendation: "Create a 4-week 'Sustainable Leadership' Cohort",
    impact: "Medium",
    estRevenue: "£2,500/mo recurring",
    icon: <Target className="h-4 w-4 text-blue-500" />
  }
]

export default function RevenueIntelligencePage() {
  const params = useParams()
  const [timeRange, setTimeRange] = useState('30d')

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
            <Button size="sm" variant="default" className="h-9 gap-2 shadow-sm bg-slate-900">
              <BarChart3 className="h-3.5 w-3.5" /> Full Report
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">

          {/* SECTION 1: REVENUE BREAKDOWN */}
          <div className="xl:col-span-2 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                  <div className="h-[240px] mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={revenueByTheme} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
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
                        />
                        <Bar dataKey="revenue" radius={[6, 6, 0, 0]} barSize={40}>
                          {revenueByTheme.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

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
                          data={interactionModeData}
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {interactionModeData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <RechartsTooltip />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-xl font-bold">$12.4k</span>
                      <span className="text-[10px] text-slate-400 font-bold uppercase">Total</span>
                    </div>
                  </div>
                  <div className="space-y-2 ml-4">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-blue-500" />
                      <span className="text-[11px] font-bold text-slate-600">Text: 65%</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-emerald-500" />
                      <span className="text-[11px] font-bold text-slate-600">Voice: 35%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* SECTION 2: REVENUE PER INTERACTION */}
            <Card className="border-slate-200/60 shadow-sm overflow-hidden">
              <CardHeader className="bg-slate-50/30 border-b border-slate-100/50">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg font-bold">Revenue Per Interaction</CardTitle>
                    <CardDescription>Valuing themes by their average transaction impact.</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" className="h-8 text-[11px] font-bold">
                    View Heatmap
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
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
                      {revenuePerInteraction.map((item, idx) => (
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
                                <div className="bg-blue-500 h-full" style={{ width: item.conversion }} />
                              </div>
                              <span className="text-xs font-bold text-slate-600">{item.conversion}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`text-xs font-bold ${item.trend.startsWith('+') ? 'text-emerald-500' : 'text-slate-400'}`}>
                              {item.trend}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* SECTION 3: OPPORTUNITY SIGNALS */}
          <div className="space-y-6">
            <div className="flex items-center gap-2 px-1">
              <Lightbulb className="h-5 w-5 text-amber-500" />
              <h2 className="text-xl font-bold text-slate-900 italic">Opportunity Signals</h2>
            </div>

            {opportunitySignals.map((sig, idx) => (
              <Card key={idx} className="group border-slate-200/60 hover:border-amber-200 transition-all hover:shadow-md bg-gradient-to-br from-white to-slate-50/50">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="outline" className={`text-[9px] font-bold uppercase ${sig.impact === 'High' ? 'text-amber-600 border-amber-200 bg-amber-50' : 'text-blue-600 border-blue-200 bg-blue-50'}`}>
                      {sig.impact} Impact
                    </Badge>
                    {sig.icon}
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
                      <span>84%</span>
                    </div>
                    <div className="w-full bg-indigo-800 rounded-full h-1.5">
                      <div className="bg-white h-full rounded-full" style={{ width: '84%' }} />
                    </div>
                  </div>
                  <p className="text-[10px] text-indigo-100 font-medium">
                    Your Persona is currently capturing 84% of potential high-intent revenue signals. Focus on "Operations" to capture the remaining 16%.
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