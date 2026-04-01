"use client"

import { Suspense, useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { DataTable } from "@/components/ui/data-table"
import { columns, BranchSummary } from "./columns"
import { 
  Calendar as CalendarIcon, 
  Loader2, 
  TrendingUp,
  LayoutGrid,
  Download
} from "lucide-react"
import { CrawlLogActions } from "@/components/CrawlLogActions"

function BranchReportContent() {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<BranchSummary[]>([])
  const [dateFrom, setDateFrom] = useState(new Date().toISOString().split('T')[0])
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0])

  const handleSearch = async () => {
    setLoading(true)
    try {
      const formatDate = (dateStr: string) => {
        const [y, m, d] = dateStr.split('-')
        return `${d}-${m}-${y}`
      }

      const url = new URL(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001"}/reports/branches`)
      url.searchParams.set("dateFrom", formatDate(dateFrom))
      url.searchParams.set("dateTo", formatDate(dateTo))

      const res = await fetch(url.toString())
      if (res.ok) {
        const result = await res.json()
        const enhancedResult = result.map((item: any) => ({
          ...item,
          queryDateFrom: formatDate(dateFrom),
          queryDateTo: formatDate(dateTo)
        }))
        setData(enhancedResult)
      }
    } catch (error) {
      console.error("Search failed", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    handleSearch()
  }, [])

  return (
    <div className="p-3 space-y-3 animate-in fade-in duration-500">
      <Card className="border-none shadow-sm rounded-xl overflow-hidden bg-white/80 backdrop-blur-md border border-slate-200/50">
        <CardContent className="p-3 space-y-3">
          <div className="flex flex-wrap items-center gap-4 justify-between">
            {/* Header Area */}
            <div className="flex items-center gap-3">
              <div className="p-1.5 bg-indigo-600 rounded-lg text-white shadow-md shadow-indigo-100">
                <LayoutGrid className="w-4 h-4 font-bold" />
              </div>
              <div className="whitespace-nowrap">
                <h2 className="text-[13px] font-black tracking-tighter text-slate-900 uppercase">
                  Báo cáo Tổng hợp
                </h2>
                <div className="flex items-center gap-1.5 leading-none mt-0.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest">Sẵn sàng</span>
                </div>
              </div>
            </div>

            {/* Filter Area (Integrated with Header) */}
            <div className="flex flex-1 items-center gap-3 justify-center">
              <div className="flex items-center gap-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Từ</Label>
                <div className="relative group">
                  <CalendarIcon className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400 group-hover:text-indigo-500" />
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="pl-8 rounded-xl border-slate-100 bg-slate-50/80 h-8 text-[11px] w-[140px] focus:ring-2 focus:ring-indigo-500/20 transition-all font-bold text-slate-700"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Đến</Label>
                <div className="relative group">
                  <CalendarIcon className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400 group-hover:text-indigo-500" />
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="pl-8 rounded-xl border-slate-100 bg-slate-50/80 h-8 text-[11px] w-[140px] focus:ring-2 focus:ring-indigo-500/20 transition-all font-bold text-slate-700"
                  />
                </div>
              </div>

              <Button 
                className="h-8 px-4 rounded-xl font-black bg-indigo-600 hover:bg-indigo-700 text-white shadow-xl shadow-indigo-100 gap-2 text-[10px] uppercase tracking-[0.1em] transition-all active:scale-95 whitespace-nowrap"
                onClick={handleSearch}
                disabled={loading}
              >
                {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <TrendingUp className="w-3 h-3" />}
                Phân tích
              </Button>
            </div>

            {/* Global Actions */}
            <div className="flex items-center gap-3">
              <CrawlLogActions />
              <div className="w-px h-6 bg-slate-200/50 mx-1 hidden xl:block" />
              <Button variant="outline" size="sm" className="gap-2 h-8 px-4 glass border-slate-100 rounded-xl text-[9px] uppercase font-black hover:bg-white hover:border-indigo-500 hover:text-indigo-600 transition-all shadow-sm">
                <Download className="w-3 h-3" />
                Xuất Excel
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-slate-200/50 shadow-sm rounded-xl overflow-hidden bg-white">
        <CardHeader className="px-4 py-3 border-b border-slate-50 flex flex-row items-center justify-between">
          <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-500">Chi tiết dữ liệu theo chi nhánh</CardTitle>
          <div className="text-[10px] font-bold text-slate-400 italic">Cập nhật lúc: {new Date().toLocaleTimeString('vi-VN')}</div>
        </CardHeader>
        <CardContent className="p-4 pt-4">
          {loading ? (
             <div className="flex flex-col items-center justify-center py-20 gap-3">
               <Loader2 className="w-10 h-10 animate-spin text-indigo-600/30 font-thin" />
               <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.3em] animate-pulse">Đang tổng kết dữ liệu...</p>
             </div>
          ) : (
            <DataTable 
              columns={columns} 
              data={data} 
              searchKey="name" 
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default function BranchReportPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    }>
      <BranchReportContent />
    </Suspense>
  )
}
