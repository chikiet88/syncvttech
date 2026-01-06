"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar, Phone, PhoneForwarded, PhoneIncoming, Clock, PlayCircle } from "lucide-react"

export type PbxCallRecordColumn = {
  id: number
  uuid: string
  direction: string
  caller_id_number: string
  outbound_caller_id_number: string
  destination_number: string
  start_time: string
  duration: number
  billsec: number
  call_status: string
  record_path: string | null
}

export const columns: ColumnDef<PbxCallRecordColumn>[] = [
  {
    accessorKey: "start_time",
    header: "Thời gian",
    cell: ({ row }) => {
      const date = new Date(row.getValue("start_time"))
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
    accessorKey: "direction",
    header: "Hướng",
    cell: ({ row }) => {
      const direction = row.getValue("direction") as string
      const isInbound = direction === "inbound"
      return (
        <Badge variant="outline" className={`gap-2 border-white/5 glass font-bold uppercase tracking-tighter text-[10px] ${isInbound ? "text-blue-500" : "text-orange-500"}`}>
          {isInbound ? <PhoneIncoming className="w-3 h-3" /> : <PhoneForwarded className="w-3 h-3" />}
          {isInbound ? "Gọi đến" : "Gọi đi"}
        </Badge>
      )
    }
  },
  {
    accessorKey: "caller_id_number",
    header: "Extension/Từ",
    cell: ({ row }) => (
      <div className="flex items-center gap-2 font-mono font-bold">
        <Phone className="w-3 h-3 text-muted-foreground opacity-50" />
        {row.getValue("caller_id_number") || row.original.outbound_caller_id_number || "N/A"}
      </div>
    )
  },
  {
    accessorKey: "destination_number",
    header: "Đến",
    cell: ({ row }) => (
      <div className="flex items-center gap-2 font-mono font-bold text-blue-600">
        <PhoneForwarded className="w-3 h-3 opacity-50" />
        {row.getValue("destination_number")}
      </div>
    )
  },
  {
    accessorKey: "duration",
    header: "Thời lượng",
    cell: ({ row }) => {
      const duration = row.getValue("duration") as number
      const minutes = Math.floor(duration / 60)
      const seconds = duration % 60
      return (
        <div className="flex items-center gap-2 text-xs font-semibold">
          <Clock className="w-4 h-4 text-muted-foreground" />
          {minutes > 0 ? `${minutes}m ` : ""}{seconds}s
        </div>
      )
    }
  },
  {
    accessorKey: "call_status",
    header: "Trạng thái",
    cell: ({ row }) => {
      const status = row.getValue("call_status") as string
      const isAnswered = status === "ANSWERED"
      const isCanceled = status === "CANCELED" || status === "NO_ANSWER"
      
      return (
        <Badge 
          variant={isAnswered ? "secondary" : (isCanceled ? "destructive" : "outline")} 
          className={`rounded-xl px-4 uppercase text-[10px] font-black ${isAnswered ? "bg-emerald-500/10 text-emerald-600 border-none" : ""}`}
        >
          {status}
        </Badge>
      )
    }
  },
  {
    id: "actions",
    header: "Ghi âm",
    cell: ({ row }) => {
      const recordPath = row.original.record_path
      if (!recordPath) return <span className="text-muted-foreground italic text-[10px]">No record</span>
      
      return (
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full hover:bg-blue-50 text-blue-600">
           <PlayCircle className="h-5 w-5" />
        </Button>
      )
    }
  }
]
