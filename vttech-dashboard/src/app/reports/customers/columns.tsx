"use client"

import { ColumnDef } from "@tanstack/react-table"
import { User, Phone, Tag, Building2, Globe, Clock } from "lucide-react"

export type CustomerColumn = {
  id: number | string
  date: string
  customerId: number
  customerName: string
  customerCode: string
  phone: string
  branchId: number
  sourceName?: string
  createdAt?: string
}

export const columns: ColumnDef<CustomerColumn>[] = [
  {
    accessorKey: "customerCode",
    header: "Mã Khách Hàng",
    cell: ({ row }) => (
      <span className="font-bold flex items-center gap-1.5 text-zinc-900 text-[11px] tabular-nums">
        <Tag className="w-3 h-3 text-zinc-400" />
        {row.getValue("customerCode") || `C-${row.original.customerId}`}
      </span>
    )
  },
  {
    accessorKey: "customerName",
    header: "Tên Khách Hàng",
    cell: ({ row }) => (
      <span className="font-extrabold flex items-center gap-1.5 text-zinc-900 text-[11px]">
        <User className="w-3 h-3 text-emerald-500" />
        {row.getValue("customerName")}
      </span>
    )
  },
  {
    accessorKey: "phone",
    header: "Số Điện Thoại",
    cell: ({ row }) => (
      <span className="font-bold flex items-center gap-1.5 text-zinc-600 text-[11px] tabular-nums">
        <Phone className="w-3 h-3 text-zinc-400" />
        {row.getValue("phone") || "N/A"}
      </span>
    )
  },
  {
    accessorKey: "sourceName",
    header: "Nguồn Khách Hàng",
    cell: ({ row }) => (
      <span className="font-bold flex items-center gap-1.5 text-zinc-600 text-[11px]">
        <Globe className="w-3 h-3 text-zinc-400" />
        {row.getValue("sourceName") || "Khách Giới Thiệu"}
      </span>
    )
  },
  {
    accessorKey: "createdAt",
    header: "Giờ Tạo",
    cell: ({ row }) => {
      const dateVal = row.getValue("createdAt")
      if (!dateVal) return <span className="text-[11px] font-bold text-zinc-400">N/A</span>
      const d = new Date(String(dateVal))
      const timeStr = d.toLocaleTimeString('vi-VN', { hour12: false })
      return (
        <span className="font-bold flex items-center gap-1.5 text-zinc-600 text-[11px] tabular-nums">
          <Clock className="w-3 h-3 text-zinc-400" />
          {timeStr}
        </span>
      )
    }
  },
  {
    accessorKey: "branchId",
    header: "Chi nhánh",
    cell: ({ row }) => (
      <span className="font-bold flex items-center gap-1.5 text-zinc-500 text-[11px]">
        <Building2 className="w-3 h-3 text-zinc-400" />
        CN #{row.getValue("branchId")}
      </span>
    )
  }
]
