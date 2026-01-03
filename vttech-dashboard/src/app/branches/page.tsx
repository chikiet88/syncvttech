import prisma from "@/lib/db"
import { DataTable } from "@/components/ui/data-table"
import { columns, BranchColumn } from "./columns"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { MapPin, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"

export default async function BranchesPage() {
  const branches = await prisma.branch.findMany({
    orderBy: {
      name: "asc"
    }
  })

  // Format data for the table
  const formattedBranches: BranchColumn[] = branches.map((item: any) => ({
    id: item.id,
    code: item.code,
    name: item.name,
    address: item.address,
    phone: item.phone,
    is_active: item.is_active,
    created_at: item.created_at.toISOString(),
  }))

  return (
    <div className="p-8 space-y-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <MapPin className="w-8 h-8 text-blue-500" />
            Branch Management
          </h2>
          <p className="text-muted-foreground">
            Configure and monitor all business locations.
          </p>
        </div>
        <Button className="rounded-xl gap-2 font-bold bg-blue-600 hover:bg-blue-700">
          <Plus className="w-5 h-5" />
          Add Branch
        </Button>
      </div>

      <Card className="glass border-none shadow-2xl rounded-[2rem] overflow-hidden">
        <CardHeader className="p-8 pb-4">
          <CardTitle>Locations List</CardTitle>
          <CardDescription>Manage your active and inactive branches across the city.</CardDescription>
        </CardHeader>
        <CardContent className="p-8 pt-4">
          <DataTable columns={columns} data={formattedBranches} searchKey="name" />
        </CardContent>
      </Card>
    </div>
  )
}
