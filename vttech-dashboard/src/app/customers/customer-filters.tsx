"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Calendar, MapPin, X, Filter } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface Branch {
  id: number
  name: string
}

export function CustomerFilters() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const today = new Date().toISOString().split('T')[0]
  const [branches, setBranches] = useState<Branch[]>([])
  const [selectedBranch, setSelectedBranch] = useState<string>(searchParams.get("branchId") || "all")
  const [fromDate, setFromDate] = useState<string>(searchParams.get("from") || today)
  const [toDate, setToDate] = useState<string>(searchParams.get("to") || today)

  useEffect(() => {
    fetch("/api/branches")
      .then((res) => res.json())
      .then((data) => setBranches(data))
      .catch((err) => console.error("Error fetching branches:", err))
  }, [])

  const onApply = () => {
    const params = new URLSearchParams(searchParams.toString())
    
    if (selectedBranch && selectedBranch !== "all") {
      params.set("branchId", selectedBranch)
    } else {
      params.delete("branchId")
    }

    if (fromDate) {
      params.set("from", fromDate)
    } else {
      params.delete("from")
    }

    if (toDate) {
      params.set("to", toDate)
    } else {
      params.delete("to")
    }

    router.push(`/customers?${params.toString()}`)
  }

  const onReset = () => {
    setSelectedBranch("all")
    setFromDate(today)
    setToDate(today)
    router.push("/customers")
  }

  return (
    <div className="flex flex-wrap items-center gap-4 bg-slate-50/50 p-4 rounded-[2rem] border border-black/5 glass">
      <div className="flex items-center gap-2">
        <MapPin className="w-4 h-4 text-blue-500" />
        <Select value={selectedBranch} onValueChange={setSelectedBranch}>
          <SelectTrigger className="w-[200px] border border-black/5 bg-white/80 rounded-xl shadow-sm">
            <SelectValue placeholder="Tất cả Chi nhánh" />
          </SelectTrigger>
          <SelectContent className="bg-popover border-border rounded-xl shadow-2xl z-50">
            <SelectItem value="all">Tất cả Chi nhánh</SelectItem>
            {branches.map((branch) => (
              <SelectItem key={branch.id} value={branch.id.toString()}>
                {branch.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2">
        <Calendar className="w-4 h-4 text-purple-500" />
        <Input
          type="date"
          className="w-[160px] border border-black/5 bg-white/80 rounded-xl shadow-sm"
          value={fromDate}
          onChange={(e) => setFromDate(e.target.value)}
        />
        <span className="text-muted-foreground text-sm font-medium">đến</span>
        <Input
          type="date"
          className="w-[160px] border border-black/5 bg-white/80 rounded-xl shadow-sm"
          value={toDate}
          onChange={(e) => setToDate(e.target.value)}
        />
      </div>

      <div className="flex items-center gap-2 ml-auto">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onReset}
          className="rounded-xl gap-2 hover:bg-slate-100 border-black/5 bg-white/50"
        >
          <X className="w-4 h-4" />
          Đặt lại
        </Button>
        <Button 
          size="sm" 
          onClick={onApply}
          className="rounded-xl gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20"
        >
          <Filter className="w-4 h-4" />
          Áp dụng lọc
        </Button>
      </div>
    </div>
  )
}
