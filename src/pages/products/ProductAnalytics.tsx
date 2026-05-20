import * as React from 'react'
import { Package, TrendingUp, CheckCircle, XCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { KPICard } from '@/components/charts/kpi-card'
import { ProductGroupChart } from '@/components/charts/renewal-charts'
import { useRenewalStore } from '@/store/renewal.store'
import { RenewalService } from '@/services/renewal.service'
import { mockRenewals } from '@/data/mock-renewals'
import { cn } from '@/lib/utils'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend,
} from 'recharts'

export function ProductAnalytics() {
  const { records: storeRecords } = useRenewalStore()
  const records = storeRecords.length > 0 ? storeRecords : mockRenewals

  const productGroups = React.useMemo(() => RenewalService.getProductGroupData(records), [records])
  const kpis = React.useMemo(() => RenewalService.calculateKPIs(records), [records])

  const uniqueProducts = React.useMemo(() => {
    const productMap = new Map<string, { code: string; renewed: number; expired: number; group: string }>()
    records.forEach(r => {
      const key = r.productCode
      if (!key) return
      if (!productMap.has(key)) productMap.set(key, { code: key, renewed: 0, expired: 0, group: r.productGroup || '' })
      const e = productMap.get(key)!
      if (r.atrStatus === 'RENEWED') e.renewed++
      else e.expired++
    })
    return Array.from(productMap.values())
      .map(p => ({ ...p, total: p.renewed + p.expired, renewalRate: p.renewed + p.expired > 0 ? Math.round((p.renewed / (p.renewed + p.expired)) * 1000) / 10 : 0 }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 20)
  }, [records])

  const topProductsChartData = uniqueProducts.slice(0, 8).map(p => ({
    name: p.code.length > 16 ? p.code.slice(0, 14) + '…' : p.code,
    renewed: p.renewed,
    expired: p.expired,
    renewalRate: p.renewalRate,
  }))

  const avgRenewalRate = productGroups.length > 0
    ? (productGroups.reduce((s, p) => s + p.renewalRate, 0) / productGroups.length).toFixed(1)
    : '0.0'

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Product Analytics</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {uniqueProducts.length} unique products across {productGroups.length} groups
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KPICard title="Product Groups" value={productGroups.length} icon={Package} severity="info" />
        <KPICard
          title="Avg Renewal Rate"
          value={`${avgRenewalRate}%`}
          icon={TrendingUp}
          severity={Number(avgRenewalRate) >= 80 ? 'success' : Number(avgRenewalRate) >= 60 ? 'warning' : 'danger'}
        />
        <KPICard
          title="Top Performing"
          value={productGroups.filter(p => p.renewalRate >= 80).length}
          icon={CheckCircle}
          severity="success"
          description="≥ 80% renewal rate"
        />
        <KPICard
          title="Underperforming"
          value={productGroups.filter(p => p.renewalRate < 60).length}
          icon={XCircle}
          severity={productGroups.filter(p => p.renewalRate < 60).length > 0 ? 'danger' : 'info'}
          description="< 60% renewal rate"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Product Group Performance */}
        <ProductGroupChart data={productGroups} />

        {/* Top Products Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Top Products by Volume</CardTitle>
            <CardDescription className="text-xs">Renewed vs Expired by product code</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={topProductsChartData} margin={{ top: 0, right: 5, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 8, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'var(--popover)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '12px' }}
                />
                <Legend iconSize={8} iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
                <Bar dataKey="renewed" name="Renewed" fill="#10b981" radius={[3, 3, 0, 0]} maxBarSize={20} stackId="a" />
                <Bar dataKey="expired" name="Expired" fill="#f43f5e" radius={[0, 0, 0, 0]} maxBarSize={20} stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Product Group KPI Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Product Group KPIs</CardTitle>
          <CardDescription className="text-xs">Performance metrics by product group</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  {['Product Group', 'Total', 'Renewed', 'Expired', 'Renewal Rate', 'Status'].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {productGroups.sort((a, b) => b.count - a.count).map(pg => (
                  <tr key={pg.productGroup} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium">{pg.productGroup || '—'}</td>
                    <td className="px-4 py-3 tabular-nums">{pg.count}</td>
                    <td className="px-4 py-3 tabular-nums text-green-500">{pg.renewed}</td>
                    <td className="px-4 py-3 tabular-nums text-red-500">{pg.expired}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Progress value={pg.renewalRate} className="h-1.5 w-16" />
                        <span className={cn('text-xs font-medium tabular-nums w-10',
                          pg.renewalRate >= 80 ? 'text-green-500' :
                          pg.renewalRate >= 60 ? 'text-yellow-500' : 'text-red-500'
                        )}>
                          {pg.renewalRate}%
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {pg.renewalRate >= 80 ? <Badge variant="success">Good</Badge>
                        : pg.renewalRate >= 60 ? <Badge variant="medium">Fair</Badge>
                        : <Badge variant="critical">Poor</Badge>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
