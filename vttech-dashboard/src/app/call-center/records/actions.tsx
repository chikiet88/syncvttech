"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { RefreshCcw, Play, Loader2, Calendar as CalendarIcon, PhoneCall } from "lucide-react"
import { useRouter } from "next/navigation"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function PbxActions() {
    const [isOpen, setIsOpen] = useState(false)
    const [isSyncing, setIsSyncing] = useState(false)
    const [isSyncingMaster, setIsSyncingMaster] = useState(false)
    
    // Date range states
    const [dateFrom, setDateFrom] = useState(new Date().toISOString().split('T')[0])
    const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0])
    
    const router = useRouter()

    const handleStartPbxSync = async () => {
        setIsSyncing(true)
        try {
            const response = await fetch(`http://localhost:3001/sync/pbx?from=${dateFrom}&to=${dateTo}`)
            if (response.ok) {
                alert("Đã bắt đầu đồng bộ PBX CDR trong background")
                setIsOpen(false)
            } else {
                const error = await response.json()
                alert(error.message || "Không thể bắt đầu đồng bộ")
            }
        } catch (error) {
            alert("Lỗi kết nối Server")
        } finally {
            setIsSyncing(false)
        }
    }

    const handleSyncMaster = async () => {
        setIsSyncingMaster(true)
        try {
            const response = await fetch("http://localhost:3001/sync/pbx-master")
            if (response.ok) {
                alert("Đã bắt đầu đồng bộ Extensions và Employees")
            }
        } catch (error) {
            alert("Lỗi kết nối Server")
        } finally {
            setIsSyncingMaster(false)
        }
    }

    return (
        <div className="flex items-center gap-3">
            <Button
                variant="outline"
                className="rounded-xl gap-2 glass border-none"
                onClick={() => router.refresh()}
            >
                <RefreshCcw className="w-4 h-4" />
                Làm mới
            </Button>

            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogTrigger asChild>
                    <Button
                        className="rounded-xl gap-2 font-bold bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/20"
                    >
                        <PhoneCall className="w-4 h-4" />
                        Đồng bộ PBX
                    </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px] bg-background/95 backdrop-blur-xl border-none shadow-2xl rounded-[2rem] overflow-hidden">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                           Đồng bộ Tổng đài
                        </DialogTitle>
                        <DialogDescription>
                            Lấy lịch sử cuộc gọi (CDR) từ máy chủ PBX.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-4 space-y-6">
                        <div className="grid grid-cols-2 gap-4 p-4 bg-blue-500/5 rounded-2xl border border-blue-500/10">
                            <div className="space-y-2">
                                <Label htmlFor="dateFrom" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Từ ngày</Label>
                                <div className="relative">
                                    <CalendarIcon className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="dateFrom"
                                        type="date"
                                        value={dateFrom}
                                        onChange={(e) => setDateFrom(e.target.value)}
                                        className="pl-9 rounded-xl border-none bg-background shadow-sm"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="dateTo" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Đến ngày</Label>
                                <div className="relative">
                                    <CalendarIcon className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="dateTo"
                                        type="date"
                                        value={dateTo}
                                        onChange={(e) => setDateTo(e.target.value)}
                                        className="pl-9 rounded-xl border-none bg-background shadow-sm"
                                    />
                                </div>
                            </div>

                            <div className="col-span-2 pt-2">
                                <Button 
                                    className="w-full rounded-xl font-bold bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/20"
                                    onClick={handleStartPbxSync}
                                    disabled={isSyncing}
                                >
                                    {isSyncing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Play className="w-4 h-4 mr-2" />}
                                    Bắt đầu Đồng bộ CDR
                                </Button>
                            </div>
                        </div>

                        <div className="p-4 bg-orange-500/5 rounded-2xl border border-orange-500/10 space-y-3">
                            <h4 className="text-xs font-bold uppercase tracking-widest text-orange-600">Dữ liệu Master</h4>
                            <p className="text-[11px] text-muted-foreground font-medium uppercase italic">Đồng bộ danh sách Extension và Nhân viên từ VTTech để ánh xạ với cuộc gọi.</p>
                            <Button 
                                variant="outline"
                                className="w-full rounded-xl border-orange-500/20 hover:bg-orange-50 text-orange-600 font-bold"
                                onClick={handleSyncMaster}
                                disabled={isSyncingMaster}
                            >
                                {isSyncingMaster ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCcw className="w-4 h-4 mr-2" />}
                                Đồng bộ Extension/Nhân sự
                            </Button>
                        </div>
                    </div>

                    <DialogFooter className="bg-slate-50 p-4 -m-6 mt-4 border-t border-black/5">
                        <Button
                            variant="ghost"
                            className="rounded-xl px-8 hover:bg-black/5"
                            onClick={() => setIsOpen(false)}
                        >
                            Đóng
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
