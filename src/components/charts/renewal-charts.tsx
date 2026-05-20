import * as React from 'react'
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  ComposedChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import type { QuarterlyData, TheatreData, ProductGroupData, ForecastData } from '@/types/renewal.types'

const CHART_COLORS = ['#6366f1', '#22d3ee', '#f59e0b', '#10b981', '#f43f5e', '#8b5cf6', '#ec4899', '#14b8a6']
const THEATRE_COLORS: Record<string, string> = {
  AMERICAS: '#6366f1',
  EMEA: '#22d3ee',
  APJC: '#f59e0b',
  Unknown: '#94a3b8',
}

const CUSTOM_TOOLTIP_STYLE = {
  backgroundColor: 'var(--popover)',
  border: '1px solid var(--border)',
  borderRadius: '8px',
  color: 'var(--popover-foreground)',
  fontSize: '12px',
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div style={CUSTOM_TOOLTIP_STYLE} className="px-3 py-2 shadow-lg">
      <p className="mb-1 font-medium text-xs text-muted-foreground">{label}</p>
      {payload.map((entry: { name: string; value: number; color: string }, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-xs text-foreground">{entry.name}: <strong>{entry.value}</strong></span>
        </div>
      ))}
    </div>
  )
}

interface QuarterlyChartProps {
  data: QuarterlyData[]
}

export function QuarterlyRenewalChart({ data }: QuarterlyChartProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Quarterly Renewals</CardTitle>
        <CardDescription className="text-xs">Renewed vs Expired per quarter</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={220}>
          <ComposedChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="quarter" tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Legend iconSize={8} iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
            <Bar dataKey="renewed" name="Renewed" fill="#10b981" radius={[3, 3, 0, 0]} maxBarSize={32} />
            <Bar dataKey="expired" name="Expired" fill="#f43f5e" radius={[3, 3, 0, 0]} maxBarSize={32} />
            <Bar dataKey="pending" name="Pending" fill="#f59e0b" radius={[3, 3, 0, 0]} maxBarSize={32} />
            <Line type="monotone" dataKey="renewalRate" name="Rate %" yAxisId="right" stroke="#6366f1" strokeWidth={2} dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

export function RenewalTrendChart({ data }: QuarterlyChartProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Renewal Rate Trend</CardTitle>
        <CardDescription className="text-xs">Renewal rate over time</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
            <defs>
              <linearGradient id="renewalGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="quarter" tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} domain={[0, 100]} />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={80} stroke="#10b981" strokeDasharray="3 3" strokeWidth={1} label={{ value: 'Target', fontSize: 10, fill: '#10b981' }} />
            <Area type="monotone" dataKey="renewalRate" name="Renewal Rate %" stroke="#6366f1" fill="url(#renewalGrad)" strokeWidth={2} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

interface TheatreChartProps {
  data: TheatreData[]
}

export function TheatreDistributionChart({ data }: TheatreChartProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Theatre Distribution</CardTitle>
        <CardDescription className="text-xs">Renewals by region</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={data}
              dataKey="count"
              nameKey="theatre"
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={80}
              paddingAngle={3}
            >
              {data.map((entry, i) => (
                <Cell key={entry.theatre} fill={THEATRE_COLORS[entry.theatre] || CHART_COLORS[i % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend iconSize={8} iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

interface ProductGroupChartProps {
  data: ProductGroupData[]
}

export function ProductGroupChart({ data }: ProductGroupChartProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Product Group Performance</CardTitle>
        <CardDescription className="text-xs">Renewed vs Expired by product group</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
            <YAxis dataKey="productGroup" type="category" tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} width={90} />
            <Tooltip content={<CustomTooltip />} />
            <Legend iconSize={8} iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
            <Bar dataKey="renewed" name="Renewed" fill="#10b981" radius={[0, 3, 3, 0]} maxBarSize={16} stackId="a" />
            <Bar dataKey="expired" name="Expired" fill="#f43f5e" radius={[0, 3, 3, 0]} maxBarSize={16} stackId="a" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

interface ForecastChartProps {
  data: ForecastData[]
}

export function ForecastChart({ data }: ForecastChartProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Renewal Forecast</CardTitle>
        <CardDescription className="text-xs">Actual vs forecasted renewals with confidence bands</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={260}>
          <ComposedChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
            <defs>
              <linearGradient id="forecastGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="quarter" tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Legend iconSize={8} iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
            <Area type="monotone" dataKey="upper" stroke="none" fill="#6366f1" fillOpacity={0.1} name="Upper Bound" />
            <Area type="monotone" dataKey="lower" stroke="none" fill="var(--background)" fillOpacity={1} name="Lower Bound" />
            <Line type="monotone" dataKey="actual" name="Actual" stroke="#10b981" strokeWidth={2} dot={{ r: 3, fill: '#10b981' }} connectNulls={false} />
            <Line type="monotone" dataKey="forecast" name="Forecast" stroke="#6366f1" strokeWidth={2} strokeDasharray="5 3" dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

export function RenewalFunnelChart({ data }: { data: { name: string; value: number; color: string }[] }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Renewal Funnel</CardTitle>
        <CardDescription className="text-xs">From target to renewed</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {data.map((item, i) => {
            const maxVal = data[0]?.value || 1
            const pct = Math.round((item.value / maxVal) * 100)
            return (
              <div key={item.name} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">{item.name}</span>
                  <span className="font-medium tabular-nums">{item.value} <span className="text-muted-foreground">({pct}%)</span></span>
                </div>
                <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${pct}%`, backgroundColor: item.color }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
