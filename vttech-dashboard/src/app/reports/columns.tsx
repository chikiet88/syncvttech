"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Building2, Users, Scissors, Activity, CalendarCheck, DollarSign, Wallet } from "lucide-react"
import Link from "next/link"

export type BranchSummary = {
  id: number
  name: string
  customerCount: number
  serviceCount: number
  treatmentCount: number
  appointmentCount: number
  totalSales: number
  totalRevenue: number
  queryDateFrom?: string
  queryDateTo?: string
}

export const columns: ColumnDef<BranchSummary>[] = [
  {
    accessorKey: "id",
    header: "ID",
    cell: ({ row }) => (
      <span className="text-[10px] font-bold text-slate-400 tabular-nums">#{row.getValue("id")}</span>
    )
  },
  {
    accessorKey: "name",
    header: "Chi nhánh",
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <div className="p-1.5 bg-indigo-50 rounded-lg text-indigo-600">
          <Building2 className="w-3.5 h-3.5" />
        </div>
        <span className="font-bold text-slate-900 truncate">
          {row.getValue("name")}
        </span>
      </div>
    )
  },
  {
    accessorKey: "customerCount",
    header: "Khách hàng",
    cell: ({ row }) => {
      const { id, queryDateFrom, queryDateTo } = row.original
      return (
        <Link 
          href={`/reports/customers?branchId=${id}&from=${queryDateFrom || ""}&to=${queryDateTo || ""}`}
          className="flex items-center gap-1.5 hover:bg-emerald-50 px-2 py-1 -ml-2 rounded-md transition-colors cursor-pointer group"
        >
          <Users className="w-3 h-3 text-emerald-500 group-hover:scale-110 transition-transform" />
          <span className="font-semibold text-slate-700 tabular-nums group-hover:text-emerald-700 transition-colors">
            {Number(row.getValue("customerCount")).toLocaleString()}
          </span>
        </Link>
      )
    }
  },
  {
    accessorKey: "serviceCount",
    header: "Dịch vụ",
    cell: ({ row }) => {
      const { id, queryDateFrom, queryDateTo } = row.original
      return (
        <Link 
          href={`/reports/services?branchId=${id}&from=${queryDateFrom || ""}&to=${queryDateTo || ""}&service_only=true`}
          className="flex items-center gap-1.5 hover:bg-blue-50 px-2 py-1 -ml-2 rounded-md transition-colors cursor-pointer group"
        >
          <Scissors className="w-3 h-3 text-blue-500 group-hover:scale-110 transition-transform" />
          <span className="font-semibold text-slate-700 tabular-nums group-hover:text-blue-700 transition-colors">
            {Number(row.getValue("serviceCount")).toLocaleString()}
          </span>
        </Link>
      )
    }
  },
  {
    accessorKey: "treatmentCount",
    header: "Điều trị",
    cell: ({ row }) => {
      const { id, queryDateFrom, queryDateTo } = row.original
      return (
        <Link 
          href={`/reports/treatments?branchId=${id}&from=${queryDateFrom || ""}&to=${queryDateTo || ""}`}
          className="flex items-center gap-1.5 hover:bg-amber-50 px-2 py-1 -ml-2 rounded-md transition-colors cursor-pointer group"
        >
          <Activity className="w-3 h-3 text-amber-500 group-hover:scale-110 transition-transform" />
          <span className="font-semibold text-slate-700 tabular-nums group-hover:text-amber-700 transition-colors">
            {Number(row.getValue("treatmentCount")).toLocaleString()}
          </span>
        </Link>
      )
    }
  },
  {
    accessorKey: "appointmentCount",
    header: "Lịch hẹn",
    cell: ({ row }) => {
      const { id, queryDateFrom, queryDateTo } = row.original
      return (
        <Link 
          href={`/reports/appointments?branchId=${id}&from=${queryDateFrom || ""}&to=${queryDateTo || ""}`}
          className="flex items-center gap-1.5 hover:bg-purple-50 px-2 py-1 -ml-2 rounded-md transition-colors cursor-pointer group"
        >
          <CalendarCheck className="w-3 h-3 text-purple-500 group-hover:scale-110 transition-transform" />
          <span className="font-semibold text-slate-700 tabular-nums group-hover:text-purple-700 transition-colors">
            {Number(row.getValue("appointmentCount")).toLocaleString()}
          </span>
        </Link>
      )
    }
  },
  {
    accessorKey: "totalSales",
    header: "Doanh số",
    cell: ({ row }) => {
      const val = Number(row.getValue("totalSales"))
      const { id, queryDateFrom, queryDateTo } = row.original
      return (
        <Link 
          href={`/reports/sales?branchId=${id}&from=${queryDateFrom || ""}&to=${queryDateTo || ""}&focus=Amount`}
          className="flex items-center gap-1.5 px-2 py-1 bg-slate-50 hover:bg-slate-100 rounded-md w-fit cursor-pointer transition-colors group"
        >
          <DollarSign className="w-3 h-3 text-slate-500 group-hover:text-slate-800 transition-colors" />
          <span className="font-black text-slate-700 tabular-nums group-hover:text-slate-900 transition-colors">
            {new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(val)}đ
          </span>
        </Link>
      )
    }
  },
  {
    accessorKey: "totalRevenue",
    header: "Doanh thu",
    cell: ({ row }) => {
      const val = Number(row.getValue("totalRevenue"))
      const { id, queryDateFrom, queryDateTo } = row.original
      return (
        <Link 
          href={`/reports/revenue?branchId=${id}&dateFrom=${queryDateFrom || ""}&dateTo=${queryDateTo || ""}`}
          className="flex items-center gap-1.5 px-2 py-1 bg-indigo-600 hover:bg-indigo-700 rounded-md w-fit text-white cursor-pointer transition-all hover:shadow-md hover:shadow-indigo-500/20 group"
        >
          <Wallet className="w-3 h-3 text-indigo-200 group-hover:text-white transition-colors" />
          <span className="font-black tabular-nums">
            {new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(val)}đ
          </span>
        </Link>
      )
    }
  }
]
