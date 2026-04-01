"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { User, Activity, Calendar, Building2, Stethoscope, FileText, CheckCircle2 } from "lucide-react"

export type TreatmentColumn = {
  id: number
  customer_name: string
  branch_name: string
  service_name: string
  employee_name: string
  treatment_date: string
  amount: number
  paid: number
  status: number
  note: string
}

export const columns: ColumnDef<TreatmentColumn>[] = [
  {
    accessorKey: "treatment_date",
    header: "Ngày điều trị",
    cell: ({ row }) => {
      const date = new Date(row.getValue("treatment_date"))
      return (
        <div className="flex flex-col">
          <span className="font-bold flex items-center gap-2 text-slate-700">
            <Calendar className="w-3.5 h-3.5 text-amber-500" />
            {date.toLocaleDateString('vi-VN')}
          </span>
          <span className="text-[10px] font-medium text-slate-500 ml-5">
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
        <span className="font-bold flex items-center gap-2 text-slate-900">
          <User className="w-3.5 h-3.5 text-emerald-500" />
          {row.getValue("customer_name") || "N/A"}
        </span>
      </div>
    )
  },
  {
    accessorKey: "service_name",
    header: "Dịch vụ Điều trị",
    cell: ({ row }) => (
      <div className="flex flex-col items-start gap-1">
          <Badge variant="outline" className="gap-2 border-amber-200 bg-amber-50 text-amber-700 font-bold uppercase tracking-tighter text-[10px] w-fit">
            <Activity className="w-3 h-3 text-amber-500" />
            {row.getValue("service_name") || "Không xác định"}
          </Badge>
          {row.original.note && (
             <span className="text-[10px] font-medium text-slate-500 flex items-center gap-1 max-w-[200px] truncate" title={row.original.note}>
                 <FileText className="w-2.5 h-2.5" />
                 {row.original.note}
             </span>
          )}
      </div>
    )
  },
  {
    accessorKey: "employee_name",
    header: "Bác sĩ / KTV",
    cell: ({ row }) => (
      <span className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
        <Stethoscope className="w-3.5 h-3.5 text-indigo-400" />
        {row.getValue("employee_name") || "N/A"}
      </span>
    )
  },
  {
    accessorKey: "status",
    header: "Trạng thái",
    cell: ({ row }) => {
      const status = Number(row.getValue("status"))
      return (
        <Badge className={`w-fit text-[10px] h-5 border-none px-2 shadow-none font-medium gap-1 ${
          status === 1 ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-600'
        }`}>
          {status === 1 ? <CheckCircle2 className="w-3 h-3"/> : null}
          {status === 1 ? 'Hoàn thành' : 'Đang xử lý'}
        </Badge>
      )
    }
  },
  {
    accessorKey: "branch_name",
    header: "Chi nhánh",
    cell: ({ row }) => (
      <span className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
        <Building2 className="w-3.5 h-3.5 text-slate-400" />
        {row.getValue("branch_name")}
      </span>
    )
  }
]
