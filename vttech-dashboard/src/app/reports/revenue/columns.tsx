"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { User, Phone, DollarSign, Calendar, Tag, CreditCard, TrendingUp } from "lucide-react"

export type RevenueColumn = {
  id: string
  customer_name: string
  customer_code: string
  phone: string
  service_name: string
  category_name: string
  amount: number
  paid: number
  is_new: boolean
  created_at: string
  branch_name: string
}

export const columns: ColumnDef<RevenueColumn>[] = [
  {
    accessorKey: "created_at",
    header: "Thời gian",
    cell: ({ row }) => {
      const date = new Date(row.getValue("created_at"))
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
    accessorKey: "customer_name",
    header: "Khách hàng",
    cell: ({ row }) => (
      <div className="flex flex-col">
        <span className="font-bold flex items-center gap-2">
          <User className="w-3.5 h-3.5 text-emerald-500" />
          {row.getValue("customer_name")}
        </span>
        <div className="flex flex-col ml-5">
            <span className="text-[10px] font-medium text-muted-foreground flex items-center gap-1">
                <Tag className="w-2.5 h-2.5" />
                {row.original.customer_code}
            </span>
            <span className="text-[10px] font-medium text-muted-foreground flex items-center gap-1">
                <Phone className="w-3 h-3" />
                {row.original.phone}
            </span>
        </div>
      </div>
    )
  },
  {
    accessorKey: "service_name",
    header: "Dịch vụ/Phát sinh",
    cell: ({ row }) => (
      <div className="flex flex-col">
          <Badge variant="outline" className="gap-2 border-white/5 glass font-bold uppercase tracking-tighter text-[10px] w-fit">
            <TrendingUp className="w-3 h-3 text-indigo-500" />
            {row.getValue("service_name") || "N/A"}
          </Badge>
          <span className="text-[10px] font-medium text-muted-foreground ml-2 mt-1 italic">
              {row.original.category_name}
          </span>
      </div>
    )
  },
  {
    accessorKey: "amount",
    header: "Giá trị",
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue("amount"))
      return (
        <span className="font-bold text-slate-700">
          {amount.toLocaleString('vi-VN')}đ
        </span>
      )
    }
  },
  {
    accessorKey: "paid",
    header: "Đã thanh toán",
    cell: ({ row }) => {
      const paid = parseFloat(row.getValue("paid"))
      return (
        <div className="flex flex-col">
          <span className="font-bold text-emerald-600 flex items-center gap-1">
            <DollarSign className="w-3 h-3" />
            {paid.toLocaleString('vi-VN')}đ
          </span>
          {row.original.is_new && (
            <Badge className="w-fit text-[8px] h-4 bg-blue-500/10 text-blue-600 border-none px-1">Khách mới</Badge>
          )}
        </div>
      )
    }
  },
  {
    accessorKey: "branch_name",
    header: "Chi nhánh",
    cell: ({ row }) => (
      <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
        <CreditCard className="w-3 h-3" />
        {row.getValue("branch_name")}
      </span>
    )
  }
]
