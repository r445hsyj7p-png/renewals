import type {
  RenewalRecord,
  KPIData,
  QuarterlyData,
  TheatreData,
  ProductGroupData,
  CustomerAnalytics,
  ForecastData,
  FilterState,
} from '@/types/renewal.types'
import { daysUntil, getSeverityFromDays } from '@/lib/utils'

export class RenewalService {
  static enrichRecords(records: RenewalRecord[]): RenewalRecord[] {
    return records.map(r => ({
      ...r,
      daysToExpire: r.expirationDate ? daysUntil(r.expirationDate) : undefined,
      severity: r.expirationDate ? getSeverityFromDays(daysUntil(r.expirationDate)) : 'info',
      renewalRate: r.targetQty > 0 ? (r.renewedQty / r.targetQty) * 100 : 0,
    }))
  }

  static calculateKPIs(records: RenewalRecord[]): KPIData {
    const enriched = this.enrichRecords(records)
    const total = records.length
    const renewed = records.filter(r => r.atrStatus === 'RENEWED').length
    const expired = records.filter(r => r.atrStatus === 'EXPIRED').length
    const upcoming = enriched.filter(
      r => r.daysToExpire !== undefined && r.daysToExpire > 0 && r.daysToExpire <= 180,
    ).length
    const critical = enriched.filter(r => r.severity === 'critical').length
    const high = enriched.filter(r => r.severity === 'high').length
    const next30 = enriched.filter(
      r => r.daysToExpire !== undefined && r.daysToExpire > 0 && r.daysToExpire <= 30,
    ).length
    const next90 = enriched.filter(
      r => r.daysToExpire !== undefined && r.daysToExpire > 0 && r.daysToExpire <= 90,
    ).length
    const renewalRate = total > 0 ? (renewed / (renewed + expired)) * 100 : 0
    const churnRate = 100 - renewalRate
    const riskAccounts = records.filter(
      r =>
        ['AT_RISK', 'PENDING'].includes(r.atrStatus) ||
        (r.daysToExpire !== undefined && r.daysToExpire <= 60),
    ).length

    return {
      totalRenewals: renewed,
      upcomingRenewals: upcoming,
      renewalRate: Math.round(renewalRate * 10) / 10,
      churnRate: Math.round(churnRate * 10) / 10,
      riskAccounts,
      expiringThisQuarter: next90,
      expiringNext30Days: next30,
      expiringNext90Days: next90,
      forecastedRenewals: Math.round(upcoming * (renewalRate / 100)),
      totalRecords: total,
      criticalCount: critical,
      highCount: high,
    }
  }

  static getQuarterlyData(records: RenewalRecord[]): QuarterlyData[] {
    const quarterMap = new Map<string, { renewed: number; expired: number; pending: number }>()

    records.forEach(r => {
      const q = r.reportingFiscalQtr || r.expiredFiscalQtr || 'Unknown'
      if (!quarterMap.has(q)) quarterMap.set(q, { renewed: 0, expired: 0, pending: 0 })
      const entry = quarterMap.get(q)!
      if (r.atrStatus === 'RENEWED') entry.renewed++
      else if (r.atrStatus === 'EXPIRED') entry.expired++
      else entry.pending++
    })

    return Array.from(quarterMap.entries())
      .map(([quarter, data]) => ({
        quarter,
        ...data,
        total: data.renewed + data.expired + data.pending,
        renewalRate:
          data.renewed + data.expired > 0
            ? Math.round((data.renewed / (data.renewed + data.expired)) * 1000) / 10
            : 0,
      }))
      .sort((a, b) => a.quarter.localeCompare(b.quarter))
  }

  static getTheatreData(records: RenewalRecord[]): TheatreData[] {
    const theatreMap = new Map<string, { count: number; renewed: number; total: number }>()

    records.forEach(r => {
      const t = r.theatre || 'Unknown'
      if (!theatreMap.has(t)) theatreMap.set(t, { count: 0, renewed: 0, total: 0 })
      const entry = theatreMap.get(t)!
      entry.count++
      entry.total++
      if (r.atrStatus === 'RENEWED') entry.renewed++
    })

    return Array.from(theatreMap.entries()).map(([theatre, data]) => ({
      theatre,
      count: data.count,
      renewalRate:
        data.total > 0 ? Math.round((data.renewed / data.total) * 1000) / 10 : 0,
      value: data.count,
    }))
  }

  static getProductGroupData(records: RenewalRecord[]): ProductGroupData[] {
    const pgMap = new Map<string, { renewed: number; expired: number }>()

    records.forEach(r => {
      const pg = r.productGroup || 'Unknown'
      if (!pgMap.has(pg)) pgMap.set(pg, { renewed: 0, expired: 0 })
      const entry = pgMap.get(pg)!
      if (r.atrStatus === 'RENEWED') entry.renewed++
      else entry.expired++
    })

    return Array.from(pgMap.entries()).map(([productGroup, data]) => ({
      productGroup,
      count: data.renewed + data.expired,
      renewalRate:
        data.renewed + data.expired > 0
          ? Math.round((data.renewed / (data.renewed + data.expired)) * 1000) / 10
          : 0,
      renewed: data.renewed,
      expired: data.expired,
    }))
  }

  static getCustomerAnalytics(records: RenewalRecord[]): CustomerAnalytics[] {
    const custMap = new Map<string, RenewalRecord[]>()

    records.forEach(r => {
      const key = r.endCustomerName || 'Unknown'
      if (!custMap.has(key)) custMap.set(key, [])
      custMap.get(key)!.push(r)
    })

    return Array.from(custMap.entries())
      .map(([name, recs]) => {
        const renewed = recs.filter(r => r.atrStatus === 'RENEWED').length
        const expired = recs.filter(r => r.atrStatus === 'EXPIRED').length
        const total = recs.length
        const renewalRate =
          renewed + expired > 0 ? (renewed / (renewed + expired)) * 100 : 0
        const riskScore = Math.max(
          0,
          100 -
            renewalRate -
            (recs.some(r => r.daysToExpire !== undefined && r.daysToExpire < 30) ? 20 : 0),
        )

        const sorted = recs
          .filter(r => r.expirationDate)
          .sort(
            (a, b) =>
              new Date(a.expirationDate).getTime() - new Date(b.expirationDate).getTime(),
          )

        return {
          customerId:
            recs[0].endCustomerName?.toLowerCase().replace(/\s+/g, '-') || 'unknown',
          customerName: name,
          country: recs[0].endCustomerCountry || recs[0].country || '',
          theatre: recs[0].theatre || '',
          totalContracts: total,
          renewedContracts: renewed,
          expiredContracts: expired,
          renewalRate: Math.round(renewalRate * 10) / 10,
          riskScore: Math.round(riskScore),
          lastRenewalDate: sorted[0]?.expirationDate || '',
          nextExpirationDate: sorted[sorted.length - 1]?.expirationDate || '',
        }
      })
      .sort((a, b) => b.totalContracts - a.totalContracts)
      .slice(0, 50)
  }

  static getForecastData(quarterlyData: QuarterlyData[]): ForecastData[] {
    const sorted = [...quarterlyData].sort((a, b) => a.quarter.localeCompare(b.quarter))
    const result: ForecastData[] = []

    sorted.forEach(q => {
      result.push({
        quarter: q.quarter,
        actual: q.total,
        forecast: q.total,
        lower: Math.round(q.total * 0.9),
        upper: Math.round(q.total * 1.1),
      })
    })

    // Add 2 future quarters as forecast
    if (sorted.length > 0) {
      const lastQ = sorted[sorted.length - 1]
      const avg =
        sorted.slice(-4).reduce((s, q) => s + q.total, 0) / Math.min(4, sorted.length)
      const trend =
        sorted.length > 1
          ? (sorted[sorted.length - 1].total - sorted[sorted.length - 2].total) * 0.5
          : 0

      for (let i = 1; i <= 2; i++) {
        const forecastVal = Math.round(avg + trend * i)
        result.push({
          quarter: `${lastQ.quarter}+${i}`,
          actual: null,
          forecast: forecastVal,
          lower: Math.round(forecastVal * 0.85),
          upper: Math.round(forecastVal * 1.15),
        })
      }
    }

    return result
  }

  static applyFilters(
    records: RenewalRecord[],
    filters: Partial<FilterState>,
  ): RenewalRecord[] {
    return records.filter(r => {
      if (filters.search) {
        const search = filters.search.toLowerCase()
        const searchable = [
          r.endCustomerName,
          r.productCode,
          r.country,
          r.theatre,
          r.atrStatus,
          r.productGroup,
          r.distiName,
          r.reselName,
          r.serialNumber,
          r.authCode,
        ]
          .join(' ')
          .toLowerCase()
        if (!searchable.includes(search)) return false
      }
      if (filters.theatre?.length) {
        if (!filters.theatre.includes(r.theatre)) return false
      }
      if (filters.country?.length) {
        if (!filters.country.includes(r.country)) return false
      }
      if (filters.productGroup?.length) {
        if (!filters.productGroup.includes(r.productGroup)) return false
      }
      if (filters.status?.length) {
        if (!filters.status.includes(r.atrStatus)) return false
      }
      if (filters.fiscalQuarter?.length) {
        if (!filters.fiscalQuarter.includes(r.reportingFiscalQtr)) return false
      }
      if (filters.customer?.length) {
        if (!filters.customer.includes(r.endCustomerName)) return false
      }
      if (filters.distributor?.length) {
        if (!filters.distributor.includes(r.distiName)) return false
      }
      if (filters.severity?.length && r.severity) {
        if (!filters.severity.includes(r.severity)) return false
      }
      if (filters.dateRange?.from) {
        const from = new Date(filters.dateRange.from)
        const exp = new Date(r.expirationDate)
        if (exp < from) return false
      }
      if (filters.dateRange?.to) {
        const to = new Date(filters.dateRange.to)
        const exp = new Date(r.expirationDate)
        if (exp > to) return false
      }
      return true
    })
  }

  static getUniqueValues(
    records: RenewalRecord[],
    field: keyof RenewalRecord,
  ): string[] {
    const set = new Set<string>()
    records.forEach(r => {
      const val = r[field]
      if (val !== undefined && val !== null && String(val).trim() !== '') {
        set.add(String(val))
      }
    })
    return Array.from(set).sort()
  }

  static getAtRiskSummary(records: RenewalRecord[]): {
    critical: RenewalRecord[]
    high: RenewalRecord[]
    medium: RenewalRecord[]
  } {
    const enriched = this.enrichRecords(records)
    return {
      critical: enriched.filter(r => r.severity === 'critical' && r.atrStatus !== 'RENEWED'),
      high: enriched.filter(r => r.severity === 'high' && r.atrStatus !== 'RENEWED'),
      medium: enriched.filter(r => r.severity === 'medium' && r.atrStatus !== 'RENEWED'),
    }
  }
}
