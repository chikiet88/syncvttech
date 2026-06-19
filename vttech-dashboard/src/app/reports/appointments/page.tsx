"use client"

import { Suspense, useState, useEffect } from "react"
import { DataTable } from "@/components/ui/data-table"
import { columns, AppointmentColumn } from "./columns"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CalendarCheck, Download, Calendar as CalendarIcon, Loader2, Search, ArrowLeft, Cloud } from "lucide-react"
import { useSearchParams, useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"

function AppointmentsReportContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  
  const page = searchParams.get("page") ?? "1"
  const q = searchParams.get("q") ?? ""
  const paramBranchId = searchParams.get("branchId")
  const paramDateFrom = searchParams.get("from")
  const paramDateTo = searchParams.get("to")

  const parseInitDate = (dStr: string | null, isFrom = false) => {
    if (!dStr) return isFrom ? '2026-01-01' : new Date().toISOString().split('T')[0]
    const parts = dStr.split('-')
    if (parts.length === 3) {
      if (parts[0].length === 2) return `${parts[2]}-${parts[1]}-${parts[0]}`
      return dStr
    }
    return new Date().toISOString().split('T')[0]
  }

  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<AppointmentColumn[]>([])
  const [branches, setBranches] = useState<{id: number, name: string}[]>([])
  const [dateFrom, setDateFrom] = useState(parseInitDate(paramDateFrom, true))
  const [dateTo, setDateTo] = useState(parseInitDate(paramDateTo, false))
  const [branchID, setBranchID] = useState(paramBranchId || "0")
  const [pushing, setPushing] = useState(false)

  const handlePushGoogleSheet = async () => {
    setPushing(true)
    const toastId = toast.loading("Đang đẩy dữ liệu lên Google Sheets...")
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001"
      const res = await fetch(`${apiUrl}/reports/appointments/push-google-sheet?from=${dateFrom}&to=${dateTo}`, {
        method: 'POST'
      })
      if (res.ok) {
        const result = await res.json()
        toast.success(
          `Đẩy dữ liệu thành công! Taza: ${result.tazaCount} dòng, Timona: ${result.timonaCount} dòng.`,
          {
            id: toastId,
            description: "Dữ liệu đã được cập nhật trực tiếp trên Google Sheet.",
            action: {
              label: "Mở Sheet",
              onClick: () => window.open(result.url, "_blank")
            }
          }
        )
      } else {
        const errData = await res.json().catch(() => ({}))
        toast.error(`Đẩy dữ liệu thất bại: ${errData.message || res.statusText}`, { id: toastId })
      }
    } catch (e: any) {
      console.error("Failed to push to Google Sheet", e)
      toast.error(`Lỗi kết nối: ${e.message}`, { id: toastId })
    } finally {
      setPushing(false)
    }
  }
  
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 0
  })

  // Fetch branches on mount
  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001"}/branches`)
        if (res.ok) setBranches(await res.json())
      } catch (e) {
        console.error("Failed to fetch branches", e)
      }
    }
    fetchBranches()
  }, [])

  const handleSearch = async () => {
    setLoading(true)
    try {
      const formatDate = (dateStr: string) => {
        const [y, m, d] = dateStr.split('-')
        return `${d}-${m}-${y}`
      }

      const url = new URL(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001"}/reports/appointments/details`)
      url.searchParams.set("branchId", branchID)
      url.searchParams.set("from", formatDate(dateFrom))
      url.searchParams.set("to", formatDate(dateTo))
      url.searchParams.set("page", page)
      url.searchParams.set("limit", "20")
      if (q) {
        url.searchParams.set("q", q)
      }

      const res = await fetch(url.toString())
      if (res.ok) {
        const result = await res.json()
        setData(result.data || [])
        if (result.pagination) {
          setPagination(result.pagination)
        }
      }
    } catch (error) {
      console.error("Search failed", error)
    } finally {
      setLoading(false)
    }
  }

  const handleExport = () => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001"
    window.open(`${apiUrl}/reports/appointments/export?from=${dateFrom}&to=${dateTo}&branchId=${branchID}`, '_blank')
  }

  useEffect(() => {
    handleSearch()
  }, [page, branchID, q]) // auto search when page, branchID or q changes

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => router.back()} className="rounded-xl glass border-slate-200 shadow-sm">
            <ArrowLeft className="w-4 h-4 text-purple-600" />
          </Button>
          <div className="space-y-1">
            <h2 className="text-2xl font-bold tracking-tight flex items-center gap-3">
              <CalendarCheck className="w-6 h-6 text-purple-500" />
              Mẫu Lịch hẹn Taza
            </h2>
            <p className="text-sm text-muted-foreground">
              Tra cứu và kết xuất danh sách lịch hẹn chi tiết theo form mẫu báo cáo Taza.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            className="rounded-xl gap-2 glass border-none shadow-sm hover:bg-emerald-50 hover:text-emerald-700 transition-all active:scale-95"
            onClick={handlePushGoogleSheet}
            disabled={pushing}
          >
            {pushing ? (
              <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
            ) : (
              <Cloud className="w-4 h-4 text-emerald-500" />
            )}
            {pushing ? "Đang đẩy..." : "Đẩy Google Sheet"}
          </Button>

          <Button 
            variant="outline" 
            className="rounded-xl gap-2 glass border-none shadow-sm hover:bg-purple-50 transition-all active:scale-95"
            onClick={handleExport}
          >
            <Download className="w-4 h-4 text-purple-500" />
            Xuất Excel
          </Button>
        </div>
      </div>

      <Card className="glass border-none shadow-xl rounded-2xl overflow-hidden relative">
        <div className="absolute top-0 w-full h-1 bg-gradient-to-r from-purple-400 to-purple-600" />
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Chi nhánh</Label>
                <div className="flex gap-1.5 mr-1">
                  <Badge 
                    variant="outline" 
                    className={`text-[8.5px] px-1.5 py-0 cursor-pointer rounded-full transition-all border ${
                      branchID === 'taza' 
                        ? 'bg-purple-500 text-white border-purple-500 font-bold shadow-sm' 
                        : 'text-purple-600 border-purple-200 hover:bg-purple-50 hover:border-purple-300'
                    }`}
                    onClick={() => setBranchID('taza')}
                  >
                    Tất cả Taza
                  </Badge>
                  <Badge 
                    variant="outline" 
                    className={`text-[8.5px] px-1.5 py-0 cursor-pointer rounded-full transition-all border ${
                      branchID === 'timona' 
                        ? 'bg-indigo-500 text-white border-indigo-500 font-bold shadow-sm' 
                        : 'text-indigo-600 border-indigo-200 hover:bg-indigo-50 hover:border-indigo-300'
                    }`}
                    onClick={() => setBranchID('timona')}
                  >
                    Tất cả Timona
                  </Badge>
                </div>
              </div>
              <Select value={branchID} onValueChange={setBranchID}>
                <SelectTrigger className="rounded-xl border-none bg-slate-100 h-11 focus:ring-1 focus:ring-purple-500 text-black shadow-inner shadow-slate-200">
                  <SelectValue placeholder="Chọn chi nhánh" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-white/5 glass">
                  <SelectItem value="0">Tất cả chi nhánh Taza & Timona</SelectItem>
                  <SelectItem value="taza">Tất cả chi nhánh Taza</SelectItem>
                  <SelectItem value="timona">Tất cả chi nhánh Timona</SelectItem>
                  {branches.filter(b => b.name.toLowerCase().includes('taza') || b.name.toLowerCase().includes('timona')).map(branch => (
                    <SelectItem key={branch.id} value={branch.id.toString()}>
                      {branch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Từ ngày</Label>
              <div className="relative">
                <CalendarIcon className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="pl-9 rounded-xl border-none bg-slate-100 h-11 focus:ring-1 focus:ring-purple-500 text-black shadow-inner shadow-slate-200"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Đến ngày</Label>
              <div className="relative">
                <CalendarIcon className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="pl-9 rounded-xl border-none bg-slate-100 h-11 focus:ring-1 focus:ring-purple-500 text-black shadow-inner shadow-slate-200"
                />
              </div>
            </div>

            <Button 
              className="h-11 rounded-xl font-bold bg-purple-500 hover:bg-purple-600 text-white shadow-lg shadow-purple-500/20 gap-2 transition-all active:scale-95"
              onClick={handleSearch}
              disabled={loading}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              Tìm kiếm
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="glass border-none shadow-xl rounded-2xl overflow-hidden mt-6">
        <CardHeader className="p-6 pb-2 border-b border-slate-50">
          <CardTitle className="text-lg">Dữ liệu Lịch hẹn (Form Mẫu)</CardTitle>
          <CardDescription className="text-xs">Hiển thị danh sách lịch hẹn chi nhánh Taza tương ứng với cấu trúc file báo cáo.</CardDescription>
        </CardHeader>
        <CardContent className="p-6 pt-6">
          <DataTable 
            columns={columns} 
            data={data} 
            searchKey="mlh_kh"
            pageCount={pagination.totalPages}
            currentPage={pagination.page}
            totalCount={pagination.total}
            pageSize={pagination.limit}
          />
        </CardContent>
      </Card>
    </div>
  )
}

export default function AppointmentsReportPage() {
  return (
    <Suspense fallback={<div className="p-6 flex justify-center mt-20"><Loader2 className="w-8 h-8 animate-spin text-purple-500" /></div>}>
      <AppointmentsReportContent />
    </Suspense>
  )
}
