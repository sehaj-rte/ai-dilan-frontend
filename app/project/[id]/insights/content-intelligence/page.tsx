'use client'

import { useState } from 'react'
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
  Upload
} from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

const contentGaps = [
  {
    topic: "Venture Debt Nuances",
    issue: "Persona lacks depth on specific clawback provisions.",
    count: 24,
    impact: "High",
    sessions: "-12% session length",
    color: "text-red-600 bg-red-50 border-red-100"
  },
  {
    topic: "B2B SaaS Pricing",
    issue: "Users ask about usage-based billing logic which is missing in frameworks.",
    count: 18,
    impact: "Medium",
    sessions: "Short session warning",
    color: "text-amber-600 bg-amber-50 border-amber-100"
  },
  {
    topic: "Team Psychology",
    issue: "Boundary issue: Persona provides tactical advice but lacks your specific 'Empathy First' framework.",
    count: 12,
    impact: "Insight",
    sessions: "Med engagement",
    color: "text-blue-600 bg-blue-50 border-blue-100"
  },
  {
    topic: "Post-Seed Scaling",
    issue: "More training needed on hiring for Head of Ops role.",
    count: 9,
    impact: "Growth",
    sessions: "Increasing volume",
    color: "text-indigo-600 bg-indigo-50 border-indigo-100"
  }
]

const trainingSuggestions = [
  {
    id: 1,
    label: "Upload new Scaling Framework (.pdf)",
    desc: "Target: Post-Seed Scaling gap",
    icon: <FilePlus className="h-4 w-4" />,
    completed: false
  },
  {
    id: 2,
    label: "Record 2-min Voice Note on Billable Units",
    desc: "Target: B2B SaaS Pricing gap",
    icon: <Mic className="h-4 w-4" />,
    completed: false
  },
  {
    id: 3,
    label: "Add 'Empathy First' Decision Logic",
    desc: "Target: Team Psychology boundary",
    icon: <Puzzle className="h-4 w-4" />,
    completed: true
  },
  {
    id: 4,
    label: "Clarify Hiring Boundaries for Ops",
    desc: "Policy update required",
    icon: <Settings className="h-4 w-4" />,
    completed: false
  },
]

export default function ContentIntelligencePage() {
  const params = useParams()
  const [items, setItems] = useState(trainingSuggestions)

  const toggleItem = (id: number) => {
    setItems(items.map(item => item.id === id ? { ...item, completed: !item.completed } : item))
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
              Content Intelligence
              <Badge variant="outline" className="font-semibold text-violet-600 border-violet-200 bg-violet-50/50 uppercase tracking-wider text-[10px]">Deep Analysis</Badge>
            </h1>
            <p className="text-muted-foreground mt-1">Analyzing knowledge voids and optimizing your AI's expertise.</p>
          </div>

          <div className="flex items-center gap-3">
            <Button size="sm" variant="outline" className="h-9 gap-2">
              <Sparkles className="h-3.5 w-3.5 text-amber-500" /> Auto-Generate Gaps
            </Button>
            <Button size="sm" className="h-9 gap-2 bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-200">
              <Zap className="h-3.5 w-3.5" /> Retrain Persona
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">

          {/* SECTION 1: CONTENT GAPS */}
          <div className="xl:col-span-2 space-y-6">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-500" />
                <h2 className="text-xl font-bold text-slate-800">Knowledge Gaps</h2>
              </div>
              <Badge variant="secondary" className="bg-slate-100 text-slate-500 font-bold">{contentGaps.length} Active Gaps</Badge>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {contentGaps.map((gap, idx) => (
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
              ))}
            </div>

            <Card className="bg-slate-900 text-white border-none shadow-xl overflow-hidden relative">
              <div className="absolute top-0 right-0 p-6 opacity-10">
                <Flame className="h-24 w-24 text-orange-500" />
              </div>
              <CardContent className="p-8">
                <div className="flex flex-col md:flex-row items-center gap-6">
                  <div className="h-16 w-16 rounded-2xl bg-orange-500/20 flex items-center justify-center shrink-0 border border-orange-500/30">
                    <AlertCircle className="h-8 w-8 text-orange-500" />
                  </div>
                  <div className="space-y-2 flex-1">
                    <h3 className="text-xl font-bold">Session Drop-off Warning</h3>
                    <p className="text-slate-400 text-sm font-medium">
                      Users asking about <span className="text-white underline decoration-orange-500 underline-offset-4">Clawback Provisions</span> are ending sessions 40% faster than average. This indicates a significant knowledge failure.
                    </p>
                  </div>
                  <Button className="bg-white text-slate-900 hover:bg-orange-50 font-bold">
                    Train on Topic
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* SECTION 2: SUGGESTED TRAINING INPUTS */}
          <div className="space-y-6">
            <div className="flex items-center gap-2 px-1">
              <CheckCircle2 className="h-5 w-5 text-indigo-500" />
              <h2 className="text-xl font-bold text-slate-800 italic">Training Pipeline</h2>
            </div>

            <Card className="border-slate-200/60 shadow-sm border-t-4 border-t-indigo-500">
              <CardHeader className="pb-4">
                <CardTitle className="text-sm font-bold uppercase tracking-widest text-slate-400">Next-Step Inputs</CardTitle>
                <CardDescription className="text-xs font-semibold">Creator tasks to bridge the identified gaps.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {items.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => toggleItem(item.id)}
                    className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer group ${item.completed ? 'bg-indigo-50/50 border-indigo-100 opacity-60' : 'bg-white border-slate-100 hover:border-indigo-200 hover:shadow-sm'}`}
                  >
                    <div className={`mt-0.5 h-5 w-5 rounded-md border flex items-center justify-center transition-colors ${item.completed ? 'bg-indigo-500 border-indigo-500' : 'border-slate-300 group-hover:border-indigo-400 bg-white'}`}>
                      {item.completed && <CheckCircle2 className="h-3.5 w-3.5 text-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold leading-none ${item.completed ? 'text-indigo-900 line-through' : 'text-slate-700'}`}>{item.label}</span>
                        {!item.completed && <div className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-pulse" />}
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1 font-medium truncate">{item.desc}</p>
                    </div>
                    <div className={`p-1.5 rounded-lg ${item.completed ? 'bg-indigo-100 text-indigo-500' : 'bg-slate-50 text-slate-400 group-hover:text-indigo-500 group-hover:bg-indigo-50'} transition-colors`}>
                      {item.icon}
                    </div>
                  </div>
                ))}

                <div className="pt-4 space-y-3">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 px-1">
                    <span>Retraining Readiness</span>
                    <span>{Math.round((items.filter(i => i.completed).length / items.length) * 100)}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden shadow-inner">
                    <div
                      className="bg-indigo-600 h-full transition-all duration-700"
                      style={{ width: `${(items.filter(i => i.completed).length / items.length) * 100}%` }}
                    />
                  </div>
                  <Button className="w-full bg-indigo-600 hover:bg-indigo-700 h-10 font-bold group shadow-xl shadow-indigo-100 mt-2">
                    Retrain Persona Now
                    <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200/60 shadow-sm bg-indigo-50/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-bold uppercase text-indigo-600 flex items-center gap-2">
                  <BrainCircuit className="h-4 w-4" /> Pro Optimization Tips
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-3">
                  <div className="h-6 w-6 rounded bg-white shadow-sm flex items-center justify-center shrink-0 border border-slate-100">
                    <span className="text-[10px] font-bold text-indigo-600">01</span>
                  </div>
                  <p className="text-[11px] text-slate-600 font-medium italic leading-relaxed">
                    Voice notes create higher engagement for "Pricing" topics than PDF text alone.
                  </p>
                </div>
                <div className="flex gap-3">
                  <div className="h-6 w-6 rounded bg-white shadow-sm flex items-center justify-center shrink-0 border border-slate-100">
                    <span className="text-[10px] font-bold text-indigo-600">02</span>
                  </div>
                  <p className="text-[11px] text-slate-600 font-medium italic leading-relaxed">
                    Setting a "Hard Boundary" on tactical tax advice improves compliance and trust.
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