"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { Calendar, Activity, Database, Clock, AlertCircle, ShieldCheck, Users, CreditCard, Stethoscope } from "lucide-react"

export type CrawlLogColumn = {
  id: number
  crawl_date: string
  crawl_type: string
  status: string
  records_count: number
  total_branches: number
  total_customers: number
  total_payments: number
  total_treatments: number
  total_services: number
  duration_seconds: number | null
  error_message: string | null
}

export const columns: ColumnDef<CrawlLogColumn>[] = [
  {
    accessorKey: "crawl_date",
    header: "Thời gian",
    cell: ({ row }) => {
      const date = new Date(row.getValue("crawl_date"))
      return (
        <div className="flex flex-col">
          <span className="font-bold flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-blue-500" />
            {date.toLocaleDateString('vi-VN')}
          </span>
          <span className="text-[10px] font-medium text-muted-foreground ml-5">
            {date.toLocaleTimeString('vi-VN')}
          </span>
        </div>
      )
    }
  },
  {
    accessorKey: "crawl_type",
    header: "Loại quy trình",
    cell: ({ row }) => (
      <Badge variant="outline" className="gap-2 border-white/5 glass font-bold uppercase tracking-tighter text-[10px]">
        <Activity className="w-3 h-3 text-blue-500" />
        {row.getValue("crawl_type")}
      </Badge>
    )
  },
  {
    accessorKey: "stats",
    header: "Thống kê đồng bộ",
    cell: ({ row }) => {
      const log = row.original;
      return (
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px]">
          <div className="flex items-center gap-1.5 font-bold">
            <ShieldCheck className="w-3 h-3 text-blue-500" />
            <span className="text-muted-foreground min-w-[50px]">Chi nhánh:</span>
            <span className="text-blue-600">{log.total_branches || 0}</span>
          </div>
          <div className="flex items-center gap-1.5 font-bold">
            <Users className="w-3 h-3 text-emerald-500" />
            <span className="text-muted-foreground min-w-[50px]">Khách hàng:</span>
            <span className="text-emerald-600">{log.total_customers || 0}</span>
          </div>
          <div className="flex items-center gap-1.5 font-bold">
            <CreditCard className="w-3 h-3 text-orange-500" />
            <span className="text-muted-foreground min-w-[50px]">Thanh toán:</span>
            <span className="text-orange-600">{log.total_payments || 0}</span>
          </div>
          <div className="flex items-center gap-1.5 font-bold">
            <Stethoscope className="w-3 h-3 text-rose-500" />
            <span className="text-muted-foreground min-w-[50px]">Điều trị:</span>
            <span className="text-rose-600">{log.total_treatments || 0}</span>
          </div>
          <div className="flex items-center gap-1.5 font-bold col-span-2">
            <Database className="w-3 h-3 text-indigo-500" />
            <span className="text-muted-foreground min-w-[50px]">Dịch vụ:</span>
            <span className="text-indigo-600">{log.total_services || 0}</span>
          </div>
        </div>
      )
    }
  },
  {
    accessorKey: "duration_seconds",
    header: "Thời lượng",
    cell: ({ row }) => (
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
          <Clock className="w-4 h-4" />
          {(row.getValue("duration_seconds") as number | null)?.toFixed(2) || "0.00"}s
        </div>
      </div>
    )
  },
  {
    accessorKey: "status",
    header: "Trạng thái",
    cell: ({ row }) => {
      const status = row.getValue("status") as string
      const isSuccess = status === "success"
      return (
        <Badge variant={isSuccess ? "secondary" : "destructive"} className={`rounded-xl px-4 uppercase text-[10px] font-black ${isSuccess ? "bg-emerald-500/10 text-emerald-600 border-none" : ""}`}>
          {isSuccess ? "Thành công" : "Thất bại"}
        </Badge>
      )
    }
  },
  {
    accessorKey: "error_message",
    header: "Chi tiết lỗi",
    cell: ({ row }) => {
      const error = row.getValue("error_message") as string
      if (!error) return <span className="text-muted-foreground italic text-xs">Không có lỗi</span>
      return (
        <div className="flex items-center gap-2 text-red-500 text-xs font-medium max-w-[200px] truncate">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )
    }
  },
]
