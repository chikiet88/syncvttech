"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { Briefcase, Building2, Phone } from "lucide-react"

export type EmployeeColumn = {
  id: number
  code: string | null
  name: string
  position: string | null
  branch_name: string | null
  phone: string | null
  is_active: number
}

export const columns: ColumnDef<EmployeeColumn>[] = [
  {
    accessorKey: "code",
    header: "Code",
    cell: ({ row }) => <span className="font-mono text-xs font-bold">{row.getValue("code") || `EMP-${row.original.id}`}</span>
  },
  {
    accessorKey: "name",
    header: "Employee",
    cell: ({ row }) => (
      <div className="flex flex-col gap-0.5">
        <span className="font-semibold">{row.getValue("name")}</span>
        <span className="text-xs text-muted-foreground flex items-center gap-1 font-medium">
          <Briefcase className="w-3 h-3" /> {row.original.position || "Staff"}
        </span>
      </div>
    )
  },
  {
    accessorKey: "branch_name",
    header: "Branch",
    cell: ({ row }) => (
      <div className="flex items-center gap-2 font-medium text-blue-500">
        <Building2 className="w-4 h-4 opacity-50" />
        {row.getValue("branch_name") || "Head Office"}
      </div>
    )
  },
  {
    accessorKey: "phone",
    header: "Phone",
    cell: ({ row }) => (
      <span className="text-muted-foreground text-sm flex items-center gap-1">
        <Phone className="w-3 h-3" /> {row.getValue("phone") || "N/A"}
      </span>
    )
  },
  {
    accessorKey: "is_active",
    header: "Status",
    cell: ({ row }) => {
      const isActive = row.getValue("is_active") === 1
      return (
        <Badge variant={isActive ? "secondary" : "destructive"} className={`rounded-full px-3 font-semibold ${isActive ? "bg-emerald-500/10 text-emerald-500 border-none" : ""}`}>
          {isActive ? "On Duty" : "Off Duty"}
        </Badge>
      )
    }
  },
]
