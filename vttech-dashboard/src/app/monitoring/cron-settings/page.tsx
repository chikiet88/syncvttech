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
  ShieldAlert
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

// Custom Switch component styled like Shadcn UI Switch
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

  useEffect(() => {
    fetchConfigs()
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

  // Khớp biểu thức thời gian để hiển thị cho trực quan
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

  return (
    <div className="min-h-screen bg-[#fafafa] p-4 lg:p-8 font-sans selection:bg-zinc-200">
      <div className="max-w-[1200px] mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-1">
            <Badge variant="secondary" className="bg-zinc-900 text-white hover:bg-zinc-800 rounded-md px-2 py-0 text-[10px] font-bold tracking-widest uppercase mb-2">
              System Admin
            </Badge>
            <h1 className="text-3xl font-black tracking-tight text-zinc-900">Cài đặt Cron Job</h1>
            <p className="text-zinc-500 text-sm font-medium flex items-center gap-2">
              Quản lý trạng thái Bật/Tắt các tác vụ đồng bộ ngầm của hệ thống.
            </p>
          </div>

          <div className="flex items-center gap-2 p-1 bg-white border border-zinc-200 rounded-xl shadow-sm">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={fetchConfigs}
              disabled={loading}
              className="h-9 px-3 rounded-lg text-zinc-600 font-bold hover:bg-zinc-50"
            >
              <RefreshCw className={cn("w-4 h-4 mr-2", loading && "animate-spin")} /> Tải lại
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-none shadow-sm bg-white rounded-2xl">
            <CardHeader className="pb-2">
              <CardDescription className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Tổng số tác vụ</CardDescription>
              <CardTitle className="text-3xl font-black text-zinc-900">{configs.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-none shadow-sm bg-white rounded-2xl">
            <CardHeader className="pb-2">
              <CardDescription className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Đang hoạt động</CardDescription>
              <CardTitle className="text-3xl font-black text-emerald-600">{activeCount}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-none shadow-sm bg-white rounded-2xl">
            <CardHeader className="pb-2">
              <CardDescription className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Tạm dừng</CardDescription>
              <CardTitle className="text-3xl font-black text-rose-500">{inactiveCount}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Main Content */}
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
                            <Badge className="bg-emerald-500/10 text-emerald-700 hover:bg-emerald-50/20 border-none font-bold text-[9px] rounded px-1.5 py-0.5">
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
