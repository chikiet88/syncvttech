export const dynamic = "force-dynamic";
import { DataTable } from "@/components/ui/data-table"
import { columns, PbxExtensionColumn } from "./columns"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Shield } from "lucide-react"
import prisma from "@/lib/db"

export default async function PbxExtensionsPage() {
  const extensions = await prisma.pbxExtension.findMany({
    orderBy: { extension: 'asc' },
  })

  // Format data for the table
  const formattedExtensions: PbxExtensionColumn[] = extensions.map((item: any) => ({
    id: item.id,
    vttech_id: item.vttech_id,
    extension: item.extension,
    password: item.password,
    is_active: item.is_active,
  }))

  return (
    <div className="p-8 space-y-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Shield className="w-8 h-8 text-blue-500" />
            Cấu hình Extension
          </h2>
          <p className="text-muted-foreground">
            Quản lý danh sách các dải số nội bộ và thông tin xác thực SIP.
          </p>
        </div>
      </div>

      <Card className="glass border-none shadow-2xl rounded-[2rem] overflow-hidden">
        <CardHeader className="p-8 pb-4">
          <CardTitle>Danh sách Extension</CardTitle>
          <CardDescription>Thông tin chi tiết về các Line được đăng ký trên hệ thống VTTech.</CardDescription>
        </CardHeader>
        <CardContent className="p-8 pt-4">
          <DataTable columns={columns} data={formattedExtensions} searchKey="extension" />
        </CardContent>
      </Card>
    </div>
  )
}
