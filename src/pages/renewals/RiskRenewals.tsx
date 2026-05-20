import * as React from 'react'
import { AlertTriangle, Clock, TrendingDown, Search, Download, X } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { KPICard } from '@/components/charts/kpi-card'
import { StatusBadge, SeverityBadge } from '@/components/charts/severity-badge'
import { useRenewalStore } from '@/store/renewal.store'
import { RenewalService } from '@/services/renewal.service'
import { XLSXService } from '@/services/xlsx.service'
import { mockRenewals } from '@/data/mock-renewals'
import { formatDate, cn } from '@/lib/utils'
import type { RenewalRecord } from '@/types/renewal.types'

function sortByCustomerThenSN(records: RenewalRecord[]): RenewalRecord[] {
  return [...records].sort((a, b) => {
    const cn1 = (a.endCustomerName ?? '').toLowerCase()
    const cn2 = (b.endCustomerName ?? '').toLowerCase()
    if (cn1 < cn2) return -1
    if (cn1 > cn2) return 1
    const sn1 = a.serialNumber ?? ''
    const sn2 = b.serialNumber ?? ''
    if (sn1 < sn2) return -1
    if (sn1 > sn2) return 1
    return 0
  })
}

export function RiskRenewals() {
  const { records: storeRecords } = useRenewalStore()
  const records = storeRecords.length > 0 ? storeRecords : mockRenewals
  const enriched = React.useMemo(() => RenewalService.enrichRecords(records), [records])

  const [search, setSearch] = React.useState('')
  const [debouncedSearch, setDebouncedSearch] = React.useState('')

  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 250)
    return () => clearTimeout(t)
  }, [search])

  const applySearch = (recs: RenewalRecord[]) => {
    if (!debouncedSearch) return recs
    const q = debouncedSearch.toLowerCase()
    return recs.filter(r =>
      (r.endCustomerName ?? '').toLowerCase().includes(q) ||
      (r.serialNumber ?? '').toLowerCase().includes(q) ||
      (r.productCode ?? '').toLowerCase().includes(q) ||
      (r.country ?? '').toLowerCase().includes(q) ||
      (r.distiName ?? '').toLowerCase().includes(q) ||
      (r.reselName ?? '').toLowerCase().includes(q)
    )
  }

  const critical = React.useMemo(() =>
    sortByCustomerThenSN(applySearch(enriched.filter(r => r.severity === 'critical'))),
    [enriched, debouncedSearch]
  )
  const high = React.useMemo(() =>
    sortByCustomerThenSN(applySearch(enriched.filter(r => r.severity === 'high'))),
    [enriched, debouncedSearch]
  )
  const atRisk = React.useMemo(() =>
    sortByCustomerThenSN(applySearch(enriched.filter(r => r.atrStatus === 'AT_RISK' || r.atrStatus === 'PENDING')
      .filter(r => r.severity !== 'critical' && r.severity !== 'high'))),
    [enriched, debouncedSearch]
  )

  const allRisk = React.useMemo(() =>
    [...critical, ...high, ...atRisk],
    [critical, high, atRisk]
  )

  const handleExport = () => {
    XLSXService.exportToXLSX(allRisk, `risk-renewals-${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Risk Renewals</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {allRisk.length} renewals requiring immediate attention
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleExport}>
          <Download className="h-4 w-4" /> Export
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KPICard
          title="Critical"
          value={enriched.filter(r => r.severity === 'critical').length}
          icon={AlertTriangle}
          severity="danger"
          description="≤ 30 days"
        />
        <KPICard
          title="High Risk"
          value={enriched.filter(r => r.severity === 'high').length}
          icon={Clock}
          severity="warning"
          description="31–60 days"
        />
        <KPICard
          title="AT_RISK Status"
          value={enriched.filter(r => r.atrStatus === 'AT_RISK').length}
          icon={TrendingDown}
          severity="warning"
        />
        <KPICard
          title="Pending"
          value={enriched.filter(r => r.atrStatus === 'PENDING').length}
          icon={Clock}
          severity="info"
        />
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search customer, serial number, product, country..."
          className="pl-8 pr-8 h-8"
          value={search}
          onChange={e => { setSearch(e.target.value) }}
        />
        {search && (
          <button
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            onClick={() => setSearch('')}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Critical */}
      {critical.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold text-red-500">
              <AlertTriangle className="h-4 w-4" />
              Critical — Expiring in ≤ 30 Days
              <span className="ml-auto text-xs font-normal text-red-500/70">{critical.length} records</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <RiskTable records={critical} />
          </CardContent>
        </Card>
      )}

      {/* High */}
      {high.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold text-orange-500">
              <Clock className="h-4 w-4" />
              High Risk — Expiring in 31–60 Days
              <span className="ml-auto text-xs font-normal text-orange-500/70">{high.length} records</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <RiskTable records={high} />
          </CardContent>
        </Card>
      )}

      {/* AT_RISK / Pending */}
      {atRisk.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold text-yellow-500">
              <TrendingDown className="h-4 w-4" />
              AT_RISK & Pending
              <span className="ml-auto text-xs font-normal text-yellow-500/70">{atRisk.length} records</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <RiskTable records={atRisk} />
          </CardContent>
        </Card>
      )}

      {allRisk.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-500/10 mb-3">
            <AlertTriangle className="h-7 w-7 text-green-500" />
          </div>
          <p className="font-medium">No risk renewals found</p>
          <p className="text-sm text-muted-foreground mt-1">
            {search ? 'No results match your search.' : 'All renewals are within safe thresholds.'}
          </p>
        </div>
      )}
    </div>
  )
}

function RiskTable({ records }: { records: RenewalRecord[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/50">
            <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">Customer</th>
            <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">Serial Number</th>
            <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">Product</th>
            <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap hidden md:table-cell">Distributor</th>
            <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap hidden lg:table-cell">Country</th>
            <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap hidden lg:table-cell">Theatre</th>
            <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">Status</th>
            <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">Expires</th>
            <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">Risk</th>
          </tr>
        </thead>
        <tbody>
          {records.map((r, i) => {
            const prevCustomer = i > 0 ? records[i - 1].endCustomerName : null
            const isNewCustomer = r.endCustomerName !== prevCustomer

            return (
              <tr
                key={r.id}
                className={cn(
                  'border-b border-border last:border-0 hover:bg-muted/30 transition-colors',
                  isNewCustomer && i > 0 && 'border-t-2 border-t-border/60'
                )}
              >
                <td className="px-4 py-3">
                  {isNewCustomer ? (
                    <div>
                      <div className="font-medium truncate max-w-[180px]">{r.endCustomerName || '—'}</div>
                      <div className="text-xs text-muted-foreground truncate max-w-[180px]">{r.reselName || '—'}</div>
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground pl-2 border-l-2 border-border truncate max-w-[180px]">
                      ↳ {r.reselName || '—'}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className="font-mono text-xs font-medium">{r.serialNumber || '—'}</span>
                </td>
                <td className="px-4 py-3">
                  <div className="font-mono text-xs">{r.productCode || '—'}</div>
                  {r.productGroup && (
                    <div className="text-xs text-muted-foreground">{r.productGroup}</div>
                  )}
                </td>
                <td className="px-4 py-3 hidden md:table-cell">
                  <span className="text-xs text-muted-foreground truncate max-w-[120px] block">{r.distiName || '—'}</span>
                </td>
                <td className="px-4 py-3 hidden lg:table-cell">
                  <span className="text-xs">{r.country || '—'}</span>
                </td>
                <td className="px-4 py-3 hidden lg:table-cell">
                  <span className="text-xs">{r.theatre || '—'}</span>
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={r.atrStatus} />
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  {r.daysToExpire !== undefined ? (
                    <div>
                      <div className={cn('text-sm font-medium tabular-nums',
                        r.daysToExpire <= 0 ? 'text-red-500' :
                        r.daysToExpire <= 30 ? 'text-red-500' :
                        r.daysToExpire <= 60 ? 'text-orange-500' : 'text-yellow-500'
                      )}>
                        {r.daysToExpire <= 0 ? 'Expired' : `${r.daysToExpire}d`}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {r.expirationDate ? formatDate(r.expirationDate) : ''}
                      </div>
                    </div>
                  ) : '—'}
                </td>
                <td className="px-4 py-3">
                  {r.severity && <SeverityBadge severity={r.severity} />}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
