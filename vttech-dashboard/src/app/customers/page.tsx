import prisma from "@/lib/db"
import { DataTable } from "@/components/ui/data-table"
import { columns, CustomerColumn } from "./columns"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Users, UserPlus, Filter } from "lucide-react"
import { Button } from "@/components/ui/button"

export default async function CustomersPage() {
  const customers = await prisma.customer.findMany({
    take: 100, // Limit for better performance in initial view
    orderBy: {
      created_at: "desc"
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
  }))

  return (
    <div className="p-8 space-y-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Users className="w-8 h-8 text-purple-500" />
            Customer Profiles
          </h2>
          <p className="text-muted-foreground">
            Manage your customer relationship and viewing financial history.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="rounded-xl gap-2 glass border-none">
            <Filter className="w-4 h-4" />
            Filter
          </Button>
          <Button className="rounded-xl gap-2 font-bold bg-purple-600 hover:bg-purple-700">
            <UserPlus className="w-5 h-5" />
            New Customer
          </Button>
        </div>
      </div>

      <Card className="glass border-none shadow-2xl rounded-[2rem] overflow-hidden">
        <CardHeader className="p-8 pb-4">
          <CardTitle>Directory</CardTitle>
          <CardDescription>Showing recent 100 customer records from the unified database.</CardDescription>
        </CardHeader>
        <CardContent className="p-8 pt-4">
          <DataTable columns={columns} data={formattedCustomers} searchKey="name" />
        </CardContent>
      </Card>
    </div>
  )
}
