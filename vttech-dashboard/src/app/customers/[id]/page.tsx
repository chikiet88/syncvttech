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
    <div className="p-8 space-y-8 animate-fade-in max-w-7xl mx-auto">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-black/5">
        <div className="flex items-center gap-6">
          <Link href="/customers">
            <Button variant="ghost" size="icon" className="rounded-full glass h-12 w-12 border border-black/5 bg-white/50 shadow-sm">
              <ArrowLeft className="w-6 h-6 text-slate-600" />
            </Button>
          </Link>
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h2 className="text-4xl font-black tracking-tighter text-slate-900 italic">
                {customer.name}
              </h2>
              <Badge variant="outline" className="rounded-full bg-blue-500/10 text-blue-600 border-none font-black px-3 py-1">
                {customer.code || `C-${customer.id}`}
              </Badge>
            </div>
            <div className="flex items-center gap-4 text-sm font-medium text-slate-500">
              <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> {customer.branch?.name || "Chi nhánh chung"}</span>
              {customer.membership && (
                <span className="flex items-center gap-1.5 text-purple-600 font-bold uppercase tracking-widest text-[10px]">
                  • {customer.membership.name}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button className="rounded-full bg-slate-900 hover:bg-slate-800 text-white font-bold px-8 shadow-xl">
            Chỉnh sửa Hồ sơ
          </Button>
        </div>
      </div>

      <CustomerDetailContent customer={customer} />
    </div>
  )
}
