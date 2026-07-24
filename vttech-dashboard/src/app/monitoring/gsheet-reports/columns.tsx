"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { Calendar, Eye } from "lucide-react"

export type GsheetReportColumn = {
  id: number
  report_date: string
  status: string
  total_db: number
  total_sheet: number
  diff: number
  report_content: string
}

export const getColumns = (onViewDetail: (report: GsheetReportColumn) => void): ColumnDef<GsheetReportColumn>[] => [
  {
    accessorKey: "report_date",
    header: "Thời gian",
    cell: ({ row }) => {
      const date = new Date(row.getValue("report_date"))
      return (
        <div className="flex flex-col">
          <span className="font-bold flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-blue-500" />
            {date.toLocaleDateString('vi-VN')}
          </span>
          <span className="text-[10px] font-medium text-muted-foreground ml-5">
            {date.toLocaleTimeString('vi-VN')}
          </span>
        </div>
      )
    }
  },
  {
    accessorKey: "total_db",
    header: "Tổng Khách DB",
    cell: ({ row }) => (
      <span className="font-bold text-slate-800">
        {(row.getValue("total_db") as number).toLocaleString()}
      </span>
    )
  },
  {
    accessorKey: "total_sheet",
    header: "Tổng Khách Sheet",
    cell: ({ row }) => (
      <span className="font-bold text-slate-800">
        {(row.getValue("total_sheet") as number).toLocaleString()}
      </span>
    )
  },
  {
    accessorKey: "diff",
    header: "Chênh lệch mới",
    cell: ({ row }) => {
      const diff = row.getValue("diff") as number;
      return (
        <span className={`font-bold ${diff > 0 ? "text-amber-600" : "text-emerald-600"}`}>
          {diff > 0 ? `+${diff}` : diff}
        </span>
      )
    }
  },
  {
    accessorKey: "status",
    header: "Trạng thái",
    cell: ({ row }) => {
      const status = row.getValue("status") as string
      const isSuccess = status === "success"
      return (
        <Badge variant={isSuccess ? "secondary" : "destructive"} className={`rounded-xl px-4 uppercase text-[10px] font-black ${isSuccess ? "bg-emerald-500/10 text-emerald-600 border-none" : ""}`}>
          {isSuccess ? "Thành công" : "Thất bại"}
        </Badge>
      )
    }
  },
  {
    id: "actions",
    header: "Hành động",
    cell: ({ row }) => (
      <button
        onClick={() => onViewDetail(row.original)}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 hover:text-blue-700 font-bold text-xs rounded-lg transition-all duration-200"
      >
        <Eye className="w-3.5 h-3.5" />
        Chi tiết
      </button>
    )
  }
];
