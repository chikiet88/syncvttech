"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { Package, User, Clock, Activity } from "lucide-react"
import Link from "next/link"

export type ServiceTabColumn = {
  id: number
  customer_id: number
  customer_name: string
  service_name: string | null
  quantity: number
  price: number
  total: number
  status: string | null
  created_at: string | null
}

export const columns: ColumnDef<ServiceTabColumn>[] = [
  {
    accessorKey: "id",
    header: "ID",
  },
  {
    accessorKey: "service_name",
    header: "Dịch vụ",
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <div className="p-1.5 rounded-lg bg-orange-50">
          <Package className="w-3.5 h-3.5 text-orange-500" />
        </div>
        <span className="font-bold">{row.original.service_name || "Không xác định"}</span>
      </div>
    ),
  },
  {
    accessorKey: "customer_name",
    header: "Khách hàng",
    cell: ({ row }) => (
      <Link 
        href={`/customers/${row.original.customer_id}`}
        className="flex items-center gap-2 group hover:text-blue-600 transition-colors"
      >
        <User className="w-3.5 h-3.5 text-muted-foreground group-hover:text-blue-500" />
        <span className="font-medium">{row.original.customer_name}</span>
      </Link>
    ),
  },
  {
    accessorKey: "quantity",
    header: "Số lượng",
    cell: ({ row }) => (
      <Badge variant="outline" className="rounded-md font-bold">
        {row.original.quantity}
      </Badge>
    ),
  },
  {
    accessorKey: "total",
    header: "Tổng giá trị",
    cell: ({ row }) => (
      <div className="font-black text-blue-600">
        {new Intl.NumberFormat('vi-VN').format(row.original.total)} đ
      </div>
    ),
  },
  {
    accessorKey: "status",
    header: "Trạng thái",
    cell: ({ row }) => (
      <Badge className={`rounded-full uppercase text-[10px] tracking-widest font-black ${
        row.original.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-orange-500/10 text-orange-600'
      } border-none`}>
        {row.original.status === 'Completed' ? 'Hoàn tất' : (row.original.status || "Đang chờ")}
      </Badge>
    ),
  },
  {
    accessorKey: "created_at",
    header: "Ngày tạo",
    cell: ({ row }) => {
      const date = row.original.created_at
      if (!date) return "---"
      return (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="w-3 h-3" />
          {format(new Date(date), "dd/MM/yyyy")}
        </div>
      )
    },
  },
]
