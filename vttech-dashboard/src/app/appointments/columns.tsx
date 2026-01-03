"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { Calendar, User, Building2, Scissors, UserCheck } from "lucide-react"

export type AppointmentColumn = {
  id: number
  appointment_date: string | null
  customer_name: string | null
  phone: string | null
  branch_name: string | null
  service_name: string | null
  employee_name: string | null
  status: number
}

const statusMap: Record<number, { label: string, variant: "default" | "secondary" | "destructive" | "outline", className?: string }> = {
  0: { label: "Scheduled", variant: "outline", className: "text-blue-500 border-blue-500/20 bg-blue-500/10" },
  1: { label: "Confirmed", variant: "secondary", className: "text-emerald-500 bg-emerald-500/10 border-none" },
  2: { label: "Checked In", variant: "default", className: "bg-blue-600 text-white border-none" },
  3: { label: "Cancelled", variant: "destructive", className: "opacity-50" },
}

export const columns: ColumnDef<AppointmentColumn>[] = [
  {
    accessorKey: "appointment_date",
    header: "Date & Time",
    cell: ({ row }) => {
      const date = row.getValue("appointment_date") ? new Date(row.getValue("appointment_date") as string) : null
      return (
        <div className="flex flex-col">
          <span className="font-bold flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-blue-500" />
            {date ? date.toLocaleDateString('vi-VN') : "N/A"}
          </span>
          <span className="text-[10px] font-medium text-muted-foreground ml-5">
            {date ? date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : "N/A"}
          </span>
        </div>
      )
    }
  },
  {
    accessorKey: "customer_name",
    header: "Customer",
    cell: ({ row }) => (
      <div className="flex flex-col">
        <span className="font-semibold flex items-center gap-1.5 uppercase tracking-tight">
          <User className="w-3.5 h-3.5 text-muted-foreground" />
          {row.getValue("customer_name") || "Guest"}
        </span>
        <span className="text-xs text-muted-foreground font-mono ml-5">{row.original.phone || "No Phone"}</span>
      </div>
    )
  },
  {
    accessorKey: "branch_name",
    header: "Location",
    cell: ({ row }) => (
      <Badge variant="outline" className="gap-1.5 border-white/5 glass font-medium">
        <Building2 className="w-3 h-3 text-blue-500" />
        {row.getValue("branch_name") || "HQ"}
      </Badge>
    )
  },
  {
    accessorKey: "service_name",
    header: "Service",
    cell: ({ row }) => (
      <div className="flex items-center gap-2 font-medium">
        <Scissors className="w-4 h-4 text-muted-foreground opacity-50" />
        {row.getValue("service_name") || "General"}
      </div>
    )
  },
  {
    accessorKey: "employee_name",
    header: "Specialist",
    cell: ({ row }) => (
      <div className="flex items-center gap-2 text-xs font-semibold">
        <UserCheck className="w-4 h-4 text-purple-500" />
        {row.getValue("employee_name") || "Assigned"}
      </div>
    )
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = statusMap[row.getValue("status") as number] || statusMap[0]
      return (
        <Badge variant={status.variant} className={`rounded-xl px-3 uppercase text-[10px] tracking-widest font-black ${status.className}`}>
          {status.label}
        </Badge>
      )
    }
  },
]
