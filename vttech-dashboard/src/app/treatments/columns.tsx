"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { Calendar, User, Stethoscope, Landmark, BadgeDollarSign } from "lucide-react"

export type TreatmentColumn = {
  id: number
  treatment_date: string | null
  customer_name: string | null
  branch_name: string | null
  service_name: string | null
  amount: number
  paid: number
  status: number
}

export const columns: ColumnDef<TreatmentColumn>[] = [
  {
    accessorKey: "treatment_date",
    header: "Ngày",
    cell: ({ row }) => {
      const date = row.getValue("treatment_date") ? new Date(row.getValue("treatment_date") as string) : null
      return (
        <div className="flex items-center gap-2 font-medium">
          <Calendar className="w-4 h-4 text-blue-500" />
          {date ? date.toLocaleDateString('vi-VN') : "N/A"}
        </div>
      )
    }
  },
  {
    accessorKey: "customer_name",
    header: "Khách hàng",
    cell: ({ row }) => (
      <div className="flex items-center gap-2 font-semibold uppercase tracking-tight">
        <User className="w-4 h-4 text-muted-foreground" />
        {row.getValue("customer_name") || "Thành viên"}
      </div>
    )
  },
  {
    accessorKey: "service_name",
    header: "Dịch vụ Điều trị",
    cell: ({ row }) => (
      <div className="flex items-center gap-2 font-medium text-blue-500">
        <Stethoscope className="w-4 h-4 opacity-50" />
        {row.getValue("service_name") || "Phòng khám Tổng quát"}
      </div>
    )
  },
  {
    accessorKey: "amount",
    header: "Tổng chi phí",
    cell: ({ row }) => (
      <div className="flex flex-col">
        <span className="font-extrabold text-sm">{new Intl.NumberFormat('vi-VN').format(row.getValue("amount"))} đ</span>
        <div className="flex items-center gap-1.5 mt-0.5">
           <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-white/10 glass bg-white/5 uppercase font-bold text-muted-foreground">
             Fee
           </Badge>
        </div>
      </div>
    )
  },
  {
    accessorKey: "paid",
    header: "Đã thanh toán",
    cell: ({ row }) => {
      const amount = row.original.amount
      const paid = row.getValue("paid") as number
      const isFull = paid >= amount && amount > 0
      return (
        <div className="flex flex-col">
          <span className={`font-extrabold text-sm ${isFull ? "text-emerald-500" : "text-amber-500"}`}>
            {new Intl.NumberFormat('vi-VN').format(paid)} đ
          </span>
          <div className="flex items-center gap-1.5 mt-0.5">
             <Badge variant="outline" className={`text-[9px] px-1.5 py-0 border-none glass uppercase font-bold ${isFull ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"}`}>
               {isFull ? "Đã thanh toán" : "Một phần"}
             </Badge>
          </div>
        </div>
      )
    }
  },
  {
    accessorKey: "status",
    header: "Trạng thái",
    cell: ({ row }) => {
      const status = row.getValue("status")
      return (
        <Badge variant={status === 1 ? "secondary" : "default"} className={`rounded-full px-3 uppercase text-[10px] font-black ${status === 1 ? "bg-emerald-500/10 text-emerald-600 border-none" : ""}`}>
          {status === 1 ? "Hoàn tất" : "Đang thực hiện"}
        </Badge>
      )
    }
  },
]
