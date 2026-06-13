"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Calendar, User, Phone, Tag, Building2, ClipboardList, UserCheck } from "lucide-react"

export type CareHistoryColumn = {
  id: number
  date: string
  customerId: number
  customerName: string
  customerCode: string
  phone: string
  actionType: string
  note: string
  employeeName: string
  branchName: string
}

export const columns: ColumnDef<CareHistoryColumn>[] = [
  {
    accessorKey: "date",
    header: "Ngày",
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
    accessorKey: "actionType",
    header: "Tương tác / Loại",
    cell: ({ row }) => (
      <span className="font-black text-[10px] uppercase tracking-wider bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full w-fit">
        {row.getValue("actionType") || "Chăm sóc"}
      </span>
    )
  },
  {
    accessorKey: "note",
    header: "Nội dung phản hồi / Chi tiết",
    cell: ({ row }) => (
      <div className="max-w-[350px] font-bold text-zinc-800 text-[11px] line-clamp-2">
        {row.getValue("note")}
      </div>
    )
  },
  {
    accessorKey: "employeeName",
    header: "Nhân viên chăm sóc",
    cell: ({ row }) => (
      <span className="font-bold flex items-center gap-1.5 text-zinc-700 text-[11px]">
        <UserCheck className="w-3 h-3 text-zinc-400" />
        {row.getValue("employeeName") || "N/A"}
      </span>
    )
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
