"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, XCircle } from "lucide-react"

export type BranchColumn = {
  id: number
  code: string | null
  name: string
  address: string | null
  phone: string | null
  is_active: number
  created_at: string
}

export const columns: ColumnDef<BranchColumn>[] = [
  {
    accessorKey: "code",
    header: "Mã",
    cell: ({ row }) => <span className="font-mono text-xs font-bold">{row.getValue("code") || "N/A"}</span>
  },
  {
    accessorKey: "name",
    header: "Tên",
    cell: ({ row }) => <span className="font-semibold">{row.getValue("name")}</span>
  },
  {
    accessorKey: "address",
    header: "Địa chỉ",
    cell: ({ row }) => <span className="text-muted-foreground text-sm line-clamp-1">{row.getValue("address") || "N/A"}</span>
  },
  {
    accessorKey: "phone",
    header: "Điện thoại",
  },
  {
    accessorKey: "is_active",
    header: "Trạng thái",
    cell: ({ row }) => {
      const isActive = row.getValue("is_active") === 1
      return (
        <Badge variant={isActive ? "secondary" : "destructive"} className={`gap-1 rounded-full px-3 ${isActive ? "bg-emerald-500/10 text-emerald-500 border-none" : ""}`}>
          {isActive ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
          {isActive ? "Hoạt động" : "Ngừng hoạt động"}
        </Badge>
      )
    }
  },
  {
    accessorKey: "created_at",
    header: "Ngày tạo",
    cell: ({ row }) => {
      const date = new Date(row.getValue("created_at"))
      return <span className="text-muted-foreground text-xs">{date.toLocaleDateString('vi-VN')}</span>
    }
  },
]
