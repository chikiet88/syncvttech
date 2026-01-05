import prisma from "@/lib/db"
import { notFound } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  User, 
  MapPin, 
  Phone, 
  Mail, 
  Calendar, 
  Landmark, 
  Wallet, 
  History, 
  Stethoscope, 
  Clock, 
  CreditCard,
  MessageSquareWarning,
  ArrowLeft,
  ConciergeBell,
  Receipt,
  BookOpen,
  ClipboardList
} from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default async function CustomerDetailPage(props: {
  params: Promise<{ id: string }>
}) {
  const params = await props.params
  const id = parseInt(params.id)

  if (isNaN(id)) {
    return notFound()
  }

  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      branch: true,
      membership: true,
      treatments: {
        orderBy: { treatment_date: "desc" },
        take: 10
      },
      appointments: {
        orderBy: { appointment_date: "desc" },
        take: 10
      },
      payments: {
        orderBy: { payment_date: "desc" },
        take: 10
      },
      service_tabs: {
        orderBy: { created_at: "desc" },
        take: 10
      },
      treatment_plans: {
        orderBy: { created_at: "desc" },
        take: 10
      },
      care_history: {
        orderBy: { action_date: "desc" },
        take: 10
      },
      installments: {
        orderBy: { created_at: "desc" },
        take: 10
      },
      complaints: {
        orderBy: { created_at: "desc" },
        take: 5
      }
    }
  })

  if (!customer) {
    return notFound()
  }

  return (
    <div className="p-8 space-y-8 animate-fade-in max-w-7xl mx-auto">
      <div className="flex items-center gap-4">
        <Link href="/customers">
          <Button variant="ghost" size="icon" className="rounded-full glass h-10 w-10">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div className="space-y-1">
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <User className="w-8 h-8 text-blue-500" />
            {customer.name}
          </h2>
          <p className="text-muted-foreground flex items-center gap-2">
            <Badge variant="outline" className="rounded-full bg-blue-500/10 text-blue-500 border-none font-bold">
              {customer.code || `C-${customer.id}`}
            </Badge>
            <span>•</span>
            <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {customer.branch?.name || "Chưa gán chi nhánh"}</span>
            {customer.membership && (
              <>
                <span>•</span>
                <span className="text-purple-500 font-bold uppercase tracking-widest text-[10px]">
                  {customer.membership.name}
                </span>
              </>
            )}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Contact Info */}
        <Card className="glass border border-black/5 shadow-xl rounded-[2rem] overflow-hidden bg-white/70">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Phone className="w-5 h-5 text-blue-500" />
              Thông tin Liên hệ
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-slate-100"><Phone className="w-4 h-4 text-muted-foreground" /></div>
              <div>
                <p className="text-xs text-muted-foreground uppercase font-bold tracking-widest">Điện thoại</p>
                <p className="font-medium">{customer.phone || "N/A"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-slate-100"><Mail className="w-4 h-4 text-muted-foreground" /></div>
              <div>
                <p className="text-xs text-muted-foreground uppercase font-bold tracking-widest">Email</p>
                <p className="font-medium">{customer.email || "N/A"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-slate-100"><MapPin className="w-4 h-4 text-muted-foreground" /></div>
              <div>
                <p className="text-xs text-muted-foreground uppercase font-bold tracking-widest">Địa chỉ</p>
                <p className="font-medium">{customer.address || "N/A"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Financial Overview */}
        <Card className="glass border border-black/5 shadow-xl rounded-[2rem] overflow-hidden bg-white/70">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-emerald-500" />
              Tài chính
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 shadow-sm shadow-emerald-500/5">
              <div className="space-y-0.5">
                <p className="text-[10px] text-emerald-600 uppercase font-black tracking-widest">Tổng chi</p>
                <p className="text-xl font-black text-emerald-600">
                  {new Intl.NumberFormat('vi-VN').format(customer.total_spent)} đ
                </p>
              </div>
              <Landmark className="w-8 h-8 text-emerald-500 opacity-20" />
            </div>
            <div className="flex items-center justify-between p-4 rounded-2xl bg-red-500/10 border border-red-500/20 shadow-sm shadow-red-500/5">
              <div className="space-y-0.5">
                <p className="text-[10px] text-red-600 uppercase font-black tracking-widest">Công nợ hiện tại</p>
                <p className="text-xl font-black text-red-600">
                  {new Intl.NumberFormat('vi-VN').format(customer.total_debt)} đ
                </p>
              </div>
              <Wallet className="w-8 h-8 text-red-500 opacity-20" />
            </div>
          </CardContent>
        </Card>

        {/* Loyalty */}
        <Card className="glass border border-black/5 shadow-xl rounded-[2rem] overflow-hidden bg-white/70">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <History className="w-5 h-5 text-purple-500" />
              Khách hàng Thân thiết
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <div className="py-6">
              <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest mb-1">Số dư điểm</p>
              <div className="text-6xl font-black gradient-text inline-block">
                {customer.point}
              </div>
              <p className="text-sm font-bold text-muted-foreground mt-2">Điểm khả dụng</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Treatments */}
        <Card className="glass border border-black/5 shadow-2xl rounded-[2rem] overflow-hidden bg-white/70">
          <CardHeader className="p-8 pb-4">
            <CardTitle className="flex items-center gap-3">
              <Stethoscope className="w-6 h-6 text-blue-500" />
              Liệu trình gần đây
            </CardTitle>
            <CardDescription className="text-muted-foreground/80">10 bản ghi điều trị gần nhất</CardDescription>
          </CardHeader>
          <CardContent className="p-8 pt-4">
            <div className="space-y-4">
              {customer.treatments.length > 0 ? customer.treatments.map((t) => (
                <div key={t.id} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-black/5 hover:bg-slate-100 transition-colors">
                  <div className="space-y-1">
                    <p className="font-bold text-slate-800">{t.service_name || "Dịch vụ không xác định"}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-2">
                      <Clock className="w-3 h-3" /> {t.treatment_date ? new Date(t.treatment_date).toLocaleDateString("vi-VN") : "N/A"}
                      <span>•</span>
                      {t.employee_name}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-emerald-600">{new Intl.NumberFormat('vi-VN').format(t.amount)} đ</p>
                    <Badge variant="outline" className="text-[10px] rounded-full border-none bg-blue-500/10 text-blue-600 font-bold">
                      {t.status === 1 ? "Hoàn tất" : "Đang chờ"}
                    </Badge>
                  </div>
                </div>
              )) : (
                <div className="text-center py-8 text-muted-foreground italic">Không tìm thấy liệu trình</div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Upcoming/Recent Appointments */}
        <Card className="glass border border-black/5 shadow-2xl rounded-[2rem] overflow-hidden bg-white/70">
          <CardHeader className="p-8 pb-4">
            <CardTitle className="flex items-center gap-3">
              <Calendar className="w-6 h-6 text-purple-500" />
              Lịch hẹn
            </CardTitle>
            <CardDescription className="text-muted-foreground/80">Lịch thăm khám và lịch sử</CardDescription>
          </CardHeader>
          <CardContent className="p-8 pt-4">
            <div className="space-y-4">
              {customer.appointments.length > 0 ? customer.appointments.map((a) => (
                <div key={a.id} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-black/5 hover:bg-slate-100 transition-colors">
                  <div className="space-y-1">
                    <p className="font-bold text-slate-800">{a.service_name || "Khám tổng quát"}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-2">
                      <Clock className="w-3 h-3" /> {a.appointment_date ? new Date(a.appointment_date).toLocaleString("vi-VN") : "N/A"}
                    </p>
                  </div>
                  <Badge className={`rounded-full uppercase text-[10px] tracking-widest font-black ${
                    a.status === 1 ? "bg-emerald-500/10 text-emerald-600" : "bg-blue-500/10 text-blue-600"
                  } border-none`}>
                    {a.status === 1 ? "Hoàn tất" : "Đã lên lịch"}
                  </Badge>
                </div>
              )) : (
                <div className="text-center py-8 text-muted-foreground italic">Không tìm thấy lịch hẹn</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Financial & Service History */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Payment History */}
        <Card className="glass border border-black/5 shadow-2xl rounded-[2rem] overflow-hidden bg-white/70">
          <CardHeader className="p-8 pb-4">
            <CardTitle className="flex items-center gap-3">
              <Receipt className="w-6 h-6 text-emerald-500" />
              Lịch sử Thanh toán
            </CardTitle>
            <CardDescription className="text-muted-foreground/80">10 giao dịch gần nhất</CardDescription>
          </CardHeader>
          <CardContent className="p-8 pt-4">
            <div className="space-y-4">
              {customer.payments.length > 0 ? customer.payments.map((p) => (
                <div key={p.id} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-black/5 hover:bg-slate-100 transition-colors">
                  <div className="space-y-1">
                    <p className="font-bold text-slate-800">{p.payment_method || "Tiền mặt"}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-2">
                      <Clock className="w-3 h-3" /> {p.payment_date ? new Date(p.payment_date).toLocaleDateString("vi-VN") : "N/A"}
                    </p>
                    {p.note && <p className="text-[10px] text-muted-foreground italic line-clamp-1">{p.note}</p>}
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-emerald-600">+{new Intl.NumberFormat('vi-VN').format(p.amount)} đ</p>
                  </div>
                </div>
              )) : (
                <div className="text-center py-8 text-muted-foreground italic">Không tìm thấy lịch sử thanh toán</div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Services & Products */}
        <Card className="glass border border-black/5 shadow-2xl rounded-[2rem] overflow-hidden bg-white/70">
          <CardHeader className="p-8 pb-4">
            <CardTitle className="flex items-center gap-3">
              <ConciergeBell className="w-6 h-6 text-blue-500" />
              Dịch vụ & Sản phẩm
            </CardTitle>
            <CardDescription className="text-muted-foreground/80">Các dịch vụ đã đăng ký</CardDescription>
          </CardHeader>
          <CardContent className="p-8 pt-4">
            <div className="space-y-4">
              {customer.service_tabs.length > 0 ? customer.service_tabs.map((s) => (
                <div key={s.id} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-black/5 hover:bg-slate-100 transition-colors">
                  <div className="space-y-1">
                    <p className="font-bold text-slate-800">{s.service_name || "Dịch vụ không tên"}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-3">
                      <span>SL: {s.quantity}</span>
                      <span>•</span>
                      <span>Đơn giá: {new Intl.NumberFormat('vi-VN').format(s.price)} đ</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-blue-600">{new Intl.NumberFormat('vi-VN').format(s.total)} đ</p>
                    {s.status && (
                      <Badge variant="outline" className="text-[10px] rounded-full border-none bg-slate-200 text-slate-600 font-bold">
                        {s.status}
                      </Badge>
                    )}
                  </div>
                </div>
              )) : (
                <div className="text-center py-8 text-muted-foreground italic">Không tìm thấy dịch vụ</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Care History */}
        <Card className="glass border border-black/5 shadow-2xl rounded-[2rem] overflow-hidden bg-white/70">
          <CardHeader className="p-8 pb-4">
            <CardTitle className="flex items-center gap-3">
              <ClipboardList className="w-6 h-6 text-purple-500" />
              Lịch sử Chăm sóc
            </CardTitle>
            <CardDescription className="text-muted-foreground/80">Nhật ký tư vấn và hỗ trợ</CardDescription>
          </CardHeader>
          <CardContent className="p-8 pt-4">
            <div className="space-y-4">
              {customer.care_history.length > 0 ? customer.care_history.map((h) => (
                <div key={h.id} className="p-4 rounded-2xl bg-slate-50 border border-black/5 hover:bg-slate-100 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <Badge className="bg-purple-500/10 text-purple-600 border-none font-bold text-[10px] uppercase">
                      {h.action_type || "Chăm sóc"}
                    </Badge>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {h.action_date ? new Date(h.action_date).toLocaleDateString("vi-VN") : "N/A"}
                    </p>
                  </div>
                  <p className="text-sm text-slate-800 mb-2">{h.note}</p>
                  {h.employee_name && (
                    <p className="text-[10px] text-muted-foreground font-medium">Nhân viên: {h.employee_name}</p>
                  )}
                </div>
              )) : (
                <div className="text-center py-8 text-muted-foreground italic">Không tìm thấy lịch sử chăm sóc</div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Treatment Plans */}
        <Card className="glass border border-black/5 shadow-2xl rounded-[2rem] overflow-hidden bg-white/70">
          <CardHeader className="p-8 pb-4">
            <CardTitle className="flex items-center gap-3">
              <BookOpen className="w-6 h-6 text-indigo-500" />
              Kế hoạch Điều trị
            </CardTitle>
            <CardDescription className="text-muted-foreground/80">Phác đồ đề xuất</CardDescription>
          </CardHeader>
          <CardContent className="p-8 pt-4">
            <div className="space-y-4">
              {customer.treatment_plans.length > 0 ? customer.treatment_plans.map((p) => (
                <div key={p.id} className="p-4 rounded-2xl bg-slate-50 border border-black/5 hover:bg-slate-100 transition-colors">
                  <p className="font-bold text-slate-800">{p.service_name}</p>
                  <p className="text-sm text-slate-600 mt-1">{p.note}</p>
                  <div className="flex items-center justify-between mt-3">
                    <p className="text-[10px] text-muted-foreground italic">Bác sĩ: {p.doctor_name || "N/A"}</p>
                    <p className="text-[10px] text-muted-foreground">{p.created_at ? new Date(p.created_at).toLocaleDateString("vi-VN") : "N/A"}</p>
                  </div>
                </div>
              )) : (
                <div className="text-center py-8 text-muted-foreground italic">Không tìm thấy kế hoạch điều trị</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Complaints Section */}
      {customer.complaints.length > 0 && (
        <Card className="glass border border-red-500/10 shadow-2xl rounded-[2rem] overflow-hidden bg-red-50/50">
          <CardHeader className="p-8 pb-4">
            <CardTitle className="flex items-center gap-3 text-red-600">
              <MessageSquareWarning className="w-6 h-6" />
              Khiếu nại Dịch vụ
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8 pt-4">
            <div className="space-y-4">
              {customer.complaints.map((c) => (
                <div key={c.id} className="p-4 rounded-2xl bg-red-100/50 border border-red-200/50">
                  <p className="font-semibold text-red-900">{c.content}</p>
                  <p className="text-xs text-red-600/70 mt-2 flex items-center gap-2">
                    {c.created_at && new Date(c.created_at).toLocaleDateString("vi-VN")}
                    <span>•</span>
                    {c.status_name}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
