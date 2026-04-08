'use client'

import React, { useEffect, useState, useMemo } from 'react'
import { 
  Activity, 
  Database, 
  RefreshCw, 
  Play, 
  Pause, 
  CheckCircle2, 
  AlertCircle, 
  Clock,
  LayoutGrid,
  History,
  TrendingUp,
  Search,
  Calendar,
  Zap,
  Trash2,
  Hash,
  Terminal,
  Settings2,
  ListFilter,
  BarChart3,
  ArrowRight
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface SyncSummary {
  total: number
  success: number
  progress: number
  detailProgress?: {
    total: number
    completed: number
    percentage: number
  }
  details: {
    status: string
    _count: { _all: number }
  }[]
  stats?: {
    customers: number
    appointments: number
    services: number
    treatments: number
    sales: number
    revenue: number
  }
}

interface SyncLog {
  id: number
  crawl_date: string
  crawl_type: string
  status: string
  records_count: number
  duration_seconds: number | null
  error_message: string | null
  created_at: string
}

export default function SyncMonitoringPage() {
  const [summary, setSummary] = useState<SyncSummary | null>(null)
  const [logs, setLogs] = useState<SyncLog[]>([])
  const [realtimeLogs, setRealtimeLogs] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  
  // Cache dates in localStorage
  const [dateFrom, setDateFrom] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('sync_date_from') || '2026-04-01'
    }
    return '2026-04-01'
  })
  const [dateTo, setDateTo] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('sync_date_to') || '2026-04-05'
    }
    return '2026-04-05'
  })

  useEffect(() => {
    localStorage.setItem('sync_date_from', dateFrom)
    localStorage.setItem('sync_date_to', dateTo)
  }, [dateFrom, dateTo])
  
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'

  const fetchData = async () => {
    try {
      const [summaryRes, logsRes, statusRes] = await Promise.all([
        fetch(`${API_BASE}/sync/tasks-summary`),
        fetch(`${API_BASE}/monitoring/logs?limit=50`),
        fetch(`${API_BASE}/sync/status`)
      ])
      
      const summaryData = await summaryRes.json()
      const logsData = await logsRes.json()
      const statusData = await statusRes.json()
      
      setSummary(summaryData)
      setLogs(logsData)
      if (statusData && statusData.logs) {
        setRealtimeLogs(statusData.logs)
      }
    } catch (error) {
      console.error('Fetch error:', error)
      // Only toast on manual refresh or initial load to avoid clutter
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 5000)
    return () => clearInterval(interval)
  }, [])

  const handleAction = async (endpoint: string, successMsg: string, errorMsg: string) => {
    setActionLoading(true)
    try {
      const res = await fetch(`${API_BASE}${endpoint}`)
      const data = await res.json()
      toast.success(data.message || successMsg)
      fetchData()
    } catch (error) {
      toast.error(errorMsg)
    } finally {
      setActionLoading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status.toUpperCase()) {
      case 'SUCCESS': return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
      case 'FAILED': return <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
      case 'PROCESSING': return <RefreshCw className="w-3.5 h-3.5 text-blue-500 animate-spin" />
      default: return <Clock className="w-3.5 h-3.5 text-zinc-400" />
    }
  }

  const stats = useMemo(() => [
    { label: 'Khách hàng', value: summary?.stats?.customers, icon: Database, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Dịch vụ', value: summary?.stats?.services, icon: LayoutGrid, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Điều trị', value: summary?.stats?.treatments, icon: Activity, color: 'text-rose-600', bg: 'bg-rose-50' },
    { label: 'Lịch hẹn', value: summary?.stats?.appointments, icon: Calendar, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Doanh thu', value: summary?.stats?.revenue?.toLocaleString('vi-VN') + ' đ', icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  ], [summary])

  return (
    <div className="min-h-screen bg-[#fafafa] p-4 lg:p-8 font-sans selection:bg-zinc-200">
      <div className="max-w-[1400px] mx-auto space-y-8">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 overflow-hidden">
          <div className="space-y-1">
            <Badge variant="secondary" className="bg-zinc-900 text-white hover:bg-zinc-800 rounded-md px-2 py-0 text-[10px] font-bold tracking-widest uppercase mb-2">
              System Admin
            </Badge>
            <h1 className="text-3xl font-black tracking-tight text-zinc-900">Sync Monitor</h1>
            <p className="text-zinc-500 text-sm font-medium flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              Hệ thống đang hoạt động • Tự động cập nhật sau 5s
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 p-1 bg-white border border-zinc-200 rounded-xl shadow-sm self-start md:self-auto">
            <Button 
                variant="ghost" 
                size="sm"
                onClick={fetchData}
                className="h-9 px-3 rounded-lg text-zinc-600 font-bold hover:bg-zinc-50"
              >
              <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
            </Button>
            <Separator orientation="vertical" className="h-6 mx-1" />
            <Button 
              size="sm"
              onClick={() => handleAction(`/sync/start-tasks?limit=500`, 'Đã bắt đầu đồng bộ', 'Lỗi khi bắt đầu')}
              disabled={actionLoading}
              className="h-9 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg px-4 font-bold transition-all shadow-sm"
            >
              <Play className="w-3.5 h-3.5 mr-2 fill-current" /> Bắt đầu
            </Button>
            <Button 
              variant="outline"
              size="sm"
              onClick={() => handleAction(`/sync/stop`, 'Đã gửi lệnh dừng', 'Lỗi khi dừng')}
              className="h-9 border-zinc-200 text-zinc-600 font-bold hover:bg-zinc-50"
            >
              <Pause className="w-3.5 h-3.5 mr-2 fill-current" /> Tạm dừng
            </Button>
            <Button 
              variant="ghost"
              size="sm"
              onClick={() => {
                if(confirm('Xóa sạch hàng đợi?')) handleAction(`/sync/reset-queue`, 'Đã xóa hàng đợi', 'Lỗi khi xóa')
              }}
              className="h-9 text-rose-600 font-bold hover:bg-rose-50 hover:text-rose-700"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Global Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-[10px] font-black uppercase text-zinc-400 tracking-wider">Tiến độ tổng thể</span>
            <span className="text-xl font-black text-zinc-900">{summary?.progress.toFixed(1)}%</span>
          </div>
          <div className="h-3 w-full bg-zinc-200 rounded-full overflow-hidden shadow-inner">
            <div 
              className={cn(
                "h-full transition-all duration-1000 ease-in-out relative",
                summary?.progress === 100 ? "bg-emerald-500" : "bg-zinc-900"
              )}
              style={{ width: `${summary?.progress}%` }} 
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent animate-shimmer" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Main Dashboard Area */}
          <div className="lg:col-span-8 space-y-8">
            
            {/* Action Group: Range Configuration */}
            <Card className="border-none shadow-sm bg-white rounded-2xl overflow-hidden">
              <CardHeader className="pb-3 border-b border-zinc-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Settings2 className="w-4 h-4 text-zinc-400" />
                    <CardTitle className="text-sm font-bold uppercase tracking-tight">Cấu hình đồng bộ</CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row items-center gap-6">
                  <div className="grid grid-cols-2 gap-4 flex-1 w-full">
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black uppercase text-zinc-400 ml-1">Kể từ ngày</label>
                      <Input 
                        type="date" 
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                        className="h-11 rounded-xl bg-zinc-50 border-none focus-visible:ring-2 focus-visible:ring-zinc-200 font-bold text-zinc-700" 
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black uppercase text-zinc-400 ml-1">Đến ngày</label>
                      <Input 
                        type="date" 
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                        className="h-11 rounded-xl bg-zinc-50 border-none focus-visible:ring-2 focus-visible:ring-zinc-200 font-bold text-zinc-700" 
                      />
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 w-full md:w-auto self-end md:self-auto">
                    <Button 
                      onClick={() => handleAction(`/sync/seed-tasks?from=${dateFrom}&to=${dateTo}`, 'Khởi tạo task thành công', 'Lỗi khởi tạo')}
                      className="bg-zinc-900 hover:bg-black text-white rounded-xl h-11 px-8 font-bold transition-all shadow-md active:scale-95"
                    >
                      Khởi tạo hàng đợi
                    </Button>
                    <p className="text-[9px] font-medium text-zinc-400 text-center uppercase tracking-tighter">
                      Cần khởi tạo task trước khi nhấn Bắt đầu
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Stats Dashboard */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Detailed Metrics */}
              <div className="space-y-4">
                 <div className="flex items-center gap-2 px-1">
                    <BarChart3 className="w-4 h-4 text-zinc-400" />
                    <span className="text-[10px] font-black uppercase text-zinc-400 tracking-wider">Metrics Chi Tiết</span>
                 </div>
                 <div className="grid grid-cols-2 gap-3">
                    {stats.map((s, i) => (
                      <div key={i} className="bg-white p-4 rounded-2xl border border-zinc-100 shadow-sm flex flex-col gap-3 group hover:border-zinc-200 transition-colors">
                        <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110", s.bg)}>
                          <s.icon className={cn("w-4 h-4", s.color)} />
                        </div>
                        <div className="space-y-0.5">
                          <p className="text-[9px] font-bold text-zinc-400 uppercase">{s.label}</p>
                          <p className="text-sm font-black text-zinc-900 tabular-nums">{s.value || 0}</p>
                        </div>
                      </div>
                    ))}
                 </div>
              </div>

              {/* Status Breakdown */}
              <div className="space-y-4">
                 <div className="flex items-center gap-2 px-1">
                    <ListFilter className="w-4 h-4 text-zinc-400" />
                    <span className="text-[10px] font-black uppercase text-zinc-400 tracking-wider">Trạng thái Tasks</span>
                 </div>
                 <Card className="border-none shadow-sm bg-white rounded-2xl p-6 h-full flex flex-col justify-between">
                    <div className="space-y-6">
                      {summary?.details.map((detail, idx) => (
                        <div key={idx} className="flex items-center justify-between group">
                          <div className="flex items-center gap-3">
                            <div className="h-2 w-2 rounded-full bg-zinc-200 group-hover:bg-zinc-900 transition-colors" />
                            <span className="text-xs font-bold text-zinc-500 uppercase tracking-tight">{detail.status}</span>
                          </div>
                          <span className="text-sm font-black text-zinc-900 tabular-nums">
                            {detail._count._all.toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                    {summary?.detailProgress && (
                      <div className="mt-8 p-4 bg-zinc-900 rounded-xl text-white space-y-3">
                        <div className="flex items-center justify-between">
                           <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Worker Progress</span>
                           <span className="text-[11px] font-black text-emerald-400">{summary.detailProgress.percentage.toFixed(1)}%</span>
                        </div>
                        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500 transition-all duration-700" style={{ width: `${summary.detailProgress.percentage}%` }} />
                        </div>
                        <p className="text-[9px] font-medium text-zinc-400 text-right">
                          {summary.detailProgress.completed} / {summary.detailProgress.total} chi tiết
                        </p>
                      </div>
                    )}
                 </Card>
              </div>
            </div>
          </div>

          {/* Console / Log Area */}
          <div className="lg:col-span-4 self-start sticky top-8">
            <div className="bg-zinc-900 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[calc(100vh-100px)]">
              <div className="p-6 bg-black/40 border-b border-white/5 space-y-4">
                <div className="flex items-center justify-between">
                   <h2 className="text-[10px] font-black uppercase text-zinc-500 tracking-widest flex items-center gap-2">
                     <Terminal className="w-3 h-3 text-emerald-500" /> Operational Log
                   </h2>
                   <Badge className="bg-emerald-500/10 text-emerald-500 border-none text-[9px]">Live</Badge>
                </div>
                
                <Tabs defaultValue="tasks" className="w-full">
                  <TabsList className="grid grid-cols-2 bg-white/5 w-full h-9 p-1 rounded-xl">
                    <TabsTrigger value="tasks" className="text-[10px] font-black uppercase rounded-lg data-[state=active]:bg-white/10 data-[state=active]:text-white">Tasks</TabsTrigger>
                    <TabsTrigger value="realtime" className="text-[10px] font-black uppercase rounded-lg data-[state=active]:bg-white/10 data-[state=active]:text-white">Events</TabsTrigger>
                  </TabsList>
                  
                  <div className="mt-6">
                    <TabsContent value="tasks" className="m-0 focus-visible:outline-none">
                      <ScrollArea className="h-[450px] pr-4">
                        <div className="space-y-4">
                          {logs.map((log) => (
                            <div key={log.id} className="group border-b border-white/5 pb-4 last:border-none flex items-start gap-3">
                              <div className="shrink-0 mt-0.5">
                                {getStatusIcon(log.status)}
                              </div>
                              <div className="space-y-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-black text-zinc-200">
                                    {log.crawl_type}
                                  </span>
                                  <span className="text-[8px] font-bold text-zinc-600">
                                    {new Date(log.created_at).toLocaleTimeString()}
                                  </span>
                                </div>
                                <p className="text-[11px] text-zinc-400 leading-snug line-clamp-2">
                                  {log.status === 'success' 
                                    ? `Đã nhận ${log.records_count} bản ghi từ VTTech thành công.`
                                    : log.error_message || 'Có lỗi xảy ra'}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </TabsContent>
                    
                    <TabsContent value="realtime" className="m-0 focus-visible:outline-none">
                      <ScrollArea className="h-[450px]">
                        <div className="space-y-1.5 font-mono text-[10px]">
                           {realtimeLogs.length > 0 ? (
                              [...realtimeLogs].reverse().map((log, i) => (
                                <div key={i} className="flex gap-2 leading-tight">
                                   <span className="text-zinc-600 shrink-0">[{log.match(/\[(.*?)\]/)?.[1] || '--:--'}]</span>
                                   <span className={cn(
                                     "break-words",
                                     log.includes('❌') ? "text-rose-400" : log.includes('✅') ? "text-emerald-400" : "text-zinc-400"
                                   )}>
                                     {log.replace(/\[.*?\]/, "").trim()}
                                   </span>
                                </div>
                              ))
                           ) : (
                             <div className="h-full flex items-center justify-center py-20 opacity-20 italic">No events streaming...</div>
                           )}
                        </div>
                      </ScrollArea>
                    </TabsContent>
                  </div>
                </Tabs>
              </div>
              <div className="p-4 bg-black/20 text-center">
                 <p className="text-[8px] font-black text-zinc-600 uppercase tracking-widest flex items-center justify-center gap-2">
                   Last update {new Date().toLocaleTimeString()} <ArrowRight className="w-2 h-2" />
                 </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
