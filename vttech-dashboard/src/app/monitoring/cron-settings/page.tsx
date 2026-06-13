'use client'

import React, { useEffect, useState } from 'react'
import {
  Settings,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Info,
  Clock,
  Play,
  ToggleLeft,
  ToggleRight,
  ShieldAlert,
  Database,
  Activity,
  Flame,
  Trash2,
  StopCircle,
  Calendar,
  ListTodo,
  ArrowRight
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Separator } from '@/components/ui/separator'

interface CronConfig {
  id: string
  name: string
  enabled: boolean
  description: string | null
  updated_at: string
}

interface SwitchProps {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  disabled?: boolean
}

function Switch({ checked, onCheckedChange, disabled }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        checked ? "bg-zinc-900" : "bg-zinc-200"
      )}
    >
      <span
        className={cn(
          "pointer-events-none block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform duration-200",
          checked ? "translate-x-5" : "translate-x-0.5"
        )}
      />
    </button>
  )
}

export default function CronSettingsPage() {
  const [configs, setConfigs] = useState<CronConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  // Retroactive Sync configuration states
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [syncLimit, setSyncLimit] = useState(50)

  // Sync status polling state
  const [syncStatus, setSyncStatus] = useState<any>(null)
  const [queueLoading, setQueueLoading] = useState(false)

  // Activity loaders
  const [seeding, setSeeding] = useState(false)
  const [starting, setStarting] = useState(false)
  const [stopping, setStopping] = useState(false)
  const [resetting, setResetting] = useState(false)

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'

  const fetchConfigs = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/cron-configs`)
      if (!res.ok) throw new Error('Không thể tải cấu hình Cron')
      const data = await res.json()
      setConfigs(data)
    } catch (error: any) {
      console.error(error)
      toast.error('Lỗi khi tải cấu hình Cron Job từ server.')
    } finally {
      setLoading(false)
    }
  }

  const fetchSyncStatus = async (showLoader = false) => {
    if (showLoader) setQueueLoading(true)
    try {
      const res = await fetch(`${API_BASE}/sync/status`)
      if (!res.ok) throw new Error('Không thể tải trạng thái hàng đợi')
      const data = await res.json()
      setSyncStatus(data)
    } catch (error) {
      console.error('Error fetching sync status:', error)
    } finally {
      if (showLoader) setQueueLoading(false)
    }
  }

  // Poll sync status every 3 seconds
  useEffect(() => {
    fetchConfigs()
    fetchSyncStatus(true)

    const timer = setInterval(() => {
      fetchSyncStatus(false)
    }, 3000)

    return () => clearInterval(timer)
  }, [])

  const handleToggle = async (id: string, currentStatus: boolean) => {
    setUpdatingId(id)
    try {
      const res = await fetch(`${API_BASE}/cron-configs/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ enabled: !currentStatus }),
      })

      if (!res.ok) throw new Error('Không thể cập nhật cấu hình')
      
      const updated = await res.json()
      
      setConfigs(prev => prev.map(c => c.id === id ? { ...c, enabled: updated.enabled } : c))
      toast.success(`Đã ${updated.enabled ? 'bật' : 'tắt'} Cron Job "${updated.name}" thành công.`)
    } catch (error: any) {
      console.error(error)
      toast.error(`Cập nhật thất bại. Vui lòng thử lại.`)
    } finally {
      setUpdatingId(null)
    }
  }

  // Handle Seeding tasks
  const handleSeedTasks = async () => {
    if (!fromDate || !toDate) {
      toast.error('Vui lòng chọn đầy đủ khoảng thời gian (Từ ngày - Đến ngày)')
      return
    }
    setSeeding(true)
    try {
      const res = await fetch(`${API_BASE}/sync/seed-tasks?from=${fromDate}&to=${toDate}`)
      if (!res.ok) throw new Error('Lỗi khi gieo hạt tác vụ')
      const result = await res.json()
      toast.success(result.message || 'Đã tạo các tác vụ đồng bộ lịch sử thành công.')
      fetchSyncStatus(true)
    } catch (error: any) {
      console.error(error)
      toast.error(`Gieo hạt tác vụ thất bại: ${error.message}`)
    } finally {
      setSeeding(false)
    }
  }

  // Handle Feeding queue (Start tasks)
  const handleStartTasks = async () => {
    setStarting(true)
    try {
      const res = await fetch(`${API_BASE}/sync/start-tasks?limit=${syncLimit}`)
      if (!res.ok) throw new Error('Lỗi khi đẩy tác vụ vào hàng đợi')
      const result = await res.json()
      toast.success(result.message || `Đã đẩy các tác vụ vào hàng đợi thành công.`)
      fetchSyncStatus(true)
    } catch (error: any) {
      console.error(error)
      toast.error(`Kích hoạt chạy thất bại: ${error.message}`)
    } finally {
      setStarting(false)
    }
  }

  // Handle Emergency Stop
  const handleStopSync = async () => {
    setStopping(true)
    try {
      const res = await fetch(`${API_BASE}/sync/stop`)
      if (!res.ok) throw new Error('Không thể dừng đồng bộ')
      toast.success('Đã gửi yêu cầu dừng đồng bộ khẩn cấp lên server.')
      fetchSyncStatus(true)
    } catch (error: any) {
      console.error(error)
      toast.error(`Dừng đồng bộ thất bại: ${error.message}`)
    } finally {
      setStopping(false)
    }
  }

  // Handle Reset Queue
  const handleResetQueue = async () => {
    const confirmed = window.confirm(
      'CẢNH BÁO: Hành động này sẽ dừng toàn bộ tiến trình đang chạy, xóa sạch hàng đợi BullMQ và dọn sạch các tác vụ sync_tasks trong Database. Giao dịch thực tế đã lưu sẽ không bị ảnh hưởng. Bạn có muốn tiếp tục?'
    )
    if (!confirmed) return

    setResetting(true)
    try {
      const res = await fetch(`${API_BASE}/sync/reset-queue`)
      if (!res.ok) throw new Error('Không thể reset hàng đợi')
      const result = await res.json()
      toast.success('Đã xóa sạch hàng đợi và làm trống danh sách tác vụ.')
      fetchSyncStatus(true)
    } catch (error: any) {
      console.error(error)
      toast.error(`Reset hàng đợi thất bại: ${error.message}`)
    } finally {
      setResetting(false)
    }
  }

  // Map cron descriptions
  const getCronExpression = (id: string) => {
    switch (id) {
      case 'handleDailySync': return '0 0 0 * * * (00:00 hàng ngày)'
      case 'handleDailyPbxSync': return '0 0 1 * * * (01:00 hàng ngày)'
      case 'handleHeartbeat': return '0 */5 * * * * (Mỗi 5 phút)'
      case 'handleFrequentSync': return '0 */20 * * * * (Mỗi 20 phút)'
      case 'handleHistoricalSyncCron': return '0 */30 * * * * (Mỗi 30 phút)'
      case 'handleStaleTasksCron': return '0 */10 * * * * (Mỗi 10 phút)'
      case 'handleQueueCleanupCron': return '0 0 * * * * (Mỗi 1 giờ)'
      case 'handleDailyReporting': return '0 0 8,20 * * * (08:00 & 20:00 hàng ngày)'
      default: return '* * * * *'
    }
  }

  const activeCount = configs.filter(c => c.enabled).length
  const inactiveCount = configs.length - activeCount

  // Extract queue statuses
  const queueCounts = syncStatus?.queueCounts || { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0, prioritized: 0 }
  const taskSummary = syncStatus?.taskSummary || { pending: 0, processing: 0, success: 0, failed: 0 }
  const isSyncing = syncStatus?.isSyncing || false
  const progressPercent = syncStatus?.progress !== undefined && syncStatus?.progress !== null && syncStatus?.progress > 0
    ? syncStatus.progress
    : (syncStatus?.total > 0 ? Math.round((syncStatus.current / syncStatus.total) * 100) : 0)

  return (
    <div className="min-h-screen bg-[#fafafa] p-4 lg:p-8 font-sans selection:bg-zinc-200">
      <div className="max-w-[1200px] mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-1">
            <Badge variant="secondary" className="bg-zinc-900 text-white hover:bg-zinc-800 rounded-md px-2 py-0 text-[10px] font-bold tracking-widest uppercase mb-2">
              System Admin
            </Badge>
            <h1 className="text-3xl font-black tracking-tight text-zinc-900">Bảng Điều Khiển Đồng Bộ & Cron Job</h1>
            <p className="text-zinc-500 text-sm font-medium flex items-center gap-2">
              Quản lý các cron job tự động, cấu hình gieo hạt lịch sử và điều khiển khẩn cấp hàng đợi BullMQ.
            </p>
          </div>

          <div className="flex items-center gap-2 p-1 bg-white border border-zinc-200 rounded-xl shadow-sm">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => { fetchConfigs(); fetchSyncStatus(true); }}
              disabled={loading || queueLoading}
              className="h-9 px-3 rounded-lg text-zinc-600 font-bold hover:bg-zinc-50"
            >
              <RefreshCw className={cn("w-4 h-4 mr-2", (loading || queueLoading) && "animate-spin")} /> Tải lại
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="border-none shadow-sm bg-white rounded-2xl">
            <CardHeader className="pb-2">
              <CardDescription className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Trạng Thái Runner</CardDescription>
              <CardTitle className="text-xl font-black flex items-center gap-2 mt-1">
                {isSyncing ? (
                  <>
                    <Activity className="w-5 h-5 text-emerald-500 animate-pulse" />
                    <span className="text-emerald-600">Đang đồng bộ</span>
                  </>
                ) : (
                  <>
                    <Clock className="w-5 h-5 text-zinc-400" />
                    <span className="text-zinc-500">Đang rảnh</span>
                  </>
                )}
              </CardTitle>
            </CardHeader>
          </Card>
          
          <Card className="border-none shadow-sm bg-white rounded-2xl">
            <CardHeader className="pb-2">
              <CardDescription className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Tác vụ Cron Job</CardDescription>
              <CardTitle className="text-3xl font-black text-zinc-900">
                {activeCount} <span className="text-sm font-bold text-zinc-400">/ {configs.length} Bật</span>
              </CardTitle>
            </CardHeader>
          </Card>

          <Card className="border-none shadow-sm bg-white rounded-2xl">
            <CardHeader className="pb-2">
              <CardDescription className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">BullMQ Active & Wait</CardDescription>
              <CardTitle className="text-3xl font-black text-zinc-900">
                <span className="text-emerald-600">{queueCounts.active}</span>
                <span className="text-zinc-300 mx-2">/</span>
                <span className="text-zinc-500">{queueCounts.waiting + (queueCounts.prioritized || 0)}</span>
              </CardTitle>
            </CardHeader>
          </Card>

          <Card className="border-none shadow-sm bg-white rounded-2xl">
            <CardHeader className="pb-2">
              <CardDescription className="text-[10px] font-bold uppercase tracking-wider text-rose-400">BullMQ Jobs Thất Bại</CardDescription>
              <CardTitle className="text-3xl font-black text-rose-600">{queueCounts.failed}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Live Progress Bar (Shows when syncing) */}
        {isSyncing && (
          <Card className="border-none shadow-sm bg-zinc-900 text-white rounded-2xl p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Tiến trình đồng bộ thực tế</span>
                  <h3 className="text-lg font-black text-zinc-100">{syncStatus?.message || 'Đang quét chi tiết...'}</h3>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-black text-white">{progressPercent}%</span>
                  <p className="text-[10px] font-bold text-zinc-400">{syncStatus?.current} / {syncStatus?.total} Task</p>
                </div>
              </div>
              <div className="w-full bg-zinc-800 rounded-full h-3 overflow-hidden">
                <div 
                  className="bg-emerald-500 h-3 rounded-full transition-all duration-500" 
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </Card>
        )}

        {/* Controls and Queue Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Retroactive Control Card */}
          <Card className="border-none shadow-sm bg-white rounded-2xl lg:col-span-2">
            <CardHeader className="border-b border-zinc-100">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-zinc-400" />
                <CardTitle className="text-sm font-bold uppercase tracking-tight">Bộ Điều Khiển Đồng Bộ Hồi Quy</CardTitle>
              </div>
              <CardDescription className="text-xs">Gieo hạt và kích hoạt tác vụ lịch sử (Backlog)</CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500">Từ Ngày (From Date)</label>
                  <input 
                    type="date" 
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="w-full rounded-lg border border-zinc-200 bg-white p-2.5 text-sm font-bold focus:outline-none focus:ring-1 focus:ring-zinc-950"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500">Đến Ngày (To Date)</label>
                  <input 
                    type="date" 
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="w-full rounded-lg border border-zinc-200 bg-white p-2.5 text-sm font-bold focus:outline-none focus:ring-1 focus:ring-zinc-950"
                  />
                </div>
              </div>

              <div className="flex flex-col md:flex-row items-end md:items-center justify-between gap-6 pt-2">
                <div className="space-y-2 w-full md:w-auto">
                  <label className="text-xs font-bold text-zinc-500 block">Số lượng Task nạp mỗi lượt (Limit)</label>
                  <select 
                    value={syncLimit} 
                    onChange={(e) => setSyncLimit(parseInt(e.target.value))}
                    className="w-full md:w-32 rounded-lg border border-zinc-200 bg-white p-2.5 text-sm font-bold focus:outline-none focus:ring-1 focus:ring-zinc-950"
                  >
                    <option value={20}>20 Task</option>
                    <option value={50}>50 Task</option>
                    <option value={100}>100 Task</option>
                    <option value={200}>200 Task</option>
                  </select>
                </div>

                <div className="flex gap-3 w-full md:w-auto">
                  <Button 
                    onClick={handleSeedTasks} 
                    disabled={seeding}
                    variant="outline"
                    className="flex-1 md:flex-none h-11 px-6 font-bold border-zinc-200 rounded-lg text-zinc-700"
                  >
                    {seeding ? 'Đang tạo...' : '1. Gieo Hạt Tác Vụ'}
                  </Button>
                  <Button 
                    onClick={handleStartTasks} 
                    disabled={starting || isSyncing}
                    className="flex-1 md:flex-none h-11 px-6 font-bold bg-zinc-900 text-white rounded-lg hover:bg-zinc-800"
                  >
                    {starting ? 'Đang đẩy...' : '2. Đẩy Queue Chạy'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Emergency Stop & Reset Panel */}
          <Card className="border-none shadow-sm bg-white rounded-2xl">
            <CardHeader className="border-b border-zinc-100">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-zinc-400" />
                <CardTitle className="text-sm font-bold uppercase tracking-tight">Hành Động Khẩn Cấp</CardTitle>
              </div>
              <CardDescription className="text-xs">Xử lý sự cố và dọn sạch dữ liệu hàng đợi</CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <Button 
                onClick={handleStopSync} 
                disabled={stopping || !isSyncing}
                className="w-full h-12 font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl flex items-center justify-center gap-2"
              >
                <StopCircle className="w-5 h-5" />
                DỪNG KHẨN CẤP (STOP)
              </Button>

              <Button 
                onClick={handleResetQueue} 
                disabled={resetting}
                variant="outline"
                className="w-full h-12 font-bold border-rose-200 hover:bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center gap-2"
              >
                <Trash2 className="w-5 h-5" />
                DỌN SẠCH & RESET QUEUE
              </Button>

              <div className="text-[10px] text-zinc-400 font-semibold leading-normal pt-2">
                * Nút <strong>Stop</strong> yêu cầu tiến trình ngừng cào sau khi xong job hiện tại. <br />
                * Nút <strong>Reset</strong> sẽ giải phóng toàn bộ Redis RAM và xóa các task PENDING/PROCESSING trong DB.
              </div>
            </CardContent>
          </Card>

        </div>

        {/* Live Queue Monitor Status Details */}
        <Card className="border-none shadow-sm bg-white rounded-2xl">
          <CardHeader className="border-b border-zinc-100">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-zinc-400" />
              <CardTitle className="text-sm font-bold uppercase tracking-tight">Chi Tiết Giám Sát Hàng Đợi & Sync Tasks</CardTitle>
            </div>
            <CardDescription className="text-xs">Trạng thái thời gian thực các tác vụ đồng bộ lịch sử</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
              
              {/* BullMQ waiting */}
              <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-100 text-center">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">BullMQ Waiting & Prioritized</span>
                <span className="text-2xl font-black text-zinc-700 block mt-1">{queueCounts.waiting + (queueCounts.prioritized || 0)}</span>
              </div>
              {/* BullMQ active */}
              <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-100 text-center">
                <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">BullMQ Active</span>
                <span className="text-2xl font-black text-emerald-600 block mt-1">{queueCounts.active}</span>
              </div>
              {/* BullMQ delayed */}
              <div className="p-4 bg-amber-50/50 rounded-xl border border-amber-100 text-center">
                <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider block">BullMQ Delayed</span>
                <span className="text-2xl font-black text-amber-600 block mt-1">{queueCounts.delayed}</span>
              </div>
              {/* BullMQ completed */}
              <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-100 text-center">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">BullMQ Completed</span>
                <span className="text-2xl font-black text-zinc-700 block mt-1">{queueCounts.completed}</span>
              </div>
              {/* BullMQ failed */}
              <div className="p-4 bg-rose-50/50 rounded-xl border border-rose-100 text-center">
                <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider block">BullMQ Failed</span>
                <span className="text-2xl font-black text-rose-600 block mt-1">{queueCounts.failed}</span>
              </div>

            </div>

            <Separator className="my-6 bg-zinc-100" />

            <div className="space-y-3">
              <h4 className="text-xs font-bold text-zinc-500 flex items-center gap-1.5">
                <ListTodo className="w-3.5 h-3.5" /> Thống kê Sync Tasks trong Database
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="flex items-center justify-between p-3.5 bg-zinc-50/50 rounded-xl border border-zinc-100">
                  <span className="text-xs font-bold text-zinc-500">Chờ chạy (PENDING):</span>
                  <span className="text-sm font-black text-zinc-800">{taskSummary.pending}</span>
                </div>
                <div className="flex items-center justify-between p-3.5 bg-blue-50/30 rounded-xl border border-blue-100">
                  <span className="text-xs font-bold text-blue-600">Đang chạy (PROCESSING):</span>
                  <span className="text-sm font-black text-blue-600">{taskSummary.processing}</span>
                </div>
                <div className="flex items-center justify-between p-3.5 bg-emerald-50/30 rounded-xl border border-emerald-100">
                  <span className="text-xs font-bold text-emerald-600">Thành công (SUCCESS):</span>
                  <span className="text-sm font-black text-emerald-600">{taskSummary.success}</span>
                </div>
                <div className="flex items-center justify-between p-3.5 bg-rose-50/30 rounded-xl border border-rose-100">
                  <span className="text-xs font-bold text-rose-600">Thất bại (FAILED):</span>
                  <span className="text-sm font-black text-rose-600">{taskSummary.failed}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Core Cron Settings Table */}
        <Card className="border-none shadow-sm bg-white rounded-2xl overflow-hidden">
          <CardHeader className="pb-3 border-b border-zinc-100">
            <div className="flex items-center gap-2">
              <Settings className="w-4 h-4 text-zinc-400" />
              <CardTitle className="text-sm font-bold uppercase tracking-tight">Danh sách Cron Job hệ thống</CardTitle>
            </div>
          </CardHeader>
          
          <CardContent className="p-0">
            {loading && configs.length === 0 ? (
              <div className="py-20 flex flex-col items-center justify-center gap-3">
                <RefreshCw className="w-8 h-8 text-zinc-400 animate-spin" />
                <p className="text-xs text-zinc-500 font-medium">Đang tải danh sách cấu hình...</p>
              </div>
            ) : (
              <div className="divide-y divide-zinc-100">
                {configs.map((config) => {
                  const isUpdating = updatingId === config.id
                  return (
                    <div 
                      key={config.id} 
                      className={cn(
                        "p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 transition-colors hover:bg-zinc-50/50",
                        !config.enabled && "opacity-80 bg-zinc-50/30"
                      )}
                    >
                      <div className="space-y-2 max-w-[80%]">
                        <div className="flex flex-wrap items-center gap-2.5">
                          <span className="text-sm font-bold text-zinc-900">{config.name}</span>
                          <code className="text-[10px] font-mono font-bold bg-zinc-100 text-zinc-600 px-1.5 py-0.5 rounded">
                            {config.id}
                          </code>
                          {config.enabled ? (
                            <Badge className="bg-emerald-500/10 text-emerald-700 hover:bg-emerald-50/20 border-none font-bold text-[9px] rounded px-1.5 py-0.5 animate-none">
                              <CheckCircle2 className="w-3 h-3 mr-1" /> Kích hoạt
                            </Badge>
                          ) : (
                            <Badge className="bg-zinc-100 text-zinc-500 hover:bg-zinc-100 border-none font-bold text-[9px] rounded px-1.5 py-0.5">
                              <ShieldAlert className="w-3 h-3 mr-1" /> Tắt
                            </Badge>
                          )}
                        </div>
                        
                        <p className="text-xs text-zinc-500 leading-relaxed font-medium">
                          {config.description || 'Không có mô tả.'}
                        </p>
                        
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-400">
                          <Clock className="w-3.5 h-3.5" />
                          <span>Tần suất chạy: {getCronExpression(config.id)}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 shrink-0 self-end md:self-auto">
                        <span className="text-xs font-bold text-zinc-400 group-data-[disabled]:opacity-50">
                          {config.enabled ? 'Đang bật' : 'Đang tắt'}
                        </span>
                        <Switch 
                          checked={config.enabled} 
                          onCheckedChange={() => handleToggle(config.id, config.enabled)}
                          disabled={isUpdating}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Warning Banner */}
        <div className="p-4 bg-amber-50/50 border border-amber-100 rounded-2xl flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-xs font-bold text-amber-800">Lưu ý vận hành hệ thống</h4>
            <p className="text-[11px] text-amber-700 font-medium leading-relaxed">
              Việc tắt các Cron Job cốt lõi như <strong>Duy trì Session VTTech (Heartbeat)</strong> hoặc <strong>Đồng bộ nhanh định kỳ</strong> có thể làm gián đoạn việc cập nhật dữ liệu tự động lên Dashboard và gây hết hạn session làm việc với VTTech Portal. Vui lòng cân nhắc kỹ trước khi thực hiện thay đổi.
            </p>
          </div>
        </div>

      </div>
    </div>
  )
}
