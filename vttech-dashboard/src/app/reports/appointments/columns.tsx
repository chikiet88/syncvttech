"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { User, Calendar, Building2, Phone, Clock, FileText, CheckCircle2, AlertCircle } from "lucide-react"

export type AppointmentColumn = {
  id: number
  customer_name: string
  phone: string
  branch_name: string
  service_name: string
  employee_name: string
  appointment_date: string
  status: number
  note: string
}

export const columns: ColumnDef<AppointmentColumn>[] = [
  {
    accessorKey: "appointment_date",
    header: "Lịch hẹn (Ngày & Giờ)",
    cell: ({ row }) => {
      const date = new Date(row.getValue("appointment_date"))
      return (
        <div className="flex flex-col">
          <span className="font-bold flex items-center gap-2 text-slate-700">
            <Calendar className="w-3.5 h-3.5 text-purple-500" />
            {date.toLocaleDateString('vi-VN')}
          </span>
          <span className="font-bold text-[11px] text-purple-600 ml-5 mt-0.5 flex items-center gap-1 bg-purple-50 w-fit px-1.5 rounded">
            <Clock className="w-3 h-3" />
            {date.toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'})}
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
        <span className="font-bold flex items-center gap-2 text-slate-900">
          <User className="w-3.5 h-3.5 text-purple-500" />
          {row.getValue("customer_name") || "N/A"}
        </span>
        <span className="text-[10px] font-medium text-slate-500 flex items-center gap-1.5 ml-5 mt-0.5">
            <Phone className="w-2.5 h-2.5" />
            {row.original.phone || "Không có SĐT"}
        </span>
      </div>
    )
  },
  {
    accessorKey: "service_name",
    header: "Nội dung Hẹn",
    cell: ({ row }) => (
      <div className="flex flex-col items-start gap-1">
          <Badge variant="outline" className="gap-1.5 border-purple-200 bg-purple-50 text-purple-700 font-bold uppercase tracking-tighter text-[9px] w-fit">
            {row.getValue("service_name") || "Tư vấn chung"}
          </Badge>
          {row.original.note && (
             <span className="text-[10px] font-medium text-slate-500 flex items-center gap-1 max-w-[180px] truncate" title={row.original.note}>
                 <FileText className="w-2.5 h-2.5" />
                 {row.original.note}
             </span>
          )}
      </div>
    )
  },
  {
    accessorKey: "status",
    header: "Trạng thái",
    cell: ({ row }) => {
      const status = Number(row.getValue("status"))
      // Default statuses for example: 1 = Finished, 0 = Pending/Waiting
      return (
        <Badge className={`w-fit text-[10px] h-5 border-none px-2 shadow-none font-bold gap-1 ${
          status > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
        }`}>
          {status > 0 ? <CheckCircle2 className="w-3 h-3"/> : <AlertCircle className="w-3 h-3"/>}
          {status > 0 ? 'Đã đến khám' : 'Đang chờ'}
        </Badge>
      )
    }
  },
  {
    accessorKey: "branch_name",
    header: "Chi nhánh",
    cell: ({ row }) => (
      <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
        <Building2 className="w-3.5 h-3.5 text-slate-400" />
        {row.getValue("branch_name")}
      </span>
    )
  }
]
