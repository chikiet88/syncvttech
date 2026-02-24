export const dynamic = "force-dynamic";
import prisma from "@/lib/db"
import { DataTable } from "@/components/ui/data-table"
import { columns, AppointmentColumn } from "./columns"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { CalendarRange, Plus, CalendarCheck2 } from "lucide-react"
import { Button } from "@/components/ui/button"

export default async function AppointmentsPage() {
  const appointments = await prisma.appointment.findMany({
    take: 100,
    orderBy: {
      appointment_date: "desc"
    }
  })

  // Format data for the table
  const formattedAppointments: AppointmentColumn[] = appointments.map((item: any) => ({
    id: item.id,
    appointment_date: item.appointment_date?.toISOString() || null,
    customer_name: item.customer_name,
    phone: item.phone,
    branch_name: item.branch_name,
    service_name: item.service_name,
    employee_name: item.employee_name,
    status: item.status,
  }))

  return (
    <div className="p-8 space-y-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <CalendarRange className="w-8 h-8 text-blue-500" />
            Quản lý Lịch hẹn
          </h2>
          <p className="text-muted-foreground">
            Theo dõi và quản lý lịch hẹn khách hàng và lịch thực hiện dịch vụ.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="rounded-xl gap-2 glass border-none">
            <CalendarCheck2 className="w-4 h-4" />
            Xem hôm nay
          </Button>
          <Button className="rounded-xl gap-2 font-bold bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/20">
            <Plus className="w-5 h-5" />
            Đặt lịch mới
          </Button>
        </div>
      </div>

      <Card className="glass border-none shadow-2xl rounded-[2rem] overflow-hidden">
        <CardHeader className="p-8 pb-4">
          <CardTitle>Hàng đợi Lịch hẹn</CardTitle>
          <CardDescription>Đồng bộ trực tiếp các lịch hẹn khách hàng và trạng thái hiện tại.</CardDescription>
        </CardHeader>
        <CardContent className="p-8 pt-4">
          <DataTable columns={columns} data={formattedAppointments} searchKey="customer_name" />
        </CardContent>
      </Card>
    </div>
  )
}
