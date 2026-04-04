"use client"

import { useState } from "react"
import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { AlertCircle, Lock, User, Sparkles, Building2 } from "lucide-react"

export default function LoginPage() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    
    // Simulate slight delay for premium feel
    await new Promise(r => setTimeout(r, 600))
    
    const success = await login(username, password)
    if (!success) {
      setError("Tài khoản hoặc mật khẩu không chính xác.")
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#fdfdfd] relative overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-50/50 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-50/50 rounded-full blur-[120px]" />

      <div className="w-full max-w-md px-6 z-10 animate-in fade-in zoom-in duration-700">
        <div className="flex flex-col items-center mb-10 text-center space-y-4">
           <div className="w-16 h-16 bg-gradient-to-tr from-indigo-600 to-indigo-400 rounded-[1.5rem] flex items-center justify-center shadow-2xl shadow-indigo-200 group transition-transform hover:scale-110 duration-500">
              <Building2 className="w-8 h-8 text-white" />
           </div>
           <div>
             <h1 className="text-3xl font-black tracking-tighter text-slate-900 uppercase">
                VTTech <span className="text-indigo-600">Studio</span>
             </h1>
             <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 mt-1">Hệ thống phân tích dữ liệu tập trung</p>
           </div>
        </div>

        <Card className="border border-slate-100 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.08)] rounded-[2.5rem] overflow-hidden bg-white">
          <CardHeader className="space-y-2 p-8 pb-4 pt-10 text-center">
            <CardTitle className="text-2xl font-black text-slate-800 tracking-tight">Chào mừng trở lại</CardTitle>
            <CardDescription className="text-sm font-bold text-slate-400 uppercase tracking-widest">Đăng nhập để bắt đầu phiên làm việc</CardDescription>
          </CardHeader>
          
          <form onSubmit={handleSubmit}>
            <CardContent className="p-8 space-y-5">
              <div className="space-y-2.5">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Tài khoản</Label>
                <div className="relative group">
                  <User className="absolute left-4 top-3.5 h-4 w-4 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                  <Input 
                    placeholder="Nhập tên đăng nhập..."
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="h-12 pl-12 pr-4 rounded-2xl border-slate-100 bg-slate-50/50 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 transition-all font-bold text-slate-700 placeholder:text-slate-300 border focus:border-indigo-200"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2.5">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Mật khẩu</Label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-3.5 h-4 w-4 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                  <Input 
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-12 pl-12 pr-4 rounded-2xl border-slate-100 bg-slate-50/50 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 transition-all font-bold text-slate-700 placeholder:text-slate-300 border focus:border-indigo-200"
                    required
                  />
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 p-4 rounded-2xl bg-red-50 text-red-600 text-xs font-bold animate-shake">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <p>{error}</p>
                </div>
              )}
            </CardContent>

            <CardFooter className="px-8 pb-10 pt-4 flex flex-col space-y-6">
              <Button 
                type="submit" 
                className="w-full h-14 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[13px] uppercase tracking-[0.1em] shadow-xl shadow-indigo-100 transition-all active:scale-95 disabled:opacity-70 flex items-center justify-center gap-3"
                disabled={loading}
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Xác thực hệ thống</span>
                  </>
                )}
              </Button>
              
              <div className="flex items-center gap-4 w-full">
                <div className="h-px bg-slate-100 flex-1" />
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Version 2.0.4 Premium</span>
                <div className="h-px bg-slate-100 flex-1" />
              </div>
            </CardFooter>
          </form>
        </Card>
        
        <p className="mt-8 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-loose max-w-[280px] mx-auto opacity-60">
          Chỉ nhân viên được cấp phép mới có quyền truy cập vào hệ thống này.
        </p>
      </div>
    </div>
  )
}
