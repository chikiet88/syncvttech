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

export function CrawlLogActions() {
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
    
    const router = useRouter()
    const logEndRef = useRef<HTMLDivElement>(null)

    // Polling for sync status
    useEffect(() => {
        let interval: NodeJS.Timeout

        if (isOpen || (status?.isSyncing)) {
            const fetchStatus = async () => {
                try {
                    const res = await fetch("http://localhost:3001/sync/status")
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
        if (logEndRef.current) {
            logEndRef.current.scrollIntoView({ behavior: "smooth" })
        }
    }, [status?.logs])

    const handleStartSync = async () => {
        setIsStarting(true)
        try {
            const response = await fetch(`http://localhost:3001/sync?from=${dateFrom}&to=${dateTo}&forceMaster=${forceMaster}&syncPbx=${syncPbx}&syncDetails=${syncDetails}`)
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

    const handleStopSync = async () => {
        setIsStopping(true)
        try {
            const response = await fetch("http://localhost:3001/sync/stop")
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
            const res = await fetch("http://localhost:3001/sync/status")
            if (res.ok) {
                const data = await res.json()
                setStatus(data)
                setIsOpen(true)
            }
        } catch (error) {
            alert("Lỗi kết nối Server")
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
                    className="rounded-xl gap-2 font-bold bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/20"
                    onClick={handleOpenDialog}
                    disabled={isStarting}
                >
                    {isStarting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                    {status?.isSyncing ? "Đang Đồng bộ..." : "Đồng bộ Ngay"}
                </Button>
            </div>

            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent className="sm:max-w-[750px] bg-background/95 backdrop-blur-xl border-none shadow-2xl rounded-[2rem] overflow-hidden p-0">
                    <DialogHeader className="p-8 pb-4">
                        <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                            {status?.isSyncing ? (
                                <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                            ) : status?.error ? (
                                <XCircle className="w-6 h-6 text-red-500" />
                            ) : (
                                <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                            )}
                            {status?.isSyncing ? "Tiến độ đồng bộ" : (status?.logs?.length === 0 ? "Cấu hình đồng bộ" : (status?.error ? "Đồng bộ thất bại" : "Đồng bộ hoàn tất"))}
                        </DialogTitle>
                        <DialogDescription>
                            Dữ liệu khách hàng, dịch vụ và thanh toán được cập nhật từ hệ thống VTTech.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="px-8 pb-8 space-y-6">
                        {/* Configuration Section (Hide when syncing) */}
                        {!status?.isSyncing && (
                            <div className="grid grid-cols-2 gap-4 p-5 bg-slate-500/5 rounded-3xl border border-slate-500/10">
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

                                <div className="col-span-2 space-y-3 pt-2">
                                    <div className="flex items-center gap-2 px-1">
                                        <input 
                                            type="checkbox" 
                                            id="forceMaster" 
                                            checked={forceMaster}
                                            onChange={(e) => setForceMaster(e.target.checked)}
                                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-600 cursor-pointer"
                                        />
                                        <Label htmlFor="forceMaster" className="text-xs font-semibold cursor-pointer text-muted-foreground hover:text-foreground transition-colors">
                                            Đồng bộ lại toàn bộ danh mục (Chi nhánh, Dịch vụ, Nhân viên...)
                                        </Label>
                                    </div>

                                    <div className="flex items-center gap-2 px-1">
                                        <input 
                                            type="checkbox" 
                                            id="syncPbx" 
                                            checked={syncPbx}
                                            onChange={(e) => setSyncPbx(e.target.checked)}
                                            className="h-4 w-4 rounded border-gray-300 text-orange-600 focus:ring-orange-600 cursor-pointer"
                                        />
                                        <Label htmlFor="syncPbx" className="text-xs font-semibold cursor-pointer text-muted-foreground hover:text-foreground transition-colors">
                                            Đồng bộ kèm cuộc gọi PBX (CDR Records)
                                        </Label>
                                    </div>

                                    <div className="flex items-center gap-2 px-1">
                                        <input 
                                            type="checkbox" 
                                            id="syncDetails" 
                                            checked={syncDetails}
                                            onChange={(e) => setSyncDetails(e.target.checked)}
                                            className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-600 cursor-pointer"
                                        />
                                        <Label htmlFor="syncDetails" className="text-xs font-semibold cursor-pointer text-muted-foreground hover:text-foreground transition-colors">
                                            Đồng bộ chi tiết khách hàng (Thanh toán, Điều trị, Lịch sử...)
                                        </Label>
                                    </div>
                                </div>

                                <div className="col-span-2 pt-2 flex gap-3">
                                    <Button 
                                        className="flex-1 rounded-xl font-bold bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/20 h-11"
                                        onClick={handleStartSync}
                                        disabled={isStarting}
                                    >
                                        Bắt đầu Đồng bộ dữ liệu
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* Status/Logs Section (Show always if there are logs or syncing) */}
                        {(status?.isSyncing || (status?.logs?.length ?? 0) > 0) && (
                            <div className="space-y-4 animate-in slide-in-from-bottom duration-500">
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                            <Activity className="w-4 h-4 text-emerald-500" />
                                            Tiến độ: {status?.current} / {status?.total} CHI NHÁNH
                                        </div>
                                        {status?.logs && status.logs.length > 0 && (
                                            <Button
                                                variant="ghost" 
                                                size="sm"
                                                className="h-7 rounded-lg text-[10px] font-bold gap-2 hover:bg-emerald-500/10 hover:text-emerald-500"
                                                onClick={handleCopyLogs}
                                            >
                                                {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                                {isCopied ? "Đã sao chép" : "Sao chép Log"}
                                            </Button>
                                        )}
                                    </div>
                                    <Progress value={status?.progress} className="h-2.5 rounded-full bg-slate-100" />
                                    <div className="flex justify-between items-center text-[10px] font-bold">
                                        <span className="text-blue-600 truncate max-w-[70%] bg-blue-50 px-3 py-1 rounded-full border border-blue-100 italic">
                                            {status?.message}
                                        </span>
                                        {status?.isSyncing && (
                                            <Button
                                                variant="link"
                                                size="sm"
                                                className="h-auto p-0 text-rose-500 font-bold hover:text-rose-600"
                                                onClick={handleStopSync}
                                                disabled={isStopping || status.shouldStop}
                                            >
                                                {isStopping ? "Đang dừng..." : "Dừng ngay"}
                                            </Button>
                                        )}
                                    </div>
                                </div>

                                <div className="bg-[#0f172a] rounded-[1.5rem] p-5 border border-slate-800 shadow-inner flex flex-col group relative">
                                    <div className="font-mono text-[10px] leading-relaxed overflow-y-auto custom-scrollbar h-[300px] pr-2 space-y-1">
                                        {status?.logs.map((log, i) => (
                                            <div key={i} className="flex gap-3 border-b border-white/5 pb-1 last:border-0 hover:bg-white/5 transition-colors group/row">
                                                <span className="text-emerald-500/60 inline-block min-w-[100px] font-medium opacity-80">
                                                    {log.includes(']') ? log.substring(0, log.indexOf(']') + 1) : ''}
                                                </span>
                                                <span className={`${
                                                    log.includes('❌') ? 'text-rose-400 font-bold' : 
                                                    log.includes('⚠️') ? 'text-amber-400' :
                                                    log.includes('✅') ? 'text-emerald-400 font-bold' :
                                                    log.includes('📡') ? 'text-blue-400' :
                                                    log.includes('📅') ? 'text-white font-black bg-blue-500/20 px-2 rounded mt-2' :
                                                    'text-slate-400'
                                                } break-all`}>
                                                    {log.includes(']') ? log.substring(log.indexOf(']') + 1) : log}
                                                </span>
                                            </div>
                                        ))}
                                        <div ref={logEndRef} />
                                    </div>
                                    
                                    {/* Glass gradient overlay on top/bottom */}
                                    <div className="absolute inset-x-0 top-0 h-4 bg-gradient-to-b from-[#0f172a] to-transparent rounded-t-[1.5rem]" />
                                    <div className="absolute inset-x-0 bottom-0 h-4 bg-gradient-to-t from-[#0f172a] to-transparent rounded-b-[1.5rem]" />
                                </div>
                            </div>
                        )}
                    </div>

                    <DialogFooter className="bg-slate-50/50 p-6 border-t border-black/5 flex sm:justify-between items-center">
                        <div className="text-[10px] text-muted-foreground font-medium">
                            {status?.startTime && `Khởi chạy: ${new Date(status.startTime).toLocaleTimeString()}`}
                        </div>
                        <Button
                            variant="ghost"
                            className="rounded-xl px-10 font-bold hover:bg-black/5"
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
