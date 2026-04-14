'use client'

import React, { Suspense, useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AdvancedTable } from "@/components/ui/advanced-table/AdvancedTable"
import { columns, BranchSummary } from "./columns"
import { 
  Calendar as CalendarIcon, 
  Loader2, 
  TrendingUp,
  LayoutGrid,
  Download,
  Search,
  Filter
} from "lucide-react"
import { CrawlLogActions } from "@/components/CrawlLogActions"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { 
  Badge 
} from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Users as UsersIcon,
  Scissors as ScissorsIcon,
  Activity as ActivityIcon,
  CalendarCheck as CalendarCheckIcon,
  DollarSign as DollarSignIcon,
  Wallet as WalletIcon
} from "lucide-react"

function BranchReportContent() {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<BranchSummary[]>([])
  
  // Cache dates in localStorage
  const [dateFrom, setDateFrom] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('report_date_from') || new Date().toISOString().split('T')[0]
    }
    return new Date().toISOString().split('T')[0]
  })
  const [dateTo, setDateTo] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('report_date_to') || new Date().toISOString().split('T')[0]
    }
    return new Date().toISOString().split('T')[0]
  })
  const [selectedBranchId, setSelectedBranchId] = useState<string>("all")
  const [selectedMonth, setSelectedMonth] = useState<string>("none")

  // Sync state to localStorage on change
  useEffect(() => {
    localStorage.setItem('report_date_from', dateFrom)
    localStorage.setItem('report_date_to', dateTo)
  }, [dateFrom, dateTo])

  // Helper: Get quick date range
  const setQuickRange = (days: number) => {
    const end = new Date()
    const start = new Date()
    start.setDate(end.getDate() - days + 1)
    
    setDateFrom(start.toISOString().split('T')[0])
    setDateTo(end.toISOString().split('T')[0])
    setSelectedMonth("none")
  }

  // Helper: Set Month range
  const setMonthRange = (monthValue: string) => {
    if (monthValue === "none") return
    
    const [year, month] = monthValue.split('-').map(Number)
    const start = new Date(year, month - 1, 1, 12)
    const end = new Date(year, month, 0, 12) // Last day of month
    
    setDateFrom(start.toISOString().split('T')[0])
    setDateTo(end.toISOString().split('T')[0])
    setSelectedMonth(monthValue)
  }

  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])

  const handleSearch = async (overrideFrom?: string, overrideTo?: string) => {
    setLoading(true)
    try {
      const formatDateForApi = (dateStr: string) => {
        const [y, m, d] = dateStr.split('-')
        return `${d}-${m}-${y}`
      }

      const apiHost = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";
      
      const targetFrom = overrideFrom || dateFrom;
      const targetTo = overrideTo || dateTo;

      const url = new URL(`${apiHost}/reports/branches`)
      url.searchParams.set("dateFrom", formatDateForApi(targetFrom))
      url.searchParams.set("dateTo", formatDateForApi(targetTo))

      const res = await fetch(url.toString())
      if (res.ok) {
        const result = await res.json()
        const enhancedResult = result.map((item: any) => ({
          ...item,
          queryDateFrom: formatDateForApi(targetFrom),
          queryDateTo: formatDateForApi(targetTo)
        }))
        setData(enhancedResult)
        toast.success("Đã cập nhật dữ liệu báo cáo")
      } else {
        toast.error("Lỗi khi tải dữ liệu từ máy chủ")
      }
    } catch (error) {
      console.error("Search failed", error)
      toast.error("Không thể kết nối với API")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    handleSearch()
  }, [])

  return (
    <div className="flex flex-col gap-4 p-4 lg:p-6 max-w-[1600px] mx-auto animate-in fade-in duration-500">
      {/* Page Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-100 pb-4">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-1.5 text-zinc-400 font-bold uppercase tracking-wider text-[10px]">
            <TrendingUp className="w-3 h-3 text-zinc-900" />
            Báo cáo quản trị
          </div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-900">Tổng hợp chi nhánh <span className="text-zinc-400 font-medium whitespace-nowrap">Hệ thống VTTech</span></h1>
        </div>
        
        <div className="flex items-center gap-2">
        </div>
      </header>

      {/* Summary Cards - Compact Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 mb-1">
        {[
          { label: "Khách hàng", value: data.reduce((acc, curr) => acc + curr.customerCount, 0), icon: UsersIcon, color: "text-emerald-600", bg: "bg-emerald-50/50" },
          { label: "Dịch vụ", value: data.reduce((acc, curr) => acc + curr.serviceCount, 0), icon: ScissorsIcon, color: "text-blue-600", bg: "bg-blue-50/50" },
          { label: "Điều trị", value: data.reduce((acc, curr) => acc + curr.treatmentCount, 0), icon: ActivityIcon, color: "text-amber-600", bg: "bg-amber-50/50" },
          { label: "Lịch hẹn", value: data.reduce((acc, curr) => acc + curr.appointmentCount, 0), icon: CalendarCheckIcon, color: "text-purple-600", bg: "bg-purple-50/50" },
          { label: "Doanh số", value: data.reduce((acc, curr) => acc + curr.totalSales, 0), icon: DollarSignIcon, color: "text-slate-600", bg: "bg-slate-50/50", type: "currency" },
          { label: "Doanh thu", value: data.reduce((acc, curr) => acc + curr.totalRevenue, 0), icon: WalletIcon, color: "text-white", bg: "bg-indigo-600 shadow-indigo-200", type: "currency" },
        ].map((stat, i) => (
          <div key={i} className={cn("border border-zinc-100 rounded-xl overflow-hidden p-2.5 flex flex-col gap-0.5 group hover:shadow-sm transition-all", stat.bg)}>
            <div className="flex items-center justify-between opacity-70">
              <span className={cn("text-[9px] font-bold uppercase tracking-wider", stat.color, stat.type === "currency" ? "opacity-100" : "text-zinc-500")}>{stat.label}</span>
              <stat.icon className={cn("w-3 h-3 transition-transform group-hover:scale-110", stat.color)} />
            </div>
            <div className={cn("text-[13px] font-black tabular-nums tracking-tight", stat.color)}>
              {stat.type === "currency" 
                ? new Intl.NumberFormat('vi-VN').format(stat.value) + 'đ'
                : stat.value.toLocaleString()}
            </div>
          </div>
        ))}
      </div>

      {/* Filter Section - Advanced Style */}
      <Card className="border border-zinc-100 bg-white shadow-sm rounded-xl overflow-hidden">
        <CardContent className="p-4 flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2 pb-2 border-b border-zinc-50">
             <span className="text-[10px] font-bold uppercase text-zinc-400 mr-2">Chọn nhanh:</span>
             <Badge 
              variant="outline" 
              className={cn("cursor-pointer h-7 px-3 rounded-md border-zinc-200 text-xs font-bold hover:bg-zinc-100", (dateFrom === new Date().toISOString().split('T')[0]) && "bg-zinc-900 text-white hover:bg-black border-zinc-900")}
              onClick={() => setQuickRange(1)}
             >Hôm nay</Badge>
             <Badge 
              variant="outline" 
              className="cursor-pointer h-7 px-3 rounded-md border-zinc-200 text-xs font-bold hover:bg-zinc-100"
              onClick={() => {
                const y = new Date()
                y.setDate(y.getDate() - 1)
                const yStr = y.toISOString().split('T')[0]
                setDateFrom(yStr)
                setDateTo(yStr)
                setSelectedMonth("none")
              }}
             >Hôm qua</Badge>
             <Badge 
              variant="outline" 
              className="cursor-pointer h-7 px-3 rounded-md border-zinc-200 text-xs font-bold hover:bg-zinc-100"
              onClick={() => setQuickRange(7)}
             >7 Ngày qua</Badge>
             <Badge 
              variant="outline" 
              className="cursor-pointer h-7 px-3 rounded-md border-zinc-200 text-xs font-bold hover:bg-zinc-100"
              onClick={() => setQuickRange(30)}
             >30 Ngày qua</Badge>
             <div className="w-px h-4 bg-zinc-200 mx-1"></div>
             <Badge 
              variant="outline" 
              className="cursor-pointer h-7 px-3 rounded-md border-zinc-200 text-xs font-bold hover:bg-zinc-100"
              onClick={() => {
                const parts = dateFrom.split('-');
                if (parts.length === 3) {
                  const currentFrom = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
                  currentFrom.setDate(currentFrom.getDate() - 1);
                  const prev = `${currentFrom.getFullYear()}-${String(currentFrom.getMonth() + 1).padStart(2, '0')}-${String(currentFrom.getDate()).padStart(2, '0')}`;
                  setDateFrom(prev);
                  setDateTo(prev);
                  setSelectedMonth("none");
                  handleSearch(prev, prev);
                }
              }}
             >Trước</Badge>
             <Badge 
              variant="outline" 
              className="cursor-pointer h-7 px-3 rounded-md border-zinc-200 text-xs font-bold hover:bg-zinc-100"
              onClick={() => {
                const parts = dateFrom.split('-');
                if (parts.length === 3) {
                  const currentFrom = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
                  currentFrom.setDate(currentFrom.getDate() + 1);
                  const next = `${currentFrom.getFullYear()}-${String(currentFrom.getMonth() + 1).padStart(2, '0')}-${String(currentFrom.getDate()).padStart(2, '0')}`;
                  setDateFrom(next);
                  setDateTo(next);
                  setSelectedMonth("none");
                  handleSearch(next, next);
                }
              }}
             >Tiếp</Badge>
             
             <div className="ml-auto flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase text-zinc-400">Chọn chi nhánh:</span>
                <Select value={selectedBranchId} onValueChange={setSelectedBranchId}>
                  <SelectTrigger className="h-8 w-[200px] text-[11px] font-bold border-zinc-200 rounded-lg">
                    <SelectValue placeholder="Tất cả chi nhánh" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-[11px] font-bold">💎 Tất cả chi nhánh</SelectItem>
                    {data.sort((a,b) => a.id - b.id).map(b => (
                      <SelectItem key={b.id} value={String(b.id)} className="text-[11px] font-bold">{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
             </div>
          </div>

          <div className="flex flex-col lg:flex-row lg:items-end gap-4">
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 flex-1">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase text-zinc-400 ml-1">Chọn Tháng</Label>
                <Select value={selectedMonth} onValueChange={setMonthRange}>
                  <SelectTrigger className="rounded-lg border-zinc-200 h-9 text-xs font-bold bg-zinc-50/30">
                    <SelectValue placeholder="Chọn tháng..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">-- Chọn tháng --</SelectItem>
                    {Array.from({ length: 12 }, (_, i) => {
                       const d = new Date()
                       d.setMonth(d.getMonth() - i)
                       const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
                       const label = `Tháng ${d.getMonth() + 1} / ${d.getFullYear()}`
                       return <SelectItem key={val} value={val}>{label}</SelectItem>
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase text-zinc-400 ml-1">Từ ngày</Label>
                <div className="relative">
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => { setDateFrom(e.target.value); setSelectedMonth("none"); }}
                    className="rounded-lg border-zinc-200 h-9 text-xs font-bold bg-zinc-50/30 focus-visible:ring-zinc-900"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase text-zinc-400 ml-1">Đến ngày</Label>
                <div className="relative">
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={(e) => { setDateTo(e.target.value); setSelectedMonth("none"); }}
                    className="rounded-lg border-zinc-200 h-9 text-xs font-bold bg-zinc-50/30 focus-visible:ring-zinc-900"
                  />
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button 
                onClick={() => handleSearch()}
                disabled={loading}
                className="bg-zinc-900 hover:bg-black text-white rounded-lg h-9 px-6 font-bold transition-all text-xs active:scale-95 flex-1 md:flex-none"
              >
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" /> : <Filter className="w-3.5 h-3.5 mr-2" />}
                Lọc dữ liệu
              </Button>
              <CrawlLogActions hideSyncButtons={true} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Table Section */}
      <div className="space-y-2 translate-y-0 opacity-100 transition-all duration-700">
        <div className="flex items-center justify-between px-1">
           <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400 flex items-center gap-2">
             <LayoutGrid className="w-3 h-3 text-zinc-400" />
             Chi tiết hiệu suất chi nhánh
           </h3>
           <div className="text-[10px] font-medium text-zinc-500 tabular-nums">
             Cập nhật: {mounted ? new Date().toLocaleTimeString('vi-VN') : "--:--"}
           </div>
        </div>

        {loading ? (
             <div className="flex flex-col items-center justify-center py-32 gap-4 border border-zinc-100 rounded-2xl bg-white/50 border-dashed animate-pulse">
               <div className="relative">
                  <Loader2 className="w-12 h-12 text-zinc-200 transition-all" />
                  <TrendingUp className="w-5 h-5 text-zinc-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
               </div>
               <p className="text-[11px] text-zinc-400 font-bold uppercase tracking-[0.4em]">Đang xử lý dữ liệu báo cáo...</p>
             </div>
          ) : (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-700">
              <AdvancedTable 
                columns={columns} 
                data={selectedBranchId === "all" ? data : data.filter(b => String(b.id) === selectedBranchId)} 
                onRefresh={handleSearch}
                height="calc(100vh - 430px)"
              />
            </div>
          )}
      </div>
    </div>
  )
}

export default function BranchReportPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-900" />
      </div>
    }>
      <BranchReportContent />
    </Suspense>
  )
}
