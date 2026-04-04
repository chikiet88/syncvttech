"use client"

import * as React from "react"
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { 
  ChevronDown, 
  Search, 
  RefreshCw
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { vietnameseSearch } from "@/lib/vietnamese"

interface AdvancedTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  searchKey?: string
  hideFilterButton?: boolean
  height?: string
  pageSize?: number
  onRowClick?: (row: TData) => void
  onRefresh?: () => void
}

export function AdvancedTable<TData, TValue>({
  columns,
  data,
  searchKey,
  hideFilterButton = true,
  height = "calc(100vh - 280px)",
  pageSize = 20,
  onRowClick,
  onRefresh
}: AdvancedTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = React.useState({})
  const [globalFilter, setGlobalFilter] = React.useState("")

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: (row, columnId, filterValue) => {
      const value = row.getValue(columnId)
      return vietnameseSearch(filterValue, String(value))
    },
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      globalFilter,
    },
    initialState: {
      pagination: {
        pageSize: pageSize
      }
    }
  })

  return (
    <div className="w-full space-y-2 animate-in fade-in duration-500">
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-1 items-center gap-2 max-w-sm">
          <div className="relative w-full group">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-400 group-focus-within:text-zinc-900 transition-colors" />
            <Input
              placeholder="Tìm kiếm nhanh..."
              value={globalFilter ?? ""}
              onChange={(event) => setGlobalFilter(event.target.value)}
              className="pl-9 h-9 border-zinc-200 bg-white shadow-none focus-visible:ring-1 focus-visible:ring-zinc-900 rounded-lg text-sm"
            />
          </div>
          {onRefresh && (
            <Button 
              variant="outline" 
              size="icon" 
              onClick={onRefresh}
              className="h-9 w-9 border-zinc-200 rounded-lg hover:bg-zinc-50"
            >
              <RefreshCw className="h-4 w-4 text-zinc-500" />
            </Button>
          )}
        </div>
        {!hideFilterButton && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-9 border-zinc-200 text-xs font-bold rounded-lg hover:bg-zinc-50">
                Hiển thị cột <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[180px] rounded-xl border-zinc-100 shadow-xl p-1">
              {table
                .getAllColumns()
                .filter((column) => column.getCanHide())
                .map((column) => {
                  return (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      className="capitalize text-xs font-medium rounded-lg"
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) =>
                        column.toggleVisibility(!!value)
                      }
                    >
                      {column.id}
                    </DropdownMenuCheckboxItem>
                  )
                })}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <div className="rounded-xl border border-zinc-100 bg-white overflow-hidden shadow-sm shadow-zinc-100/50">
        <ScrollArea className="w-full" style={{ height }}>
          <Table className="relative w-full border-separate border-spacing-0">
            <TableHeader className="sticky top-0 bg-white z-10 shadow-[0_1px_0_0_rgba(228,228,231,1)]">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="hover:bg-transparent border-none">
                  {headerGroup.headers.map((header) => {
                    return (
                      <TableHead 
                        key={header.id} 
                        className="text-zinc-500 font-bold uppercase tracking-wider text-[10px] h-10 px-4 first:pl-6 last:pr-6"
                      >
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                      </TableHead>
                    )
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                    className={cn(
                      "hover:bg-zinc-50/50 transition-colors border-zinc-100",
                      onRowClick && "cursor-pointer"
                    )}
                    onClick={() => onRowClick && onRowClick(row.original)}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className="py-2.5 px-4 first:pl-6 last:pr-6 text-zinc-700 font-medium">
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-32 text-center text-zinc-400 font-bold text-sm"
                  >
                    Không tìm thấy dữ liệu phù hợp.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>

      <div className="flex items-center justify-between px-2 py-1">
        <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-tighter">
          Hiển thị {table.getFilteredRowModel().rows.length} / {data.length} bản ghi
        </div>
        <div className="flex items-center space-x-1.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="h-8 text-xs font-bold rounded-lg hover:bg-zinc-50 disabled:opacity-30 transition-all active:scale-95"
          >
            Trước
          </Button>
          <div className="flex items-center gap-1.5 px-2">
            <span className="text-[11px] font-black text-zinc-900">{table.getState().pagination.pageIndex + 1}</span>
            <span className="text-[10px] font-bold text-zinc-300">/</span>
            <span className="text-[11px] font-bold text-zinc-400">{table.getPageCount()}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="h-8 text-xs font-bold rounded-lg hover:bg-zinc-50 disabled:opacity-30 transition-all active:scale-95"
          >
            Tiếp
          </Button>
        </div>
      </div>
    </div>
  )
}
