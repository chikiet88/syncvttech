import prisma from "@/lib/db"
import { DataTable } from "@/components/ui/data-table"
import { columns, TreatmentColumn } from "./columns"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Stethoscope, FileText, Download } from "lucide-react"
import { Button } from "@/components/ui/button"

export default async function TreatmentsPage() {
  const treatments = await prisma.treatment.findMany({
    take: 100,
    orderBy: {
      treatment_date: "desc"
    }
  })

  // Format data for the table
  const formattedTreatments: TreatmentColumn[] = treatments.map((item: any) => ({
    id: item.id,
    treatment_date: item.treatment_date?.toISOString() || null,
    customer_name: item.customer_name,
    branch_name: item.branch_name,
    service_name: item.service_name,
    amount: item.amount,
    paid: item.paid,
    status: item.status,
  }))

  return (
    <div className="p-8 space-y-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Stethoscope className="w-8 h-8 text-emerald-500" />
            Liệu trình Điều trị
          </h2>
          <p className="text-muted-foreground">
            Lịch sử các quy trình y tế và các buổi điều trị đã thực hiện.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="rounded-xl gap-2 glass border-none">
            <Download className="w-4 h-4" />
            Báo cáo
          </Button>
          <Button className="rounded-xl gap-2 font-bold bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-500/20">
            <FileText className="w-5 h-5" />
            Ghi nhận mới
          </Button>
        </div>
      </div>

      <Card className="glass border-none shadow-2xl rounded-[2rem] overflow-hidden">
        <CardHeader className="p-8 pb-4">
          <CardTitle>Lịch sử Buổi điều trị</CardTitle>
          <CardDescription>Theo dõi chi tiết các quy trình và trạng thái thanh toán.</CardDescription>
        </CardHeader>
        <CardContent className="p-8 pt-4">
          <DataTable columns={columns} data={formattedTreatments} searchKey="customer_name" />
        </CardContent>
      </Card>
    </div>
  )
}
