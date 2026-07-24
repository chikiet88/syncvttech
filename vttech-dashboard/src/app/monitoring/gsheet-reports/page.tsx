"use client"

import React, { useEffect, useState } from "react"
import { DataTable } from "@/components/ui/data-table"
import { getColumns, GsheetReportColumn } from "./columns"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { toast } from "sonner"
import { Database, Play, RefreshCw, X, Calendar, DatabaseZap } from "lucide-react"

export default function GsheetReportsPage() {
  const [reports, setReports] = useState<GsheetReportColumn[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [selectedReport, setSelectedReport] = useState<GsheetReportColumn | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'

  const fetchReports = async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/monitoring/gsheet-reports`)
      if (!res.ok) throw new Error("Không thể tải danh sách báo cáo")
      const data = await res.json()
      setReports(data)
    } catch (error: any) {
      console.error(error)
      toast.error("Lỗi khi tải danh sách báo cáo GSheet.")
    } finally {
      if (!silent) setLoading(false)
    }
  }

  useEffect(() => {
    fetchReports()
  }, [])

  const handleSyncManual = async () => {
    setSyncing(true)
    toast.info("Đang bắt đầu đối soát & đồng bộ lên Google Sheets...")
    try {
      const res = await fetch(`${API_BASE}/monitoring/gsheet-reports/sync`, {
        method: "POST"
      })
      if (!res.ok) throw new Error("Yêu cầu đồng bộ thất bại")
      const result = await res.json()
      toast.success(result.message || "Đã kích hoạt đồng bộ thành công.")
      
      // Refresh list after 3 seconds to see new report
      setTimeout(() => {
        fetchReports(true)
      }, 3000)
    } catch (error: any) {
      console.error(error)
      toast.error(`Kích hoạt đồng bộ thất bại: ${error.message}`)
    } finally {
      setSyncing(false)
    }
  }

  const handleViewDetail = (report: GsheetReportColumn) => {
    setSelectedReport(report)
    setIsDialogOpen(true)
  }

  // Simple markdown renderer for displaying the comparison logs nicely
  const renderMarkdown = (content: string) => {
    if (!content) return null
    const lines = content.split('\n')
    return lines.map((line, idx) => {
      if (line.startsWith('# ')) {
        return <h1 key={idx} className="text-xl font-bold text-zinc-950 mt-4 mb-2 first:mt-0">{line.substring(2)}</h1>
      }
      if (line.startsWith('## ')) {
        return <h2 key={idx} className="text-sm font-bold text-zinc-800 uppercase tracking-wide mt-5 mb-2.5 pb-1 border-b border-zinc-100">{line.substring(3)}</h2>
      }
      if (line.startsWith('### ')) {
        return <h3 key={idx} className="text-xs font-bold text-zinc-600 uppercase tracking-wider mt-4 mb-1.5">{line.substring(4)}</h3>
      }
      if (line.startsWith('* ')) {
        return <li key={idx} className="text-xs text-zinc-600 ml-4 list-disc my-1">{line.substring(2)}</li>
      }
      if (line.startsWith('|')) {
        // Render markdown table row
        if (line.includes('---')) return null
        const cols = line.split('|').map(c => c.trim()).filter((c, i, a) => i > 0 && i < a.length - 1)
        const isHeader = line.includes('Năm') || line.includes('STT')
        return (
          <div 
            key={idx} 
            className={`flex text-[11px] py-2 border-b border-zinc-100 items-center ${isHeader ? 'font-bold bg-zinc-50 border-t border-b-2 border-zinc-200 text-zinc-800' : 'text-zinc-600 hover:bg-zinc-50/50'}`}
          >
            {cols.map((col, colIdx) => (
              <div key={colIdx} className="flex-1 px-2.5 overflow-hidden truncate">
                {col}
              </div>
            ))}
          </div>
        )
      }
      if (line.trim() === '') return <div key={idx} className="h-1.5" />
      return <p key={idx} className="text-xs text-zinc-600 leading-relaxed my-0.5">{line}</p>
    })
  }

  const columns = getColumns(handleViewDetail)

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-3">
            <DatabaseZap className="w-6 h-6 text-indigo-500" />
            Lịch sử Báo cáo GSheet
          </h2>
          <p className="text-sm text-muted-foreground">
            Quản lý nhật ký đối soát dữ liệu và đồng bộ khách hàng định kỳ lên Google Sheets.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchReports()}
            disabled={loading}
            className="h-9 px-3 text-xs font-bold gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Tải lại
          </Button>
          <Button
            size="sm"
            onClick={handleSyncManual}
            disabled={syncing}
            className="h-9 px-4 text-xs font-bold gap-1.5 bg-zinc-900 text-white hover:bg-zinc-800"
          >
            <Play className={`w-3 h-3 fill-white ${syncing ? "animate-pulse" : ""}`} />
            Chạy đối soát & Sync
          </Button>
        </div>
      </div>

      <Card className="border-none shadow-sm bg-white rounded-2xl overflow-hidden">
        <CardHeader className="p-6 pb-2">
          <CardTitle className="text-lg">Danh sách Báo cáo</CardTitle>
          <CardDescription className="text-xs">Báo cáo chênh lệch số lượng bản ghi giữa Database CRM và Google Sheet.</CardDescription>
        </CardHeader>
        <CardContent className="p-6 pt-2">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3">
              <RefreshCw className="w-8 h-8 text-zinc-400 animate-spin" />
              <p className="text-xs text-zinc-500 font-medium">Đang tải danh sách báo cáo...</p>
            </div>
          ) : (
            <DataTable columns={columns} data={reports} searchKey="status" />
          )}
        </CardContent>
      </Card>

      {/* Dialog detail view */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-[700px] w-[90vw] max-h-[85vh] overflow-hidden flex flex-col p-6 bg-white rounded-2xl border border-zinc-100 shadow-xl">
          <DialogHeader className="pb-4 border-b border-zinc-100 flex flex-row items-center justify-between">
            <div>
              <DialogTitle className="text-lg font-bold text-zinc-900 flex items-center gap-2">
                <Database className="w-5 h-5 text-indigo-500" />
                Chi tiết Báo cáo Đối soát
              </DialogTitle>
              {selectedReport && (
                <DialogDescription className="text-xs text-zinc-500 flex items-center gap-1.5 mt-1">
                  <Calendar className="w-3.5 h-3.5" />
                  Mã báo cáo: #{selectedReport.id} — Ngày chạy: {new Date(selectedReport.report_date).toLocaleString('vi-VN')}
                </DialogDescription>
              )}
            </div>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto py-6 pr-2 space-y-4 max-h-[50vh] font-sans selection:bg-zinc-200">
            {selectedReport ? (
              <div className="bg-zinc-50/50 p-6 rounded-xl border border-zinc-100 space-y-4">
                {renderMarkdown(selectedReport.report_content)}
              </div>
            ) : (
              <p className="text-xs text-zinc-500 italic">Không có dữ liệu hiển thị.</p>
            )}
          </div>

          <div className="pt-4 border-t border-zinc-100 flex justify-end gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsDialogOpen(false)}
              className="h-9 px-4 text-xs font-bold rounded-lg"
            >
              Đóng hộp thoại
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
