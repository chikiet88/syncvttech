"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Calendar, User, Phone, Tag, Building2, AlertTriangle } from "lucide-react"
import { Badge } from "@/components/ui/badge"

export type ComplaintColumn = {
  id: number
  date: string
  customerId: number
  customerName: string
  customerCode: string
  phone: string
  content: string
  statusName: string
  branchName: string
}

export const columns: ColumnDef<ComplaintColumn>[] = [
  {
    accessorKey: "date",
    header: "Ngày khiếu nại",
    cell: ({ row }) => {
      const date = new Date(row.getValue("date"))
      return (
        <span className="font-bold flex items-center gap-1.5 text-zinc-600 text-[11px] tabular-nums">
          <Calendar className="w-3 h-3 text-zinc-400" />
          {date.toLocaleDateString('vi-VN')}
        </span>
      )
    }
  },
  {
    accessorKey: "customerName",
    header: "Khách hàng",
    cell: ({ row }) => (
      <div className="flex flex-col gap-0.5">
        <span className="font-extrabold flex items-center gap-1.5 text-zinc-900 text-[11px]">
          <User className="w-3 h-3 text-emerald-500" />
          {row.getValue("customerName")}
        </span>
        <div className="flex items-center gap-2 ml-4">
          <span className="text-[10px] font-bold text-zinc-400 flex items-center gap-1">
            <Tag className="w-2.5 h-2.5" />
            {row.original.customerCode || `C-${row.original.customerId}`}
          </span>
          <span className="text-[10px] font-bold text-zinc-400 flex items-center gap-1">
            <Phone className="w-2.5 h-2.5" />
            {row.original.phone || "N/A"}
          </span>
        </div>
      </div>
    )
  },
  {
    accessorKey: "content",
    header: "Nội dung khiếu nại / Phàn nàn",
    cell: ({ row }) => (
      <div className="max-w-[400px] font-bold text-red-650 flex items-start gap-1 text-[11px]">
        <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
        <span className="line-clamp-2">{row.getValue("content") || "N/A"}</span>
      </div>
    )
  },
  {
    accessorKey: "statusName",
    header: "Trạng thái",
    cell: ({ row }) => {
      const status = String(row.getValue("statusName") || "Đang xử lý")
      const isResolved = status.includes("Giải quyết") || status.includes("Đóng") || status.includes("Xong");
      return (
        <Badge variant="outline" className={`rounded-full border-none font-bold text-[10px] uppercase tracking-wider ${
          isResolved ? "bg-emerald-500/10 text-emerald-600" : "bg-red-500/10 text-red-600"
        }`}>
          {status}
        </Badge>
      )
    }
  },
  {
    accessorKey: "branchName",
    header: "Chi nhánh",
    cell: ({ row }) => (
      <span className="font-bold flex items-center gap-1.5 text-zinc-500 text-[11px]">
        <Building2 className="w-3 h-3 text-zinc-400" />
        {row.getValue("branchName")}
      </span>
    )
  }
]
