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

  // Sync state to localStorage on change
  useEffect(() => {
    localStorage.setItem('report_date_from', dateFrom)
    localStorage.setItem('report_date_to', dateTo)
  }, [dateFrom, dateTo])

  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])

  const handleSearch = async () => {
    setLoading(true)
    try {
      const formatDateForApi = (dateStr: string) => {
        const [y, m, d] = dateStr.split('-')
        return `${d}-${m}-${y}`
      }

      const apiHost = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";
      
      const url = new URL(`${apiHost}/reports/branches`)
      url.searchParams.set("dateFrom", formatDateForApi(dateFrom))
      url.searchParams.set("dateTo", formatDateForApi(dateTo))

      const res = await fetch(url.toString())
      if (res.ok) {
        const result = await res.json()
        const enhancedResult = result.map((item: any) => ({
          ...item,
          queryDateFrom: formatDateForApi(dateFrom),
          queryDateTo: formatDateForApi(dateTo)
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
          <div className="flex items-center bg-zinc-100/50 p-1 rounded-lg border border-zinc-100">
             <div className="flex items-center gap-1.5 px-3">
                <CalendarIcon className="w-3.5 h-3.5 text-zinc-400" />
                <span className="text-xs font-bold text-zinc-600 tabular-nums">{dateFrom}</span>
                <span className="text-zinc-300 mx-1">→</span>
                <span className="text-xs font-bold text-zinc-600 tabular-nums">{dateTo}</span>
             </div>
          </div>
          <Button variant="outline" size="sm" className="h-8 rounded-lg border-zinc-200 text-xs font-bold hover:bg-zinc-50">
            <Download className="w-3.5 h-3.5 mr-1.5" /> Xuất dữ liệu
          </Button>
        </div>
      </header>

      {/* Filter Section - Zinc Style */}
      <Card className="border border-zinc-100 bg-white shadow-sm rounded-xl overflow-hidden">
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row lg:items-end gap-4">
            <div className="grid grid-cols-2 gap-4 flex-1">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase text-zinc-400 ml-1">Từ ngày</Label>
                <div className="relative">
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
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
                    onChange={(e) => setDateTo(e.target.value)}
                    className="rounded-lg border-zinc-200 h-9 text-xs font-bold bg-zinc-50/30 focus-visible:ring-zinc-900"
                  />
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button 
                onClick={handleSearch}
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
                data={data} 
                onRefresh={handleSearch}
                height="calc(100vh - 350px)"
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
