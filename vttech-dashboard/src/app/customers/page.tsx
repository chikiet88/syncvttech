export const dynamic = "force-dynamic";
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
    page?: string
    limit?: string
    q?: string
    sortBy?: string
    sortOrder?: string
  }>
}) {
  const searchParams = await props.searchParams
  const { branchId, from, to, q, sortBy, sortOrder } = searchParams

  const page = parseInt(searchParams.page || "1")
  const limit = parseInt(searchParams.limit || "20")
  const skip = (page - 1) * limit

  const where: any = {}

  if (branchId && branchId !== "all") {
    where.branch_id = parseInt(branchId)
  }

  // Handle Search
  if (q) {
    where.OR = [
      { name: { contains: q } },
      { code: { contains: q } },
      { phone: { contains: q } }
    ]
  }

  // Date Filtering
  if (from || to) {
    const filterFrom = from || "2000-01-01"
    const filterTo = to || new Date().toISOString().split('T')[0]
    where.created_at = {
      gte: new Date(filterFrom),
      lte: new Date(new Date(filterTo).setHours(23, 59, 59, 999))
    }
  }

  // Sorting
  const orderBy: any = {}
  if (sortBy) {
    orderBy[sortBy] = sortOrder || "desc"
  } else {
    orderBy.created_at = "desc"
  }

  const [customers, totalCount] = await Promise.all([
    prisma.customer.findMany({
      where,
      take: limit,
      skip: skip,
      orderBy,
      include: {
        branch: true,
        _count: {
          select: {
            appointments: true,
            payments: true,
            treatments: true,
            service_tabs: true,
            cards: true,
            prescriptions: true,
          }
        }
      } as any
    } as any),
    prisma.customer.count({ where })
  ])

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
    card_count: item._count?.cards || 0,
    prescription_count: item._count?.prescriptions || 0,
  }))

  return (
    <div className="flex flex-col gap-4 p-4 lg:p-6 max-w-[1600px] mx-auto animate-in fade-in duration-500">
      {/* Page Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-100 pb-4">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-1.5 text-zinc-400 font-bold uppercase tracking-wider text-[10px]">
            <Users className="w-3 h-3 text-zinc-900" />
            Quản trị hệ thống
          </div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-900">Danh sách khách hàng <span className="text-zinc-400 font-medium whitespace-nowrap">Hồ sơ chi tiết</span></h1>
        </div>
        
        <div className="flex items-center gap-2">
          <Button size="sm" className="h-8 bg-zinc-900 hover:bg-black text-zinc-50 rounded-lg px-4 font-bold shadow-sm transition-all border-none text-xs">
            <UserPlus className="w-3.5 h-3.5 mr-1.5" /> Thêm khách hàng
          </Button>
        </div>
      </header>

      <CustomerFilters />

      <div className="space-y-2">
         <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400">
              Cơ sở dữ liệu khách hàng ({totalCount.toLocaleString()})
            </h3>
         </div>
         
         <Card className="border-none shadow-none bg-transparent">
           <CardContent className="p-0">
             <div className="rounded-xl border border-zinc-100 bg-white shadow-sm overflow-hidden p-1">
               <DataTable
                 columns={columns}
                 data={formattedCustomers}
                 searchKey="name"
                 pageCount={Math.ceil(totalCount / limit)}
                 currentPage={page}
                 pageSize={limit}
                 totalCount={totalCount}
               />
             </div>
           </CardContent>
         </Card>
      </div>
    </div>
  )
}

