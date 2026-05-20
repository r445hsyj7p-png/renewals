import * as React from 'react'
import { Search, TrendingUp, TrendingDown, Users, AlertTriangle } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { KPICard } from '@/components/charts/kpi-card'
import { useRenewalStore } from '@/store/renewal.store'
import { RenewalService } from '@/services/renewal.service'
import { mockRenewals } from '@/data/mock-renewals'
import { cn } from '@/lib/utils'
import type { CustomerAnalytics as CustomerAnalyticsType } from '@/types/renewal.types'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'

export function CustomerAnalytics() {
  const { records: storeRecords } = useRenewalStore()
  const records = storeRecords.length > 0 ? storeRecords : mockRenewals
  const [search, setSearch] = React.useState('')
  const [debouncedSearch, setDebouncedSearch] = React.useState('')

  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(t)
  }, [search])

  const customers = React.useMemo(() => RenewalService.getCustomerAnalytics(records), [records])
  const kpis = React.useMemo(() => RenewalService.calculateKPIs(records), [records])

  const filtered = React.useMemo(() => {
    if (!debouncedSearch) return customers
    const q = debouncedSearch.toLowerCase()
    return customers.filter(c =>
      c.customerName.toLowerCase().includes(q) ||
      c.country.toLowerCase().includes(q) ||
      c.theatre.toLowerCase().includes(q)
    )
  }, [customers, debouncedSearch])

  const topCustomers = customers.slice(0, 8)
  const churnRisks = customers.filter(c => c.renewalRate < 60).slice(0, 5)

  const topChartData = topCustomers.map(c => ({
    name: c.customerName.length > 20 ? c.customerName.slice(0, 18) + '…' : c.customerName,
    total: c.totalContracts,
    renewed: c.renewedContracts,
    renewalRate: c.renewalRate,
  }))

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Customer Analytics</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {customers.length} unique customers • {records.length} total contracts
        </p>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KPICard title="Total Customers" value={customers.length} icon={Users} severity="info" />
        <KPICard
          title="High Value"
          value={customers.filter(c => c.totalContracts >= 5).length}
          icon={TrendingUp}
          severity="success"
          description="5+ contracts"
        />
        <KPICard
          title="Churn Risk"
          value={churnRisks.length}
          icon={AlertTriangle}
          severity={churnRisks.length > 5 ? 'danger' : 'warning'}
          description="< 60% renewal rate"
        />
        <KPICard
          title="Avg Renewal Rate"
          value={`${(customers.reduce((s, c) => s + c.renewalRate, 0) / (customers.length || 1)).toFixed(1)}%`}
          icon={TrendingUp}
          severity="success"
        />
      </div>

      {/* Top Customers Chart */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Top Customers by Volume</CardTitle>
              <CardDescription className="text-xs">Contract count and renewal performance</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={topChartData} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 9, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'var(--popover)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '12px' }}
                    labelStyle={{ color: 'var(--muted-foreground)' }}
                  />
                  <Bar dataKey="total" name="Total" fill="var(--muted)" radius={[3, 3, 0, 0]} maxBarSize={28} />
                  <Bar dataKey="renewed" name="Renewed" fill="#10b981" radius={[3, 3, 0, 0]} maxBarSize={28} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Churn Risks */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Churn Risk Accounts</CardTitle>
            <CardDescription className="text-xs">Customers with low renewal rates</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {churnRisks.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No churn risks detected</p>
            ) : (
              churnRisks.map(c => (
                <div key={c.customerId} className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium truncate max-w-[150px]">{c.customerName}</span>
                    <span className={cn('font-bold tabular-nums', c.renewalRate < 30 ? 'text-red-500' : c.renewalRate < 60 ? 'text-orange-500' : 'text-yellow-500')}>
                      {c.renewalRate}%
                    </span>
                  </div>
                  <Progress value={c.renewalRate} className="h-1.5" />
                  <p className="text-[10px] text-muted-foreground">{c.totalContracts} contracts • {c.theatre}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Customer Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="text-sm font-semibold">All Customers</CardTitle>
              <CardDescription className="text-xs">{filtered.length} customers</CardDescription>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search customers..."
                className="pl-8 h-7 text-xs"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  {['Customer', 'Country', 'Theatre', 'Contracts', 'Renewed', 'Renewal Rate', 'Risk'].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, 50).map(c => (
                  <tr key={c.customerId} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium max-w-[180px]">
                      <span className="truncate block">{c.customerName}</span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{c.country || '—'}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className="text-[10px]">{c.theatre || '—'}</Badge>
                    </td>
                    <td className="px-4 py-3 tabular-nums font-medium">{c.totalContracts}</td>
                    <td className="px-4 py-3 tabular-nums text-green-500">{c.renewedContracts}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Progress value={c.renewalRate} className="h-1.5 w-16" />
                        <span className={cn('text-xs font-medium tabular-nums w-10',
                          c.renewalRate >= 80 ? 'text-green-500' :
                          c.renewalRate >= 60 ? 'text-yellow-500' : 'text-red-500'
                        )}>
                          {c.renewalRate}%
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {c.renewalRate < 30 ? <Badge variant="critical">Critical</Badge>
                        : c.renewalRate < 60 ? <Badge variant="high">High Risk</Badge>
                        : c.renewalRate < 80 ? <Badge variant="medium">Medium</Badge>
                        : <Badge variant="success">Good</Badge>}
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
