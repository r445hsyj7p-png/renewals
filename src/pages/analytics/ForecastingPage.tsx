import * as React from 'react'
import { BarChart3, TrendingUp, Globe, Package } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { KPICard } from '@/components/charts/kpi-card'
import { ForecastChart, QuarterlyRenewalChart, TheatreDistributionChart } from '@/components/charts/renewal-charts'
import { useRenewalStore } from '@/store/renewal.store'
import { RenewalService } from '@/services/renewal.service'
import { mockRenewals } from '@/data/mock-renewals'
import { formatPercent } from '@/lib/utils'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'

export function ForecastingPage() {
  const { records: storeRecords } = useRenewalStore()
  const records = storeRecords.length > 0 ? storeRecords : mockRenewals

  const quarterly = React.useMemo(() => RenewalService.getQuarterlyData(records), [records])
  const theatre = React.useMemo(() => RenewalService.getTheatreData(records), [records])
  const productGroups = React.useMemo(() => RenewalService.getProductGroupData(records), [records])
  const forecast = React.useMemo(() => RenewalService.getForecastData(quarterly), [quarterly])
  const kpis = React.useMemo(() => RenewalService.calculateKPIs(records), [records])

  const lastActual = forecast.filter(f => f.actual !== null).slice(-1)[0]
  const nextForecast = forecast.filter(f => f.actual === null)[0]
  const forecastGrowth = lastActual && nextForecast
    ? ((nextForecast.forecast - lastActual.actual!) / lastActual.actual! * 100).toFixed(1)
    : null

  const theatreForecasts = theatre.map(t => {
    const baseCount = t.count
    const growth = (Math.random() * 10 - 2)
    return {
      ...t,
      forecasted: Math.round(baseCount * (1 + growth / 100)),
      growth: growth.toFixed(1),
    }
  })

  const pgForecastData = productGroups.map(pg => ({
    name: pg.productGroup.length > 16 ? pg.productGroup.slice(0, 14) + '…' : pg.productGroup,
    current: pg.count,
    forecasted: Math.round(pg.count * (1 + (Math.random() * 0.15 - 0.05))),
    renewalRate: pg.renewalRate,
  }))

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Forecasting</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Renewal forecasts and trend predictions</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KPICard
          title="Forecasted Renewals"
          value={kpis.forecastedRenewals}
          icon={BarChart3}
          severity="info"
          description="Next quarter estimate"
        />
        <KPICard
          title="Forecast Growth"
          value={forecastGrowth ? `${forecastGrowth}%` : '—'}
          icon={TrendingUp}
          severity={forecastGrowth && Number(forecastGrowth) > 0 ? 'success' : 'warning'}
          description="vs current quarter"
        />
        <KPICard
          title="Theatre Coverage"
          value={theatre.length}
          icon={Globe}
          severity="info"
          description="Active theatres"
        />
        <KPICard
          title="Product Groups"
          value={productGroups.length}
          icon={Package}
          severity="info"
          description="Active groups"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ForecastChart data={forecast} />
        <QuarterlyRenewalChart data={quarterly} />
      </div>

      {/* Theatre Forecasts */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Theatre Forecast</CardTitle>
            <CardDescription className="text-xs">Expected renewals by region next quarter</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {theatreForecasts.map(t => (
                <div key={t.theatre} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{t.theatre}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-muted-foreground text-xs">Current: {t.count}</span>
                      <span className="font-bold tabular-nums">
                        Forecast: {t.forecasted}
                      </span>
                      <span className={Number(t.growth) >= 0 ? 'text-green-500 text-xs' : 'text-red-500 text-xs'}>
                        {Number(t.growth) >= 0 ? '+' : ''}{t.growth}%
                      </span>
                    </div>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${Math.min((t.forecasted / Math.max(...theatreForecasts.map(x => x.forecasted))) * 100, 100)}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground">Renewal rate: {t.renewalRate}%</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Product Group Forecasts */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Product Group Forecast</CardTitle>
            <CardDescription className="text-xs">Current vs forecasted by product group</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={pgForecastData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'var(--popover)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '12px' }}
                />
                <Legend iconSize={8} iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
                <Area type="monotone" dataKey="current" name="Current" stroke="#6366f1" fill="#6366f1" fillOpacity={0.2} strokeWidth={2} />
                <Area type="monotone" dataKey="forecasted" name="Forecasted" stroke="#10b981" fill="#10b981" fillOpacity={0.15} strokeWidth={2} strokeDasharray="5 3" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
