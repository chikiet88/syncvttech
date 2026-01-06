import prisma from "@/lib/db"
import { notFound } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import {
  User,
  MapPin,
  ArrowLeft,
} from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { CustomerDetailContent } from "./detail-client"

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
        take: 100
      },
      appointments: {
        orderBy: { appointment_date: "desc" },
        take: 100
      },
      payments: {
        orderBy: { payment_date: "desc" },
        take: 100
      },
      service_tabs: {
        orderBy: { created_at: "desc" },
        take: 100
      },
      treatment_plans: {
        orderBy: { created_at: "desc" },
        take: 50
      },
      care_history: {
        orderBy: { action_date: "desc" },
        take: 100
      },
      installments: {
        orderBy: { created_at: "desc" },
        take: 50
      },
      complaints: {
        orderBy: { created_at: "desc" },
        take: 20
      }
    }
  })

  if (!customer) {
    return notFound()
  }

  return (
    <div className="p-6 space-y-6 animate-fade-in max-w-7xl mx-auto">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-black/5">
        <div className="flex items-center gap-4">
          <Link href="/customers">
            <Button variant="ghost" size="icon" className="rounded-lg glass h-10 w-10 border border-black/5 bg-white/50 shadow-sm">
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </Button>
          </Link>
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <h2 className="text-3xl font-black tracking-tighter text-slate-900 italic">
                {customer.name}
              </h2>
              <Badge variant="outline" className="rounded-md bg-blue-500/10 text-blue-600 border-none font-black px-2 py-0.5 text-[10px]">
                {customer.code || `C-${customer.id}`}
              </Badge>
            </div>
            <div className="flex items-center gap-3 text-xs font-medium text-slate-500">
              <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {customer.branch?.name || "Chi nhánh chung"}</span>
              {customer.membership && (
                <span className="flex items-center gap-1 text-purple-600 font-bold uppercase tracking-widest text-[9px]">
                  • {customer.membership.name}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button className="rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold px-6 shadow-md text-sm">
            Chỉnh sửa Hồ sơ
          </Button>
        </div>
      </div>

      <CustomerDetailContent customer={customer} />
    </div>
  )
}
