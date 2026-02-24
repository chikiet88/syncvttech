export const dynamic = "force-dynamic";
import { DataTable } from "@/components/ui/data-table"
import { columns, PbxCallRecordColumn } from "./columns"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Phone, PhoneIncoming, PhoneOutgoing, Clock } from "lucide-react"
import { PbxActions } from "./actions"
import prisma from "@/lib/db"

export default async function PbxRecordsPage() {
  const records = await prisma.pbxCallRecord.findMany({
    take: 100,
    orderBy: { start_time: 'desc' },
  })

  // Format data for the table
  const formattedRecords: PbxCallRecordColumn[] = records.map((item: any) => ({
    id: item.id,
    uuid: item.uuid,
    direction: item.direction || "N/A",
    caller_id_number: item.caller_id_number || "N/A",
    outbound_caller_id_number: item.outbound_caller_id_number || "N/A",
    destination_number: item.destination_number || "N/A",
    start_time: item.start_time?.toISOString() || item.created_at.toISOString(),
    duration: item.duration || 0,
    billsec: item.billsec || 0,
    call_status: item.call_status || "N/A",
    record_path: item.record_path,
  }))

  // Stats calculation
  const totalCalls = formattedRecords.length;
  const answeredCalls = formattedRecords.filter(r => r.call_status === 'ANSWERED').length;
  const totalDuration = formattedRecords.reduce((acc, curr) => acc + curr.duration, 0);
  const avgDuration = totalCalls > 0 ? Math.round(totalDuration / totalCalls) : 0;

  return (
    <div className="p-8 space-y-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Phone className="w-8 h-8 text-blue-500" />
            Lịch sử Cuộc gọi
          </h2>
          <p className="text-muted-foreground">
            Danh sách chi tiết các cuộc gọi đi và đến từ hệ thống tổng đài PBX.
          </p>
        </div>
        <PbxActions />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="glass border-none shadow-xl rounded-3xl overflow-hidden">
            <CardHeader className="pb-2">
                <CardDescription className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
                    <PhoneOutgoing className="w-3 h-3 text-blue-500" />
                    Tổng cuộc gọi (Top 100)
                </CardDescription>
                <CardTitle className="text-3xl font-black">{totalCalls}</CardTitle>
            </CardHeader>
        </Card>
        <Card className="glass border-none shadow-xl rounded-3xl overflow-hidden">
            <CardHeader className="pb-2">
                <CardDescription className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
                    <PhoneIncoming className="w-3 h-3 text-emerald-500" />
                    Đã trả lời
                </CardDescription>
                <CardTitle className="text-3xl font-black text-emerald-600">{answeredCalls}</CardTitle>
            </CardHeader>
        </Card>
        <Card className="glass border-none shadow-xl rounded-3xl overflow-hidden">
            <CardHeader className="pb-2">
                <CardDescription className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
                    <Clock className="w-3 h-3 text-orange-500" />
                    T.Lượng Trung bình
                </CardDescription>
                <CardTitle className="text-3xl font-black">{Math.floor(avgDuration / 60)}m {avgDuration % 60}s</CardTitle>
            </CardHeader>
        </Card>
      </div>

      <Card className="glass border-none shadow-2xl rounded-[2rem] overflow-hidden">
        <CardHeader className="p-8 pb-4">
          <CardTitle>Chi tiết Cuộc gọi</CardTitle>
          <CardDescription>Hiển thị 100 cuộc gọi gần nhất trong máy chủ.</CardDescription>
        </CardHeader>
        <CardContent className="p-8 pt-4">
          <DataTable columns={columns} data={formattedRecords} searchKey="destination_number" />
        </CardContent>
      </Card>
    </div>
  )
}
