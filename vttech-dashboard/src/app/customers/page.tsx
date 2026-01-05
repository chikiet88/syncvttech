import prisma from "@/lib/db"
import { DataTable } from "@/components/ui/data-table"
import { columns, CustomerColumn } from "./columns"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Users, UserPlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CustomerFilters } from "./customer-filters"

export default async function CustomersPage(props: {
  searchParams: Promise<{
    branchId?: string
    from?: string
    to?: string
    name?: string
  }>
}) {
  const searchParams = await props.searchParams
  const { branchId, from, to } = searchParams

  const where: any = {}
  
  if (branchId && branchId !== "all") {
    where.branch_id = parseInt(branchId)
  }

  // Default to today if no dates provided
  const filterFrom = from || new Date().toISOString().split('T')[0]
  const filterTo = to || new Date().toISOString().split('T')[0]

  where.created_at = {
    gte: new Date(filterFrom),
    lte: new Date(new Date(filterTo).setHours(23, 59, 59, 999))
  }

  const customers = await prisma.customer.findMany({
    where,
    take: 200, // Increased limit for filtered views
    orderBy: {
      created_at: "desc"
    },
    include: {
      branch: true,
      _count: {
        select: {
          appointments: true,
          payments: true,
          treatments: true,
          service_tabs: true,
        }
      }
    }
  })

  // Format data for the table
  const formattedCustomers: CustomerColumn[] = customers.map((item: any) => ({
    id: item.id,
    code: item.code,
    name: item.name,
    phone: item.phone,
    email: item.email,
    total_spent: item.total_spent || 0,
    total_debt: item.total_debt || 0,
    point: item.point || 0,
    is_active: item.is_active || 1,
    branch_name: item.branch?.name || "N/A",
    appointment_count: item._count?.appointments || 0,
    payment_count: item._count?.payments || 0,
    treatment_count: item._count?.treatments || 0,
    service_tab_count: item._count?.service_tabs || 0,
  }))

  return (
    <div className="p-8 space-y-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Users className="w-8 h-8 text-purple-500" />
            Hồ sơ Khách hàng
          </h2>
          <p className="text-muted-foreground">
            Quản lý quan hệ khách hàng và theo dõi lịch sử tài chính.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button className="rounded-xl gap-2 font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-500/30">
            <UserPlus className="w-5 h-5" />
            Thêm Khách hàng
          </Button>
        </div>
      </div>

      <CustomerFilters />

      <Card className="glass border border-black/5 shadow-2xl rounded-[2rem] overflow-hidden bg-white/70">
        <CardHeader className="p-8 pb-4">
          <CardTitle>Danh sách Khách hàng</CardTitle>
          <CardDescription className="text-muted-foreground/80">
            {Object.keys(where).length > 0 
              ? `Đang hiển thị kết quả lọc (${customers.length} bản ghi)` 
              : "Hiển thị 200 bản ghi khách hàng gần đây từ cơ sở dữ liệu."}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-8 pt-4">
          <DataTable columns={columns} data={formattedCustomers} searchKey="name" />
        </CardContent>
      </Card>
    </div>
  )
}
