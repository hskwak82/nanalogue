'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LabelList,
} from 'recharts'

interface MonthlyRevenueData {
  month: string
  label: string
  revenue: number
}

interface MonthlyRevenueChartProps {
  data: MonthlyRevenueData[]
}

// Format currency in KRW
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
    maximumFractionDigits: 0,
  }).format(value)
}

export function MonthlyRevenueChart({ data }: MonthlyRevenueChartProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart
        data={data}
        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
        <XAxis
          dataKey="label"
          tick={{ fill: '#6B7280', fontSize: 12 }}
          axisLine={{ stroke: '#E5E7EB' }}
        />
        <YAxis
          tick={{ fill: '#6B7280', fontSize: 12 }}
          axisLine={{ stroke: '#E5E7EB' }}
          tickFormatter={(value) => `₩${(value / 1000).toFixed(0)}K`}
        />
        <Tooltip
          cursor={false}
          contentStyle={{
            backgroundColor: 'white',
            border: '1px solid #E5E7EB',
            borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          }}
          formatter={(value) => [formatCurrency(Number(value) || 0), '매출']}
          labelFormatter={(label) => `${label} 매출`}
        />
        <Bar
          dataKey="revenue"
          fill="#6EE7B7"
          name="revenue"
          radius={[4, 4, 0, 0]}
        >
          <LabelList
            dataKey="revenue"
            position="center"
            fill="#065F46"
            fontSize={11}
            fontWeight={500}
            formatter={(value) => {
              const num = Number(value) || 0
              return num > 0 ? `${(num / 1000).toFixed(0)}K` : ''
            }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
