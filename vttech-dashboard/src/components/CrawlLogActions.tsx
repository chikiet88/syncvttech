"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Play, Activity, CheckCircle2, XCircle, AlertCircle, Loader2, Calendar as CalendarIcon, RefreshCw, Phone, ShieldCheck, Copy, Check } from "lucide-react"
import { useRouter } from "next/navigation"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"

interface SyncStatus {
    isSyncing: boolean
    progress: number
    total: number
    current: number
    message: string
    logs: string[]
    startTime: number | null
    endTime: number | null
    error: string | null
    shouldStop: boolean
}

export function CrawlLogActions({ hideSyncButtons = false }: { hideSyncButtons?: boolean }) {
    const [isOpen, setIsOpen] = useState(false)
    const [status, setStatus] = useState<SyncStatus | null>(null)
    const [isStarting, setIsStarting] = useState(false)

    // New date range states
    const [dateFrom, setDateFrom] = useState(new Date().toISOString().split('T')[0])
    const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0])
    const [forceMaster, setForceMaster] = useState(false)
    const [syncPbx, setSyncPbx] = useState(false)
    const [syncDetails, setSyncDetails] = useState(true)
    const [isStopping, setIsStopping] = useState(false)
    const [isCopied, setIsCopied] = useState(false)
    const [loginDialogOpen, setLoginDialogOpen] = useState(false)
    const [testUser, setTestUser] = useState("ittest123")
    const [testPass, setTestPass] = useState("ittest123")
    const [isTesting, setIsTesting] = useState(false)

    const router = useRouter()
    const logContainerRef = useRef<HTMLDivElement>(null)
    const [autoScroll, setAutoScroll] = useState(true)

    // Handle manual scroll to toggle auto-scroll
    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const { scrollTop, scrollHeight, clientHeight } = e.currentTarget
        const isNearBottom = scrollHeight - scrollTop - clientHeight < 50
        setAutoScroll(isNearBottom)
    }

    // Polling for sync status
    useEffect(() => {
        let interval: NodeJS.Timeout

        if (isOpen || (status?.isSyncing)) {
            const fetchStatus = async () => {
                try {
                    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001"}/sync/status`)
                    if (res.ok) {
                        const data = await res.json()
                        setStatus(data)

                        // If sync just finished, refresh the table
                        if (status?.isSyncing && !data.isSyncing) {
                            router.refresh()
                        }
                    }
                } catch (error) {
                    console.error("Poling error:", error)
                }
            }

            fetchStatus()
            interval = setInterval(fetchStatus, 1500)
        }

        return () => {
            if (interval) clearInterval(interval)
        }
    }, [isOpen, status?.isSyncing, router])

    // Scroll to bottom of logs
    useEffect(() => {
        if (autoScroll && logContainerRef.current) {
            logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight
        }
    }, [status?.logs, autoScroll])

    const handleStartSync = async () => {
        setIsStarting(true)
        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001"}/sync?from=${dateFrom}&to=${dateTo}&forceMaster=${forceMaster}&syncPbx=${syncPbx}&syncDetails=${syncDetails}`)
            if (response.ok) {
                setIsOpen(true)
            } else {
                const error = await response.json()
                alert(error.message || "Không thể bắt đầu đồng bộ")
            }
        } catch (error) {
            alert("Lỗi kết nối Server")
        } finally {
            setIsStarting(false)
        }
    }

    const handleStartRevenueSync = async () => {
        setIsStarting(true)
        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001"}/sync/revenue?from=${dateFrom}&to=${dateTo}`)
            if (response.ok) {
                setIsOpen(true)
            } else {
                const error = await response.json()
                alert(error.message || "Không thể bắt đầu đồng bộ doanh thu")
            }
        } catch (error) {
            alert("Lỗi kết nối Server")
        } finally {
            setIsStarting(false)
        }
    }

    const handleStopSync = async () => {
        setIsStopping(true)
        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001"}/sync/stop`)
            if (response.ok) {
                // Request sent
            }
        } catch (error) {
            console.error("Stop request failed", error)
        } finally {
            setIsStopping(false)
        }
    }

    const handleCopyLogs = () => {
        if (!status?.logs) return
        const fullLogs = status.logs.join('\n')
        navigator.clipboard.writeText(fullLogs)
        setIsCopied(true)
        setTimeout(() => setIsCopied(false), 2000)
    }

    const handleOpenDialog = async () => {
        // Check if a sync is already in progress before opening
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001"}/sync/status`)
            if (res.ok) {
                const data = await res.json()
                setStatus(data)
                setIsOpen(true)
            }
        } catch (error) {
            alert("Lỗi kết nối Server")
        }
    }

    const handleCheckLogin = async () => {
        setIsTesting(true)
        try {
            const url = new URL(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001"}/check-login`)
            if (testUser) url.searchParams.set("user", testUser)
            if (testPass) url.searchParams.set("pass", testPass)
            
            const res = await fetch(url.toString())
            const result = await res.json()
            
            if (result.success) {
                alert(`✅ ${result.message}\nUser: ${result.user || 'Default'}`)
                setLoginDialogOpen(false)
            } else {
                alert(`❌ ${result.message}`)
            }
        } catch (error) {
            alert("Lỗi kết nối Backend")
        } finally {
            setIsTesting(false)
        }
    }

    return (
        <>
            <div className="flex items-center gap-3">
                <Button
                    variant="outline"
                    className="rounded-xl gap-2 glass border-none"
                    onClick={() => router.refresh()}
                >
                    <RefreshCw className="w-4 h-4" />
                    Làm mới
                </Button>
                <Button
                    variant="outline"
                    className="rounded-xl gap-2 glass border-none hover:bg-indigo-50 hover:text-indigo-600"
                    onClick={() => setLoginDialogOpen(true)}
                >
                    <ShieldCheck className="w-4 h-4 text-indigo-500" />
                    Check Login
                </Button>
                {!hideSyncButtons && (
                    <>
                        <Button
                            className="rounded-xl gap-2 font-bold bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-500/20"
                            onClick={handleOpenDialog}
                            disabled={isStarting}
                        >
                            {isStarting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Activity className="w-4 h-4" />}
                            {status?.isSyncing ? "Đang Đồng bộ..." : "Đồng bộ Doanh thu"}
                        </Button>
                        <Button
                            className="rounded-xl gap-2 font-bold bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/20"
                            onClick={handleOpenDialog}
                            disabled={isStarting}
                        >
                            {isStarting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                            {status?.isSyncing ? "Đang Đồng bộ..." : "Đồng bộ Ngay"}
                        </Button>
                    </>
                )}
            </div>

            {/* Login Test Dialog */}
            <Dialog open={loginDialogOpen} onOpenChange={setLoginDialogOpen}>
                <DialogContent className="sm:max-w-[400px] rounded-3xl p-8 border-none shadow-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <ShieldCheck className="w-6 h-6 text-indigo-500" />
                            Kiểm tra Đăng nhập
                        </DialogTitle>
                        <DialogDescription>
                            Nhập tài khoản VTTech để thử nghiệm kết nối. Nếu để trống sẽ dùng thông tin mặc định.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="testUser">Username</Label>
                            <Input 
                                id="testUser" 
                                placeholder="Tài khoản..." 
                                value={testUser}
                                onChange={(e) => setTestUser(e.target.value)}
                                className="rounded-xl border-slate-100 h-11"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="testPass">Password</Label>
                            <Input 
                                id="testPass" 
                                type="password" 
                                placeholder="Mật khẩu..." 
                                value={testPass}
                                onChange={(e) => setTestPass(e.target.value)}
                                className="rounded-xl border-slate-100 h-11"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button 
                            className="w-full rounded-xl h-11 font-bold bg-indigo-600 hover:bg-indigo-700 text-white"
                            onClick={handleCheckLogin}
                            disabled={isTesting}
                        >
                            {isTesting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                            {isTesting ? "Đang kiểm tra..." : "Bắt đầu Test"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent className="sm:max-w-[750px] h-[90vh] sm:h-auto max-h-[90vh] flex flex-col p-0 overflow-hidden border-none shadow-2xl rounded-t-[2rem] sm:rounded-[2rem]">
                    <DialogHeader className="p-6 sm:p-8 pb-4 shrink-0 border-b border-black/5">
                        <DialogTitle className="text-xl sm:text-2xl font-bold flex items-center gap-2">
                            {status?.isSyncing ? (
                                <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 animate-spin text-primary" />
                            ) : status?.error ? (
                                <XCircle className="w-5 h-5 sm:w-6 sm:h-6 text-destructive" />
                            ) : (
                                <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-500" />
                            )}
                            <span className="truncate">
                                {status?.isSyncing ? "Tiến độ đồng bộ" : (status?.logs?.length === 0 ? "Cấu hình đồng bộ" : (status?.error ? "Đồng bộ thất bại" : "Đồng bộ hoàn tất"))}
                            </span>
                        </DialogTitle>
                        <DialogDescription className="text-sm">
                            Dữ liệu khách hàng, dịch vụ và thanh toán được cập nhật từ hệ thống VTTech.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto custom-scrollbar p-6 sm:p-8 space-y-6">
                        {/* Configuration Section (Hide when syncing) */}
                        {!status?.isSyncing && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 sm:p-5 bg-muted/30 rounded-3xl border border-border">
                                <div className="space-y-2">
                                    <Label htmlFor="dateFrom" className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Từ ngày</Label>
                                    <div className="relative">
                                        <CalendarIcon className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            id="dateFrom"
                                            type="date"
                                            value={dateFrom}
                                            onChange={(e) => setDateFrom(e.target.value)}
                                            className="pl-9 rounded-xl border-none bg-background shadow-sm h-11"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="dateTo" className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Đến ngày</Label>
                                    <div className="relative">
                                        <CalendarIcon className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            id="dateTo"
                                            type="date"
                                            value={dateTo}
                                            onChange={(e) => setDateTo(e.target.value)}
                                            className="pl-9 rounded-xl border-none bg-background shadow-sm h-11"
                                        />
                                    </div>
                                </div>

                                <div className="col-span-1 md:col-span-2 space-y-4 pt-2">
                                    <div className="flex items-start gap-3 px-1 group cursor-pointer" onClick={() => setForceMaster(!forceMaster)}>
                                        <Checkbox
                                            id="forceMaster"
                                            checked={forceMaster}
                                            onCheckedChange={(checked) => setForceMaster(!!checked)}
                                            className="mt-0.5 rounded-md border-muted-foreground/30 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                                        />
                                        <Label htmlFor="forceMaster" className="text-xs font-semibold leading-relaxed cursor-pointer text-muted-foreground group-hover:text-foreground transition-colors">
                                            Đồng bộ lại toàn bộ danh mục (Chi nhánh, Dịch vụ, Nhân viên...)
                                        </Label>
                                    </div>

                                    <div className="flex items-start gap-3 px-1 group cursor-pointer" onClick={() => setSyncPbx(!syncPbx)}>
                                        <Checkbox
                                            id="syncPbx"
                                            checked={syncPbx}
                                            onCheckedChange={(checked) => setSyncPbx(!!checked)}
                                            className="mt-0.5 rounded-md border-muted-foreground/30 data-[state=checked]:bg-orange-600 data-[state=checked]:border-orange-600"
                                        />
                                        <Label htmlFor="syncPbx" className="text-xs font-semibold leading-relaxed cursor-pointer text-muted-foreground group-hover:text-foreground transition-colors">
                                            Đồng bộ kèm cuộc gọi PBX (CDR Records)
                                        </Label>
                                    </div>

                                    <div className="flex items-start gap-3 px-1 group cursor-pointer" onClick={() => setSyncDetails(!syncDetails)}>
                                        <Checkbox
                                            id="syncDetails"
                                            checked={syncDetails}
                                            onCheckedChange={(checked) => setSyncDetails(!!checked)}
                                            className="mt-0.5 rounded-md border-muted-foreground/30 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                                        />
                                        <Label htmlFor="syncDetails" className="text-xs font-semibold leading-relaxed cursor-pointer text-muted-foreground group-hover:text-foreground transition-colors">
                                            Đồng bộ chi tiết khách hàng (Thanh toán, Điều trị, Lịch sử...)
                                        </Label>
                                    </div>
                                </div>

                                <div className="col-span-1 md:col-span-2 pt-2 flex flex-col sm:flex-row gap-3">
                                    <Button
                                        className="flex-1 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-500/20 h-11"
                                        onClick={handleStartRevenueSync}
                                        disabled={isStarting}
                                    >
                                        Đồng bộ Doanh thu
                                    </Button>
                                    <Button
                                        className="flex-1 rounded-xl font-bold bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 h-11"
                                        onClick={handleStartSync}
                                        disabled={isStarting}
                                    >
                                        Đồng bộ Tổng thể
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* Status/Logs Section (Show always if there are logs or syncing) */}
                        {(status?.isSyncing || (status?.logs?.length ?? 0) > 0) && (
                            <div className="space-y-4 animate-in slide-in-from-bottom duration-500">
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] flex items-center gap-2">
                                            <Activity className="w-4 h-4 text-emerald-500" />
                                            Tiến độ: {status?.current} / {status?.total} CN
                                        </div>
                                        {status?.logs && status.logs.length > 0 && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-7 rounded-lg text-[10px] font-bold gap-2 hover:bg-emerald-500/10 hover:text-emerald-500"
                                                onClick={handleCopyLogs}
                                            >
                                                {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                                {isCopied ? "Đã chép" : "Log"}
                                            </Button>
                                        )}
                                    </div>
                                    <Progress value={status?.progress} className="h-2 rounded-full bg-muted" />
                                    <div className="flex justify-between items-center text-[10px] font-bold">
                                        <span className="text-primary truncate max-w-[70%] bg-primary/5 px-3 py-1 rounded-full border border-primary/10 italic">
                                            {status?.message}
                                        </span>
                                        {status?.isSyncing && (
                                            <Button
                                                variant="link"
                                                size="sm"
                                                className="h-auto p-0 text-destructive font-bold hover:text-destructive/80"
                                                onClick={handleStopSync}
                                                disabled={isStopping || status.shouldStop}
                                            >
                                                {isStopping ? "Đang dừng..." : "Dừng"}
                                            </Button>
                                        )}
                                    </div>
                                </div>

                                <div className="bg-[#0f172a] rounded-[1.5rem] p-4 sm:p-5 border border-slate-800 shadow-inner flex flex-col group relative">
                                    <div
                                        ref={logContainerRef}
                                        onScroll={handleScroll}
                                        className="font-mono text-[10px] sm:text-[11px] leading-relaxed overflow-y-auto custom-scrollbar h-[350px] sm:h-[400px] pr-2 space-y-1 scroll-smooth"
                                    >
                                        {status?.logs.map((log, i) => (
                                            <div key={i} className="flex gap-2 sm:gap-3 border-b border-white/5 pb-1 last:border-0 hover:bg-white/5 transition-colors group/row">
                                                <span className="text-emerald-500/60 inline-block min-w-[80px] sm:min-w-[100px] font-medium opacity-80 shrink-0">
                                                    {log.includes(']') ? log.substring(0, log.indexOf(']') + 1) : ''}
                                                </span>
                                                <span className={cn(
                                                    "break-all",
                                                    log.includes('❌') ? 'text-rose-400 font-bold' :
                                                        log.includes('⚠️') ? 'text-amber-400' :
                                                            log.includes('✅') ? 'text-emerald-400 font-bold' :
                                                                log.includes('📡') ? 'text-blue-400' :
                                                                    log.includes('📅') ? 'text-white font-black bg-blue-500/20 px-2 rounded mt-2' :
                                                                        'text-slate-400'
                                                )}>
                                                    {log.includes(']') ? log.substring(log.indexOf(']') + 1) : log}
                                                </span>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Glass gradient overlay on top/bottom */}
                                    <div className="absolute inset-x-0 top-0 h-4 bg-gradient-to-b from-[#0f172a] to-transparent rounded-t-[1.5rem]" />
                                    <div className="absolute inset-x-0 bottom-0 h-4 bg-gradient-to-t from-[#0f172a] to-transparent rounded-b-[1.5rem]" />
                                </div>
                            </div>
                        )}
                    </div>

                    <DialogFooter className="bg-muted/50 p-6 border-t border-border flex sm:justify-between items-center shrink-0">
                        <div className="hidden sm:block text-[10px] text-muted-foreground font-medium">
                            {status?.startTime && `Khởi chạy: ${new Date(status.startTime).toLocaleTimeString()}`}
                        </div>
                        <Button
                            variant="ghost"
                            className="w-full sm:w-auto rounded-xl px-10 font-bold hover:bg-black/5 h-11 sm:h-auto"
                            onClick={() => setIsOpen(false)}
                        >
                            {status?.isSyncing ? "Chạy ẩn" : "Đóng cửa sổ"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}
