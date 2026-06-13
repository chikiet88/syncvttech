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
    TrendingUp,
    ShieldCheck,
    Pill,
    Image as ImageIcon,
    Activity,
    Folder
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

// --- Column Definitions ---

const anamnesisColumns: ColumnDef<any>[] = [
    {
        accessorKey: "created_at",
        header: "Ngày khai báo",
        cell: ({ row }) => row.original.created_at ? new Date(row.original.created_at).toLocaleDateString("vi-VN") : "N/A"
    },
    {
        accessorKey: "content",
        header: "Khảo sát sức khỏe / Câu hỏi",
        cell: ({ row }) => <span className="font-bold text-slate-800">{row.getValue("content") || "N/A"}</span>
    },
    {
        accessorKey: "note",
        header: "Trả lời / Trạng thái",
        cell: ({ row }) => {
            const noteVal = row.getValue("note")
            const isPositive = String(noteVal).toLowerCase() === 'có' || String(noteVal).toLowerCase() === 'yes';
            return (
                <Badge variant="outline" className={`rounded-full border-none font-bold text-[10px] ${
                    isPositive ? "bg-amber-500/10 text-amber-600" : "bg-slate-100 text-slate-600"
                }`}>
                    {String(noteVal) || 'Không'}
                </Badge>
            )
        }
    }
]

const complaintColumns: ColumnDef<any>[] = [
    {
        accessorKey: "created_at",
        header: "Ngày khiếu nại",
        cell: ({ row }) => row.original.created_at ? new Date(row.original.created_at).toLocaleDateString("vi-VN") : "N/A"
    },
    {
        accessorKey: "content",
        header: "Nội dung khiếu nại / Phàn nàn",
        cell: ({ row }) => <span className="font-bold text-red-650">{row.getValue("content") || "N/A"}</span>
    },
    {
        accessorKey: "status_name",
        header: "Trạng thái",
        cell: ({ row }) => (
            <Badge variant="outline" className={`rounded-full border-none font-bold text-[10px] uppercase tracking-wider ${
                String(row.getValue("status_name") || "").includes("Giải quyết") ? "bg-emerald-500/10 text-emerald-600" : "bg-red-500/10 text-red-600"
            }`}>
                {row.getValue("status_name") || "Đang xử lý"}
            </Badge>
        )
    }
]

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

const cardColumns: ColumnDef<any>[] = [
    {
        accessorKey: "card_name",
        header: "Tên thẻ",
        cell: ({ row }) => <span className="font-black text-blue-600 uppercase flex items-center gap-2">
            <CreditCard className="w-3 h-3" />
            {row.getValue("card_name")}
        </span>
    },
    {
        accessorKey: "price_root",
        header: "Mệnh giá",
        cell: ({ row }) => <span className="font-bold">{new Intl.NumberFormat('vi-VN').format(row.getValue("price_root"))} đ</span>
    },
    {
        accessorKey: "price_use",
        header: "Giá trị sử dụng",
        cell: ({ row }) => <span className="font-bold text-emerald-600">{new Intl.NumberFormat('vi-VN').format(row.getValue("price_use"))} đ</span>
    },
    {
        accessorKey: "amount_using",
        header: "Đã sử dụng",
        cell: ({ row }) => <span className="font-bold text-red-600">{new Intl.NumberFormat('vi-VN').format(row.getValue("amount_using"))} đ</span>
    },
    {
        accessorKey: "expired_date",
        header: "Hạn dùng",
        cell: ({ row }) => row.original.expired_date ? new Date(row.original.expired_date).toLocaleDateString("vi-VN") : "Không thời hạn"
    },
    {
        accessorKey: "status",
        header: "Trạng thái",
        cell: ({ row }) => {
            const amountUsing = parseFloat(row.original.amount_using);
            const priceUse = parseFloat(row.original.price_use);
            const isFull = amountUsing >= priceUse;
            return (
                <Badge variant="outline" className={`rounded-full border-none font-black text-[10px] ${isFull ? "bg-slate-200 text-slate-500" : "bg-emerald-500/10 text-emerald-600"}`}>
                    {isFull ? "Đã dùng hết" : "Đang sử dụng"}
                </Badge>
            )
        }
    }
]

const prescriptionColumns: ColumnDef<any>[] = [
    {
        accessorKey: "created_at",
        header: "Ngày kê đơn",
        cell: ({ row }) => row.original.created_at ? new Date(row.original.created_at).toLocaleDateString("vi-VN") : "N/A"
    },
    {
        accessorKey: "medicine_name",
        header: "Tên thuốc",
        cell: ({ row }) => <span className="font-black text-slate-800">{row.getValue("medicine_name")}</span>
    },
    {
        accessorKey: "quantity",
        header: "Số lượng",
        cell: ({ row }) => <span className="font-bold underlineDecoration-black">{row.getValue("quantity")} {row.original.unit_name}</span>
    },
    {
        accessorKey: "dosage",
        header: "Liều dùng",
        cell: ({ row }) => <span className="text-xs italic text-blue-600">{row.getValue("dosage")}</span>
    }
]

const statusHistoryColumns: ColumnDef<any>[] = [
    {
        accessorKey: "created_at",
        header: "Thời gian",
        cell: ({ row }) => row.original.created_at ? new Date(row.original.created_at).toLocaleString("vi-VN") : "N/A"
    },
    {
        accessorKey: "master_status_name",
        header: "Trạng thái",
        cell: ({ row }) => (
            <Badge variant="outline" style={{ backgroundColor: row.original.color_code + '20', color: row.original.color_code, borderColor: 'transparent' }} className="font-black rounded-lg">
                {row.getValue("master_status_name")}
            </Badge>
        )
    },
    {
        accessorKey: "detail_status_name",
        header: "Chi tiết",
    },
    {
        accessorKey: "content",
        header: "Ghi chú",
        cell: ({ row }) => <span className="text-xs">{row.getValue("content") || "-"}</span>
    },
    {
        accessorKey: "employee_name",
        header: "Nhân viên thực hiện",
    }
]

export function CustomerDetailContent({ customer }: { customer: any }) {
    return (
        <div className="space-y-6 pb-12">
            {/* 1. Quick Stats Header */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl glass bg-white/50 border border-black/5 flex items-center justify-between">
                    <div className="space-y-1">
                        <p className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Tổng chi tiêu</p>
                        <p className="text-2xl font-black text-emerald-600">{new Intl.NumberFormat('vi-VN').format(customer.total_spent)} đ</p>
                    </div>
                    <Landmark className="w-8 h-8 text-emerald-500 opacity-20" />
                </div>
                <div className="p-4 rounded-xl glass bg-white/50 border border-black/5 flex items-center justify-between">
                    <div className="space-y-1">
                        <p className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Công nợ</p>
                        <p className="text-2xl font-black text-red-600">{new Intl.NumberFormat('vi-VN').format(customer.total_debt)} đ</p>
                    </div>
                    <Wallet className="w-8 h-8 text-red-500 opacity-20" />
                </div>
                <div className="p-4 rounded-xl glass bg-white/50 border border-black/5 flex items-center justify-between">
                    <div className="space-y-1">
                        <p className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Điểm tích lũy</p>
                        <p className="text-2xl font-black text-purple-600">{customer.point}</p>
                    </div>
                    <History className="w-8 h-8 text-purple-500 opacity-20" />
                </div>
                <div className="p-4 rounded-xl glass bg-white/50 border border-black/5 flex items-center justify-between">
                    <div className="space-y-1">
                        <p className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Dịch vụ</p>
                        <p className="text-2xl font-black text-blue-600">{customer.service_tabs.length}</p>
                    </div>
                    <ConciergeBell className="w-8 h-8 text-blue-500 opacity-20" />
                </div>
            </div>

            {/* 2. Basic Info Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="glass border border-black/5 shadow-xl rounded-xl overflow-hidden bg-white/70">
                    <CardHeader className="p-4 pb-2">
                        <CardTitle className="text-base flex items-center gap-2">
                            <User className="w-4 h-4 text-blue-500" />
                            Thông tin Liên hệ
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="p-1.5 rounded-lg bg-slate-100"><Phone className="w-3.5 h-3.5" /></div>
                            <div>
                                <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">Điện thoại</p>
                                <p className="font-bold text-sm">{customer.phone || "N/A"}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="p-1.5 rounded-lg bg-slate-100"><Mail className="w-3.5 h-3.5" /></div>
                            <div>
                                <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">Email</p>
                                <p className="font-bold text-sm underline text-blue-500">{customer.email || "N/A"}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="glass border border-black/5 shadow-xl rounded-xl overflow-hidden bg-white/70">
                    <CardHeader className="p-4 pb-2">
                        <CardTitle className="text-base flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-emerald-500" />
                            Địa chỉ & Khu vực
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="p-1.5 rounded-lg bg-slate-100"><MapPin className="w-3.5 h-3.5" /></div>
                            <div>
                                <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">Địa chỉ</p>
                                <p className="font-bold text-sm">{customer.address || "N/A"}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="p-1.5 rounded-lg bg-slate-100"><TrendingUp className="w-3.5 h-3.5" /></div>
                            <div>
                                <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">Chi nhánh</p>
                                <p className="font-bold text-sm">{customer.branch?.name || "N/A"}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="glass border border-black/5 shadow-xl rounded-xl overflow-hidden bg-white/70">
                    <CardHeader className="p-4 pb-2">
                        <CardTitle className="text-base flex items-center gap-2">
                            <Clock className="w-4 h-4 text-purple-500" />
                            Ngày tham gia
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 flex flex-col items-center justify-center py-4">
                        <p className="text-3xl font-black text-slate-800">
                            {new Date(customer.created_at).toLocaleDateString("vi-VN", { day: '2-digit', month: '2-digit', year: 'numeric' })}
                        </p>
                        <p className="text-[10px] text-muted-foreground uppercase font-black tracking-[0.2em] mt-1 italic">Hội viên từ hệ thống</p>
                    </CardContent>
                </Card>
            </div>

            {customer.complaints.length > 0 && (
                <div className="p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-4 shadow-sm">
                    <div className="p-2 rounded-lg bg-red-100 text-red-600">
                        <MessageSquareWarning className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-red-700 font-bold text-base mb-1">
                            Lưu ý: Có {customer.complaints.length} khiếu nại
                        </h3>
                        <p className="text-red-600/80 text-xs leading-relaxed">{customer.complaints[0].content}</p>
                    </div>
                </div>
            )}

            {/* 3. Treatments Table Stack */}
            <Card className="glass border border-black/5 shadow-xl rounded-xl overflow-hidden bg-white/70">
                <CardHeader className="p-6 pb-3 bg-slate-50/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-blue-500 text-white shadow-md shadow-blue-500/20">
                            <Stethoscope className="w-5 h-5" />
                        </div>
                        <div>
                            <CardTitle className="text-lg font-black tracking-tight">Lịch sử Liệu trình</CardTitle>
                            <CardDescription className="text-xs font-medium">Toàn bộ quá trình thực hiện dịch vụ</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-6 pt-3">
                    <DataTable columns={treatmentColumns} data={customer.treatments} searchKey="service_name" />
                </CardContent>
            </Card>

            {/* 4. Appointments Table Stack */}
            <Card className="glass border border-black/5 shadow-xl rounded-xl overflow-hidden bg-white/70">
                <CardHeader className="p-6 pb-3 bg-slate-50/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-purple-500 text-white shadow-md shadow-purple-500/20">
                            <Calendar className="w-5 h-5" />
                        </div>
                        <div>
                            <CardTitle className="text-lg font-black tracking-tight">Lịch thăm khám & Tư vấn</CardTitle>
                            <CardDescription className="text-xs font-medium">Quản lý các cuộc hẹn hiện tại và lịch sử</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-6 pt-3">
                    <DataTable columns={appointmentColumns} data={customer.appointments} searchKey="service_name" />
                </CardContent>
            </Card>

            {/* Tiền sử Sức Khỏe Table Stack */}
            <Card className="glass border border-black/5 shadow-xl rounded-xl overflow-hidden bg-white/70">
                <CardHeader className="p-6 pb-3 bg-slate-50/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-teal-600 text-white shadow-md shadow-teal-600/20">
                            <Activity className="w-5 h-5" />
                        </div>
                        <div>
                            <CardTitle className="text-lg font-black tracking-tight">Tiền sử Sức khỏe & Bệnh lý</CardTitle>
                            <CardDescription className="text-xs font-medium">Bản khai báo thông tin y khoa của khách hàng</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-6 pt-3">
                    <DataTable columns={anamnesisColumns} data={customer.anamnesis || []} searchKey="content" />
                </CardContent>
            </Card>

            {/* 5. Financial Sections */}
            <div className="grid grid-cols-1 gap-6">
                {/* Payments */}
                <Card className="glass border border-black/5 shadow-xl rounded-xl overflow-hidden bg-white/70">
                    <CardHeader className="p-6 pb-3 bg-slate-50/50">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-emerald-500 text-white shadow-md shadow-emerald-500/20">
                                <Receipt className="w-5 h-5" />
                            </div>
                            <div>
                                <CardTitle className="text-lg font-black tracking-tight">Lịch sử Thanh toán</CardTitle>
                                <CardDescription className="text-xs font-medium">Nhật ký giao dịch tài chính chi tiết</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-6 pt-3">
                        <DataTable columns={paymentColumns} data={customer.payments} searchKey="payment_method" />
                    </CardContent>
                </Card>

                {/* Installments */}
                <Card className="glass border border-black/5 shadow-xl rounded-xl overflow-hidden bg-white/70">
                    <CardHeader className="p-6 pb-3 bg-slate-50/50">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-red-500 text-white shadow-md shadow-red-500/20">
                                <CreditCard className="w-5 h-5" />
                            </div>
                            <div>
                                <CardTitle className="text-lg font-black tracking-tight">Lịch trình Trả góp</CardTitle>
                                <CardDescription className="text-xs font-medium">Theo dõi dư nợ và tiến độ hoàn trả</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-6 pt-3">
                        <DataTable columns={installmentColumns} data={customer.installments} searchKey="note" />
                    </CardContent>
                </Card>
            </div>

            {/* 6. Services & Products Stack */}
            <Card className="glass border border-black/5 shadow-xl rounded-xl overflow-hidden bg-white/70">
                <CardHeader className="p-6 pb-3 bg-slate-50/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-indigo-500 text-white shadow-md shadow-indigo-500/20">
                            <ConciergeBell className="w-5 h-5" />
                        </div>
                        <div>
                            <CardTitle className="text-lg font-black tracking-tight">Sản phẩm & Dịch vụ</CardTitle>
                            <CardDescription className="text-xs font-medium">Các gói dịch vụ đã đăng ký và sử dụng</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-6 pt-3">
                    <DataTable columns={serviceColumns} data={customer.service_tabs} searchKey="service_name" />
                </CardContent>
            </Card>

            {/* 7. Care History Stack */}
            <Card className="glass border border-black/5 shadow-xl rounded-xl overflow-hidden bg-white/70">
                <CardHeader className="p-6 pb-3 bg-slate-50/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-purple-600 text-white shadow-md shadow-purple-600/20">
                            <ClipboardList className="w-5 h-5" />
                        </div>
                        <div>
                            <CardTitle className="text-lg font-black tracking-tight">Nhật ký Chăm sóc</CardTitle>
                            <CardDescription className="text-xs font-medium">Lịch sử tương tác, tư vấn và hỗ trợ</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-6 pt-3">
                    <DataTable columns={careColumns} data={customer.care_history} searchKey="note" />
                </CardContent>
            </Card>

            {/* 8. Prescription & Health Stack */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Medicine */}
                <Card className="glass border border-black/5 shadow-xl rounded-xl overflow-hidden bg-white/70">
                    <CardHeader className="p-6 pb-3 bg-slate-50/50">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-red-600 text-white shadow-md shadow-red-600/20">
                                <Pill className="w-5 h-5" />
                            </div>
                            <div>
                                <CardTitle className="text-lg font-black tracking-tight">Đơn thuốc & Thuốc</CardTitle>
                                <CardDescription className="text-xs font-medium">Lịch sử kê đơn và sử dụng thuốc</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-6 pt-3">
                        <DataTable columns={prescriptionColumns} data={customer.prescriptions} searchKey="medicine_name" />
                    </CardContent>
                </Card>

                {/* Cards Management */}
                <Card className="glass border border-black/5 shadow-xl rounded-xl overflow-hidden bg-white/70">
                    <CardHeader className="p-6 pb-3 bg-slate-50/50">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-blue-600 text-white shadow-md shadow-blue-600/20">
                                <ShieldCheck className="w-5 h-5" />
                            </div>
                            <div>
                                <CardTitle className="text-lg font-black tracking-tight">Thẻ Thành viên & Tài khoản</CardTitle>
                                <CardDescription className="text-xs font-medium">Quản lý số dư và hạn dùng của các loại thẻ</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-6 pt-3">
                        <DataTable columns={cardColumns} data={customer.cards} searchKey="card_name" />
                    </CardContent>
                </Card>
            </div>

            {/* 9. Image Library Stack */}
            <Card className="glass border border-black/5 shadow-xl rounded-xl overflow-hidden bg-white/70">
                <CardHeader className="p-6 pb-3 bg-slate-50/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-teal-600 text-white shadow-md shadow-teal-600/20">
                            <ImageIcon className="w-5 h-5" />
                        </div>
                        <div>
                            <CardTitle className="text-lg font-black tracking-tight">Thư viện Hình ảnh</CardTitle>
                            <CardDescription className="text-xs font-medium">Hình ảnh trước/sau và hồ sơ khách hàng</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-6 pt-3">
                    {customer.image_folders.length > 0 ? (
                        <div className="space-y-8">
                            {customer.image_folders.map((folder: any) => (
                                <div key={folder.id} className="space-y-4">
                                    <div className="flex items-center gap-2 border-b border-black/5 pb-2">
                                        <Folder className="w-4 h-4 text-slate-400" />
                                        <h4 className="font-black text-slate-800 uppercase tracking-tighter text-sm">{folder.folder_name}</h4>
                                        <Badge variant="secondary" className="text-[10px] text-muted-foreground">{folder.images.length} ảnh</Badge>
                                    </div>
                                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                                        {folder.images.map((img: any) => (
                                            <div key={img.id} className="group relative aspect-square rounded-xl overflow-hidden border border-black/5 bg-slate-100 hover:scale-105 transition-transform cursor-zoom-in">
                                                <img
                                                    src={img.feature_image}
                                                    alt={img.real_name}
                                                    className="w-full h-full object-cover"
                                                />
                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                    <span className="text-[10px] text-white font-black uppercase text-center p-2">{img.real_name}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12 text-muted-foreground italic font-medium">Chưa có hình ảnh nào trong thư viện.</div>
                    )}
                </CardContent>
            </Card>

            {/* 10. Status History Stack */}
            <Card className="glass border border-black/5 shadow-xl rounded-xl overflow-hidden bg-white/70">
                <CardHeader className="p-6 pb-3 bg-slate-50/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-slate-800 text-white shadow-md shadow-slate-800/20">
                            <Activity className="w-5 h-5" />
                        </div>
                        <div>
                            <CardTitle className="text-lg font-black tracking-tight">Lịch sử Chuyển trạng thái</CardTitle>
                            <CardDescription className="text-xs font-medium">Theo dõi sự thay đổi trạng thái khách hàng trong quá trình CSKH</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-6 pt-3">
                    <DataTable columns={statusHistoryColumns} data={customer.status_history} searchKey="master_status_name" />
                </CardContent>
            </Card>

            {/* 11. Proposal Plans Stack */}
            <Card className="glass border border-black/5 shadow-xl rounded-xl overflow-hidden bg-white/70">
                <CardHeader className="p-6 pb-3 bg-slate-50/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-orange-500 text-white shadow-md shadow-orange-500/20">
                            <BookOpen className="w-5 h-5" />
                        </div>
                        <div>
                            <CardTitle className="text-lg font-black tracking-tight">Phác đồ Đề xuất</CardTitle>
                            <CardDescription className="text-xs font-medium">Định hướng điều trị từ chuyên gia</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-6 pt-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {customer.treatment_plans.length > 0 ? customer.treatment_plans.map((plan: any) => (
                            <div key={plan.id} className="p-4 rounded-xl bg-white border border-black/5 shadow-sm hover:shadow-md transition-shadow">
                                <div className="flex items-center justify-between mb-2">
                                    <Badge className="bg-orange-500/10 text-orange-600 border-none font-black text-[10px] uppercase px-2 py-0.5">Đề xuất</Badge>
                                    <span className="text-[10px] text-muted-foreground font-bold italic">{new Date(plan.created_at).toLocaleDateString("vi-VN")}</span>
                                </div>
                                <p className="font-black text-slate-800 text-base mb-1">{plan.service_name}</p>
                                <p className="text-xs text-slate-600 leading-relaxed mb-3">{plan.note}</p>
                                <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[8px] font-black">BS</div>
                                    <p className="text-[8px] font-black uppercase text-slate-500">Bác sĩ: {plan.doctor_name || "N/A"}</p>
                                </div>
                            </div>
                        )) : (
                            <div className="col-span-full text-center py-6 text-muted-foreground italic font-medium text-xs">Không có phác đồ nào.</div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Complaints Table Stack */}
            <Card className="glass border border-black/5 shadow-xl rounded-xl overflow-hidden bg-white/70">
                <CardHeader className="p-6 pb-3 bg-red-50/10">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-red-500 text-white shadow-md shadow-red-500/20">
                            <MessageSquareWarning className="w-5 h-5" />
                        </div>
                        <div>
                            <CardTitle className="text-lg font-black tracking-tight">Lịch sử Khiếu nại / Phàn nàn</CardTitle>
                            <CardDescription className="text-xs font-medium">Danh sách các phàn nàn, góp ý từ khách hàng</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-6 pt-3">
                    <DataTable columns={complaintColumns} data={customer.complaints || []} searchKey="content" />
                </CardContent>
            </Card>
        </div>
    )
}
