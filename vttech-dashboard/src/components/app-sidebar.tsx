'use client'

import * as React from 'react'
import {
  ChevronRight,
  TrendingUp,
  Building2,
  BadgeDollarSign,
  UserCog,
  Settings,
  LogOut
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

const data = {
  navMain: [
    {
      title: 'Hệ thống Báo cáo',
      url: '#',
      icon: TrendingUp,
      items: [
        { title: 'Tổng hợp Chi nhánh', url: '/reports', icon: Building2 },
        { title: 'Doanh thu Chi tiết', url: '/reports/revenue', icon: BadgeDollarSign },
      ],
    }
  ],
}

export function AppSidebar() {
  const { user, logout } = useAuth()

  return (
    <Sidebar collapsible="icon" className="border-none shadow-2xl">
      <SidebarHeader className="p-4 border-b border-black/5 bg-white">
        <div className="flex items-center gap-3 px-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white font-bold text-xl shadow-lg shadow-indigo-500/20">
            V
          </div>
          <div className="flex flex-col gap-0.5 leading-none group-data-[collapsible=icon]:hidden">
            <span className="font-extrabold text-lg tracking-tight">VTTech <span className="text-indigo-600">Studio</span></span>
            <span className="text-[9px] text-muted-foreground uppercase tracking-[0.2em] font-black">Enterprise</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent className="py-4 bg-white/50 backdrop-blur-sm">
        {data.navMain.map((group) => (
          <SidebarGroup key={group.title}>
            <SidebarGroupLabel className="group-data-[collapsible=icon]:hidden px-4 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4 ml-1">
              {group.title}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-1">
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton 
                      asChild 
                      tooltip={item.title}
                      className="hover:bg-indigo-50/50 data-[active=true]:bg-indigo-600 data-[active=true]:text-white rounded-xl transition-all duration-300 mx-3 w-[calc(100%-1.5rem)] h-11"
                    >
                      <a href={item.url} className="flex items-center gap-3">
                        <item.icon className="h-4 w-4 shrink-0" />
                        <span className="font-bold text-[13px] tracking-tight">{item.title}</span>
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter className="p-4 border-t border-black/5 bg-white">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton className="h-14 hover:bg-slate-50 rounded-2xl transition-all duration-300 border border-transparent hover:border-slate-100">
              <Avatar className="h-9 w-9 rounded-xl border border-black/5 shadow-sm">
                <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user}`} />
                <AvatarFallback className="rounded-xl bg-indigo-600 text-white font-bold">{user?.substring(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col gap-0.5 text-left leading-none group-data-[collapsible=icon]:hidden ml-1">
                <span className="font-black text-[13px] text-slate-900 tracking-tight">{user}</span>
                <span className="text-[10px] text-slate-400 font-bold truncate w-32">Quản trị viên</span>
              </div>
              <ChevronRight className="ml-auto h-4 w-4 text-slate-300 group-data-[collapsible=icon]:hidden" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="right" className="w-56 rounded-[1.5rem] p-2 bg-white/95 backdrop-blur-xl border border-slate-100 shadow-2xl animate-in slide-in-from-left-2">
            <DropdownMenuItem className="rounded-xl p-3 focus:bg-slate-50 font-bold text-xs gap-3">
              <UserCog className="w-4 h-4 text-slate-400" /> Hồ sơ cá nhân
            </DropdownMenuItem>
            <DropdownMenuItem className="rounded-xl p-3 focus:bg-slate-50 font-bold text-xs gap-3">
              <Settings className="w-4 h-4 text-slate-400" /> Cài đặt hệ thống
            </DropdownMenuItem>
            <div className="h-px bg-slate-50 my-2 mx-2" />
            <DropdownMenuItem 
              className="rounded-xl p-3 focus:bg-red-50 text-red-600 font-bold text-xs gap-3 cursor-pointer"
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
