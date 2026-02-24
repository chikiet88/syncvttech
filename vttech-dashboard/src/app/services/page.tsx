export const dynamic = "force-dynamic";
import prisma from "@/lib/db"
import { DataTable } from "@/components/ui/data-table"
import { columns, ServiceColumn } from "./columns"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Package, Plus, Search } from "lucide-react"
import { Button } from "@/components/ui/button"

export default async function ServicesPage() {
  const services = await prisma.service.findMany({
    orderBy: {
      name: "asc"
    }
  })

  // Format data for the table
  const formattedServices: ServiceColumn[] = services.map((item: any) => ({
    id: item.id,
    code: item.code,
    name: item.name,
    price: item.price,
    duration: item.duration,
    is_active: item.is_active,
  }))

  return (
    <div className="p-8 space-y-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Package className="w-8 h-8 text-blue-500" />
            Danh mục Dịch vụ
          </h2>
          <p className="text-muted-foreground">
            Xem và quản lý các liệu trình, dịch vụ và bảng giá.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button className="rounded-xl gap-2 font-bold bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/20">
            <Plus className="w-5 h-5" />
            Thêm Dịch vụ
          </Button>
        </div>
      </div>

      <Card className="glass border-none shadow-2xl rounded-[2rem] overflow-hidden">
        <CardHeader className="p-8 pb-4">
          <CardTitle>Danh sách Chính</CardTitle>
          <CardDescription>Tất cả các dịch vụ đã đăng ký trong hệ thống VTTech Studio.</CardDescription>
        </CardHeader>
        <CardContent className="p-8 pt-4">
          <DataTable columns={columns} data={formattedServices} searchKey="name" />
        </CardContent>
      </Card>
    </div>
  )
}
