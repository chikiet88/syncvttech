"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"

export default function RootPage() {
  const { isAuthenticated, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated) {
        router.push("/reports")
      } else {
        router.push("/login")
      }
    }
  }, [isLoading, isAuthenticated, router])

  return (
    <div className="flex items-center justify-center min-h-screen bg-background text-foreground">
      <div className="flex flex-col items-center gap-4 animate-pulse uppercase tracking-[0.3em] text-[11px] font-black opacity-30">
        <div className="w-10 h-10 border-4 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin" />
        Xác thực hệ thống...
      </div>
    </div>
  )
}
