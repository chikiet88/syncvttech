'use client'

import { useState, useEffect } from 'react'
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts'

interface RevenueChartProps {
  data: {
    name: string
    revenue: number
  }[]
}

export default function RevenueChart({ data }: RevenueChartProps) {
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  if (!isMounted) {
    return <div className="w-full h-full bg-slate-50/50 animate-pulse rounded-2xl" />
  }

  return (
    <div className="w-full h-full min-h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 20, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-primary, #3b82f6)" stopOpacity={0.8}/>
              <stop offset="100%" stopColor="var(--color-secondary, #6366f1)" stopOpacity={0.5}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border, #e2e8f0)" opacity={0.1} />
          <XAxis 
            dataKey="name" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: 'var(--color-muted-foreground, #64748b)', fontSize: 11, fontWeight: 500 }}
            dy={10}
          />
          <YAxis hide />
          <Tooltip 
            cursor={{ fill: 'var(--color-muted, #f1f5f9)', opacity: 0.1 }}
            contentStyle={{ 
              backgroundColor: 'var(--color-popover, #ffffff)', 
              border: '1px solid var(--color-border, #e2e8f0)',
              borderRadius: '12px',
              boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
              backdropFilter: 'blur(8px)',
              padding: '12px'
            }}
            itemStyle={{ color: 'var(--color-foreground, #0f172a)', fontWeight: 600 }}
            labelStyle={{ color: 'var(--color-muted-foreground, #64748b)', marginBottom: '4px', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase' }}
            formatter={(value: any) => [new Intl.NumberFormat('vi-VN').format(Number(value || 0)) + ' VND', 'Revenue']}
          />
          <Bar 
            dataKey="revenue" 
            radius={[8, 8, 8, 8]}
            fill="url(#barGradient)"
            barSize={40}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
