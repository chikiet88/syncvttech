"use client"

import { Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { DollarSign, AlertCircle, ArrowLeft, Calendar, Building2, ExternalLink } from "lucide-react"

function SalesReportContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  
  const branchId = searchParams.get("branchId")
  const paramFrom = searchParams.get("from")
  const paramTo = searchParams.get("to")

  return (
    <div className="p-6 space-y-6 animate-in fade-in zoom-in-95 duration-500 max-w-4xl mx-auto mt-10">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => router.back()} className="rounded-xl glass border-slate-200">
          <ArrowLeft className="w-4 h-4 text-slate-600" />
        </Button>
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-3">
            <DollarSign className="w-6 h-6 text-slate-500" />
            Chi tiết Doanh số
          </h2>
          <p className="text-sm text-muted-foreground font-medium">
            Phân tích số lượng đơn hàng (Order Amount) đã ghi nhận tại Chi nhánh #{branchId || "Tất cả"}
          </p>
        </div>
      </div>

      <Card className="glass border-none shadow-2xl shadow-slate-500/10 rounded-2xl overflow-hidden relative">
        <div className="absolute top-0 w-full h-1 bg-gradient-to-r from-slate-400 to-slate-600" />
        <CardContent className="p-8 flex flex-col items-center justify-center text-center space-y-6 min-h-[300px]">
          <div className="p-5 bg-slate-100 rounded-full animate-pulse relative">
             <AlertCircle className="w-12 h-12 text-slate-500" />
             <div className="absolute inset-0 bg-slate-300 rounded-full blur-xl opacity-20" />
          </div>
          
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-slate-800">Cấu hình hiển thị theo giá trị Doanh Số</h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto">
              Chế độ xem Doanh số sẽ sớm sử dụng chung bảng dữ liệu với Doanh thu, được focus vào cột <code className="text-slate-600 bg-slate-100 px-1 rounded">Amount</code> thay vì Paid.
            </p>
            <Button 
                onClick={() => router.push(`/reports/revenue?branchId=${branchId || "0"}&dateFrom=${paramFrom}&dateTo=${paramTo}`)}
                className="mt-2 text-xs font-bold bg-slate-800 hover:bg-slate-900 text-white rounded-xl shadow-lg hover:shadow-xl transition-all gap-2"
            >
                Chuyển sang Bảng Doanh thu tạm thời
                <ExternalLink className="w-3.5 h-3.5" />
            </Button>
          </div>

          <div className="flex gap-4 items-center justify-center mt-4">
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 px-4 py-2 rounded-xl text-xs font-bold text-slate-600 shadow-sm">
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
              Chi nhánh: {branchId === "0" || !branchId ? "Tất cả" : `#${branchId}`}
            </div>
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 px-4 py-2 rounded-xl text-xs font-bold text-slate-600 shadow-sm">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              Từ: {paramFrom || "N/A"} Đến: {paramTo || "N/A"}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function SalesReportPage() {
  return (
    <Suspense fallback={<div className="p-6 flex justify-center"><div className="w-8 h-8 rounded-full border-2 border-slate-500 border-t-transparent animate-spin"/></div>}>
      <SalesReportContent />
    </Suspense>
  )
}
