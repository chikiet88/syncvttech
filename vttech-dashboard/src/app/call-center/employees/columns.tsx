"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { User, Phone, Briefcase, Building } from "lucide-react"

export type PbxEmployeeColumn = {
  id: number
  vttech_id: number
  name: string
  code: string | null
  phone: string | null
  extension: string | null
  group_name: string | null
  department: string | null
  position: string | null
  is_active: number
}

export const columns: ColumnDef<PbxEmployeeColumn>[] = [
  {
    accessorKey: "name",
    header: "Họ tên",
    cell: ({ row }) => (
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs">
            {row.getValue("name")?.toString().charAt(0)}
        </div>
        <div className="flex flex-col">
          <span className="font-bold">{row.getValue("name")}</span>
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">ID: {row.original.vttech_id}</span>
        </div>
      </div>
    )
  },
  {
    accessorKey: "extension",
    header: "Extension",
    cell: ({ row }) => (
      <Badge variant="outline" className="gap-2 border-blue-200 bg-blue-50 text-blue-700 font-mono font-bold text-sm">
        <Phone className="w-3 h-3" />
        {row.getValue("extension") || "Chưa gán"}
      </Badge>
    )
  },
  {
    accessorKey: "group_name",
    header: "Nhóm/Bộ phận",
    cell: ({ row }) => (
      <div className="flex flex-col gap-1">
        <span className="text-xs font-bold flex items-center gap-2">
            <Building className="w-3 h-3 text-muted-foreground" />
            {row.getValue("group_name") || "N/A"}
        </span>
        <span className="text-[10px] text-muted-foreground italic">
            {row.original.department || ""}
        </span>
      </div>
    )
  },
  {
    accessorKey: "position",
    header: "Vị trí",
    cell: ({ row }) => (
      <div className="flex items-center gap-2 text-xs font-medium">
        <Briefcase className="w-4 h-4 text-muted-foreground" />
        {row.getValue("position") || "N/A"}
      </div>
    )
  },
  {
    accessorKey: "phone",
    header: "Số điện thoại",
    cell: ({ row }) => (
      <span className="text-xs font-mono">{row.getValue("phone") || "N/A"}</span>
    )
  },
  {
    accessorKey: "is_active",
    header: "Trạng thái",
    cell: ({ row }) => {
      const isActive = row.getValue("is_active") === 1
      return (
        <Badge variant={isActive ? "secondary" : "outline"} className={`rounded-xl px-4 uppercase text-[10px] font-black ${isActive ? "bg-emerald-500/10 text-emerald-600 border-none" : ""}`}>
          {isActive ? "Đang làm việc" : "Nghỉ việc"}
        </Badge>
      )
    }
  },
]
