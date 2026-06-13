'use client'

import React, { Suspense, useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AdvancedTable } from "@/components/ui/advanced-table/AdvancedTable"
import { columns as branchColumns, BranchSummary } from "./columns"
import { columns as customerColumns } from "./customers/columns"
import { columns as serviceColumns } from "./services/columns"
import { columns as treatmentColumns } from "./treatments/columns"
import { columns as appointmentColumns } from "./appointments/columns"
import { columns as salesColumns } from "./sales/columns"
import { columns as revenueColumns } from "./revenue/columns"
import { columns as anamnesisColumns } from "./anamnesis/columns"
import { columns as imagesColumns } from "./images/columns"
import { columns as careHistoryColumns } from "./care-history/columns"
import { columns as complaintsColumns } from "./complaints/columns"
import { columns as treatmentPlansColumns } from "./treatment-plans/columns"
import { 
  Calendar as CalendarIcon, 
  Loader2, 
  TrendingUp,
  LayoutGrid,
  Download,
  Search,
  Filter,
  HelpCircle,
  FolderOpen,
  ClipboardList,
  MessageSquare,
  AlertTriangle,
  BookOpen
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
  const [overviewData, setOverviewData] = useState<BranchSummary[]>([])
  const [tableData, setTableData] = useState<any[]>([])
  
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
  const [activeTab, setActiveTab] = useState<"all" | "customers" | "services" | "treatments" | "appointments" | "sales" | "revenue" | "anamnesis" | "images" | "care-history" | "complaints" | "treatment-plans">("all")

  const getFilteredColumns = () => {
    if (activeTab === "all") return branchColumns;
    if (activeTab === "customers") return customerColumns;
    if (activeTab === "services") return serviceColumns;
    if (activeTab === "treatments") return treatmentColumns;
    if (activeTab === "appointments") return appointmentColumns;
    if (activeTab === "sales") return salesColumns;
    if (activeTab === "revenue") return revenueColumns;
    if (activeTab === "anamnesis") return anamnesisColumns;
    if (activeTab === "images") return imagesColumns;
    if (activeTab === "care-history") return careHistoryColumns;
    if (activeTab === "complaints") return complaintsColumns;
    if (activeTab === "treatment-plans") return treatmentPlansColumns;
    return branchColumns;
  }

  const getSortedData = () => {
    if (activeTab === "all") {
      const filtered = selectedBranchId === "all" ? overviewData : overviewData.filter(b => String(b.id) === selectedBranchId);
      return [...filtered].sort((a, b) => a.id - b.id);
    }
    return tableData;
  }

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
      const formattedFrom = formatDateForApi(targetFrom);
      const formattedTo = formatDateForApi(targetTo);
      const mappedBranchId = selectedBranchId === "all" ? "0" : selectedBranchId;

      // 1. ALWAYS fetch overview data to populate card counts
      const overviewUrl = new URL(`${apiHost}/reports/branches`)
      overviewUrl.searchParams.set("dateFrom", formattedFrom)
      overviewUrl.searchParams.set("dateTo", formattedTo)
      
      const overviewRes = await fetch(overviewUrl.toString())
      let fetchedOverview: BranchSummary[] = []
      if (overviewRes.ok) {
        const result = await overviewRes.json()
        fetchedOverview = result.map((item: any) => ({
          ...item,
          queryDateFrom: formattedFrom,
          queryDateTo: formattedTo
        }))
        setOverviewData(fetchedOverview)
      }

      // 2. Fetch active table data based on selected tab
      if (activeTab === "all") {
        setTableData(fetchedOverview)
      } else if (activeTab === "customers") {
        const url = new URL(`${apiHost}/reports/customers/details`)
        url.searchParams.set("branchId", mappedBranchId)
        url.searchParams.set("from", formattedFrom)
        url.searchParams.set("to", formattedTo)
        url.searchParams.set("page", "1")
        url.searchParams.set("limit", "1000")
        const res = await fetch(url.toString())
        if (res.ok) {
          const result = await res.json()
          setTableData(result.data || [])
        }
      } else if (activeTab === "services") {
        const url = new URL(`${apiHost}/reports/revenue`)
        url.searchParams.set("branchID", mappedBranchId)
        url.searchParams.set("dateFrom", formattedFrom)
        url.searchParams.set("dateTo", formattedTo)
        url.searchParams.set("service_only", "true")
        url.searchParams.set("page", "1")
        url.searchParams.set("limit", "1000")
        const res = await fetch(url.toString())
        if (res.ok) {
          const result = await res.json()
          const table = result.Table || []
          const formatted = table.map((item: any, index: number) => ({
            id: String(item.id || index),
            CustomerName: item.CustomerName || "N/A",
            CustomerCode: item.CustomerCode || "",
            Phone: item.Phone || "",
            ServiceName: item.ServiceName || "N/A",
            CategoryName: item.CategoryName || "",
            Amount: parseFloat(String(item.amount || item.Amount || 0).replace(/,/g, '')) || 0,
            Paid: parseFloat(String(item.paid || item.Paid || 0).replace(/,/g, '')) || 0,
            IsNew: item.is_new === 1 || item.IsNew === 1,
            Created: item.Created || item.created_at || new Date().toISOString(),
            BranchName: item.BranchName || item.branch_name || "Chi nhánh gốc",
          }))
          setTableData(formatted)
        }
      } else if (activeTab === "treatments") {
        const url = new URL(`${apiHost}/reports/treatments/details`)
        url.searchParams.set("branchId", mappedBranchId)
        url.searchParams.set("from", formattedFrom)
        url.searchParams.set("to", formattedTo)
        url.searchParams.set("page", "1")
        url.searchParams.set("limit", "1000")
        const res = await fetch(url.toString())
        if (res.ok) {
          const result = await res.json()
          setTableData(result.data || [])
        }
      } else if (activeTab === "appointments") {
        const url = new URL(`${apiHost}/reports/appointments/details`)
        url.searchParams.set("branchId", mappedBranchId)
        url.searchParams.set("from", formattedFrom)
        url.searchParams.set("to", formattedTo)
        url.searchParams.set("page", "1")
        url.searchParams.set("limit", "1000")
        const res = await fetch(url.toString())
        if (res.ok) {
          const result = await res.json()
          setTableData(result.data || [])
        }
      } else if (activeTab === "sales") {
        const url = new URL(`${apiHost}/reports/revenue`)
        url.searchParams.set("branchID", mappedBranchId)
        url.searchParams.set("dateFrom", formattedFrom)
        url.searchParams.set("dateTo", formattedTo)
        url.searchParams.set("page", "1")
        url.searchParams.set("limit", "1000")
        const res = await fetch(url.toString())
        if (res.ok) {
          const result = await res.json()
          const table = result.Table || []
          const formatted = table.map((item: any, index: number) => ({
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
          setTableData(formatted)
        }
      } else if (activeTab === "revenue") {
        const url = new URL(`${apiHost}/reports/revenue`)
        url.searchParams.set("branchID", mappedBranchId)
        url.searchParams.set("dateFrom", formattedFrom)
        url.searchParams.set("dateTo", formattedTo)
        url.searchParams.set("page", "1")
        url.searchParams.set("limit", "1000")
        const res = await fetch(url.toString())
        if (res.ok) {
          const result = await res.json()
          const table = result.Table || []
          const formatted = table.map((item: any, index: number) => ({
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
          setTableData(formatted)
        }
      } else if (activeTab === "anamnesis") {
        const url = new URL(`${apiHost}/reports/anamnesis/details`)
        url.searchParams.set("branchId", mappedBranchId)
        url.searchParams.set("from", formattedFrom)
        url.searchParams.set("to", formattedTo)
        url.searchParams.set("page", "1")
        url.searchParams.set("limit", "1000")
        const res = await fetch(url.toString())
        if (res.ok) {
          const result = await res.json()
          setTableData(result.data || [])
        }
      } else if (activeTab === "images") {
        const url = new URL(`${apiHost}/reports/images/details`)
        url.searchParams.set("branchId", mappedBranchId)
        url.searchParams.set("from", formattedFrom)
        url.searchParams.set("to", formattedTo)
        url.searchParams.set("page", "1")
        url.searchParams.set("limit", "1000")
        const res = await fetch(url.toString())
        if (res.ok) {
          const result = await res.json()
          setTableData(result.data || [])
        }
      } else if (activeTab === "care-history") {
        const url = new URL(`${apiHost}/reports/care-history/details`)
        url.searchParams.set("branchId", mappedBranchId)
        url.searchParams.set("from", formattedFrom)
        url.searchParams.set("to", formattedTo)
        url.searchParams.set("page", "1")
        url.searchParams.set("limit", "1000")
        const res = await fetch(url.toString())
        if (res.ok) {
          const result = await res.json()
          setTableData(result.data || [])
        }
      } else if (activeTab === "complaints") {
        const url = new URL(`${apiHost}/reports/complaints/details`)
        url.searchParams.set("branchId", mappedBranchId)
        url.searchParams.set("from", formattedFrom)
        url.searchParams.set("to", formattedTo)
        url.searchParams.set("page", "1")
        url.searchParams.set("limit", "1000")
        const res = await fetch(url.toString())
        if (res.ok) {
          const result = await res.json()
          setTableData(result.data || [])
        }
      } else if (activeTab === "treatment-plans") {
        const url = new URL(`${apiHost}/reports/treatment-plans/details`)
        url.searchParams.set("branchId", mappedBranchId)
        url.searchParams.set("from", formattedFrom)
        url.searchParams.set("to", formattedTo)
        url.searchParams.set("page", "1")
        url.searchParams.set("limit", "1000")
        const res = await fetch(url.toString())
        if (res.ok) {
          const result = await res.json()
          setTableData(result.data || [])
        }
      }
    } catch (error) {
      console.error("Search failed", error)
      toast.error("Không thể kết nối với API")
    } finally {
      setLoading(false)
    }
  }

  // Trigger search on tab/branch/date changes
  useEffect(() => {
    handleSearch()
  }, [activeTab])

  return (
    <div className="flex flex-col gap-2.5 p-3 lg:p-4 max-w-[1600px] mx-auto animate-in fade-in duration-500">
      {/* Page Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-zinc-100 pb-2">
        <div className="flex flex-col gap-0">
          <div className="flex items-center gap-1 text-zinc-400 font-bold uppercase tracking-wider text-[9px]">
            <TrendingUp className="w-2.5 h-2.5 text-zinc-900" />
            Báo cáo quản trị
          </div>
          <h1 className="text-lg font-extrabold tracking-tight text-zinc-900">Tổng hợp chi nhánh <span className="text-zinc-400 font-normal whitespace-nowrap">Hệ thống VTTech</span></h1>
        </div>
        
        <div className="flex items-center gap-2">
        </div>
      </header>

      {/* Summary Cards - Compact Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-1.5">
        {[
          { id: "customers", label: "Khách hàng", value: overviewData.reduce((acc, curr) => acc + curr.customerCount, 0), icon: UsersIcon, color: "text-emerald-600", bg: "bg-emerald-50/50 border-emerald-100/50", activeBg: "bg-emerald-600 border-emerald-600 text-white shadow-md shadow-emerald-500/10" },
          { id: "services", label: "Dịch vụ", value: overviewData.reduce((acc, curr) => acc + curr.serviceCount, 0), icon: ScissorsIcon, color: "text-blue-600", bg: "bg-blue-50/50 border-blue-100/50", activeBg: "bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-500/10" },
          { id: "treatments", label: "Điều trị", value: overviewData.reduce((acc, curr) => acc + curr.treatmentCount, 0), icon: ActivityIcon, color: "text-amber-600", bg: "bg-amber-50/50 border-amber-100/50", activeBg: "bg-amber-600 border-amber-600 text-white shadow-md shadow-amber-500/10" },
          { id: "appointments", label: "Lịch hẹn", value: overviewData.reduce((acc, curr) => acc + curr.appointmentCount, 0), icon: CalendarCheckIcon, color: "text-purple-600", bg: "bg-purple-50/50 border-purple-100/50", activeBg: "bg-purple-600 border-purple-600 text-white shadow-md shadow-purple-500/10" },
          { id: "sales", label: "Doanh số", value: overviewData.reduce((acc, curr) => acc + curr.totalSales, 0), icon: DollarSignIcon, color: "text-slate-600", bg: "bg-slate-50/50 border-slate-100/50", type: "currency", activeBg: "bg-slate-700 border-slate-700 text-white shadow-md shadow-slate-500/10" },
          { id: "revenue", label: "Doanh thu", value: overviewData.reduce((acc, curr) => acc + curr.totalRevenue, 0), icon: WalletIcon, color: "text-indigo-650", bg: "bg-indigo-50/50 border-indigo-100/50", type: "currency", activeBg: "bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-500/10" },
        ].map((stat, i) => {
          const isActive = activeTab === stat.id;
          return (
            <button 
              key={i} 
              type="button"
              onClick={() => setActiveTab(isActive ? "all" : stat.id as any)}
              className={cn(
                "border rounded-lg overflow-hidden px-2.5 py-1.5 flex flex-col gap-0.5 group hover:shadow-sm transition-all text-left w-full active:scale-[0.98]", 
                isActive ? stat.activeBg : stat.bg
              )}
            >
              <div className="flex items-center justify-between opacity-90">
                <span className={cn(
                  "text-[9px] font-bold uppercase tracking-wider", 
                  isActive ? "text-white/90" : "text-zinc-500"
                )}>{stat.label}</span>
                <stat.icon className={cn("w-3 h-3 transition-transform group-hover:scale-115", isActive ? "text-white" : stat.color)} />
              </div>
              <div className={cn("text-[13px] font-extrabold tabular-nums tracking-tight", isActive ? "text-white" : stat.color)}>
                {stat.type === "currency" 
                  ? new Intl.NumberFormat('vi-VN').format(stat.value) + 'đ'
                  : stat.value.toLocaleString()}
              </div>
            </button>
          );
        })}
      </div>

      {/* Filter Section - Super Compact & Premium Inline Style */}
      <div className="border border-zinc-100/80 bg-white shadow-sm rounded-xl p-2 flex flex-col gap-2 animate-in fade-in duration-300">
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* Left: Quick range select & manual date pickers */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Quick Ranges Button Group */}
            <div className="flex items-center gap-1 bg-zinc-50 p-1 rounded-lg border border-zinc-150">
              <span className="text-[9px] font-extrabold uppercase text-zinc-400 px-1.5 whitespace-nowrap">Nhanh</span>
              <button
                type="button"
                className={cn(
                  "h-6 px-2.5 rounded-md text-[11px] font-bold transition-all",
                  (dateFrom === new Date().toISOString().split('T')[0] && dateTo === new Date().toISOString().split('T')[0] && selectedMonth === "none")
                    ? "bg-zinc-950 text-white shadow-sm"
                    : "text-zinc-600 hover:bg-zinc-200/50 hover:text-zinc-900"
                )}
                onClick={() => setQuickRange(1)}
              >Hôm nay</button>
              <button
                type="button"
                className={cn(
                  "h-6 px-2.5 rounded-md text-[11px] font-bold transition-all",
                  (dateFrom === (() => { const y = new Date(); y.setDate(y.getDate() - 1); return y.toISOString().split('T')[0]; })() && dateTo === dateFrom && selectedMonth === "none")
                    ? "bg-zinc-950 text-white shadow-sm"
                    : "text-zinc-600 hover:bg-zinc-200/50 hover:text-zinc-900"
                )}
                onClick={() => {
                  const y = new Date()
                  y.setDate(y.getDate() - 1)
                  const yStr = y.toISOString().split('T')[0]
                  setDateFrom(yStr)
                  setDateTo(yStr)
                  setSelectedMonth("none")
                }}
              >Hôm qua</button>
              <button
                type="button"
                className="h-6 px-2.5 rounded-md text-[11px] font-bold text-zinc-600 hover:bg-zinc-200/50 hover:text-zinc-900 transition-all"
                onClick={() => setQuickRange(7)}
              >7 Ngày</button>
              <button
                type="button"
                className="h-6 px-2.5 rounded-md text-[11px] font-bold text-zinc-600 hover:bg-zinc-200/50 hover:text-zinc-900 transition-all"
                onClick={() => setQuickRange(30)}
              >30 Ngày</button>
              <div className="w-[1px] h-3 bg-zinc-200 mx-0.5"></div>
              <button
                type="button"
                className="h-6 px-2 rounded-md text-[11px] font-bold text-zinc-600 hover:bg-zinc-200/50 hover:text-zinc-900 transition-all"
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
              >Trước</button>
              <button
                type="button"
                className="h-6 px-2 rounded-md text-[11px] font-bold text-zinc-600 hover:bg-zinc-200/50 hover:text-zinc-900 transition-all"
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
              >Tiếp</button>
            </div>

            {/* Manual Date Input Group */}
            <div className="flex items-center gap-1.5 bg-zinc-50/50 p-1 rounded-lg border border-zinc-150">
              <span className="text-[9px] font-extrabold uppercase text-zinc-400 px-1 whitespace-nowrap">Thời gian</span>
              
              <Select value={selectedMonth} onValueChange={setMonthRange}>
                <SelectTrigger className="h-7 w-[105px] rounded-md border-zinc-200 bg-white text-[11px] font-bold shadow-none px-2 py-0">
                  <SelectValue placeholder="Tháng" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none" className="text-[11px]">-- Tháng --</SelectItem>
                  {Array.from({ length: 12 }, (_, i) => {
                     const d = new Date()
                     d.setMonth(d.getMonth() - i)
                     const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
                     const label = `Tháng ${d.getMonth() + 1}/${d.getFullYear()}`
                     return <SelectItem key={val} value={val} className="text-[11px]">{label}</SelectItem>
                  })}
                </SelectContent>
              </Select>

              <input
                type="date"
                value={dateFrom}
                onChange={(e) => { setDateFrom(e.target.value); setSelectedMonth("none"); }}
                className="h-7 px-1.5 rounded-md border border-zinc-200 bg-white text-[11px] font-bold focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-950 w-[112px]"
              />
              <span className="text-[9px] text-zinc-400 font-extrabold">→</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => { setDateTo(e.target.value); setSelectedMonth("none"); }}
                className="h-7 px-1.5 rounded-md border border-zinc-200 bg-white text-[11px] font-bold focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-950 w-[112px]"
              />
            </div>
          </div>

          {/* Right: Branch select & actions */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 bg-zinc-50/50 p-1 rounded-lg border border-zinc-150">
              <span className="text-[9px] font-extrabold uppercase text-zinc-400 px-1 whitespace-nowrap">Chi nhánh</span>
              <Select value={selectedBranchId} onValueChange={setSelectedBranchId}>
                <SelectTrigger className="h-7 w-[160px] text-[11px] font-bold border-zinc-200 bg-white rounded-md shadow-none px-2">
                  <SelectValue placeholder="Tất cả chi nhánh" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-[11px] font-bold">💎 Tất cả chi nhánh</SelectItem>
                  {[...overviewData].sort((a,b) => a.id - b.id).map(b => (
                    <SelectItem key={b.id} value={String(b.id)} className="text-[11px] font-bold">{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-1.5">
              <Button 
                onClick={() => handleSearch()}
                disabled={loading}
                className="bg-zinc-950 hover:bg-black text-white rounded-lg h-7 px-3.5 font-bold transition-all text-[11px] active:scale-95 flex items-center shadow-sm"
              >
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Filter className="w-3.5 h-3.5 mr-1.5" />}
                Lọc dữ liệu
              </Button>
              <CrawlLogActions hideSyncButtons={true} size="sm" />
            </div>
          </div>
        </div>
      </div>

      {/* Data Table Section */}
      <div className="space-y-2 translate-y-0 opacity-100 transition-all duration-700">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100 pb-1.5 px-1">
           <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-[11px] font-extrabold uppercase tracking-widest text-zinc-400 flex items-center gap-1.5 mr-2">
                <LayoutGrid className="w-3 h-3 text-zinc-400" />
                Chi tiết hiệu suất
              </h3>
              
              {/* Premium Tabs Selector */}
              <div className="flex flex-wrap items-center gap-0.5 bg-zinc-100/70 p-0.5 rounded-lg border border-zinc-200/40">
                {[
                  { id: "all", label: "Tất cả", icon: LayoutGrid },
                  { id: "customers", label: "Khách hàng", icon: UsersIcon, activeColor: "text-emerald-600" },
                  { id: "services", label: "Dịch vụ", icon: ScissorsIcon, activeColor: "text-blue-600" },
                  { id: "treatments", label: "Điều trị", icon: ActivityIcon, activeColor: "text-amber-600" },
                  { id: "appointments", label: "Lịch hẹn", icon: CalendarCheckIcon, activeColor: "text-purple-600" },
                  { id: "sales", label: "Doanh số", icon: DollarSignIcon, activeColor: "text-slate-700" },
                  { id: "revenue", label: "Doanh thu", icon: WalletIcon, activeColor: "text-indigo-600" },
                  { id: "anamnesis", label: "Tiền sử", icon: HelpCircle, activeColor: "text-cyan-655" },
                  { id: "images", label: "Hình ảnh", icon: FolderOpen, activeColor: "text-teal-600" },
                  { id: "care-history", label: "Tư vấn", icon: ClipboardList, activeColor: "text-pink-600" },
                  { id: "complaints", label: "Complaint", icon: AlertTriangle, activeColor: "text-red-600" },
                  { id: "treatment-plans", label: "Chẩn đoán", icon: BookOpen, activeColor: "text-orange-600" },
                ].map(tab => {
                  const TabIcon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id as any)}
                      className={cn(
                        "flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold transition-all active:scale-95",
                        isActive
                          ? "bg-white text-zinc-950 shadow-sm"
                          : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50/50"
                      )}
                    >
                      <TabIcon className={cn("w-3 h-3", isActive ? tab.activeColor : "text-zinc-400")} />
                      {tab.label}
                    </button>
                  );
                })}
              </div>
           </div>

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
                columns={getFilteredColumns()} 
                data={getSortedData()} 
                onRefresh={handleSearch}
                height="calc(100vh - 280px)"
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
