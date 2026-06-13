"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { User, Calendar, Building2, Phone, Clock, FileText, Activity, HelpCircle } from "lucide-react"

export type AppointmentColumn = {
  id: number
  vttech_code: string
  mlh_kh: string
  appointment_date: string
  phone: string
  note: string
  status_name: string
  branch_name: string
  type_name: string
  sale_time_date: string
  source_name: string
}

export const columns: ColumnDef<AppointmentColumn>[] = [
  {
    accessorKey: "vttech_code",
    header: "Mã lịch hẹn",
    cell: ({ row }) => (
      <span className="font-bold text-xs font-mono text-zinc-600 bg-zinc-50 border border-zinc-150 px-2 py-0.5 rounded">
        {row.getValue("vttech_code") || "N/A"}
      </span>
    )
  },
  {
    accessorKey: "mlh_kh",
    header: "MLH & Tên KH",
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-purple-50 text-purple-650 font-bold text-xs">
          <User className="w-3.5 h-3.5" />
        </div>
        <span className="font-bold text-xs text-zinc-900 tracking-tight">
          {row.getValue("mlh_kh") || "N/A"}
        </span>
      </div>
    )
  },
  {
    accessorKey: "appointment_date",
    header: "Ngày hẹn",
    cell: ({ row }) => {
      const dateVal = row.getValue("appointment_date")
      if (!dateVal) return <span className="text-zinc-400">-</span>
      const date = new Date(dateVal as string)
      return (
        <div className="flex flex-col">
          <span className="font-bold text-[11px] text-purple-700 flex items-center gap-1 bg-purple-50 w-fit px-1.5 py-0.5 rounded">
            <Clock className="w-3 h-3" />
            {date.toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'})}
          </span>
          <span className="font-semibold text-xs text-zinc-600 flex items-center gap-1 mt-1 ml-0.5">
            <Calendar className="w-3 h-3 text-zinc-400" />
            {date.toLocaleDateString('vi-VN')}
          </span>
        </div>
      )
    }
  },
  {
    accessorKey: "phone",
    header: "Số điện thoại",
    cell: ({ row }) => {
      const phone = row.getValue("phone") as string
      return (
        <span className="text-xs font-semibold text-zinc-600 flex items-center gap-1">
          <Phone className="w-3 h-3 text-zinc-400" />
          {phone || "N/A"}
        </span>
      )
    }
  },
  {
    accessorKey: "note",
    header: "Nội dung",
    cell: ({ row }) => {
      const note = row.getValue("note") as string
      return (
        <div className="max-w-[200px] truncate-2-lines" title={note}>
          <span className="text-xs font-medium text-zinc-600">
            {note || <span className="text-zinc-400 italic">Không có nội dung</span>}
          </span>
        </div>
      )
    }
  },
  {
    accessorKey: "status_name",
    header: "Trạng thái",
    cell: ({ row }) => {
      const status = row.getValue("status_name") as string
      let badgeClass = "bg-zinc-50 text-zinc-650"
      if (status?.includes("Hủy")) {
        badgeClass = "bg-red-50 text-red-650 border-red-100"
      } else if (status?.includes("Về") || status?.includes("Hoàn thành")) {
        badgeClass = "bg-emerald-50 text-emerald-650 border-emerald-100"
      } else if (status?.includes("Đến") || status?.includes("Đang khám")) {
        badgeClass = "bg-teal-50 text-teal-650 border-teal-100"
      } else if (status?.includes("Đặt") || status?.includes("Hẹn")) {
        badgeClass = "bg-blue-50 text-blue-650 border-blue-100"
      }

      return (
        <Badge variant="outline" className={`w-fit text-[10px] h-5 px-2 font-bold ${badgeClass}`}>
          {status || "Đặt Hẹn"}
        </Badge>
      )
    }
  },
  {
    accessorKey: "branch_name",
    header: "Chi nhánh",
    cell: ({ row }) => (
      <span className="text-xs font-bold text-zinc-650 flex items-center gap-1">
        <Building2 className="w-3.5 h-3.5 text-zinc-400" />
        {row.getValue("branch_name") || "N/A"}
      </span>
    )
  },
  {
    accessorKey: "type_name",
    header: "Loại",
    cell: ({ row }) => {
      const type = row.getValue("type_name") as string
      const isTuVan = type?.toLowerCase().includes("tư vấn")
      return (
        <Badge variant="secondary" className={`text-[10px] h-5 px-1.5 font-bold ${isTuVan ? 'bg-purple-100 text-purple-700' : 'bg-indigo-100 text-indigo-700'}`}>
          {type || "Điều trị"}
        </Badge>
      )
    }
  },
  {
    accessorKey: "sale_time_date",
    header: "Sale & Thời gian",
    cell: ({ row }) => (
      <span className="text-xs font-semibold text-zinc-600 font-mono">
        {row.getValue("sale_time_date") || "N/A"}
      </span>
    )
  },
  {
    accessorKey: "source_name",
    header: "Nguồn khách",
    cell: ({ row }) => (
      <Badge variant="outline" className="text-[10px] font-medium text-zinc-600 border-zinc-200 bg-zinc-50">
        {row.getValue("source_name") || "Khách Giới Thiệu"}
      </Badge>
    )
  }
]
