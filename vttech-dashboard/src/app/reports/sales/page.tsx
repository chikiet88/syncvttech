"use client"

import { Suspense, useState, useEffect } from "react"
import { DataTable } from "@/components/ui/data-table"
import { columns, SalesColumn } from "./columns"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { TrendingUp, MapPin, Calendar as CalendarIcon, Loader2, Download, Search, DollarSign, ArrowLeft } from "lucide-react"
import { useSearchParams, useRouter } from "next/navigation"

function SalesReportContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const q = searchParams.get("q") ?? ""
  const page = searchParams.get("page") ?? "1"
  
  // Parse drill-down params
  const paramBranchId = searchParams.get("branchId")
  const paramDateFrom = searchParams.get("from")
  const paramDateTo = searchParams.get("to")

  // Helper to convert DD-MM-YYYY to YYYY-MM-DD for input type="date"
  const parseInitDate = (dStr: string | null) => {
    if (!dStr) return new Date().toISOString().split('T')[0]
    const parts = dStr.split('-')
    if (parts.length === 3) {
      if (parts[0].length === 2) return `${parts[2]}-${parts[1]}-${parts[0]}`
      return dStr
    }
    return new Date().toISOString().split('T')[0]
  }

  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<SalesColumn[]>([])
  const [branches, setBranches] = useState<{id: number, name: string}[]>([])
  const [dateFrom, setDateFrom] = useState(parseInitDate(paramDateFrom))
  const [dateTo, setDateTo] = useState(parseInitDate(paramDateTo))
  const [branchID, setBranchID] = useState(paramBranchId || "0")
  
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
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001"}/reports/branches?dateFrom=${dateFrom}&dateTo=${dateTo}`)
        if (res.ok) {
          const data = await res.json()
          setBranches(data)
        }
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

      const url = new URL(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001"}/reports/revenue`)
      url.searchParams.set("branchID", branchID)
      url.searchParams.set("dateFrom", formatDate(dateFrom))
      url.searchParams.set("dateTo", formatDate(dateTo))
      if (q) url.searchParams.set("q", q)
      url.searchParams.set("page", page)
      url.searchParams.set("limit", "20")

      const res = await fetch(url.toString())
      if (res.ok) {
        const result = await res.json()
        const table = result.Table || []
        
        const formatted: SalesColumn[] = table.map((item: any, index: number) => ({
          id: String(item.id || index),
          customer_name: item.CustomerName || "N/A",
          customer_code: item.CustomerCode || "",
          phone: item.Phone || "",
          service_name: item.ServiceName || "N/A",
          category_name: item.CategoryName || "",
          amount: parseFloat(String(item.amount || item.Amount || 0).replace(/,/g, '')) || 0,
          paid: parseFloat(String(item.paid || item.Paid || 0).replace(/,/g, '')) || 0,
          is_new: item.is_new === 1 || item.IsNew === 1,
          created_at: item.Created || item.created_at || new Date().toISOString(),
          branch_name: item.BranchName || item.branch_name || "Chi nhánh gốc",
        }))
        setData(formatted)
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

  useEffect(() => {
    handleSearch()
  }, [q, page])

  return (
    <div className="p-6 space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => router.back()} className="rounded-xl glass border-slate-200">
            <ArrowLeft className="w-4 h-4 text-slate-600" />
          </Button>
          <div className="space-y-1">
            <h2 className="text-2xl font-bold tracking-tight flex items-center gap-3 text-slate-800">
              <DollarSign className="w-7 h-7 text-orange-500 fill-orange-50" />
              Báo cáo Doanh số (Sales)
            </h2>
            <p className="text-sm text-muted-foreground font-medium">
              Báo cáo chi tiết doanh số từ database đồng bộ (Hỗ trợ tìm kiếm & phân trang).
            </p>
          </div>
        </div>
        <Button variant="outline" className="rounded-xl gap-2 glass border-none shadow-sm hover:shadow-md transition-all">
          <Download className="w-4 h-4 text-emerald-600" />
          Xuất Excel
        </Button>
      </div>

      <Card className="glass border-none shadow-xl shadow-slate-200/50 rounded-2xl overflow-hidden ring-1 ring-white/20">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div className="space-y-2 text-black">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Chi nhánh</Label>
              <Select value={branchID} onValueChange={setBranchID}>
                <SelectTrigger className="rounded-xl border-none bg-slate-100/50 h-11 focus:ring-1 focus:ring-orange-500 text-black">
                  <SelectValue placeholder="Chọn chi nhánh" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-white/5 glass">
                  <SelectItem value="0">Tất cả chi nhánh</SelectItem>
                  {branches.map(branch => (
                    <SelectItem key={branch.id} value={branch.id.toString()}>
                      {branch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Từ ngày</Label>
              <div className="relative text-black">
                <CalendarIcon className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="pl-9 rounded-xl border-none bg-slate-100/50 h-11 focus:ring-1 focus:ring-orange-500 text-black font-medium"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Đến ngày</Label>
              <div className="relative text-black">
                <CalendarIcon className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="pl-9 rounded-xl border-none bg-slate-100/50 h-11 focus:ring-1 focus:ring-orange-500 text-black font-medium"
                />
              </div>
            </div>

            <Button 
              className="h-11 rounded-xl font-bold bg-orange-600 hover:bg-orange-700 shadow-lg shadow-orange-500/20 gap-2 transition-all active:scale-95"
              onClick={handleSearch}
              disabled={loading}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <Search className="w-4 h-4 text-white" />}
              Xem báo cáo
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="glass border-none shadow-xl shadow-slate-200/50 rounded-2xl overflow-hidden ring-1 ring-white/20">
        <CardHeader className="p-6 pb-2">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-lg font-bold text-slate-800">Dữ liệu Doanh số</CardTitle>
              <CardDescription className="text-xs font-medium">Báo cáo tập trung vào giá trị tổng đơn hàng (Amount).</CardDescription>
            </div>
            <div className="flex gap-2">
              <Badge variant="outline" className="bg-orange-500/10 text-orange-600 border-none px-3 py-1 font-bold">
                TỔNG: {pagination.total} bản ghi
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6 pt-2">
          {loading ? (
            <div className="min-h-[400px] flex flex-col items-center justify-center gap-4">
              <div className="w-12 h-12 rounded-full border-4 border-orange-500 border-t-transparent animate-spin ring-8 ring-orange-500/10" />
              <p className="text-sm font-bold text-slate-500 animate-pulse">Đang tải dữ liệu doanh số...</p>
            </div>
          ) : (
            <DataTable 
              columns={columns} 
              data={data} 
              searchKey="customer_name"
              pageCount={pagination.totalPages}
              currentPage={pagination.page}
              totalCount={pagination.total}
              pageSize={pagination.limit}
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default function SalesReportPage() {
  return (
    <Suspense fallback={
        <div className="p-6 flex flex-col items-center justify-center min-h-screen gap-4">
            <div className="w-10 h-10 rounded-full border-2 border-slate-300 border-t-slate-800 animate-spin" />
            <p className="text-xs font-black uppercase tracking-tighter text-slate-400">Khởi tạo báo cáo...</p>
        </div>
    }>
      <SalesReportContent />
    </Suspense>
  )
}
