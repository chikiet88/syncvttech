"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { Phone, Key, ShieldCheck } from "lucide-react"

export type PbxExtensionColumn = {
  id: number
  vttech_id: number
  extension: string
  password: string | null
  is_active: number
}

export const columns: ColumnDef<PbxExtensionColumn>[] = [
  {
    accessorKey: "extension",
    header: "Số Extension",
    cell: ({ row }) => (
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-2xl bg-slate-100 flex items-center justify-center text-blue-600 font-black text-lg shadow-sm border border-black/5">
            {row.getValue("extension")}
        </div>
        <div className="flex flex-col">
          <span className="font-bold text-sm">Line {row.getValue("extension")}</span>
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">VT ID: {row.original.vttech_id}</span>
        </div>
      </div>
    )
  },
  {
    accessorKey: "password",
    header: "Mật khẩu SIP",
    cell: ({ row }) => {
        const pass = row.getValue("password") as string
        return (
            <div className="flex items-center gap-2 group cursor-pointer">
                <Key className="w-4 h-4 text-muted-foreground opacity-50" />
                <span className="font-mono text-xs bg-slate-100 px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity">
                    {pass || "********"}
                </span>
                <span className="text-[10px] text-muted-foreground group-hover:hidden italic">Rê chuột để xem</span>
            </div>
        )
    }
  },
  {
    accessorKey: "is_active",
    header: "Bảo mật",
    cell: ({ row }) => {
      return (
        <div className="flex items-center gap-2 text-emerald-600 font-bold text-[10px] uppercase">
            <ShieldCheck className="w-4 h-4" />
            Đã mã hóa
        </div>
      )
    }
  },
  {
    accessorKey: "is_active",
    header: "Trạng thái",
    cell: ({ row }) => {
      const isActive = row.getValue("is_active") === 1
      return (
        <Badge variant={isActive ? "secondary" : "outline"} className={`rounded-xl px-4 uppercase text-[10px] font-black ${isActive ? "bg-emerald-500/10 text-emerald-600 border-none" : ""}`}>
          {isActive ? "Sẵn sàng" : "Khóa"}
        </Badge>
      )
    }
  },
]
