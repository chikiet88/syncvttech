"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { User, Phone, DollarSign, Calendar, Tag, CreditCard, Scissors } from "lucide-react"

export type ServiceColumn = {
  id: string
  CustomerName: string
  CustomerCode: string
  Phone: string
  ServiceName: string
  CategoryName: string
  Amount: number
  Paid: number
  IsNew: boolean
  Created: string
  BranchName: string
}

export const columns: ColumnDef<ServiceColumn>[] = [
  {
    accessorKey: "Created",
    header: "Thời gian",
    cell: ({ row }) => {
      const date = new Date(row.getValue("Created"))
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
    accessorKey: "CustomerName",
    header: "Khách hàng",
    cell: ({ row }) => (
      <div className="flex flex-col">
        <span className="font-bold flex items-center gap-2">
          <User className="w-3.5 h-3.5 text-emerald-500" />
          {row.getValue("CustomerName")}
        </span>
        <div className="flex flex-col ml-5 mt-0.5">
            <span className="text-[10px] font-medium text-muted-foreground flex items-center gap-1.5">
                <Tag className="w-2.5 h-2.5" />
                {row.original.CustomerCode}
            </span>
            <span className="text-[10px] font-medium text-muted-foreground flex items-center gap-1.5 mt-0.5">
                <Phone className="w-2.5 h-2.5" />
                {row.original.Phone || "Không có SĐT"}
            </span>
        </div>
      </div>
    )
  },
  {
    accessorKey: "ServiceName",
    header: "Dịch vụ Bán ra",
    cell: ({ row }) => (
      <div className="flex flex-col">
          <Badge variant="outline" className="gap-2 border-blue-200 bg-blue-50 text-blue-700 font-bold uppercase tracking-tighter text-[10px] w-fit">
            <Scissors className="w-3 h-3 text-blue-500" />
            {row.getValue("ServiceName") || "N/A"}
          </Badge>
          <span className="text-[10px] font-medium text-slate-500 ml-2 mt-1 italic">
              Group: {row.original.CategoryName || "Khác"}
          </span>
      </div>
    )
  },
  {
    accessorKey: "Amount",
    header: "Đơn giá (Amount)",
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue("Amount"))
      return (
        <span className="font-bold text-slate-700">
          {amount.toLocaleString('vi-VN')}đ
        </span>
      )
    }
  },
  {
    accessorKey: "Paid",
    header: "Thực thu (Paid)",
    cell: ({ row }) => {
      const paid = parseFloat(row.getValue("Paid"))
      return (
        <div className="flex flex-col">
          <span className="font-bold text-emerald-600 flex items-center gap-1">
            <DollarSign className="w-3 h-3 text-emerald-500" />
            {paid.toLocaleString('vi-VN')}đ
          </span>
          {row.original.IsNew ? (
            <Badge className="w-fit mt-1 text-[8px] h-4 bg-emerald-50 text-emerald-600 border-emerald-200 px-1.5 font-bold uppercase">Khách Mới</Badge>
          ) : null}
        </div>
      )
    }
  },
  {
    accessorKey: "BranchName",
    header: "Chi nhánh",
    cell: ({ row }) => (
      <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
        <CreditCard className="w-3 h-3 text-slate-400" />
        {row.getValue("BranchName")}
      </span>
    )
  }
]
