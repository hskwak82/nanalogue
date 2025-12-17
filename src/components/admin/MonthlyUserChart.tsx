'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LabelList,
} from 'recharts'

interface MonthlyUserData {
  month: string
  label: string
  free: number
  pro: number
  total: number
}

interface MonthlyUserChartProps {
  data: MonthlyUserData[]
}

export function MonthlyUserChart({ data }: MonthlyUserChartProps) {
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
          allowDecimals={false}
        />
        <Tooltip
          cursor={false}
          contentStyle={{
            backgroundColor: 'white',
            border: '1px solid #E5E7EB',
            borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          }}
          formatter={(value: number, name: string) => [
            `${value}명`,
            name === 'free' ? '무료' : '프로',
          ]}
          labelFormatter={(label) => `${label} 가입자`}
        />
        <Legend
          formatter={(value) => (value === 'free' ? '무료' : '프로')}
          wrapperStyle={{ paddingTop: '10px' }}
        />
        <Bar
          dataKey="free"
          stackId="users"
          fill="#9CA3AF"
          name="free"
          radius={[0, 0, 0, 0]}
        >
          <LabelList
            dataKey="free"
            position="center"
            fill="#fff"
            fontSize={11}
            fontWeight={500}
            formatter={(value: number) => (value > 0 ? value : '')}
          />
        </Bar>
        <Bar
          dataKey="pro"
          stackId="users"
          fill="#A78BFA"
          name="pro"
          radius={[4, 4, 0, 0]}
        >
          <LabelList
            dataKey="pro"
            position="center"
            fill="#fff"
            fontSize={11}
            fontWeight={500}
            formatter={(value: number) => (value > 0 ? value : '')}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
