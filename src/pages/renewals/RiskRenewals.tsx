import * as React from 'react'
import { AlertTriangle, Clock, TrendingDown } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { KPICard } from '@/components/charts/kpi-card'
import { StatusBadge, SeverityBadge } from '@/components/charts/severity-badge'
import { useRenewalStore } from '@/store/renewal.store'
import { RenewalService } from '@/services/renewal.service'
import { mockRenewals } from '@/data/mock-renewals'
import { formatDate, cn } from '@/lib/utils'

export function RiskRenewals() {
  const { records: storeRecords } = useRenewalStore()
  const records = storeRecords.length > 0 ? storeRecords : mockRenewals
  const enriched = React.useMemo(() => RenewalService.enrichRecords(records), [records])

  const critical = enriched.filter(r => r.severity === 'critical').sort((a, b) => (a.daysToExpire ?? 999) - (b.daysToExpire ?? 999))
  const high = enriched.filter(r => r.severity === 'high').sort((a, b) => (a.daysToExpire ?? 999) - (b.daysToExpire ?? 999))
  const atRisk = enriched.filter(r => r.atrStatus === 'AT_RISK' || r.atrStatus === 'PENDING')

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Risk Renewals</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Renewals requiring immediate attention</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KPICard title="Critical" value={critical.length} icon={AlertTriangle} severity="danger" description="≤ 30 days" />
        <KPICard title="High Risk" value={high.length} icon={Clock} severity="warning" description="31–60 days" />
        <KPICard title="At Risk Status" value={atRisk.filter(r => r.atrStatus === 'AT_RISK').length} icon={TrendingDown} severity="warning" />
        <KPICard title="Pending" value={atRisk.filter(r => r.atrStatus === 'PENDING').length} icon={Clock} severity="info" />
      </div>

      {critical.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-red-500">Critical — Expiring in ≤ 30 Days</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <RiskTable records={critical} />
          </CardContent>
        </Card>
      )}

      {high.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-orange-500">High Risk — Expiring in 31–60 Days</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <RiskTable records={high} />
          </CardContent>
        </Card>
      )}

      {atRisk.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-yellow-500">At Risk & Pending Renewals</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <RiskTable records={atRisk} />
          </CardContent>
        </Card>
      )}
    </div>
  )
}

import type { RenewalRecord } from '@/types/renewal.types'

function RiskTable({ records }: { records: RenewalRecord[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/50">
            {['Customer', 'Product', 'Country', 'Theatre', 'Status', 'Days', 'Severity'].map(h => (
              <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {records.slice(0, 20).map(r => (
            <tr key={r.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
              <td className="px-4 py-3">
                <div className="font-medium truncate max-w-[160px]">{r.endCustomerName || '—'}</div>
              </td>
              <td className="px-4 py-3 font-mono text-xs">{r.productCode || '—'}</td>
              <td className="px-4 py-3 text-xs text-muted-foreground">{r.country || '—'}</td>
              <td className="px-4 py-3 text-xs">{r.theatre || '—'}</td>
              <td className="px-4 py-3"><StatusBadge status={r.atrStatus} /></td>
              <td className="px-4 py-3">
                {r.daysToExpire !== undefined ? (
                  <span className={cn('font-medium tabular-nums text-sm',
                    r.daysToExpire <= 0 ? 'text-red-500' :
                    r.daysToExpire <= 30 ? 'text-red-500' :
                    r.daysToExpire <= 60 ? 'text-orange-500' : 'text-yellow-500'
                  )}>
                    {r.daysToExpire <= 0 ? 'Expired' : `${r.daysToExpire}d`}
                  </span>
                ) : '—'}
              </td>
              <td className="px-4 py-3">{r.severity && <SeverityBadge severity={r.severity} />}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
