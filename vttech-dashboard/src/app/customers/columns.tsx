"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { Users, Phone, Mail, Landmark, Wallet } from "lucide-react"

export type CustomerColumn = {
  id: number
  code: string | null
  name: string
  phone: string | null
  email: string | null
  total_spent: number
  total_debt: number
  point: number
  is_active: number
}

export const columns: ColumnDef<CustomerColumn>[] = [
  {
    accessorKey: "code",
    header: "ID",
    cell: ({ row }) => <span className="font-mono text-xs font-bold text-blue-500">{row.getValue("code") || `C-${row.original.id}`}</span>
  },
  {
    accessorKey: "name",
    header: "Customer",
    cell: ({ row }) => (
      <div className="flex flex-col gap-0.5">
        <span className="font-semibold">{row.getValue("name")}</span>
        <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
          {row.original.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {row.original.phone}</span>}
          {row.original.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {row.original.email}</span>}
        </div>
      </div>
    )
  },
  {
    accessorKey: "total_spent",
    header: "Total Spent",
    cell: ({ row }) => (
      <div className="flex items-center gap-2 font-bold text-emerald-500">
        <Landmark className="w-4 h-4 opacity-50" />
        {new Intl.NumberFormat('vi-VN').format(row.getValue("total_spent"))} đ
      </div>
    )
  },
  {
    accessorKey: "total_debt",
    header: "Debt",
    cell: ({ row }) => (
      <div className="flex items-center gap-2 font-bold text-red-500">
        <Wallet className="w-4 h-4 opacity-50" />
        {new Intl.NumberFormat('vi-VN').format(row.getValue("total_debt"))} đ
      </div>
    )
  },
  {
    accessorKey: "point",
    header: "Points",
    cell: ({ row }) => (
      <Badge variant="outline" className="rounded-full bg-purple-500/10 text-purple-500 border-none font-bold">
        {row.getValue("point")} pts
      </Badge>
    )
  },
  {
    accessorKey: "is_active",
    header: "Status",
    cell: ({ row }) => {
      const isActive = row.getValue("is_active") === 1
      return (
        <div className={`w-2.5 h-2.5 rounded-full ${isActive ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-red-500 opacity-50"}`} />
      )
    }
  },
]
