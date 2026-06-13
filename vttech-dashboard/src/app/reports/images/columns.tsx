"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Calendar, User, Phone, Tag, Building2, FolderOpen, ImageIcon } from "lucide-react"

export type ImageFolderColumn = {
  id: number
  date: string
  customerId: number
  customerName: string
  customerCode: string
  phone: string
  folderName: string
  imagesCount: number
  branchName: string
}

export const columns: ColumnDef<ImageFolderColumn>[] = [
  {
    accessorKey: "date",
    header: "Ngày ghi nhận",
    cell: ({ row }) => {
      const date = new Date(row.getValue("date"))
      return (
        <span className="font-bold flex items-center gap-1.5 text-zinc-600 text-[11px] tabular-nums">
          <Calendar className="w-3 h-3 text-zinc-400" />
          {date.toLocaleDateString('vi-VN')}
        </span>
      )
    }
  },
  {
    accessorKey: "customerName",
    header: "Khách hàng",
    cell: ({ row }) => (
      <div className="flex flex-col gap-0.5">
        <span className="font-extrabold flex items-center gap-1.5 text-zinc-900 text-[11px]">
          <User className="w-3 h-3 text-emerald-500" />
          {row.getValue("customerName")}
        </span>
        <div className="flex items-center gap-2 ml-4">
          <span className="text-[10px] font-bold text-zinc-400 flex items-center gap-1">
            <Tag className="w-2.5 h-2.5" />
            {row.original.customerCode || `C-${row.original.customerId}`}
          </span>
          <span className="text-[10px] font-bold text-zinc-400 flex items-center gap-1">
            <Phone className="w-2.5 h-2.5" />
            {row.original.phone || "N/A"}
          </span>
        </div>
      </div>
    )
  },
  {
    accessorKey: "folderName",
    header: "Thư mục đính kèm",
    cell: ({ row }) => (
      <span className="font-extrabold flex items-center gap-1.5 text-zinc-800 text-[11px]">
        <FolderOpen className="w-3 h-3 text-amber-500" />
        {row.getValue("folderName")}
      </span>
    )
  },
  {
    accessorKey: "imagesCount",
    header: "Số lượng File/Ảnh",
    cell: ({ row }) => (
      <span className="font-bold flex items-center gap-1.5 text-zinc-700 text-[11px] tabular-nums">
        <ImageIcon className="w-3 h-3 text-teal-500" />
        {row.getValue("imagesCount")} files
      </span>
    )
  },
  {
    accessorKey: "branchName",
    header: "Chi nhánh",
    cell: ({ row }) => (
      <span className="font-bold flex items-center gap-1.5 text-zinc-500 text-[11px]">
        <Building2 className="w-3 h-3 text-zinc-400" />
        {row.getValue("branchName")}
      </span>
    )
  }
]
