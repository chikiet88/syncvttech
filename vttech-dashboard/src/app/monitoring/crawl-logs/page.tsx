import prisma from "@/lib/db"
import { DataTable } from "@/components/ui/data-table"
import { columns, CrawlLogColumn } from "./columns"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Activity, RefreshCcw, History } from "lucide-react"
import { Button } from "@/components/ui/button"

export default async function CrawlLogsPage() {
  const logs = await prisma.crawlLog.findMany({
    take: 100,
    orderBy: {
      created_at: "desc"
    }
  })

  // Format data for the table
  const formattedLogs: CrawlLogColumn[] = logs.map((item: any) => ({
    id: item.id,
    crawl_date: item.crawl_date.toISOString(),
    crawl_type: item.crawl_type,
    status: item.status,
    records_count: item.records_count,
    duration_seconds: item.duration_seconds,
    error_message: item.error_message,
  }))

  return (
    <div className="p-8 space-y-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Activity className="w-8 h-8 text-blue-500" />
            Sync Monitoring
          </h2>
          <p className="text-muted-foreground">
            Detailed logs of data synchronization and crawler activities.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="rounded-xl gap-2 glass border-none">
            <RefreshCcw className="w-4 h-4" />
            Refresh
          </Button>
          <Button className="rounded-xl gap-2 font-bold bg-blue-600 hover:bg-blue-700">
            <History className="w-5 h-5" />
            Full History
          </Button>
        </div>
      </div>

      <Card className="glass border-none shadow-2xl rounded-[2rem] overflow-hidden">
        <CardHeader className="p-8 pb-4">
          <CardTitle>Crawl Execution Logs</CardTitle>
          <CardDescription>Track the performance and health of the automated synchronization process.</CardDescription>
        </CardHeader>
        <CardContent className="p-8 pt-4">
          <DataTable columns={columns} data={formattedLogs} searchKey="crawl_type" />
        </CardContent>
      </Card>
    </div>
  )
}
