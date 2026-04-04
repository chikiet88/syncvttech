'use client'

import React, { useEffect, useState, useRef } from 'react'
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
  Calendar
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'

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
  
  const API_BASE = 'http://localhost:5001'

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
      toast.success(data.message)
      fetchData()
    } catch (error) {
      toast.error('Lỗi khởi tạo task')
    } finally {
      setActionLoading(false)
    }
  }

  const handleStart = async () => {
    setActionLoading(true)
    try {
      const res = await fetch(`${API_BASE}/sync/start-tasks?limit=500`)
      const data = await res.json()
      toast.success(data.message)
      fetchData()
    } catch (error) {
      toast.error('Lỗi khởi chạy task')
    } finally {
      setActionLoading(false)
    }
  }

  const handleStop = async () => {
    setActionLoading(true)
    try {
      const res = await fetch(`${API_BASE}/sync/stop`)
      const data = await res.json()
      toast.success(data.message)
    } catch (error) {
      toast.error('Lỗi dừng đồng bộ')
    } finally {
      setActionLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status.toUpperCase()) {
      case 'SUCCESS': return <Badge className="bg-emerald-500 hover:bg-emerald-600 border-none rounded-full px-3">Hoàn thành</Badge>
      case 'PROCESSING': return <Badge className="bg-indigo-500 animate-pulse border-none rounded-full px-3">Đang chạy</Badge>
      case 'FAILED': return <Badge className="bg-rose-500 border-none rounded-full px-3">Thất bại</Badge>
      default: return <Badge variant="secondary" className="rounded-full px-3">Chờ xử lý</Badge>
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status.toUpperCase()) {
      case 'SUCCESS': return <CheckCircle2 className="w-5 h-5 text-emerald-500" />
      case 'FAILED': return <AlertCircle className="w-5 h-5 text-rose-500" />
      case 'PROCESSING': return <RefreshCw className="w-5 h-5 text-indigo-500 animate-spin" />
      default: return <Clock className="w-5 h-5 text-slate-400" />
    }
  }

  return (
    <div className="flex flex-col gap-8 p-8 max-w-[1600px] mx-auto animate-in fade-in duration-700">
      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-indigo-600 font-bold uppercase tracking-widest text-xs">
          <Activity className="w-4 h-4" />
          Giám sát hệ thống
        </div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h1 className="text-4xl font-black tracking-tight text-slate-900">Tiến trình đồng bộ <span className="text-indigo-600">Dữ liệu lớn</span></h1>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              onClick={fetchData} 
              disabled={loading}
              className="rounded-2xl border-slate-200 hover:bg-slate-50 font-bold transition-all"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Làm mới
            </Button>
            <Button 
              onClick={handleStart} 
              disabled={actionLoading}
              className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl px-6 font-bold shadow-lg shadow-indigo-200 transition-all border-none"
            >
              <Play className="w-4 h-4 mr-2 fill-current" /> Chạy tiếp
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleStop}
              className="rounded-2xl px-6 font-bold shadow-lg shadow-rose-100 transition-all border-none"
            >
              <Pause className="w-4 h-4 mr-2 fill-current" /> Dừng lại
            </Button>
          </div>
        </div>
      </header>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-none shadow-xl shadow-slate-200/50 rounded-[2rem] overflow-hidden bg-white group hover:translate-y-[-4px] transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-300">
                <Database className="w-6 h-6" />
              </div>
              <Badge variant="secondary" className="rounded-full bg-slate-50 text-slate-500 font-bold border-none">Tổng cộng</Badge>
            </div>
            <div className="text-3xl font-black text-slate-900 mb-1">{summary?.total.toLocaleString() || 0}</div>
            <p className="text-sm font-bold text-slate-400">Số gói dữ liệu (Tasks)</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-xl shadow-slate-200/50 rounded-[2rem] overflow-hidden bg-white group hover:translate-y-[-4px] transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-emerald-50 rounded-2xl text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors duration-300">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <Badge variant="secondary" className="rounded-full bg-emerald-50 text-emerald-600 font-bold border-none">Hoàn thành</Badge>
            </div>
            <div className="text-3xl font-black text-slate-900 mb-1">{summary?.success.toLocaleString() || 0}</div>
            <p className="text-sm font-bold text-slate-400">Tasks đã đồng bộ xong</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-xl shadow-slate-200/50 rounded-[2rem] overflow-hidden bg-white group hover:translate-y-[-4px] transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-amber-50 rounded-2xl text-amber-600 group-hover:bg-amber-600 group-hover:text-white transition-colors duration-300">
                <RefreshCw className="w-6 h-6" />
              </div>
              <Badge variant="secondary" className="rounded-full bg-amber-50 text-amber-600 font-bold border-none">Đang chờ</Badge>
            </div>
            <div className="text-3xl font-black text-slate-900 mb-1">{(summary?.total || 0) - (summary?.success || 0)}</div>
            <p className="text-sm font-bold text-slate-400">Tasks còn lại trong hàng đợi</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-xl shadow-slate-200/50 rounded-[2rem] overflow-hidden bg-white group hover:translate-y-[-4px] transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-rose-50 rounded-2xl text-rose-600 group-hover:bg-rose-600 group-hover:text-white transition-colors duration-300">
                <TrendingUp className="w-6 h-6" />
              </div>
              <Badge variant="secondary" className="rounded-full bg-rose-50 text-rose-600 font-bold border-none">Hiệu suất</Badge>
            </div>
            <div className="text-3xl font-black text-slate-900 mb-1">{summary?.progress.toFixed(2) || 0}%</div>
            <p className="text-sm font-bold text-slate-400">Tỷ lệ hoàn thành tổng thể</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Progress & Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Progress Visualizer */}
          <Card className="border-none shadow-2xl shadow-slate-200/60 rounded-[2.5rem] bg-white overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-xl font-black">Tiến độ tổng thể</CardTitle>
              <CardDescription className="font-bold text-slate-400">Dữ liệu từ 2019 đến Hiện tại</CardDescription>
            </CardHeader>
            <CardContent className="pt-4 flex flex-col gap-8">
              <div className="relative pt-2">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-black text-slate-500 uppercase tracking-tighter">Bắt đầu (2019)</span>
                  <span className="text-sm font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">{summary?.progress.toFixed(2)}% Hoàn thành</span>
                  <span className="text-sm font-black text-slate-500 uppercase tracking-tighter">Hiện tại</span>
                </div>
                <Progress value={summary?.progress} className="h-4 bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600 transition-all duration-1000 ease-out shadow-lg shadow-indigo-200/50" 
                    style={{ width: `${summary?.progress}%` }} 
                  />
                </Progress>
              </div>

              <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-50">
                {summary?.details.map((detail, idx) => (
                  <div key={idx} className="flex flex-col gap-1">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider font-mono">{detail.status}</span>
                    <span className="text-xl font-bold text-slate-800">{detail._count._all.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Quick Setup */}
          <Card className="border-none shadow-2xl shadow-slate-200/60 rounded-[2.5rem] bg-white overflow-hidden">
            <CardHeader>
               <CardTitle className="text-xl font-black flex items-center gap-2">
                 <Calendar className="w-5 h-5 text-indigo-600" /> Cấu hình khoảng thời gian
               </CardTitle>
               <CardDescription className="font-bold text-slate-400">Khởi tạo các gói công việc cho Worker</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row gap-4 items-end">
                <div className="flex-1 space-y-2">
                  <label className="text-xs font-black uppercase text-slate-400 ml-1">Từ ngày</label>
                  <Input 
                    type="date" 
                    className="rounded-xl border-slate-200 h-11 font-bold" 
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                  />
                </div>
                <div className="flex-1 space-y-2">
                  <label className="text-xs font-black uppercase text-slate-400 ml-1">Đến ngày</label>
                  <Input 
                    type="date" 
                    className="rounded-xl border-slate-200 h-11 font-bold" 
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                  />
                </div>
                <Button 
                  onClick={handleSeed}
                  disabled={actionLoading}
                  className="bg-slate-900 hover:bg-black text-white rounded-xl h-11 px-8 font-bold transition-all shadow-lg shadow-slate-200"
                >
                  Khởi tạo Task
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Real-time Logs */}
        <Card className="border-none shadow-2xl shadow-slate-200/60 rounded-[2.5rem] bg-white overflow-hidden flex flex-col h-[600px]">
          <CardHeader className="flex flex-row items-center justify-between shrink-0">
            <div>
              <CardTitle className="text-xl font-black flex items-center gap-2">
                <History className="w-5 h-5 text-indigo-600" /> Nhật ký vận hành
              </CardTitle>
              <CardDescription className="font-bold text-slate-400 text-xs">Thời gian thực</CardDescription>
            </div>
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          </CardHeader>
          <CardContent className="flex-1 p-0 overflow-hidden">
            <ScrollArea className="h-full p-6">
              <div className="flex flex-col gap-4">
                {logs.length > 0 ? (
                  logs.map((log) => (
                    <div key={log.id} className="flex gap-4 group">
                      <div className="flex flex-col items-center gap-1 shrink-0 pt-1">
                        {getStatusIcon(log.status)}
                        <div className="w-px h-full bg-slate-100 group-last:bg-transparent" />
                      </div>
                      <div className="flex flex-col gap-1 pb-4">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-black text-slate-900 px-2 py-0.5 bg-slate-100 rounded-lg">{log.crawl_type}</span>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                            {new Date(log.created_at).toLocaleTimeString()}
                          </span>
                        </div>
                        <div className="text-sm font-bold text-slate-600">
                          {log.status === 'success' 
                            ? `Đã đồng bộ ${log.records_count} bản ghi` 
                            : log.error_message || 'Đã xảy ra lỗi không xác định'}
                        </div>
                        {log.duration_seconds && (
                          <span className="text-[10px] text-slate-400 font-medium italic">Xử lý trong {log.duration_seconds}s</span>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center h-48 text-slate-300 gap-2">
                    <Search className="w-8 h-8 opacity-20" />
                    <span className="font-bold text-sm">Chưa có dữ liệu nhật ký</span>
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
