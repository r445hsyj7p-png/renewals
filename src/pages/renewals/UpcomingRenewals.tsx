import * as React from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search, Filter, Download, RefreshCw, SlidersHorizontal, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { StatusBadge, SeverityBadge } from '@/components/charts/severity-badge'
import { useRenewalStore } from '@/store/renewal.store'
import { RenewalService } from '@/services/renewal.service'
import { XLSXService } from '@/services/xlsx.service'
import { mockRenewals } from '@/data/mock-renewals'
import { formatDate, cn } from '@/lib/utils'
import type { RenewalRecord } from '@/types/renewal.types'

const PAGE_SIZES = [25, 50, 100]

export function UpcomingRenewals() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { records: storeRecords, filters, setFilters } = useRenewalStore()
  const records = storeRecords.length > 0 ? storeRecords : mockRenewals

  const [search, setSearch] = React.useState(searchParams.get('search') ?? filters.search)
  const [debouncedSearch, setDebouncedSearch] = React.useState(search)
  const [theatreFilter, setTheatreFilter] = React.useState<string>('all')
  const [statusFilter, setStatusFilter] = React.useState<string>('all')
  const [pageIndex, setPageIndex] = React.useState(0)
  const [pageSize, setPageSize] = React.useState(25)
  const [sortField, setSortField] = React.useState<keyof RenewalRecord>('endCustomerName')
  const [sortDesc, setSortDesc] = React.useState(false)

  // Debounce search
  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(timer)
  }, [search])

  const enriched = React.useMemo(() => RenewalService.enrichRecords(records), [records])

  const filtered = React.useMemo(() => {
    let data = RenewalService.applyFilters(enriched, {
      search: debouncedSearch,
      theatre: theatreFilter !== 'all' ? [theatreFilter] : [],
      status: statusFilter !== 'all' ? [statusFilter] : [],
    })
    data = [...data].sort((a, b) => {
      // Primary sort: user-selected field
      const av = a[sortField] ?? ''
      const bv = b[sortField] ?? ''
      if (av < bv) return sortDesc ? 1 : -1
      if (av > bv) return sortDesc ? -1 : 1
      // Secondary: customer name (groups all SNs of a customer together)
      const cn1 = (a.endCustomerName ?? '').toLowerCase()
      const cn2 = (b.endCustomerName ?? '').toLowerCase()
      if (cn1 < cn2) return -1
      if (cn1 > cn2) return 1
      // Tertiary: serial number
      const sn1 = a.serialNumber ?? ''
      const sn2 = b.serialNumber ?? ''
      if (sn1 < sn2) return -1
      if (sn1 > sn2) return 1
      return 0
    })
    return data
  }, [enriched, debouncedSearch, theatreFilter, statusFilter, sortField, sortDesc])

  const pageCount = Math.ceil(filtered.length / pageSize)
  const paginated = filtered.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize)

  const theatres = React.useMemo(() => [...new Set(records.map(r => r.theatre).filter(Boolean))], [records])
  const statuses = React.useMemo(() => [...new Set(records.map(r => r.atrStatus).filter(Boolean))], [records])

  const handleSort = (field: keyof RenewalRecord) => {
    if (sortField === field) setSortDesc(!sortDesc)
    else { setSortField(field); setSortDesc(false) }
  }

  const handleExport = () => {
    XLSXService.exportToXLSX(filtered, `renewals-${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  const clearFilters = () => {
    setSearch('')
    setTheatreFilter('all')
    setStatusFilter('all')
    setPageIndex(0)
  }

  const hasActiveFilters = search || theatreFilter !== 'all' || statusFilter !== 'all'

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Upcoming Renewals</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {filtered.length.toLocaleString()} renewals found
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleExport}>
          <Download className="h-4 w-4" /> Export
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search customer, product, country..."
            className="pl-8 h-8"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPageIndex(0) }}
          />
          {search && (
            <button className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setSearch('')}>
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <Select value={theatreFilter} onValueChange={(v) => { setTheatreFilter(v); setPageIndex(0) }}>
          <SelectTrigger className="h-8 w-36">
            <SelectValue placeholder="Theatre" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Theatres</SelectItem>
            {theatres.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPageIndex(0) }}>
          <SelectTrigger className="h-8 w-36">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {statuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={clearFilters}>
            <X className="h-3.5 w-3.5" /> Clear
          </Button>
        )}
        <div className="ml-auto flex items-center gap-2">
          <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPageIndex(0) }}>
            <SelectTrigger className="h-8 w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZES.map(s => <SelectItem key={s} value={String(s)}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <Th onClick={() => handleSort('endCustomerName')} active={sortField === 'endCustomerName'} desc={sortDesc}>Customer</Th>
                <Th onClick={() => handleSort('serialNumber')} active={sortField === 'serialNumber'} desc={sortDesc}>Serial Number</Th>
                <Th onClick={() => handleSort('productCode')} active={sortField === 'productCode'} desc={sortDesc}>Product</Th>
                <Th onClick={() => handleSort('productGroup')} active={sortField === 'productGroup'} desc={sortDesc} className="hidden md:table-cell">Group</Th>
                <Th onClick={() => handleSort('theatre')} active={sortField === 'theatre'} desc={sortDesc} className="hidden lg:table-cell">Theatre</Th>
                <Th onClick={() => handleSort('country')} active={sortField === 'country'} desc={sortDesc} className="hidden lg:table-cell">Country</Th>
                <Th onClick={() => handleSort('atrStatus')} active={sortField === 'atrStatus'} desc={sortDesc}>Status</Th>
                <Th onClick={() => handleSort('daysToExpire')} active={sortField === 'daysToExpire'} desc={sortDesc}>Expires</Th>
                <Th onClick={() => handleSort('severity')} active={sortField === 'severity'} desc={sortDesc}>Risk</Th>
                <Th className="hidden xl:table-cell" onClick={() => handleSort('renewedQty')} active={sortField === 'renewedQty'} desc={sortDesc}>Qty</Th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-muted-foreground text-sm">
                    No renewals match your filters
                  </td>
                </tr>
              ) : (
                paginated.map((r) => (
                  <tr key={r.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium truncate max-w-[160px]">{r.endCustomerName || '—'}</div>
                      <div className="text-xs text-muted-foreground truncate max-w-[160px]">{r.distiName || '—'}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="font-mono text-xs font-medium">{r.serialNumber || '—'}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-mono text-xs">{r.productCode || '—'}</div>
                      {r.renewedProductCode && r.renewedProductCode !== r.productCode && (
                        <div className="text-xs text-muted-foreground font-mono">→ {r.renewedProductCode}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="text-xs text-muted-foreground">{r.productGroup || '—'}</span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className="text-xs">{r.theatre || '—'}</span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className="text-xs">{r.country || '—'}</span>
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
                            r.daysToExpire <= 60 ? 'text-orange-500' :
                            r.daysToExpire <= 90 ? 'text-yellow-500' : 'text-muted-foreground'
                          )}>
                            {r.daysToExpire <= 0 ? 'Expired' : `${r.daysToExpire}d`}
                          </div>
                          <div className="text-xs text-muted-foreground">{r.expirationDate ? formatDate(r.expirationDate) : ''}</div>
                        </div>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {r.severity && <SeverityBadge severity={r.severity} />}
                    </td>
                    <td className="px-4 py-3 hidden xl:table-cell">
                      <div className="text-sm tabular-nums">
                        <span className="text-green-500">{r.renewedQty ?? 0}</span>
                        <span className="text-muted-foreground"> / {r.targetQty ?? 0}</span>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pageCount > 1 && (
          <div className="flex items-center justify-between border-t border-border px-4 py-3">
            <p className="text-xs text-muted-foreground">
              {pageIndex * pageSize + 1}–{Math.min((pageIndex + 1) * pageSize, filtered.length)} of {filtered.length}
            </p>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" className="h-7 px-2" onClick={() => setPageIndex(0)} disabled={pageIndex === 0}>«</Button>
              <Button variant="outline" size="sm" className="h-7 px-2" onClick={() => setPageIndex(p => p - 1)} disabled={pageIndex === 0}>‹</Button>
              <span className="px-2 text-xs">{pageIndex + 1} / {pageCount}</span>
              <Button variant="outline" size="sm" className="h-7 px-2" onClick={() => setPageIndex(p => p + 1)} disabled={pageIndex >= pageCount - 1}>›</Button>
              <Button variant="outline" size="sm" className="h-7 px-2" onClick={() => setPageIndex(pageCount - 1)} disabled={pageIndex >= pageCount - 1}>»</Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}

function Th({ children, onClick, active, desc, className }: {
  children?: React.ReactNode
  onClick?: () => void
  active?: boolean
  desc?: boolean
  className?: string
}) {
  return (
    <th
      className={cn(
        'px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap',
        onClick && 'cursor-pointer select-none hover:text-foreground',
        active && 'text-foreground',
        className,
      )}
      onClick={onClick}
    >
      {children}
      {active && <span className="ml-1">{desc ? '↓' : '↑'}</span>}
    </th>
  )
}
