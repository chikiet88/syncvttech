"use client"

import { ColumnDef } from "@tanstack/react-table"
import { User, Phone, Calendar, Tag, Building2 } from "lucide-react"

export type CustomerColumn = {
  id: number
  date: string
  customerId: number
  customerName: string
  customerCode: string
  phone: string
  branchId: number
}

export const columns: ColumnDef<CustomerColumn>[] = [
  {
    accessorKey: "date",
    header: "Ngày ghi nhận",
    cell: ({ row }) => {
      const date = new Date(row.getValue("date"))
      return (
        <div className="flex flex-col">
          <span className="font-bold flex items-center gap-2 text-slate-700">
            <Calendar className="w-3.5 h-3.5 text-emerald-500" />
            {date.toLocaleDateString('vi-VN')}
          </span>
        </div>
      )
    }
  },
  {
    accessorKey: "customerName",
    header: "Khách hàng",
    cell: ({ row }) => (
      <div className="flex flex-col">
        <span className="font-bold flex items-center gap-2 text-slate-900">
          <User className="w-3.5 h-3.5 text-emerald-500" />
          {row.getValue("customerName")}
        </span>
        <div className="flex flex-col ml-5 mt-1 gap-0.5">
            <span className="text-[10px] font-medium text-slate-500 flex items-center gap-1.5">
                <Tag className="w-2.5 h-2.5" />
                {row.original.customerCode || "Không có mã"}
            </span>
            <span className="text-[10px] font-medium text-slate-500 flex items-center gap-1.5">
                <Phone className="w-2.5 h-2.5" />
                {row.original.phone || "Không có SĐT"}
            </span>
        </div>
      </div>
    )
  },
  {
    accessorKey: "branchId",
    header: "ID Chi nhánh",
    cell: ({ row }) => (
      <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
        <Building2 className="w-3.5 h-3.5 text-slate-400" />
        CN #{row.getValue("branchId")}
      </span>
    )
  }
]
