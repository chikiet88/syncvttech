'use client'

import * as React from 'react'
import {
  TrendingUp,
  Building2,
  BadgeDollarSign,
  UserCog,
  Settings,
  LogOut,
  Activity,
  Database,
  Users,
  Calendar,
  Layers,
  Users2,
  Stethoscope,
  Briefcase,
  PhoneCall,
  ChevronRight
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
  SidebarFooter,
} from '@/components/ui/sidebar'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { useAuth } from '@/hooks/use-auth'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const data = {
  navMain: [
    {
      title: 'Báo cáo & Phân tích',
      items: [
        { title: 'Tổng hợp', url: '/reports', icon: TrendingUp },
        { title: 'Doanh thu', url: '/reports/revenue', icon: BadgeDollarSign },
        { title: 'Lịch hẹn Taza', url: '/reports/appointments', icon: Calendar },
      ],
    },
    {
      title: 'Dữ liệu hệ thống',
      items: [
        { title: 'Khách hàng', url: '/customers', icon: Users },
        { title: 'Lịch hẹn', url: '/appointments', icon: Calendar },
        { title: 'Dịch vụ', url: '/services', icon: Layers },
        { title: 'Nhân viên', url: '/employees', icon: Users2 },
        { title: 'Liệu trình', url: '/treatments', icon: Stethoscope },
      ],
    },
    {
      title: 'Call Center',
      items: [
        { title: 'Ghi âm cuộc gọi', url: '/call-center/records', icon: PhoneCall },
        { title: 'Extension', url: '/call-center/extensions', icon: Briefcase },
      ],
    },
    {
      title: 'Vận hành',
      items: [
        { title: 'Giám sát đồng bộ', url: '/monitoring/sync', icon: Activity },
        { title: 'Log hệ thống', url: '/monitoring/crawl-logs', icon: Database },
        { title: 'Cài đặt Cron', url: '/monitoring/cron-settings', icon: Settings },
      ],
    }
  ],
}

export function AppSidebar() {
  const { user, logout } = useAuth()
  const pathname = usePathname()

  return (
    <Sidebar collapsible="icon" className="border-r border-zinc-100 bg-white shadow-none">
      <SidebarHeader className="p-3 border-b border-zinc-100 bg-white">
        <div className="flex items-center gap-2 px-1">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-900 text-white font-bold text-lg">
            V
          </div>
          <div className="flex flex-col gap-0 leading-none group-data-[collapsible=icon]:hidden">
            <span className="font-bold text-sm tracking-tight text-zinc-900">VTTech <span className="text-zinc-500">Studio</span></span>
            <span className="text-[8px] text-zinc-400 font-bold uppercase tracking-widest">Enterprise Dashboard</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent className="py-2 bg-white flex flex-col gap-1">
        {data.navMain.map((group) => (
          <SidebarGroup key={group.title} className="p-0">
            <SidebarGroupLabel className="group-data-[collapsible=icon]:hidden px-4 text-[9px] font-bold uppercase tracking-wider text-zinc-400 mb-1 mt-4">
              {group.title}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-0.5 px-3">
                {group.items.map((item) => {
                  const isActive = pathname === item.url || pathname.startsWith(item.url + '/')
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton 
                        asChild 
                        tooltip={item.title}
                        className={cn(
                          "h-9 rounded-lg transition-all duration-200",
                          isActive 
                            ? "bg-zinc-100 text-zinc-900 font-bold border-none" 
                            : "hover:bg-zinc-50 text-zinc-500 hover:text-zinc-900"
                        )}
                      >
                        <a href={item.url} className="flex items-center gap-2.5">
                          <item.icon className={cn("h-4 w-4 shrink-0", isActive ? "text-zinc-900" : "text-zinc-400")} />
                          <span className="text-[12.5px] tracking-tight">{item.title}</span>
                        </a>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter className="p-3 border-t border-zinc-100 bg-white">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton className="h-10 hover:bg-zinc-50 rounded-lg transition-all border-none">
              <Avatar className="h-6 w-6 rounded-md border border-zinc-100">
                <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user}`} />
                <AvatarFallback className="rounded-md bg-zinc-900 text-white font-bold text-[10px]">{user?.substring(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col gap-0 text-left leading-none group-data-[collapsible=icon]:hidden ml-1.5 overflow-hidden">
                <span className="font-bold text-xs text-zinc-900 truncate">{user}</span>
                <span className="text-[9px] text-zinc-400 font-medium truncate uppercase tracking-tighter">Administrator</span>
              </div>
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="right" className="w-56 rounded-xl p-1 bg-white border border-zinc-100 shadow-xl animate-in slide-in-from-left-2 z-50">
            <DropdownMenuItem className="rounded-lg p-2 focus:bg-zinc-50 font-bold text-xs gap-3">
              <UserCog className="w-4 h-4 text-zinc-400" /> Hồ sơ cá nhân
            </DropdownMenuItem>
            <DropdownMenuItem className="rounded-lg p-2 focus:bg-zinc-50 font-bold text-xs gap-3">
              <Settings className="w-4 h-4 text-zinc-400" /> Cài đặt hệ thống
            </DropdownMenuItem>
            <div className="h-px bg-zinc-100 my-1 mx-1" />
            <DropdownMenuItem 
              className="rounded-lg p-2 focus:bg-rose-50 text-rose-600 font-bold text-xs gap-3 cursor-pointer"
              onClick={() => logout()}
            >
              <LogOut className="w-4 h-4" /> Đăng xuất phiên làm việc
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
