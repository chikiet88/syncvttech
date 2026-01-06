"use client"

import React from "react"
import { DataTable } from "@/components/ui/data-table"
import { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import {
    Clock,
    Stethoscope,
    Calendar,
    Receipt,
    ConciergeBell,
    ClipboardList,
    BookOpen,
    MessageSquareWarning,
    Wallet,
    Landmark,
    Phone,
    Mail,
    MapPin,
    CreditCard,
    User,
    History,
    TrendingUp
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

// --- Column Definitions ---

const treatmentColumns: ColumnDef<any>[] = [
    {
        accessorKey: "treatment_date",
        header: "Ngày",
        cell: ({ row }) => row.original.treatment_date ? new Date(row.original.treatment_date).toLocaleDateString("vi-VN") : "N/A"
    },
    {
        accessorKey: "service_name",
        header: "Dịch vụ",
        cell: ({ row }) => <span className="font-bold">{row.getValue("service_name") || "N/A"}</span>
    },
    {
        accessorKey: "employee_name",
        header: "Nhân viên",
    },
    {
        accessorKey: "amount",
        header: "Số tiền",
        cell: ({ row }) => <span className="font-bold text-emerald-600">{new Intl.NumberFormat('vi-VN').format(row.getValue("amount"))} đ</span>
    },
    {
        accessorKey: "status",
        header: "Trạng thái",
        cell: ({ row }) => (
            <Badge variant="outline" className="rounded-full bg-blue-500/10 text-blue-600 border-none font-bold">
                {row.getValue("status") === 1 ? "Hoàn tất" : "Đang chờ"}
            </Badge>
        )
    }
]

const appointmentColumns: ColumnDef<any>[] = [
    {
        accessorKey: "appointment_date",
        header: "Ngày hẹn",
        cell: ({ row }) => row.original.appointment_date ? new Date(row.original.appointment_date).toLocaleString("vi-VN") : "N/A"
    },
    {
        accessorKey: "service_name",
        header: "Dịch vụ",
        cell: ({ row }) => <span className="font-bold">{row.getValue("service_name") || "Khám tổng quát"}</span>
    },
    {
        accessorKey: "status",
        header: "Trạng thái",
        cell: ({ row }) => (
            <Badge className={`rounded-full uppercase text-[10px] tracking-widest font-black ${row.getValue("status") === 1 ? "bg-emerald-500/10 text-emerald-600" : "bg-blue-500/10 text-blue-600"
                } border-none`}>
                {row.getValue("status") === 1 ? "Hoàn tất" : "Đã lên lịch"}
            </Badge>
        )
    }
]

const paymentColumns: ColumnDef<any>[] = [
    {
        accessorKey: "payment_date",
        header: "Ngày",
        cell: ({ row }) => row.original.payment_date ? new Date(row.original.payment_date).toLocaleDateString("vi-VN") : "N/A"
    },
    {
        accessorKey: "payment_method",
        header: "Phương thức",
    },
    {
        accessorKey: "amount",
        header: "Số tiền",
        cell: ({ row }) => <span className="font-black text-emerald-600">+{new Intl.NumberFormat('vi-VN').format(row.getValue("amount"))} đ</span>
    },
    {
        accessorKey: "note",
        header: "Ghi chú",
        cell: ({ row }) => <span className="text-xs text-muted-foreground italic line-clamp-1">{row.getValue("note") || "-"}</span>
    }
]

const installmentColumns: ColumnDef<any>[] = [
    {
        accessorKey: "created_at",
        header: "Ngày tạo",
        cell: ({ row }) => row.original.created_at ? new Date(row.original.created_at).toLocaleDateString("vi-VN") : "N/A"
    },
    {
        accessorKey: "total_amount",
        header: "Tổng tiền",
        cell: ({ row }) => <span className="font-bold">{new Intl.NumberFormat('vi-VN').format(row.getValue("total_amount"))} đ</span>
    },
    {
        accessorKey: "paid_amount",
        header: "Đã trả",
        cell: ({ row }) => <span className="font-bold text-emerald-600">{new Intl.NumberFormat('vi-VN').format(row.getValue("paid_amount"))} đ</span>
    },
    {
        accessorKey: "remain_amount",
        header: "Còn lại",
        cell: ({ row }) => <span className="font-bold text-red-600">{new Intl.NumberFormat('vi-VN').format(row.getValue("remain_amount"))} đ</span>
    },
    {
        accessorKey: "note",
        header: "Ghi chú",
    }
]

const serviceColumns: ColumnDef<any>[] = [
    {
        accessorKey: "service_name",
        header: "Tên Dịch vụ / Sản phẩm",
        cell: ({ row }) => <span className="font-bold">{row.getValue("service_name")}</span>
    },
    {
        accessorKey: "quantity",
        header: "SL",
    },
    {
        accessorKey: "price",
        header: "Đơn giá",
        cell: ({ row }) => <span>{new Intl.NumberFormat('vi-VN').format(row.getValue("price"))} đ</span>
    },
    {
        accessorKey: "total",
        header: "Thành tiền",
        cell: ({ row }) => <span className="font-bold text-blue-600">{new Intl.NumberFormat('vi-VN').format(row.getValue("total"))} đ</span>
    },
    {
        accessorKey: "status",
        header: "Trạng thái",
        cell: ({ row }) => row.getValue("status") ? (
            <Badge variant="outline" className="text-[10px] rounded-full border-none bg-slate-200 text-slate-600 font-bold">
                {row.getValue("status")}
            </Badge>
        ) : null
    }
]

const careColumns: ColumnDef<any>[] = [
    {
        accessorKey: "action_date",
        header: "Ngày",
        cell: ({ row }) => row.original.action_date ? new Date(row.original.action_date).toLocaleDateString("vi-VN") : "N/A"
    },
    {
        accessorKey: "action_type",
        header: "Loại",
        cell: ({ row }) => (
            <Badge className="bg-purple-500/10 text-purple-600 border-none font-bold text-[10px] uppercase">
                {row.getValue("action_type") || "Chăm sóc"}
            </Badge>
        )
    },
    {
        accessorKey: "note",
        header: "Nội dung phản hồi",
        cell: ({ row }) => <div className="max-w-[400px] text-sm">{row.getValue("note")}</div>
    },
    {
        accessorKey: "employee_name",
        header: "Nhân viên",
    }
]

export function CustomerDetailContent({ customer }: { customer: any }) {
    return (
        <div className="space-y-12 pb-20">
            {/* 1. Quick Stats Header */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-6 rounded-[2rem] glass bg-white/50 border border-black/5 flex items-center justify-between">
                    <div className="space-y-1">
                        <p className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Tổng chi tiêu</p>
                        <p className="text-2xl font-black text-emerald-600">{new Intl.NumberFormat('vi-VN').format(customer.total_spent)} đ</p>
                    </div>
                    <Landmark className="w-8 h-8 text-emerald-500 opacity-20" />
                </div>
                <div className="p-6 rounded-[2rem] glass bg-white/50 border border-black/5 flex items-center justify-between">
                    <div className="space-y-1">
                        <p className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Công nợ</p>
                        <p className="text-2xl font-black text-red-600">{new Intl.NumberFormat('vi-VN').format(customer.total_debt)} đ</p>
                    </div>
                    <Wallet className="w-8 h-8 text-red-500 opacity-20" />
                </div>
                <div className="p-6 rounded-[2rem] glass bg-white/50 border border-black/5 flex items-center justify-between">
                    <div className="space-y-1">
                        <p className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Điểm tích lũy</p>
                        <p className="text-2xl font-black text-purple-600">{customer.point}</p>
                    </div>
                    <History className="w-8 h-8 text-purple-500 opacity-20" />
                </div>
                <div className="p-6 rounded-[2rem] glass bg-white/50 border border-black/5 flex items-center justify-between">
                    <div className="space-y-1">
                        <p className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Dịch vụ</p>
                        <p className="text-2xl font-black text-blue-600">{customer.service_tabs.length}</p>
                    </div>
                    <ConciergeBell className="w-8 h-8 text-blue-500 opacity-20" />
                </div>
            </div>

            {/* 2. Basic Info Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="glass border border-black/5 shadow-xl rounded-[2rem] overflow-hidden bg-white/70">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <User className="w-5 h-5 text-blue-500" />
                            Thông tin Liên hệ
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-slate-100"><Phone className="w-4 h-4" /></div>
                            <div>
                                <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">Điện thoại</p>
                                <p className="font-bold">{customer.phone || "N/A"}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-slate-100"><Mail className="w-4 h-4" /></div>
                            <div>
                                <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">Email</p>
                                <p className="font-bold underline text-blue-500">{customer.email || "N/A"}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="glass border border-black/5 shadow-xl rounded-[2rem] overflow-hidden bg-white/70">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <MapPin className="w-5 h-5 text-emerald-500" />
                            Địa chỉ & Khu vực
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-slate-100"><MapPin className="w-4 h-4" /></div>
                            <div>
                                <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">Địa chỉ</p>
                                <p className="font-bold">{customer.address || "N/A"}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-slate-100"><TrendingUp className="w-4 h-4" /></div>
                            <div>
                                <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">Chi nhánh</p>
                                <p className="font-bold">{customer.branch?.name || "N/A"}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="glass border border-black/5 shadow-xl rounded-[2rem] overflow-hidden bg-white/70">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Clock className="w-5 h-5 text-purple-500" />
                            Ngày tham gia
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center justify-center py-4">
                        <p className="text-4xl font-black text-slate-800">
                            {new Date(customer.created_at).toLocaleDateString("vi-VN", { day: '2-digit', month: '2-digit', year: 'numeric' })}
                        </p>
                        <p className="text-[10px] text-muted-foreground uppercase font-black tracking-[0.2em] mt-2 italic">Hội viên từ hệ thống</p>
                    </CardContent>
                </Card>
            </div>

            {customer.complaints.length > 0 && (
                <div className="p-6 rounded-[2rem] bg-red-50 border border-red-200 flex items-start gap-4 shadow-lg shadow-red-500/5">
                    <div className="p-3 rounded-2xl bg-red-100 text-red-600">
                        <MessageSquareWarning className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="text-red-700 font-bold text-lg mb-1">
                            Lưu ý quan trọng: Có {customer.complaints.length} khiếu nại chưa xử lý
                        </h3>
                        <p className="text-red-600/80 text-sm leading-relaxed">{customer.complaints[0].content}</p>
                    </div>
                </div>
            )}

            {/* 3. Treatments Table Stack */}
            <Card className="glass border border-black/5 shadow-2xl rounded-[3rem] overflow-hidden bg-white/70">
                <CardHeader className="p-10 pb-6 bg-slate-50/50">
                    <div className="flex items-center gap-3">
                        <div className="p-3 rounded-2xl bg-blue-500 text-white shadow-lg shadow-blue-500/30">
                            <Stethoscope className="w-6 h-6" />
                        </div>
                        <div>
                            <CardTitle className="text-2xl font-black tracking-tight">Lịch sử Liệu trình</CardTitle>
                            <CardDescription className="font-medium">Toàn bộ quá trình thực hiện dịch vụ của khách hàng</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-10 pt-6">
                    <DataTable columns={treatmentColumns} data={customer.treatments} searchKey="service_name" />
                </CardContent>
            </Card>

            {/* 4. Appointments Table Stack */}
            <Card className="glass border border-black/5 shadow-2xl rounded-[3rem] overflow-hidden bg-white/70">
                <CardHeader className="p-10 pb-6 bg-slate-50/50">
                    <div className="flex items-center gap-3">
                        <div className="p-3 rounded-2xl bg-purple-500 text-white shadow-lg shadow-purple-500/30">
                            <Calendar className="w-6 h-6" />
                        </div>
                        <div>
                            <CardTitle className="text-2xl font-black tracking-tight">Lịch thăm khám & Tư vấn</CardTitle>
                            <CardDescription className="font-medium">Quản lý các cuộc hẹn hiện tại và lịch sử</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-10 pt-6">
                    <DataTable columns={appointmentColumns} data={customer.appointments} searchKey="service_name" />
                </CardContent>
            </Card>

            {/* 5. Financial Sections */}
            <div className="grid grid-cols-1 gap-12">
                {/* Payments */}
                <Card className="glass border border-black/5 shadow-2xl rounded-[3rem] overflow-hidden bg-white/70">
                    <CardHeader className="p-10 pb-6 bg-slate-50/50">
                        <div className="flex items-center gap-3">
                            <div className="p-3 rounded-2xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/30">
                                <Receipt className="w-6 h-6" />
                            </div>
                            <div>
                                <CardTitle className="text-2xl font-black tracking-tight">Lịch sử Thanh toán</CardTitle>
                                <CardDescription className="font-medium">Nhật ký giao dịch tài chính chi tiết</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-10 pt-6">
                        <DataTable columns={paymentColumns} data={customer.payments} searchKey="payment_method" />
                    </CardContent>
                </Card>

                {/* Installments */}
                <Card className="glass border border-black/5 shadow-2xl rounded-[3rem] overflow-hidden bg-white/70">
                    <CardHeader className="p-10 pb-6 bg-slate-50/50">
                        <div className="flex items-center gap-3">
                            <div className="p-3 rounded-2xl bg-red-500 text-white shadow-lg shadow-red-500/30">
                                <CreditCard className="w-6 h-6" />
                            </div>
                            <div>
                                <CardTitle className="text-2xl font-black tracking-tight">Lịch trình Trả góp</CardTitle>
                                <CardDescription className="font-medium">Theo dõi dư nợ và tiến độ hoàn trả</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-10 pt-6">
                        <DataTable columns={installmentColumns} data={customer.installments} searchKey="note" />
                    </CardContent>
                </Card>
            </div>

            {/* 6. Services & Products Stack */}
            <Card className="glass border border-black/5 shadow-2xl rounded-[3rem] overflow-hidden bg-white/70">
                <CardHeader className="p-10 pb-6 bg-slate-50/50">
                    <div className="flex items-center gap-3">
                        <div className="p-3 rounded-2xl bg-indigo-500 text-white shadow-lg shadow-indigo-500/30">
                            <ConciergeBell className="w-6 h-6" />
                        </div>
                        <div>
                            <CardTitle className="text-2xl font-black tracking-tight">Sản phẩm & Dịch vụ</CardTitle>
                            <CardDescription className="font-medium">Các gói dịch vụ đã đăng ký và sử dụng</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-10 pt-6">
                    <DataTable columns={serviceColumns} data={customer.service_tabs} searchKey="service_name" />
                </CardContent>
            </Card>

            {/* 7. Care History Stack */}
            <Card className="glass border border-black/5 shadow-2xl rounded-[3rem] overflow-hidden bg-white/70">
                <CardHeader className="p-10 pb-6 bg-slate-50/50">
                    <div className="flex items-center gap-3">
                        <div className="p-3 rounded-2xl bg-purple-600 text-white shadow-lg shadow-purple-600/30">
                            <ClipboardList className="w-6 h-6" />
                        </div>
                        <div>
                            <CardTitle className="text-2xl font-black tracking-tight">Nhật ký Chăm sóc</CardTitle>
                            <CardDescription className="font-medium">Lịch sử tương tác, tư vấn và hỗ trợ khách hàng</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-10 pt-6">
                    <DataTable columns={careColumns} data={customer.care_history} searchKey="note" />
                </CardContent>
            </Card>

            {/* 8. Proposal Plans Stack */}
            <Card className="glass border border-black/5 shadow-2xl rounded-[3rem] overflow-hidden bg-white/70">
                <CardHeader className="p-10 pb-6 bg-slate-50/50">
                    <div className="flex items-center gap-3">
                        <div className="p-3 rounded-2xl bg-orange-500 text-white shadow-lg shadow-orange-500/30">
                            <BookOpen className="w-6 h-6" />
                        </div>
                        <div>
                            <CardTitle className="text-2xl font-black tracking-tight">Kế hoạch & Phác đồ Đề xuất</CardTitle>
                            <CardDescription className="font-medium">Định hướng điều trị từ bác sĩ và chuyên gia</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-10 pt-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {customer.treatment_plans.length > 0 ? customer.treatment_plans.map((plan: any) => (
                            <div key={plan.id} className="p-6 rounded-3xl bg-white border border-black/5 shadow-sm hover:shadow-md transition-shadow">
                                <div className="flex items-center justify-between mb-4">
                                    <Badge className="bg-orange-500/10 text-orange-600 border-none font-black text-[10px] uppercase px-3 py-1">Phác đồ Đề xuất</Badge>
                                    <span className="text-[10px] text-muted-foreground font-bold italic">{new Date(plan.created_at).toLocaleDateString("vi-VN")}</span>
                                </div>
                                <p className="font-black text-slate-800 text-lg mb-2">{plan.service_name}</p>
                                <p className="text-sm text-slate-600 leading-relaxed mb-4">{plan.note}</p>
                                <div className="pt-4 border-t border-slate-100 flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-black">BS</div>
                                    <p className="text-[10px] font-black uppercase text-slate-500">Bác sĩ: {plan.doctor_name || "Đang cập nhật"}</p>
                                </div>
                            </div>
                        )) : (
                            <div className="col-span-full text-center py-12 text-muted-foreground italic font-medium">Không có phác đồ đề xuất nào được ghi nhận.</div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
