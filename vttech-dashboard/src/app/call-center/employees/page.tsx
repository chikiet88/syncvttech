import { DataTable } from "@/components/ui/data-table"
import { columns, PbxEmployeeColumn } from "./columns"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Users } from "lucide-react"
import prisma from "@/lib/db"

export default async function PbxEmployeesPage() {
  const employees = await prisma.pbxEmployee.findMany({
    orderBy: { name: 'asc' },
  })

  // Format data for the table
  const formattedEmployees: PbxEmployeeColumn[] = employees.map((item: any) => ({
    id: item.id,
    vttech_id: item.vttech_id,
    name: item.name,
    code: item.code,
    phone: item.phone,
    extension: item.extension,
    group_name: item.group_name,
    department: item.department,
    position: item.position,
    is_active: item.is_active,
  }))

  return (
    <div className="p-8 space-y-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Users className="w-8 h-8 text-blue-500" />
            Nhân viên Tổng đài
          </h2>
          <p className="text-muted-foreground">
            Danh sách nhân viên được gán Extension để xử lý cuộc gọi.
          </p>
        </div>
      </div>

      <Card className="glass border-none shadow-2xl rounded-[2rem] overflow-hidden">
        <CardHeader className="p-8 pb-4">
          <CardTitle>Danh bạ Nội bộ</CardTitle>
          <CardDescription>Tra cứu nhanh nhân viên và số Extension tương ứng.</CardDescription>
        </CardHeader>
        <CardContent className="p-8 pt-4">
          <DataTable columns={columns} data={formattedEmployees} searchKey="name" />
        </CardContent>
      </Card>
    </div>
  )
}
