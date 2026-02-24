export const dynamic = "force-dynamic";
import prisma from "@/lib/db"
import { DataTable } from "@/components/ui/data-table"
import { columns, EmployeeColumn } from "./columns"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Briefcase, UserPlus, FileDown } from "lucide-react"
import { Button } from "@/components/ui/button"

export default async function EmployeesPage() {
  const employees = await prisma.employee.findMany({
    include: {
      branch: true
    },
    orderBy: {
      name: "asc"
    }
  })

  // Format data for the table
  const formattedEmployees: EmployeeColumn[] = employees.map((item: any) => ({
    id: item.id,
    code: item.code,
    name: item.name,
    position: item.position,
    branch_name: item.branch?.name || null,
    phone: item.phone,
    is_active: item.is_active,
  }))

  return (
    <div className="p-8 space-y-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Briefcase className="w-8 h-8 text-blue-500" />
            Danh bạ Nhân viên
          </h2>
          <p className="text-muted-foreground">
            Quản lý nhân viên tại tất cả các chi nhánh và giám sát vai trò.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="rounded-xl gap-2 glass border-none">
            <FileDown className="w-4 h-4" />
            Xuất CSV
          </Button>
          <Button className="rounded-xl gap-2 font-bold bg-blue-600 hover:bg-blue-700">
            <UserPlus className="w-5 h-5" />
            Thêm Nhân viên
          </Button>
        </div>
      </div>

      <Card className="glass border-none shadow-2xl rounded-[2rem] overflow-hidden">
        <CardHeader className="p-8 pb-4">
          <CardTitle>Danh sách Nhân sự</CardTitle>
          <CardDescription>Cái nhìn toàn diện về tất cả nhân viên và các chi nhánh tương ứng.</CardDescription>
        </CardHeader>
        <CardContent className="p-8 pt-4">
          <DataTable columns={columns} data={formattedEmployees} searchKey="name" />
        </CardContent>
      </Card>
    </div>
  )
}
