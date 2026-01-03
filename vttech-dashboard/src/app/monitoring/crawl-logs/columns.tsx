"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { Calendar, Activity, Database, Clock, AlertCircle } from "lucide-react"

export type CrawlLogColumn = {
  id: number
  crawl_date: string
  crawl_type: string
  status: string
  records_count: number
  duration_seconds: number | null
  error_message: string | null
}

export const columns: ColumnDef<CrawlLogColumn>[] = [
  {
    accessorKey: "crawl_date",
    header: "Timestamp",
    cell: ({ row }) => {
      const date = new Date(row.getValue("crawl_date"))
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
    accessorKey: "crawl_type",
    header: "Process Type",
    cell: ({ row }) => (
      <Badge variant="outline" className="gap-2 border-white/5 glass font-bold uppercase tracking-tighter text-[10px]">
        <Activity className="w-3 h-3 text-blue-500" />
        {row.getValue("crawl_type")}
      </Badge>
    )
  },
  {
    accessorKey: "records_count",
    header: "Records",
    cell: ({ row }) => (
      <div className="flex items-center gap-2 font-mono font-bold">
        <Database className="w-4 h-4 text-muted-foreground opacity-50" />
        {row.getValue("records_count")}
      </div>
    )
  },
  {
    accessorKey: "duration_seconds",
    header: "Duration",
    cell: ({ row }) => (
      <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
        <Clock className="w-4 h-4" />
        {(row.getValue("duration_seconds") as number | null)?.toFixed(2) || "0.00"}s
      </div>
    )
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.getValue("status") as string
      const isSuccess = status === "success"
      return (
        <Badge variant={isSuccess ? "secondary" : "destructive"} className={`rounded-xl px-4 uppercase text-[10px] font-black ${isSuccess ? "bg-emerald-500/10 text-emerald-500 border-none" : ""}`}>
          {status}
        </Badge>
      )
    }
  },
  {
    accessorKey: "error_message",
    header: "Error Details",
    cell: ({ row }) => {
      const error = row.getValue("error_message") as string
      if (!error) return <span className="text-muted-foreground italic text-xs">No errors</span>
      return (
        <div className="flex items-center gap-2 text-red-500 text-xs font-medium max-w-[200px] truncate">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )
    }
  },
]
