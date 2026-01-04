import prisma from "@/lib/db"
import { DataTable } from "@/components/ui/data-table"
import { columns, ServiceTabColumn } from "./columns"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Settings, Package, Layers, Info } from "lucide-react"

export default async function ServiceTabsPage() {
  const tabs = await prisma.customerServiceTab.findMany({
    take: 100,
    orderBy: {
      id: "desc"
    },
    include: {
      customer: {
        select: {
          name: true
        }
      }
    }
  })

  const formattedTabs: ServiceTabColumn[] = tabs.map((t) => ({
    id: t.id,
    customer_id: t.customer_id,
    customer_name: t.customer.name,
    service_name: t.service_name,
    quantity: t.quantity,
    price: t.price,
    total: t.total,
    status: t.status,
    created_at: t.created_at ? t.created_at.toISOString() : null,
  }))

  return (
    <div className="p-8 space-y-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Settings className="w-8 h-8 text-orange-500" />
            Quản lý Thẻ Dịch vụ
          </h2>
          <p className="text-muted-foreground">
            Theo dõi các thẻ dịch vụ đang hoạt động và hồ sơ sử dụng của khách hàng.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="glass border-none shadow-xl rounded-[2rem] bg-orange-500/5">
          <CardHeader className="pb-2 text-center">
            <Layers className="w-8 h-8 mx-auto text-orange-500 mb-2" />
            <CardDescription className="text-orange-600 font-bold uppercase tracking-widest text-[10px]">Tổng thẻ Hoạt động</CardDescription>
            <CardTitle className="text-3xl font-black text-orange-700">
              {formattedTabs.length}
            </CardTitle>
          </CardHeader>
        </Card>
        
        <Card className="glass border-none shadow-xl rounded-[2rem] bg-blue-500/5">
          <CardHeader className="pb-2 text-center">
            <Package className="w-8 h-8 mx-auto text-blue-500 mb-2" />
            <CardDescription className="text-blue-600 font-bold uppercase tracking-widest text-[10px]">Đa dạng Dịch vụ</CardDescription>
            <CardTitle className="text-3xl font-black text-blue-700">
              {new Set(formattedTabs.map(t => t.service_name)).size}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card className="glass border-none shadow-xl rounded-[2rem] bg-emerald-500/5">
          <CardHeader className="pb-2 text-center">
            <Info className="w-8 h-8 mx-auto text-emerald-500 mb-2" />
            <CardDescription className="text-emerald-600 font-bold uppercase tracking-widest text-[10px]">Tỷ lệ Hoàn tất</CardDescription>
            <CardTitle className="text-3xl font-black text-emerald-700">
              {Math.round((formattedTabs.filter(t => t.status === 'Completed').length / (formattedTabs.length || 1)) * 100)}%
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card className="glass border-none shadow-2xl rounded-[2rem] overflow-hidden">
        <CardHeader className="p-8 pb-4">
          <CardTitle>Hồ sơ Dịch vụ Khách hàng</CardTitle>
          <CardDescription>Danh sách chi tiết các dịch vụ đã gán và trạng thái sử dụng hiện tại.</CardDescription>
        </CardHeader>
        <CardContent className="p-8 pt-4">
          <DataTable columns={columns} data={formattedTabs} searchKey="customer_name" />
        </CardContent>
      </Card>
    </div>
  )
}
