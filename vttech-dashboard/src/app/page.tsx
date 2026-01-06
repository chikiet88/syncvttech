import { Suspense } from 'react'
import prisma from '@/lib/db'
import { 
  Users, 
  TrendingUp, 
  MapPin, 
  RefreshCcw, 
  Calendar, 
  CheckCircle2, 
  XCircle,
  Clock,
  ArrowUpRight,
  Phone
} from 'lucide-react'
import RevenueChart from '@/components/RevenueChart'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'

// Fetch Stats
async function getStats() {
  const [branchCount, customerCount, revenueTotal, callCount, lastSync] = await Promise.all([
    prisma.branch.count(),
    prisma.customer.count(),
    prisma.dailyRevenue.aggregate({ _sum: { paid: true } }),
    prisma.pbxCallRecord.count(),
    prisma.crawlLog.findFirst({ orderBy: { created_at: 'desc' } })
  ])

  return {
    branchCount,
    customerCount,
    revenueTotal: revenueTotal._sum.paid || 0,
    callCount,
    lastSync
  }
}

// Fetch Recent Logs
async function getRecentLogs() {
  return await prisma.crawlLog.findMany({
    take: 5,
    orderBy: { created_at: 'desc' }
  })
}

// Fetch Revenue Data for Chart
async function getChartData() {
  const data = await prisma.dailyRevenue.findMany({
    take: 7,
    orderBy: { date: 'desc' },
    select: {
      date: true,
      paid: true,
      branch_name: true
    }
  })
  return data.reverse().map((d: any) => ({
    name: new Date(d.date).toLocaleDateString('vi-VN', { weekday: 'short' }),
    revenue: d.paid
  }))
}

export default async function DashboardPage() {
  const stats = await getStats()
  const logs = await getRecentLogs()
  const chartData = await getChartData()
  
  return (
    <div className="min-h-screen bg-background text-foreground p-6 md:p-10 lg:p-12 space-y-10 max-w-7xl mx-auto animate-fade-in">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
            VTTech <span className="gradient-text">Studio</span>
          </h1>
          <p className="text-muted-foreground text-lg">
            Giải pháp đồng bộ thông minh & phân tích kinh doanh.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Badge variant="outline" className="px-4 py-2 rounded-full glass border-none text-sm font-medium flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${stats.lastSync?.status === 'success' ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
            {stats.lastSync ? `Đã đồng bộ ${new Date(stats.lastSync.created_at).toLocaleTimeString('vi-VN')}` : 'Chưa đồng bộ'}
          </Badge>
          <Button size="icon" variant="ghost" className="rounded-full glass h-12 w-12 hover:rotate-180 transition-transform duration-500">
            <RefreshCcw className="w-5 h-5" />
          </Button>
        </div>
      </header>

      {/* Stats Grid */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Hệ thống VTTech"
          value={`${stats.branchCount} Chi nhánh`}
          icon={<MapPin className="w-5 h-5 text-blue-500" />}
          description="Đang hoạt động"
        />
        <StatCard
          title="Khách hàng CRM"
          value={stats.customerCount.toLocaleString()}
          icon={<Users className="w-5 h-5 text-purple-500" />}
          description="Hồ sơ đã đăng ký"
        />
        <StatCard
          title="Tổng Doanh thu"
          value={stats.revenueTotal.toLocaleString()}
          suffix=" VND"
          icon={<TrendingUp className="w-5 h-5 text-emerald-500" />}
          description="Doanh thu tích lũy"
        />
        <StatCard
          title="Tổng cuộc gọi"
          value={stats.callCount.toLocaleString()}
          icon={<Phone className="w-5 h-5 text-orange-500" />}
          description="Lịch sử từ PBX"
        />
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Main Chart Card */}
        <Card className="lg:col-span-8 glass border border-black/5 shadow-2xl overflow-hidden rounded-[2rem] bg-white/70">
          <CardHeader className="p-8 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl font-bold">Phân tích Doanh thu</CardTitle>
                <CardDescription className="text-muted-foreground/80">Hiệu suất kinh doanh trong 7 ngày qua</CardDescription>
              </div>
              <Button variant="ghost" size="sm" className="gap-2 hover:bg-black/5">
                Xem báo cáo đầy đủ <ArrowUpRight className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-8 pt-0">
             <div className="h-[350px] w-full mt-6">
                <RevenueChart data={chartData} />
             </div>
          </CardContent>
        </Card>

        {/* Recent Activity Card */}
        <Card className="lg:col-span-4 glass border border-black/5 shadow-2xl rounded-[2rem] flex flex-col bg-white/70">
          <CardHeader className="p-8 pb-4">
             <CardTitle className="text-2xl font-bold flex items-center gap-2">
                <Clock className="w-6 h-6 text-blue-500" />
                Đồng bộ Trực tiếp
             </CardTitle>
             <CardDescription className="text-muted-foreground/80">Nhật ký xử lý thời gian thực</CardDescription>
          </CardHeader>
          <CardContent className="p-8 pt-4 flex-1">
            <div className="space-y-6">
              {logs.map((log: any, i: number) => (
                <div key={log.id} className="group flex items-start justify-between gap-4 animate-fade-in" style={{ animationDelay: `${i * 100}ms` }}>
                  <div className="space-y-1 min-w-0">
                    <p className="font-semibold text-sm truncate uppercase tracking-tight">{log.crawl_type}</p>
                    <p className="text-xs text-muted-foreground">{new Date(log.created_at).toLocaleTimeString('vi-VN')}</p>
                  </div>
                  <Badge variant={log.status === 'success' ? 'secondary' : 'destructive'} className={`text-[10px] shadow-sm uppercase px-2 py-0 ${log.status === 'success' ? 'bg-emerald-500/10 text-emerald-600 border-none hover:bg-emerald-500/20' : ''}`}>
                    {log.status === 'success' ? 'Thành công' : 'Lỗi'}
                  </Badge>
                </div>
              ))}
            </div>
            <Button variant="ghost" className="w-full mt-8 border border-black/5 hover:bg-black/5 rounded-xl">
              Xem tất cả nhật ký
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function StatCard({ title, value, icon, description, suffix = "" }: { title: string, value: string | number, icon: React.ReactNode, description: string, suffix?: string }) {
  return (
    <Card className="glass border border-black/5 shadow-xl hover:shadow-2xl transition-all duration-500 rounded-[2rem] group overflow-hidden bg-white/70">
      <CardHeader className="p-6 flex flex-row items-center justify-between space-y-0 pb-2">
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{title}</p>
        <div className="p-2.5 rounded-2xl bg-slate-100 group-hover:bg-slate-200 transition-colors">
          {icon}
        </div>
      </CardHeader>
      <CardContent className="p-6 pt-2">
        <div className="text-3xl font-black tracking-tight">{value}{suffix}</div>
        <p className="text-xs text-muted-foreground mt-2 font-medium opacity-60 group-hover:opacity-100 transition-opacity">
          {description}
        </p>
      </CardContent>
    </Card>
  )
}
