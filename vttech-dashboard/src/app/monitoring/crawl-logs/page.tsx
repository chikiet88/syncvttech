import { DataTable } from "@/components/ui/data-table"
import { columns, CrawlLogColumn } from "./columns"
import { pbxColumns, PbxSyncLogColumn } from "./pbx-columns"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Activity, Phone, Server } from "lucide-react"
import { CrawlLogActions } from "./actions"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

async function getData(url: string) {
  try {
    const response = await fetch(url, {
      next: { revalidate: 0 }
    })
    if (response.ok) return await response.json()
  } catch (error) {
    console.error(`Failed to fetch from ${url}:`, error)
  }
  return []
}

export default async function CrawlLogsPage() {
  const [crmLogs, pbxLogs] = await Promise.all([
    getData("http://localhost:3001/monitoring/logs"),
    getData("http://localhost:3001/monitoring/pbx-logs")
  ])

  // Format data for the tables
  const formattedCrmLogs: CrawlLogColumn[] = crmLogs.map((item: any) => ({
    id: item.id,
    crawl_date: item.crawl_date,
    crawl_type: item.crawl_type,
    status: item.status,
    records_count: item.records_count,
    total_branches: item.total_branches,
    total_customers: item.total_customers,
    total_payments: item.total_payments,
    total_treatments: item.total_treatments,
    total_services: item.total_services,
    duration_seconds: item.duration_seconds,
    error_message: item.error_message,
  }))

  const formattedPbxLogs: PbxSyncLogColumn[] = pbxLogs.map((item: any) => ({
    id: item.id,
    sync_type: item.sync_type,
    status: item.status,
    start_time: item.start_time,
    end_time: item.end_time,
    date_from: item.date_from,
    date_to: item.date_to,
    total_records: item.total_records,
    success_count: item.success_count,
    failed_count: item.failed_count,
    error_message: item.error_message,
  }))

  return (
    <div className="p-8 space-y-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Activity className="w-8 h-8 text-blue-500" />
            Giám sát Hệ thống
          </h2>
          <p className="text-muted-foreground">
            Trung tâm điều khiển và nhật ký đồng bộ dữ liệu toàn hệ thống.
          </p>
        </div>
        <CrawlLogActions />
      </div>

      <Tabs defaultValue="crm" className="w-full">
        <TabsList className="bg-slate-100 p-1 rounded-2xl mb-6">
          <TabsTrigger value="crm" className="rounded-xl px-8 gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <Server className="w-4 h-4" /> CRM VTTech
          </TabsTrigger>
          <TabsTrigger value="pbx" className="rounded-xl px-8 gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <Phone className="w-4 h-4" /> PBX Call Center
          </TabsTrigger>
        </TabsList>

        <TabsContent value="crm" className="space-y-6">
          <Card className="glass border-none shadow-2xl rounded-[2rem] overflow-hidden">
            <CardHeader className="p-8 pb-4">
              <CardTitle>Nhật ký CRM</CardTitle>
              <CardDescription>Theo dõi đồng bộ khách hàng, doanh thu và dịch vụ.</CardDescription>
            </CardHeader>
            <CardContent className="p-8 pt-4">
              <DataTable columns={columns} data={formattedCrmLogs} searchKey="crawl_type" />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pbx" className="space-y-6">
          <Card className="glass border-none shadow-2xl rounded-[2rem] overflow-hidden">
            <CardHeader className="p-8 pb-4 border-orange-500/10">
              <CardTitle>Nhật ký PBX</CardTitle>
              <CardDescription>Theo dõi đồng bộ lịch sử cuộc gọi (CDR) từ máy chủ tổng đài.</CardDescription>
            </CardHeader>
            <CardContent className="p-8 pt-4">
              <DataTable columns={pbxColumns} data={formattedPbxLogs} searchKey="sync_type" />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
