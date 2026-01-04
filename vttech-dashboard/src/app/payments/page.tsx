import prisma from "@/lib/db"
import { DataTable } from "@/components/ui/data-table"
import { columns, PaymentColumn } from "./columns"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { BadgeDollarSign, Wallet, Calendar, Download } from "lucide-react"
import { Button } from "@/components/ui/button"

export default async function PaymentsPage() {
  const payments = await prisma.customerPayment.findMany({
    take: 100,
    orderBy: {
      payment_date: "desc"
    },
    include: {
      customer: {
        select: {
          name: true
        }
      }
    }
  })

  const formattedPayments: PaymentColumn[] = payments.map((p) => ({
    id: `${p.customer_id}-${p.payment_id}`,
    customer_id: p.customer_id,
    customer_name: p.customer.name,
    amount: p.amount,
    payment_date: p.payment_date ? p.payment_date.toISOString() : null,
    payment_method: p.payment_method,
    note: p.note
  }))

  const totalAmount = formattedPayments.reduce((acc, p) => acc + p.amount, 0)

  return (
    <div className="p-8 space-y-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <BadgeDollarSign className="w-8 h-8 text-emerald-500" />
            Giao dịch Tài chính
          </h2>
          <p className="text-muted-foreground">
            Theo dõi tất cả các khoản thanh toán và hoạt động tài chính của khách hàng.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="rounded-xl gap-2 glass border-none">
            <Calendar className="w-4 h-4" />
            Giai đoạn
          </Button>
          <Button className="rounded-xl gap-2 font-bold bg-emerald-600 hover:bg-emerald-700">
            <Download className="w-5 h-5" />
            Xuất báo cáo
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="glass border-none shadow-xl rounded-[2rem] bg-emerald-500/5">
          <CardHeader className="pb-2">
            <CardDescription className="text-emerald-600 font-bold uppercase tracking-widest text-[10px]">Tổng gần đây (100 GD)</CardDescription>
            <CardTitle className="text-3xl font-black text-emerald-700">
              {new Intl.NumberFormat('vi-VN').format(totalAmount)} đ
            </CardTitle>
          </CardHeader>
        </Card>
        
        <Card className="glass border-none shadow-xl rounded-[2rem] bg-blue-500/5">
          <CardHeader className="pb-2">
            <CardDescription className="text-blue-600 font-bold uppercase tracking-widest text-[10px]">Số lượng Giao dịch</CardDescription>
            <CardTitle className="text-3xl font-black text-blue-700">
              {formattedPayments.length}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card className="glass border-none shadow-xl rounded-[2rem] bg-purple-500/5">
          <CardHeader className="pb-2">
            <CardDescription className="text-purple-600 font-bold uppercase tracking-widest text-[10px]">Giao dịch Trung bình</CardDescription>
            <CardTitle className="text-3xl font-black text-purple-700">
              {new Intl.NumberFormat('vi-VN').format(formattedPayments.length ? totalAmount/formattedPayments.length : 0)} đ
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card className="glass border-none shadow-2xl rounded-[2rem] overflow-hidden">
        <CardHeader className="p-8 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Thanh toán Gần đây</CardTitle>
              <CardDescription>Lịch sử của 100 lần thanh toán gần nhất.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-8 pt-4">
          <DataTable columns={columns} data={formattedPayments} searchKey="customer_name" />
        </CardContent>
      </Card>
    </div>
  )
}
