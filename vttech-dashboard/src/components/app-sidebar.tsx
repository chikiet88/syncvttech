'use client'

import * as React from 'react'
import {
  LayoutDashboard,
  MapPin,
  Users,
  Briefcase,
  Settings,
  Database,
  Search,
  ChevronRight,
  Stethoscope,
  BadgeDollarSign,
  HeartHandshake,
  TrendingUp,
  History,
  Activity,
  UserCog,
  ShieldCheck,
  Building2,
  Package,
  Megaphone
} from 'lucide-react'

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarTrigger,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar'
import { Input } from '@/components/ui/input'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'

const data = {
  user: {
    name: 'VTTech Admin',
    email: 'admin@vttech.vn',
    avatar: 'https://github.com/shadcn.png',
  },
  navMain: [
    {
      title: 'Phân tích & Giám sát',
      url: '#',
      icon: Activity,
      isActive: true,
      items: [
        { title: 'Tổng quan', url: '/', icon: LayoutDashboard },
        { title: 'Xu hướng Doanh thu', url: '/', icon: TrendingUp },
        { title: 'Lịch sử Đồng bộ', url: '/monitoring/crawl-logs', icon: History },
      ],
    },
    {
      title: 'Dữ liệu Cốt lõi',
      url: '#',
      icon: Building2,
      items: [
        { title: 'Chi nhánh', url: '/branches', icon: MapPin },
        { title: 'Dịch vụ', url: '/services', icon: Package },
        { title: 'Tiếp thị', url: '#', icon: Megaphone },
      ],
    },
    {
      title: 'CRM & Nhân sự',
      url: '#',
      icon: Users,
      items: [
        { title: 'Khách hàng', url: '/customers', icon: Users },
        { title: 'Nhân viên', url: '/employees', icon: Briefcase },
        { title: 'Quản lý Người dùng', url: '#', icon: UserCog },
      ],
    },
    {
      title: 'Vận hành',
      url: '#',
      icon: Stethoscope,
      items: [
        { title: 'Lịch hẹn', url: '/appointments', icon: History },
        { title: 'Liệu trình', url: '/treatments', icon: HeartHandshake },
        { title: 'Thẻ Dịch vụ', url: '/service-tabs', icon: Settings },
      ],
    },
    {
      title: 'Chăm sóc Khách hàng',
      url: '#',
      icon: BadgeDollarSign,
      items: [
        { title: 'Thanh toán', url: '/payments', icon: BadgeDollarSign },
        { title: 'Trả góp', url: '/installments', icon: ShieldCheck },
        { title: 'Khiếu nại', url: '#', icon: Settings },
        { title: 'Lịch sử', url: '#', icon: History },
      ],
    },
  ],
}

export function AppSidebar() {
  const [search, setSearch] = React.useState('')
  const { state } = useSidebar()

  const filteredNav = data.navMain.map(group => ({
    ...group,
    items: group.items.filter(item => 
      item.title.toLowerCase().includes(search.toLowerCase())
    )
  })).filter(group => group.items.length > 0)

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-4 border-b border-black/5">
        <div className="flex items-center gap-3 px-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white font-bold text-xl shadow-lg shadow-blue-500/20">
            V
          </div>
          <div className="flex flex-col gap-0.5 leading-none group-data-[collapsible=icon]:hidden">
            <span className="font-bold text-lg">VTTech <span className="gradient-text">Studio</span></span>
            <span className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">Enterprise</span>
          </div>
        </div>
        <div className="mt-4 px-2 group-data-[collapsible=icon]:hidden">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Tìm kiếm tính năng..."
              className="pl-9 bg-slate-100 border-none h-9 focus-visible:ring-1 focus-visible:ring-blue-500 rounded-xl"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent className="py-2">
        {filteredNav.map((group) => (
          <SidebarGroup key={group.title}>
            <SidebarGroupLabel className="group-data-[collapsible=icon]:hidden px-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-2">
              {group.title}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton 
                      asChild 
                      tooltip={item.title}
                      className="hover:bg-slate-100 data-[active=true]:bg-blue-600/10 data-[active=true]:text-blue-600 rounded-xl transition-all duration-300 mx-2 w-[calc(100%-1rem)]"
                    >
                      <a href={item.url} className="flex items-center gap-3">
                        <item.icon className="h-4 w-4 shrink-0 transition-transform group-hover:scale-110" />
                        <span className="font-medium">{item.title}</span>
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter className="p-4 border-t border-black/5">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton className="h-12 hover:bg-slate-100 rounded-xl transition-all duration-300">
              <Avatar className="h-8 w-8 rounded-lg border border-black/10">
                <AvatarImage src={data.user.avatar} />
                <AvatarFallback className="rounded-lg">VA</AvatarFallback>
              </Avatar>
              <div className="flex flex-col gap-0.5 text-left leading-none group-data-[collapsible=icon]:hidden">
                <span className="font-semibold text-sm">{data.user.name}</span>
                <span className="text-xs text-muted-foreground truncate w-32">{data.user.email}</span>
              </div>
              <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground group-data-[collapsible=icon]:hidden" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="right" className="w-56 rounded-2xl p-2 bg-popover/95 backdrop-blur-xl border border-black/5 shadow-2xl">
            <DropdownMenuItem className="rounded-xl p-3 focus:bg-slate-100">Hồ sơ</DropdownMenuItem>
            <DropdownMenuItem className="rounded-xl p-3 focus:bg-slate-100">Cài đặt</DropdownMenuItem>
            <DropdownMenuItem className="rounded-xl p-3 focus:bg-destructive/10 text-destructive">Đăng xuất</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
