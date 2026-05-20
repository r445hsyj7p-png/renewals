import * as React from 'react'
import {
  RefreshCw, AlertTriangle, TrendingUp, BarChart3, Users, Package,
  Clock, CheckCircle, XCircle, Upload
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { KPICard } from '@/components/charts/kpi-card'
import {
  QuarterlyRenewalChart, RenewalTrendChart, TheatreDistributionChart,
  ProductGroupChart, ForecastChart, RenewalFunnelChart,
} from '@/components/charts/renewal-charts'
import { StatusBadge, SeverityBadge } from '@/components/charts/severity-badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useRenewalStore } from '@/store/renewal.store'
import { RenewalService } from '@/services/renewal.service'
import { mockRenewals } from '@/data/mock-renewals'
import { formatDate, formatRelativeDate } from '@/lib/utils'
import type { RenewalRecord } from '@/types/renewal.types'

export function ExecutiveDashboard() {
  const { records: storeRecords } = useRenewalStore()
  const records = storeRecords.length > 0 ? storeRecords : mockRenewals

  const enriched = React.useMemo(() => RenewalService.enrichRecords(records), [records])
  const kpis = React.useMemo(() => RenewalService.calculateKPIs(records), [records])
  const quarterlyData = React.useMemo(() => RenewalService.getQuarterlyData(records), [records])
  const theatreData = React.useMemo(() => RenewalService.getTheatreData(records), [records])
  const productGroupData = React.useMemo(() => RenewalService.getProductGroupData(records), [records])
  const forecastData = React.useMemo(() => RenewalService.getForecastData(quarterlyData), [quarterlyData])

  const criticalRenewals = React.useMemo(() =>
    enriched
      .filter(r => r.severity === 'critical' || r.severity === 'high')
      .sort((a, b) => (a.daysToExpire ?? 999) - (b.daysToExpire ?? 999))
      .slice(0, 6),
    [enriched]
  )

  const funnelData = [
    { name: 'Total Contracts', value: kpis.totalRecords, color: '#6366f1' },
    { name: 'Upcoming Renewals', value: kpis.upcomingRenewals, color: '#22d3ee' },
    { name: 'Forecasted Renewals', value: kpis.forecastedRenewals, color: '#f59e0b' },
    { name: 'Successfully Renewed', value: kpis.totalRenewals, color: '#10b981' },
  ]

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Executive Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Renewal analytics overview • {records.length.toLocaleString()} records loaded
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link to="/admin/import">
              <Upload className="h-4 w-4" />
              Import Data
            </Link>
          </Button>
          <Button size="sm" asChild>
            <Link to="/renewals/upcoming">
              <RefreshCw className="h-4 w-4" />
              View Renewals
            </Link>
          </Button>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        <KPICard
          title="Renewal Rate"
          value={`${kpis.renewalRate}%`}
          icon={TrendingUp}
          severity={kpis.renewalRate >= 80 ? 'success' : kpis.renewalRate >= 60 ? 'warning' : 'danger'}
          description="Overall renewal success"
          trend={2.3}
          trendLabel="vs last quarter"
        />
        <KPICard
          title="Total Renewed"
          value={kpis.totalRenewals}
          icon={CheckCircle}
          severity="success"
          description="Successfully renewed"
        />
        <KPICard
          title="Expiring in 30d"
          value={kpis.expiringNext30Days}
          icon={Clock}
          severity={kpis.expiringNext30Days > 10 ? 'danger' : kpis.expiringNext30Days > 5 ? 'warning' : 'info'}
          description="Needs immediate attention"
        />
        <KPICard
          title="Risk Accounts"
          value={kpis.riskAccounts}
          icon={AlertTriangle}
          severity={kpis.riskAccounts > 15 ? 'danger' : kpis.riskAccounts > 8 ? 'warning' : 'info'}
          description="At-risk or pending"
        />
        <KPICard
          title="Churn Rate"
          value={`${kpis.churnRate}%`}
          icon={XCircle}
          severity={kpis.churnRate > 30 ? 'danger' : kpis.churnRate > 20 ? 'warning' : 'success'}
          description="Non-renewal rate"
          trend={-1.2}
          trendLabel="vs last quarter"
        />
        <KPICard
          title="Forecasted"
          value={kpis.forecastedRenewals}
          icon={BarChart3}
          severity="info"
          description="Next period renewals"
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <QuarterlyRenewalChart data={quarterlyData} />
        </div>
        <TheatreDistributionChart data={theatreData} />
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <RenewalTrendChart data={quarterlyData} />
        </div>
        <RenewalFunnelChart data={funnelData} />
      </div>

      {/* Charts Row 3 */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ForecastChart data={forecastData} />
        <ProductGroupChart data={productGroupData} />
      </div>

      {/* Critical Renewals Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold">Critical & High Risk Renewals</CardTitle>
              <CardDescription className="text-xs">Requires immediate attention</CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link to="/renewals/risks">View All</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {criticalRenewals.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No critical renewals found
              </div>
            ) : (
              criticalRenewals.map((r) => (
                <RenewalRow key={r.id} record={r} />
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function RenewalRow({ record }: { record: RenewalRecord }) {
  return (
    <div className="flex items-center gap-4 px-4 py-3 hover:bg-muted/40 transition-colors">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{record.endCustomerName || '—'}</p>
        <p className="text-xs text-muted-foreground truncate">
          {record.productCode} • {record.country} • {record.theatre}
        </p>
      </div>
      <div className="hidden sm:flex items-center gap-3 shrink-0">
        <StatusBadge status={record.atrStatus} />
        {record.severity && <SeverityBadge severity={record.severity} />}
      </div>
      <div className="shrink-0 text-right">
        <p className="text-sm font-medium tabular-nums">
          {record.daysToExpire !== undefined
            ? record.daysToExpire <= 0
              ? <span className="text-red-500">Expired</span>
              : <span className={record.daysToExpire <= 30 ? 'text-red-500' : record.daysToExpire <= 60 ? 'text-orange-500' : 'text-yellow-500'}>
                  {record.daysToExpire}d
                </span>
            : '—'
          }
        </p>
        <p className="text-xs text-muted-foreground">{record.expirationDate ? formatDate(record.expirationDate) : '—'}</p>
      </div>
    </div>
  )
}
