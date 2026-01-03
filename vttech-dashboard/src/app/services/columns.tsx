"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { Package, Clock, Banknote } from "lucide-react"

export type ServiceColumn = {
  id: number
  code: string | null
  name: string
  price: number
  duration: number
  is_active: number
}

export const columns: ColumnDef<ServiceColumn>[] = [
  {
    accessorKey: "code",
    header: "Code",
    cell: ({ row }) => <span className="font-mono text-xs font-bold text-blue-500">{row.getValue("code") || `SRV-${row.original.id}`}</span>
  },
  {
    accessorKey: "name",
    header: "Service Name",
    cell: ({ row }) => (
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
          <Package className="w-4 h-4" />
        </div>
        <span className="font-semibold">{row.getValue("name")}</span>
      </div>
    )
  },
  {
    accessorKey: "price",
    header: "Standard Price",
    cell: ({ row }) => (
      <div className="flex items-center gap-2 font-bold text-emerald-500">
        <Banknote className="w-4 h-4 opacity-50" />
        {new Intl.NumberFormat('vi-VN').format(row.getValue("price"))} đ
      </div>
    )
  },
  {
    accessorKey: "duration",
    header: "Duration",
    cell: ({ row }) => (
      <div className="flex items-center gap-2 text-muted-foreground font-medium">
        <Clock className="w-4 h-4" />
        {row.getValue("duration")} min
      </div>
    )
  },
  {
    accessorKey: "is_active",
    header: "Status",
    cell: ({ row }) => {
      const isActive = row.getValue("is_active") === 1
      return (
        <Badge variant={isActive ? "secondary" : "destructive"} className={`rounded-xl px-4 ${isActive ? "bg-emerald-500/10 text-emerald-500 border-none" : ""}`}>
          {isActive ? "Available" : "Discontinued"}
        </Badge>
      )
    }
  },
]
