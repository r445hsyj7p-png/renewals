import * as React from 'react'
import { Globe } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { KPICard } from '@/components/charts/kpi-card'
import { TheatreDistributionChart } from '@/components/charts/renewal-charts'
import { useRenewalStore } from '@/store/renewal.store'
import { RenewalService } from '@/services/renewal.service'
import { mockRenewals } from '@/data/mock-renewals'
import { cn } from '@/lib/utils'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'

export function TheatreAnalysis() {
  const { records: storeRecords } = useRenewalStore()
  const records = storeRecords.length > 0 ? storeRecords : mockRenewals
  const theatreData = React.useMemo(() => RenewalService.getTheatreData(records), [records])

  const theatreBreakdown = React.useMemo(() => {
    return theatreData.map(t => {
      const theatreRecords = records.filter(r => r.theatre === t.theatre)
      const renewed = theatreRecords.filter(r => r.atrStatus === 'RENEWED').length
      const expired = theatreRecords.filter(r => r.atrStatus === 'EXPIRED').length
      const pending = theatreRecords.filter(r => r.atrStatus === 'PENDING').length
      const atRisk = theatreRecords.filter(r => r.atrStatus === 'AT_RISK').length
      const countries = [...new Set(theatreRecords.map(r => r.country).filter(Boolean))]
      return { ...t, renewed, expired, pending, atRisk, countries }
    })
  }, [theatreData, records])

  const chartData = theatreBreakdown.map(t => ({
    theatre: t.theatre,
    renewed: t.renewed,
    expired: t.expired,
    pending: t.pending,
    atRisk: t.atRisk,
  }))

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Theatre Analysis</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Renewal performance by global region</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {theatreBreakdown.map(t => (
          <KPICard
            key={t.theatre}
            title={t.theatre}
            value={t.count}
            icon={Globe}
            severity={t.renewalRate >= 80 ? 'success' : t.renewalRate >= 60 ? 'warning' : 'danger'}
            description={`${t.renewalRate}% renewal rate`}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <TheatreDistributionChart data={theatreData} />
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Status by Theatre</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} margin={{ top: 0, right: 5, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="theatre" tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: 'var(--popover)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '12px' }} />
                <Legend iconSize={8} iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
                <Bar dataKey="renewed" name="Renewed" fill="#10b981" stackId="a" maxBarSize={40} />
                <Bar dataKey="expired" name="Expired" fill="#f43f5e" stackId="a" maxBarSize={40} />
                <Bar dataKey="pending" name="Pending" fill="#f59e0b" stackId="a" maxBarSize={40} />
                <Bar dataKey="atRisk" name="At Risk" fill="#f97316" stackId="a" radius={[3, 3, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {theatreBreakdown.map(t => (
        <Card key={t.theatre}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold">{t.theatre}</CardTitle>
                <CardDescription className="text-xs">{t.countries.length} countries • {t.count} contracts</CardDescription>
              </div>
              <Badge variant={t.renewalRate >= 80 ? 'success' : t.renewalRate >= 60 ? 'medium' : 'critical'}>
                {t.renewalRate}% renewal rate
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4 mb-4">
              {[
                { label: 'Renewed', value: t.renewed, color: 'text-green-500' },
                { label: 'Expired', value: t.expired, color: 'text-red-500' },
                { label: 'Pending', value: t.pending, color: 'text-yellow-500' },
                { label: 'At Risk', value: t.atRisk, color: 'text-orange-500' },
              ].map(s => (
                <div key={s.label} className="text-center">
                  <p className={cn('text-xl font-bold tabular-nums', s.color)}>{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-1">
              {t.countries.map(c => (
                <Badge key={c} variant="outline" className="text-[10px]">{c}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
