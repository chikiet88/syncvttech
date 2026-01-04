"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { CreditCard, User, Landmark, History } from "lucide-react"
import Link from "next/link"

export type PaymentColumn = {
  id: string
  customer_id: number
  customer_name: string
  amount: number
  payment_date: string | null
  payment_method: string | null
  note: string | null
}

export const columns: ColumnDef<PaymentColumn>[] = [
  {
    accessorKey: "payment_date",
    header: "Ngày",
    cell: ({ row }) => {
      const date = row.original.payment_date
      if (!date) return <span className="text-muted-foreground italic text-xs">N/A</span>
      return (
        <div className="flex items-center gap-2">
          <History className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="font-medium whitespace-nowrap">
            {format(new Date(date), "dd/MM/yyyy HH:mm")}
          </span>
        </div>
      )
    },
  },
  {
    accessorKey: "customer_name",
    header: "Khách hàng",
    cell: ({ row }) => (
      <Link 
        href={`/customers/${row.original.customer_id}`}
        className="flex items-center gap-2 group hover:text-blue-600 transition-colors"
      >
        <div className="p-1.5 rounded-lg bg-blue-50 group-hover:bg-blue-100 transition-colors">
          <User className="w-3.5 h-3.5 text-blue-500" />
        </div>
        <span className="font-bold">{row.original.customer_name}</span>
      </Link>
    ),
  },
  {
    accessorKey: "amount",
    header: "Số tiền",
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue("amount"))
      return (
        <div className="font-black text-emerald-600">
          {new Intl.NumberFormat('vi-VN').format(amount)} đ
        </div>
      )
    },
  },
  {
    accessorKey: "payment_method",
    header: "Phương thức",
    cell: ({ row }) => {
      const method = row.original.payment_method || "Khác"
      return (
        <Badge variant="outline" className="rounded-full bg-slate-100 border-none font-bold text-[10px] uppercase tracking-wider py-0.5">
          <Landmark className="w-3 h-3 mr-1 opacity-50" />
          {method}
        </Badge>
      )
    },
  },
  {
    accessorKey: "note",
    header: "Ghi chú",
    cell: ({ row }) => (
      <span className="text-xs text-muted-foreground truncate max-w-[200px] block">
        {row.original.note || "---"}
      </span>
    ),
  },
]
