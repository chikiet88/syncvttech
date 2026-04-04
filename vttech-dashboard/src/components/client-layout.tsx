"use client"

import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { Separator } from "@/components/ui/separator"
import { AuthProvider, useAuth } from "@/hooks/use-auth"
import { usePathname } from "next/navigation"
import { Toaster } from "sonner"

export function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <LayoutContent>{children}</LayoutContent>
      <Toaster position="top-right" expand={true} richColors />
    </AuthProvider>
  )
}

function LayoutContent({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const pathname = usePathname();

  // Show login page without any layout overhead
  if (pathname === "/login") {
    return <main className="min-h-screen w-full bg-background">{children}</main>;
  }

  // Prevent flash of content during loading
  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  // If not authenticated, the AuthProvider will handle redirect, but we hide content here too
  if (!isAuthenticated) return null;

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="bg-background overflow-hidden flex flex-col h-screen">
        <header className="flex h-12 shrink-0 items-center justify-between gap-2 border-b border-zinc-100 px-4 bg-white/80 backdrop-blur-md sticky top-0 z-40 transition-all">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1 h-8 w-8 hover:bg-zinc-100 rounded-lg text-zinc-500" />
            <Separator orientation="vertical" className="h-4 bg-zinc-200" />
            <div className="flex items-center gap-1.5 overflow-hidden">
               <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-tighter shrink-0">Hệ thống</span>
               <span className="text-zinc-300">/</span>
               <span className="text-[11px] font-black text-zinc-900 uppercase tracking-tight truncate">
                 {pathname.split('/').filter(Boolean).pop() || 'Tổng quan'}
               </span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
             <div className="hidden md:flex items-center px-2 py-0.5 bg-emerald-50 rounded-full border border-emerald-100">
                <div className="h-1 w-1 rounded-full bg-emerald-500 animate-pulse mr-1.5" />
                <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest">Realtime Active</span>
             </div>
          </div>
        </header>
        <main className="flex-1 overflow-auto bg-zinc-50/50">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
