'use client'

import React, { useEffect, useState } from 'react'
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
  Zap
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface SyncSummary {
  total: number
  success: number
  progress: number
  details: {
    status: string
    _count: { _all: number }
  }[]
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
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [dateFrom, setDateFrom] = useState('2019-01-01')
  const [dateTo, setDateTo] = useState('2019-12-31')
  
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'

  const fetchData = async () => {
    try {
      const [summaryRes, logsRes] = await Promise.all([
        fetch(`${API_BASE}/sync/tasks-summary`),
        fetch(`${API_BASE}/monitoring/logs?limit=50`)
      ])
      
      const summaryData = await summaryRes.json()
      const logsData = await logsRes.json()
      
      setSummary(summaryData)
      setLogs(logsData)
    } catch (error) {
      console.error('Fetch error:', error)
      toast.error('Không thể kết nối với máy chủ API')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 5000)
    return () => clearInterval(interval)
  }, [])

  const handleSeed = async () => {
    setActionLoading(true)
    try {
      const res = await fetch(`${API_BASE}/sync/seed-tasks?from=${dateFrom}&to=${dateTo}`)
      const data = await res.json()
      toast.success(data.message || 'Đã khởi tạo task thành công')
      fetchData()
    } catch (error) {
      toast.error('Lỗi khi khởi tạo task')
    } finally {
      setActionLoading(false)
    }
  }

  const handleStart = async () => {
    setActionLoading(true)
    try {
      const res = await fetch(`${API_BASE}/sync/start-tasks?limit=500`)
      const data = await res.json()
      toast.success(data.message || 'Đã bắt đầu tiến trình đồng bộ')
      fetchData()
    } catch (error) {
      toast.error('Lỗi khi bắt đầu tiến trình')
    } finally {
      setActionLoading(false)
    }
  }

  const handleStop = async () => {
    setActionLoading(true)
    try {
      const res = await fetch(`${API_BASE}/sync/stop`)
      const data = await res.json()
      toast.success(data.message || 'Đã gửi lệnh dừng đồng bộ')
    } catch (error) {
      toast.error('Lỗi khi dừng đồng bộ')
    } finally {
      setActionLoading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status.toUpperCase()) {
      case 'SUCCESS': return <div className="p-1 bg-emerald-100 rounded-lg"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /></div>
      case 'FAILED': return <div className="p-1 bg-rose-100 rounded-lg"><AlertCircle className="w-3.5 h-3.5 text-rose-600" /></div>
      case 'PROCESSING': return <div className="p-1 bg-blue-100 rounded-lg"><RefreshCw className="w-3.5 h-3.5 text-blue-600 animate-spin" /></div>
      default: return <div className="p-1 bg-zinc-100 rounded-lg"><Clock className="w-3.5 h-3.5 text-zinc-500" /></div>
    }
  }

  return (
    <div className="flex flex-col gap-4 p-4 lg:p-6 max-w-[1600px] mx-auto animate-in fade-in duration-500">
      {/* Page Header - Compact Style */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-100 pb-4">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-1.5 text-zinc-400 font-bold uppercase tracking-wider text-[10px]">
            <Activity className="w-3 h-3 text-zinc-900" />
            Vận hành hệ thống
          </div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-900">Giám sát đồng bộ <span className="text-zinc-400 font-medium">Real-time</span></h1>
          <p className="text-xs text-zinc-400 font-medium italic">Tự động cập nhật sau mỗi 5 giây</p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={fetchData} 
            disabled={loading}
            className="h-8 rounded-lg border-zinc-200 hover:bg-zinc-50 font-bold transition-all text-xs"
          >
            <RefreshCw className={cn("w-3.5 h-3.5 mr-1.5", loading && "animate-spin")} /> Làm mới
          </Button>
          <Button 
            size="sm"
            onClick={handleStart} 
            disabled={actionLoading}
            className="h-8 bg-zinc-900 hover:bg-black text-zinc-50 rounded-lg px-4 font-bold shadow-sm transition-all border-none text-xs"
          >
            <Play className="w-3 h-3 mr-1.5 fill-current" /> Bắt đầu
          </Button>
          <Button 
            variant="destructive" 
            size="sm"
            onClick={handleStop}
            className="h-8 rounded-lg px-4 font-bold shadow-sm transition-all border-none text-xs"
          >
            <Pause className="w-3 h-3 mr-1.5 fill-current" /> Dừng lại
          </Button>
        </div>
      </header>

      {/* Stats Cards - Dense Design */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Tổng gói công việc', value: summary?.total, icon: Database, color: 'zinc', sub: 'Tổng số tasks' },
          { label: 'Đã hoàn thành', value: summary?.success, icon: CheckCircle2, color: 'emerald', sub: 'Đồng bộ thành công' },
          { label: 'Đang xử lý', value: (summary?.total || 0) - (summary?.success || 0), icon: Zap, color: 'blue', sub: 'Chờ hoặc đang chạy' },
          { label: 'Hiệu suất tổng', value: `${summary?.progress.toFixed(1)}%`, icon: TrendingUp, color: 'indigo', sub: 'Tỷ lệ hoàn tất' }
        ].map((stat, i) => (
          <Card key={i} className="compact-card group hover:scale-[1.01] transition-all duration-300">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-tight mb-1">{stat.label}</p>
                <h3 className="text-xl font-black text-zinc-900 tabular-nums">
                  {typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value || 0}
                </h3>
                <p className="text-[10px] font-medium text-zinc-400 mt-1">{stat.sub}</p>
              </div>
              <div className={cn(
                "p-2 rounded-xl transition-colors",
                stat.color === 'zinc' && "bg-zinc-100 text-zinc-900",
                stat.color === 'emerald' && "bg-emerald-50 text-emerald-600",
                stat.color === 'blue' && "bg-blue-50 text-blue-600",
                stat.color === 'indigo' && "bg-indigo-50 text-indigo-600"
              )}>
                <stat.icon className="w-4 h-4" />
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Progress Board */}
          <Card className="border border-zinc-100 rounded-[1.5rem] bg-white overflow-hidden shadow-sm">
            <CardHeader className="pb-2">
               <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-bold flex items-center gap-1.5 uppercase tracking-tighter">
                      <LayoutGrid className="w-4 h-4 text-zinc-900" /> Tiến độ đồng bộ
                    </CardTitle>
                    <CardDescription className="text-xs font-medium text-zinc-400 mt-1">Sơ đồ phân bổ trạng thái công việc</CardDescription>
                  </div>
                  <Badge variant="outline" className="rounded-full px-2 py-0 h-5 text-[10px] font-bold bg-zinc-50 border-zinc-200">
                    {summary?.progress.toFixed(2)}%
                  </Badge>
               </div>
            </CardHeader>
            <CardContent className="pt-4 flex flex-col gap-6">
              <div className="relative">
                <Progress value={summary?.progress} className="h-2.5 bg-zinc-100 rounded-full overflow-hidden border border-zinc-50">
                  <div 
                    className="h-full bg-zinc-900 transition-all duration-1000 ease-out" 
                    style={{ width: `${summary?.progress}%` }} 
                  />
                </Progress>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-zinc-50/50 rounded-2xl border border-zinc-50">
                {summary?.details.map((detail, idx) => (
                  <div key={idx} className="flex flex-col gap-0.5">
                    <span className="text-[9px] font-bold uppercase text-zinc-400 tracking-wider font-mono truncate">{detail.status}</span>
                    <span className="text-lg font-black text-zinc-800 tabular-nums">
                      {detail._count._all.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Configuration - New York Design */}
          <Card className="border border-zinc-100 rounded-[1.5rem] bg-white overflow-hidden shadow-sm">
            <CardHeader className="pb-4">
               <CardTitle className="text-sm font-bold flex items-center gap-2 uppercase tracking-tighter">
                 <Calendar className="w-4 h-4 text-zinc-900" /> Khởi tạo khoảng thời gian
               </CardTitle>
               <CardDescription className="text-xs font-medium text-zinc-400 mt-1">Cấu hình thời gian để Worker tải dữ liệu về hệ thống</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row gap-4 items-end bg-zinc-50/30 p-4 rounded-2xl border border-zinc-50/50">
                <div className="flex-1 space-y-1.5 w-full">
                  <label className="text-[10px] font-bold uppercase text-zinc-400 tracking-tight ml-1">Từ ngày</label>
                  <Input 
                    type="date" 
                    className="rounded-lg border-zinc-200 h-9 text-xs font-bold bg-white focus-visible:ring-zinc-900" 
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                  />
                </div>
                <div className="flex-1 space-y-1.5 w-full">
                  <label className="text-[10px] font-bold uppercase text-zinc-400 tracking-tight ml-1">Đến ngày</label>
                  <Input 
                    type="date" 
                    className="rounded-lg border-zinc-200 h-9 text-xs font-bold bg-white focus-visible:ring-zinc-900" 
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                  />
                </div>
                <Button 
                  onClick={handleSeed}
                  disabled={actionLoading}
                  className="w-full md:w-auto bg-zinc-900 hover:bg-black text-white rounded-lg h-9 px-6 font-bold transition-all text-xs active:scale-95"
                >
                  Khởi tạo Task
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Console Log - Compact List */}
        <Card className="border border-zinc-100 rounded-[1.5rem] bg-zinc-900 overflow-hidden flex flex-col h-[600px] shadow-2xl shadow-black/5">
          <CardHeader className="flex flex-row items-center justify-between shrink-0 bg-black/20 pb-4">
            <div>
              <CardTitle className="text-xs font-bold flex items-center gap-2 text-zinc-100 italic font-mono uppercase tracking-widest">
                <History className="w-3 h-3 text-emerald-400" /> Operational Console
              </CardTitle>
              <CardDescription className="text-[9px] font-bold text-zinc-500 uppercase tracking-tighter mt-0.5">Streaming events from worker</CardDescription>
            </div>
            <div className="flex items-center gap-1.5">
               <span className="text-[9px] font-bold text-emerald-500/80 uppercase">Live</span>
               <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
            </div>
          </CardHeader>
          <CardContent className="flex-1 p-0 overflow-hidden bg-black/40">
            <ScrollArea className="h-full">
              <div className="flex flex-col p-4 font-mono">
                {logs.length > 0 ? (
                  logs.map((log) => (
                    <div key={log.id} className="flex gap-3 group border-b border-white/5 py-3 last:border-none">
                      <div className="shrink-0 pt-0.5">
                        {getStatusIcon(log.status)}
                      </div>
                      <div className="flex flex-col gap-1 w-full min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className={cn(
                            "text-[10px] font-black px-1.5 py-0.5 rounded-md",
                            log.crawl_type === 'HEADER' ? "bg-blue-500/10 text-blue-400" : "bg-purple-500/10 text-purple-400"
                          )}>
                            {log.crawl_type}
                          </span>
                          <span className="text-[9px] font-bold text-zinc-600 tabular-nums">
                            {new Date(log.created_at).toLocaleTimeString()}
                          </span>
                        </div>
                        <div className="text-[11px] leading-relaxed text-zinc-300 font-medium break-words">
                          {log.status === 'success' 
                            ? `Dữ liệu ${log.crawl_date}: Đã nạp ${log.records_count} bản ghi thành công` 
                            : log.error_message || 'Timeout hoặc lỗi không xác định'}
                        </div>
                        {log.duration_seconds && (
                          <div className="flex items-center gap-2 mt-0.5">
                             <div className="h-px flex-1 bg-white/5" />
                             <span className="text-[9px] text-zinc-500 font-bold uppercase italic">Latency: {log.duration_seconds}s</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center h-48 border border-white/5 rounded-2xl m-4 border-dashed">
                    <Search className="w-5 h-5 text-zinc-700 mb-2" />
                    <span className="font-bold text-[10px] text-zinc-600 uppercase tracking-widest">No logs detected</span>
                  </div>
                )}
              </div>
              <ScrollBar />
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
