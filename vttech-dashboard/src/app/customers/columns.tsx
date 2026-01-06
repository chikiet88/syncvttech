"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { useRouter, useSearchParams } from "next/navigation"
import { Phone, Mail, Landmark, Wallet, MapPin, Calendar, CreditCard, Stethoscope, ConciergeBell, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export type CustomerColumn = {
  id: number
  code: string | null
  name: string
  phone: string | null
  email: string | null
  total_spent: number
  total_debt: number
  point: number
  is_active: number
  branch_name?: string
  appointment_count: number
  payment_count: number
  treatment_count: number
  service_tab_count: number
}

const SortableHeader = ({ title, sortKey }: { title: string, sortKey: string }) => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const currentSortBy = searchParams.get("sortBy")
  const currentSortOrder = searchParams.get("sortOrder")

  const isSorted = currentSortBy === sortKey

  const handleSort = () => {
    const params = new URLSearchParams(searchParams.toString())
    if (isSorted) {
      if (currentSortOrder === "desc") {
        params.set("sortOrder", "asc")
      } else {
        params.delete("sortBy")
        params.delete("sortOrder")
      }
    } else {
      params.set("sortBy", sortKey)
      params.set("sortOrder", "desc")
    }
    router.push(`?${params.toString()}`)
  }

  return (
    <Button
      variant="ghost"
      onClick={handleSort}
      className={`hover:bg-transparent p-0 font-bold uppercase tracking-widest text-[10px] flex items-center gap-1 ${isSorted ? "text-blue-600" : ""}`}
    >
      {title}
      {isSorted ? (
        currentSortOrder === "desc" ? <ArrowDown className="w-3 h-3" /> : <ArrowUp className="w-3 h-3" />
      ) : (
        <ArrowUpDown className="w-3 h-3 opacity-30" />
      )}
    </Button>
  )
}

export const columns: ColumnDef<CustomerColumn>[] = [
  {
    accessorKey: "code",
    header: "Mã KH",
    cell: ({ row }) => <span className="font-mono text-xs font-bold text-blue-500">{row.getValue("code") || `C-${row.original.id}`}</span>
  },
  {
    accessorKey: "name",
    header: () => <SortableHeader title="Khách hàng" sortKey="name" />,
    cell: ({ row }) => (
      <div className="flex flex-col gap-0.5">
        <Link
          href={`/customers/${row.original.id}`}
          className="font-semibold hover:text-blue-500 transition-colors"
        >
          {row.getValue("name")}
        </Link>
        <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
          {row.original.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {row.original.phone}</span>}
          {row.original.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {row.original.email}</span>}
        </div>
      </div>
    )
  },
  {
    accessorKey: "branch_name",
    header: "Chi nhánh",
    cell: ({ row }) => (
      <div className="flex items-center gap-2 text-muted-foreground font-medium italic">
        <MapPin className="w-3 h-3" />
        {row.getValue("branch_name")}
      </div>
    )
  },
  {
    accessorKey: "total_spent",
    header: () => <SortableHeader title="Tổng chi" sortKey="total_spent" />,
    cell: ({ row }) => (
      <div className="flex items-center gap-2 font-bold text-emerald-500">
        <Landmark className="w-4 h-4 opacity-50" />
        {new Intl.NumberFormat('vi-VN').format(Number(row.getValue("total_spent")))} đ
      </div>
    )
  },
  {
    accessorKey: "total_debt",
    header: () => <SortableHeader title="Nợ" sortKey="total_debt" />,
    cell: ({ row }) => (
      <div className="flex items-center gap-2 font-bold text-red-500">
        <Wallet className="w-4 h-4 opacity-50" />
        {new Intl.NumberFormat('vi-VN').format(Number(row.getValue("total_debt")))} đ
      </div>
    )
  },
  {
    accessorKey: "point",
    header: "Điểm",
    cell: ({ row }) => (
      <Badge variant="outline" className="rounded-full bg-purple-500/10 text-purple-500 border-none font-bold">
        {row.getValue("point") as number} đ
      </Badge>
    )
  },
  {
    accessorKey: "appointment_count",
    header: "Lịch hẹn",
    cell: ({ row }) => (
      <Badge variant="outline" className="rounded-xl bg-orange-500/10 text-orange-600 border-none font-bold gap-1">
        <Calendar className="w-3 h-3" />
        {row.getValue("appointment_count")}
      </Badge>
    )
  },
  {
    accessorKey: "payment_count",
    header: "Thanh toán",
    cell: ({ row }) => (
      <Badge variant="outline" className="rounded-xl bg-blue-500/10 text-blue-600 border-none font-bold gap-1">
        <CreditCard className="w-3 h-3" />
        {row.getValue("payment_count")}
      </Badge>
    )
  },
  {
    accessorKey: "treatment_count",
    header: "Điều trị",
    cell: ({ row }) => (
      <Badge variant="outline" className="rounded-xl bg-purple-500/10 text-purple-600 border-none font-bold gap-1">
        <Stethoscope className="w-3 h-3" />
        {row.getValue("treatment_count")}
      </Badge>
    )
  },
  {
    accessorKey: "service_tab_count",
    header: "Dịch vụ",
    cell: ({ row }) => (
      <Badge variant="outline" className="rounded-xl bg-emerald-500/10 text-emerald-600 border-none font-bold gap-1">
        <ConciergeBell className="w-3 h-3" />
        {row.getValue("service_tab_count")}
      </Badge>
    )
  },
  {
    accessorKey: "is_active",
    header: "Trạng thái",
    cell: ({ row }) => {
      const isActive = row.getValue("is_active") === 1
      return (
        <div className={`w-2.5 h-2.5 rounded-full ${isActive ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-red-500 opacity-50"}`} />
      )
    }
  },
]

