"use client"

import { Suspense, useState, useEffect } from "react"
import { DataTable } from "@/components/ui/data-table"
import { columns, RevenueColumn } from "./columns"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { TrendingUp, MapPin, Calendar as CalendarIcon, Loader2, Download, Search } from "lucide-react"
import { useSearchParams } from "next/navigation"

function RevenueReportContent() {
  const searchParams = useSearchParams()
  const q = searchParams.get("q") ?? ""
  const page = searchParams.get("page") ?? "1"
  
  // Parse drill-down params
  const paramBranchId = searchParams.get("branchId")
  const paramDateFrom = searchParams.get("dateFrom")
  const paramDateTo = searchParams.get("dateTo")

  // Helper to convert DD-MM-YYYY to YYYY-MM-DD for input type="date"
  const parseInitDate = (dStr: string | null) => {
    if (!dStr) return new Date().toISOString().split('T')[0]
    const parts = dStr.split('-')
    if (parts.length === 3) {
      // If it's already DD-MM-YYYY, convert to YYYY-MM-DD
      if (parts[0].length === 2) return `${parts[2]}-${parts[1]}-${parts[0]}`
      // If it's YYYY-MM-DD, return as is
      return dStr
    }
    return new Date().toISOString().split('T')[0]
  }

  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<RevenueColumn[]>([])
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
        const res = await fetch("http://localhost:5001/branches")
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
      // Format dates to DD-MM-YYYY
      const formatDate = (dateStr: string) => {
        const [y, m, d] = dateStr.split('-')
        return `${d}-${m}-${y}`
      }

      const url = new URL("http://localhost:5001/reports/revenue")
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
        
        const formatted: RevenueColumn[] = table.map((item: any, index: number) => ({
          id: String(item.id || index),
          customer_name: item.CustomerName || "N/A",
          customer_code: item.CustomerCode || "",
          phone: item.Phone || "",
          service_name: item.ServiceName || "N/A",
          category_name: item.CategoryName || "",
          amount: parseFloat(item.Amount || 0),
          paid: parseFloat(item.Paid || 0),
          is_new: item.IsNew === 1,
          created_at: item.Created || item.created_at || new Date().toISOString(),
          branch_name: item.BranchName || "Chi nhánh gốc",
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

  // Effect to re-fetch when q or page or date/branch change
  useEffect(() => {
    handleSearch()
  }, [q, page])

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-3">
            <TrendingUp className="w-6 h-6 text-emerald-500" />
            Báo cáo Doanh thu
          </h2>
          <p className="text-sm text-muted-foreground">
            Báo cáo chi tiết doanh thu từ database đồng bộ (Hỗ trợ tìm kiếm & phân trang).
          </p>
        </div>
        <Button variant="outline" className="rounded-xl gap-2 glass border-none">
          <Download className="w-4 h-4" />
          Xuất Excel
        </Button>
      </div>

      <Card className="glass border-none shadow-xl rounded-2xl overflow-hidden">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Chi nhánh</Label>
              <Select value={branchID} onValueChange={setBranchID}>
                <SelectTrigger className="rounded-xl border-none bg-slate-100 h-11 focus:ring-1 focus:ring-emerald-500 text-black">
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
              <div className="relative">
                <CalendarIcon className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="pl-9 rounded-xl border-none bg-slate-100 h-11 focus:ring-1 focus:ring-emerald-500 text-black"
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
                  className="pl-9 rounded-xl border-none bg-slate-100 h-11 focus:ring-1 focus:ring-emerald-500 text-black"
                />
              </div>
            </div>

            <Button 
              className="h-11 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-500/20 gap-2"
              onClick={handleSearch}
              disabled={loading}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              Xem báo cáo
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="glass border-none shadow-xl rounded-2xl overflow-hidden">
        <CardHeader className="p-6 pb-2">
          <CardTitle className="text-lg">Chi tiết doanh thu</CardTitle>
          <CardDescription className="text-xs">Dữ liệu được truy vấn trực tiếp từ database đã đồng bộ.</CardDescription>
        </CardHeader>
        <CardContent className="p-6 pt-2">
          <DataTable 
            columns={columns} 
            data={data} 
            searchKey="customer_name"
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

export default function RevenueReportPage() {
  return (
    <Suspense fallback={<div className="p-6">Loading report...</div>}>
      <RevenueReportContent />
    </Suspense>
  )
}
