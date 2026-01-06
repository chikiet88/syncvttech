"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { Calendar, Phone, Activity, Clock, CheckCircle2, XCircle, AlertCircle } from "lucide-react"

export type PbxSyncLogColumn = {
  id: number
  sync_type: string
  status: string
  start_time: string
  end_time: string | null
  date_from: string
  date_to: string
  total_records: number
  success_count: number
  failed_count: number
  error_message: string | null
}

export const pbxColumns: ColumnDef<PbxSyncLogColumn>[] = [
  {
    accessorKey: "start_time",
    header: "Thời gian bắt đầu",
    cell: ({ row }) => {
      const date = new Date(row.getValue("start_time"))
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
    accessorKey: "sync_type",
    header: "Loại",
    cell: ({ row }) => (
      <Badge variant="outline" className="gap-2 border-orange-200 bg-orange-50 text-orange-700 font-bold uppercase tracking-tighter text-[10px]">
        <Phone className="w-3 h-3" />
        {row.getValue("sync_type")}
      </Badge>
    )
  },
  {
    accessorKey: "date_range",
    header: "Khoảng dữ liệu",
    cell: ({ row }) => {
        const from = new Date(row.original.date_from).toLocaleDateString('vi-VN')
        const to = new Date(row.original.date_to).toLocaleDateString('vi-VN')
        return <span className="text-xs font-medium">{from} - {to}</span>
    }
  },
  {
    accessorKey: "results",
    header: "Kết quả",
    cell: ({ row }) => (
      <div className="flex items-center gap-3 text-[10px] font-bold">
        <span className="text-emerald-600">S: {row.original.success_count}</span>
        <span className="text-red-500">F: {row.original.failed_count}</span>
        <span className="text-muted-foreground">T: {row.original.total_records}</span>
      </div>
    )
  },
  {
    accessorKey: "status",
    header: "Trạng thái",
    cell: ({ row }) => {
      const status = row.getValue("status") as string
      const isSuccess = status === "success"
      const isPartial = status === "partial"
      
      return (
        <Badge 
          variant={isSuccess ? "secondary" : (isPartial ? "outline" : "destructive")} 
          className={`rounded-xl px-4 uppercase text-[10px] font-black ${isSuccess ? "bg-emerald-500/10 text-emerald-600 border-none" : (isPartial ? "bg-orange-500/10 text-orange-600 border-none" : "")}`}
        >
          {status === 'success' ? 'Hoàn tất' : status === 'partial' ? 'Một phần' : 'Thất bại'}
        </Badge>
      )
    }
  },
  {
    accessorKey: "error_message",
    header: "Lỗi",
    cell: ({ row }) => {
      const error = row.getValue("error_message") as string
      if (!error) return null
      return (
        <div className="flex items-center gap-2 text-red-500 text-[10px] font-medium max-w-[150px] truncate">
          <AlertCircle className="w-3 h-3 shrink-0" />
          {error}
        </div>
      )
    }
  },
]
