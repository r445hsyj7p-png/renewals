import * as React from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search, Download, X, CalendarDays, CheckCircle2, XCircle, RotateCcw, Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'
import { StatusBadge, SeverityBadge } from '@/components/charts/severity-badge'
import { useRenewalStore } from '@/store/renewal.store'
import { RenewalService } from '@/services/renewal.service'
import { XLSXService } from '@/services/xlsx.service'
import { mockRenewals } from '@/data/mock-renewals'
import { formatDate, formatRelativeDate, cn } from '@/lib/utils'
import type { RenewalRecord } from '@/types/renewal.types'

const PAGE_SIZES = [25, 50, 100]

const DATE_PRESETS = [
  { label: 'Next 30d', days: 30 },
  { label: 'Next 60d', days: 60 },
  { label: 'Next 90d', days: 90 },
  { label: 'Next 180d', days: 180 },
  { label: 'Expired', days: -1 },
]

function toDateInputValue(date: Date): string {
  return date.toISOString().split('T')[0]
}

export function UpcomingRenewals() {
  const [searchParams] = useSearchParams()
  const { records: storeRecords, filters, dismissRecord, restoreRecord } = useRenewalStore()
  const records = storeRecords.length > 0 ? storeRecords : mockRenewals

  const [search, setSearch] = React.useState(searchParams.get('search') ?? filters.search)
  const [debouncedSearch, setDebouncedSearch] = React.useState(search)
  const [productGroupFilter, setProductGroupFilter] = React.useState<string>('all')
  const [statusFilter, setStatusFilter] = React.useState<string>('all')
  const [dateFrom, setDateFrom] = React.useState<string>('')
  const [dateTo, setDateTo] = React.useState<string>('')
  const [activePreset, setActivePreset] = React.useState<number | null>(null)
  // Default: only show open (non-dismissed) records
  const [showDismissed, setShowDismissed] = React.useState(false)
  const [pageIndex, setPageIndex] = React.useState(0)
  const [pageSize, setPageSize] = React.useState(25)
  const [sortField, setSortField] = React.useState<keyof RenewalRecord>('endCustomerName')
  const [sortDesc, setSortDesc] = React.useState(false)

  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(timer)
  }, [search])

  const applyPreset = (days: number) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (days === -1) {
      setDateFrom('')
      setDateTo(toDateInputValue(new Date(today.getTime() - 86400000)))
    } else {
      setDateFrom(toDateInputValue(today))
      setDateTo(toDateInputValue(new Date(today.getTime() + days * 86400000)))
    }
    setActivePreset(days)
    setPageIndex(0)
  }

  const clearDateFilter = () => {
    setDateFrom('')
    setDateTo('')
    setActivePreset(null)
    setPageIndex(0)
  }

  const enriched = React.useMemo(() => RenewalService.enrichRecords(records), [records])

  // Counts for the status bar
  const openCount = enriched.filter(r => !r.dismissed).length
  const dismissedCount = enriched.filter(r => r.dismissed).length
  const renewedCount = enriched.filter(r => r.dismissedReason === 'renewed').length
  const skippedCount = enriched.filter(r => r.dismissedReason === 'skipped').length

  const filtered = React.useMemo(() => {
    let data = RenewalService.applyFilters(enriched, {
      search: debouncedSearch,
      productGroup: productGroupFilter !== 'all' ? [productGroupFilter] : [],
      status: statusFilter !== 'all' ? [statusFilter] : [],
    })

    // Dismissal filter — core of the feature
    if (!showDismissed) {
      data = data.filter(r => !r.dismissed)
    }

    // Date range on expirationDate
    if (dateFrom || dateTo) {
      data = data.filter(r => {
        if (!r.expirationDate) return false
        const d = r.expirationDate.slice(0, 10)
        if (dateFrom && d < dateFrom) return false
        if (dateTo && d > dateTo) return false
        return true
      })
    }

    data = [...data].sort((a, b) => {
      const av = a[sortField] ?? ''
      const bv = b[sortField] ?? ''
      if (av < bv) return sortDesc ? 1 : -1
      if (av > bv) return sortDesc ? -1 : 1
      const cn1 = (a.endCustomerName ?? '').toLowerCase()
      const cn2 = (b.endCustomerName ?? '').toLowerCase()
      if (cn1 < cn2) return -1
      if (cn1 > cn2) return 1
      const sn1 = a.serialNumber ?? ''
      const sn2 = b.serialNumber ?? ''
      return sn1 < sn2 ? -1 : sn1 > sn2 ? 1 : 0
    })

    return data
  }, [enriched, debouncedSearch, productGroupFilter, statusFilter, showDismissed, dateFrom, dateTo, sortField, sortDesc])

  const pageCount = Math.ceil(filtered.length / pageSize)
  const paginated = filtered.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize)

  const productGroups = React.useMemo(
    () => [...new Set(records.map(r => r.productGroup).filter(Boolean))].sort(),
    [records]
  )
  const statuses = React.useMemo(
    () => [...new Set(records.map(r => r.atrStatus).filter(Boolean))].sort(),
    [records]
  )

  const handleSort = (field: keyof RenewalRecord) => {
    if (sortField === field) setSortDesc(!sortDesc)
    else { setSortField(field); setSortDesc(false) }
    setPageIndex(0)
  }

  const handleDismiss = (record: RenewalRecord, reason: 'renewed' | 'skipped') => {
    // Use actual store records for dismiss (mock records have no store action)
    if (storeRecords.length === 0) {
      toast.info('Demo-Modus: Dismiss nicht persistierbar. Importiere zuerst Daten.')
      return
    }
    dismissRecord(record.id, reason)

    const label = reason === 'renewed' ? 'als erledigt markiert' : 'übersprungen'
    const sn = record.serialNumber || record.endCustomerName || 'Record'

    toast.success(`${sn} ${label}`, {
      description: reason === 'renewed'
        ? 'Renewal wurde als durchgeführt verbucht.'
        : 'SN wird nicht verlängert und aus der Arbeitsliste entfernt.',
      duration: 6000,
      action: {
        label: 'Rückgängig',
        onClick: () => {
          restoreRecord(record.id)
          toast.success(`${sn} wiederhergestellt`)
        },
      },
    })
  }

  const handleRestore = (record: RenewalRecord) => {
    if (storeRecords.length === 0) return
    restoreRecord(record.id)
    toast.info(`${record.serialNumber || record.endCustomerName} wiederhergestellt`)
  }

  const hasActiveFilters = search || productGroupFilter !== 'all' || statusFilter !== 'all' || dateFrom || dateTo

  const clearAll = () => {
    setSearch('')
    setProductGroupFilter('all')
    setStatusFilter('all')
    clearDateFilter()
  }

  return (
    <div className="flex flex-col gap-4 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Upcoming Renewals</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {filtered.length.toLocaleString()} von {records.length.toLocaleString()} Renewals
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => XLSXService.exportToXLSX(filtered, `renewals-${new Date().toISOString().split('T')[0]}.xlsx`)}
        >
          <Download className="h-4 w-4" /> Export
        </Button>
      </div>

      {/* Progress / status bar */}
      {dismissedCount > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/40 px-4 py-2.5">
          <div className="flex items-center gap-1.5 text-xs">
            <span className="font-medium text-foreground tabular-nums">{openCount}</span>
            <span className="text-muted-foreground">offen</span>
          </div>
          <div className="h-3 w-px bg-border" />
          <div className="flex items-center gap-1.5 text-xs">
            <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
            <span className="font-medium text-green-500 tabular-nums">{renewedCount}</span>
            <span className="text-muted-foreground">erneuert</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <XCircle className="h-3.5 w-3.5 text-red-500" />
            <span className="font-medium text-red-500 tabular-nums">{skippedCount}</span>
            <span className="text-muted-foreground">übersprungen</span>
          </div>
          <div className="ml-auto">
            {/* Progress bar */}
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-32 rounded-full bg-border overflow-hidden">
                <div
                  className="h-full rounded-full bg-green-500 transition-all"
                  style={{ width: `${Math.round((renewedCount / records.length) * 100)}%` }}
                />
              </div>
              <span className="text-xs text-muted-foreground tabular-nums">
                {Math.round((dismissedCount / records.length) * 100)}% bearbeitet
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Filter bar */}
      <div className="flex flex-col gap-2">
        {/* Row 1 */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[220px] max-w-sm">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Kunde, SN, Produkt..."
              className="pl-8 pr-8 h-8"
              value={search}
              onChange={e => { setSearch(e.target.value); setPageIndex(0) }}
            />
            {search && (
              <button
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => { setSearch(''); setPageIndex(0) }}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <Select value={productGroupFilter} onValueChange={v => { setProductGroupFilter(v); setPageIndex(0) }}>
            <SelectTrigger className="h-8 w-40">
              <SelectValue placeholder="Product Group" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Gruppen</SelectItem>
              {productGroups.map(pg => (
                <SelectItem key={pg} value={pg}>{pg}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPageIndex(0) }}>
            <SelectTrigger className="h-8 w-36">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Status</SelectItem>
              {statuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>

          {/* Show/hide dismissed toggle */}
          <button
            onClick={() => { setShowDismissed(!showDismissed); setPageIndex(0) }}
            className={cn(
              'flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium transition-colors',
              showDismissed
                ? 'border-primary/50 bg-primary/10 text-primary'
                : 'border-border bg-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            {showDismissed ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
            Erledigte {dismissedCount > 0 && (
              <span className={cn(
                'rounded-full px-1 py-0.5 text-[10px] leading-none',
                showDismissed ? 'bg-primary/20' : 'bg-muted'
              )}>
                {dismissedCount}
              </span>
            )}
          </button>

          {hasActiveFilters && (
            <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground" onClick={clearAll}>
              <X className="h-3.5 w-3.5" /> Zurücksetzen
            </Button>
          )}

          <div className="ml-auto">
            <Select value={String(pageSize)} onValueChange={v => { setPageSize(Number(v)); setPageIndex(0) }}>
              <SelectTrigger className="h-8 w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZES.map(s => <SelectItem key={s} value={String(s)}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Row 2: Date range */}
        <div className="flex flex-wrap items-center gap-2">
          <CalendarDays className="h-4 w-4 text-muted-foreground shrink-0" />
          {DATE_PRESETS.map(p => (
            <button
              key={p.days}
              onClick={() => activePreset === p.days ? clearDateFilter() : applyPreset(p.days)}
              className={cn(
                'h-7 rounded-md border px-2.5 text-xs font-medium transition-colors',
                activePreset === p.days
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-transparent text-muted-foreground hover:border-primary/50 hover:text-foreground'
              )}
            >
              {p.label}
            </button>
          ))}
          <span className="text-xs text-muted-foreground">oder:</span>
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground">Von</span>
            <input
              type="date"
              value={dateFrom}
              onChange={e => { setDateFrom(e.target.value); setActivePreset(null); setPageIndex(0) }}
              className="h-7 rounded-md border border-border bg-transparent px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring [color-scheme:dark]"
            />
          </div>
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground">Bis</span>
            <input
              type="date"
              value={dateTo}
              onChange={e => { setDateTo(e.target.value); setActivePreset(null); setPageIndex(0) }}
              className="h-7 rounded-md border border-border bg-transparent px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring [color-scheme:dark]"
            />
          </div>
          {(dateFrom || dateTo) && (
            <button onClick={clearDateFilter} className="text-muted-foreground hover:text-foreground">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <Th onClick={() => handleSort('endCustomerName')} active={sortField === 'endCustomerName'} desc={sortDesc}>Kunde</Th>
                <Th onClick={() => handleSort('serialNumber')} active={sortField === 'serialNumber'} desc={sortDesc}>Serial Number</Th>
                <Th onClick={() => handleSort('productCode')} active={sortField === 'productCode'} desc={sortDesc}>Produkt</Th>
                <Th onClick={() => handleSort('productGroup')} active={sortField === 'productGroup'} desc={sortDesc} className="hidden md:table-cell">Gruppe</Th>
                <Th onClick={() => handleSort('country')} active={sortField === 'country'} desc={sortDesc} className="hidden lg:table-cell">Land</Th>
                <Th onClick={() => handleSort('atrStatus')} active={sortField === 'atrStatus'} desc={sortDesc}>Status</Th>
                <Th onClick={() => handleSort('expirationDate')} active={sortField === 'expirationDate'} desc={sortDesc}>Ablauf</Th>
                <Th onClick={() => handleSort('daysToExpire')} active={sortField === 'daysToExpire'} desc={sortDesc}>Tage</Th>
                <Th onClick={() => handleSort('severity')} active={sortField === 'severity'} desc={sortDesc}>Risiko</Th>
                <Th onClick={() => handleSort('renewedQty')} active={sortField === 'renewedQty'} desc={sortDesc} className="hidden xl:table-cell">Qty</Th>
                {/* Action column — no sort */}
                <th className="px-3 py-2.5 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap w-10">
                  Aktion
                </th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-14 text-center text-muted-foreground text-sm">
                    {showDismissed
                      ? 'Keine Renewals gefunden.'
                      : 'Alle Renewals bearbeitet — oder Filter anpassen.'}
                  </td>
                </tr>
              ) : (
                paginated.map(r => (
                  <RenewalRow
                    key={r.id}
                    record={r}
                    onDismiss={handleDismiss}
                    onRestore={handleRestore}
                    useMockData={storeRecords.length === 0}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pageCount > 1 && (
          <div className="flex items-center justify-between border-t border-border px-4 py-3">
            <p className="text-xs text-muted-foreground">
              {pageIndex * pageSize + 1}–{Math.min((pageIndex + 1) * pageSize, filtered.length)} von {filtered.length}
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

// ── Row component ──────────────────────────────────────────────────────────────

interface RenewalRowProps {
  record: RenewalRecord
  onDismiss: (record: RenewalRecord, reason: 'renewed' | 'skipped') => void
  onRestore: (record: RenewalRecord) => void
  useMockData: boolean
}

function RenewalRow({ record: r, onDismiss, onRestore, useMockData }: RenewalRowProps) {
  const isDismissed = r.dismissed === true

  return (
    <tr className={cn(
      'border-b border-border last:border-0 transition-colors',
      isDismissed
        ? 'opacity-40 hover:opacity-60'
        : 'hover:bg-muted/30'
    )}>
      <td className="px-4 py-3">
        <div className={cn('font-medium truncate max-w-[160px]', isDismissed && 'line-through')}>
          {r.endCustomerName || '—'}
        </div>
        <div className="text-xs text-muted-foreground truncate max-w-[160px]">{r.distiName || '—'}</div>
      </td>
      <td className="px-4 py-3 whitespace-nowrap">
        <span className={cn('font-mono text-xs font-medium', isDismissed && 'line-through')}>
          {r.serialNumber || '—'}
        </span>
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
        <span className="text-xs">{r.country || '—'}</span>
      </td>
      <td className="px-4 py-3">
        {isDismissed ? (
          <Badge variant={r.dismissedReason === 'renewed' ? 'success' : 'critical'} className="text-[10px]">
            {r.dismissedReason === 'renewed' ? '✓ Erneuert' : '✗ Übersprungen'}
          </Badge>
        ) : (
          <StatusBadge status={r.atrStatus} />
        )}
      </td>
      <td className="px-4 py-3 whitespace-nowrap">
        <span className="text-xs text-muted-foreground">
          {r.expirationDate ? formatDate(r.expirationDate) : '—'}
        </span>
      </td>
      <td className="px-4 py-3 whitespace-nowrap">
        {!isDismissed && r.daysToExpire !== undefined ? (
          <span className={cn('text-sm font-medium tabular-nums',
            r.daysToExpire <= 0 ? 'text-red-500' :
            r.daysToExpire <= 30 ? 'text-red-500' :
            r.daysToExpire <= 60 ? 'text-orange-500' :
            r.daysToExpire <= 90 ? 'text-yellow-500' : 'text-muted-foreground'
          )}>
            {r.daysToExpire <= 0 ? 'Abgelaufen' : `${r.daysToExpire}d`}
          </span>
        ) : <span className="text-muted-foreground">—</span>}
      </td>
      <td className="px-4 py-3">
        {!isDismissed && r.severity && <SeverityBadge severity={r.severity} />}
      </td>
      <td className="px-4 py-3 hidden xl:table-cell">
        <div className="text-sm tabular-nums">
          <span className="text-green-500">{r.renewedQty ?? 0}</span>
          <span className="text-muted-foreground"> / {r.targetQty ?? 0}</span>
        </div>
      </td>

      {/* Action */}
      <td className="px-3 py-3 text-right">
        {isDismissed ? (
          <button
            onClick={() => onRestore(r)}
            title="Wiederherstellen"
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        ) : (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="inline-flex h-7 items-center gap-1 rounded-md border border-border px-2 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/50 hover:bg-muted hover:text-foreground focus:outline-none"
                title="Aktion auswählen"
              >
                Aktion
                <span className="text-muted-foreground/60">▾</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel className="text-xs">
                {r.serialNumber || r.endCustomerName || 'Record'}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDismiss(r, 'renewed')}
                className="gap-2 text-green-500 focus:text-green-500"
              >
                <CheckCircle2 className="h-4 w-4" />
                <div>
                  <div className="font-medium">Renewal erledigt</div>
                  <div className="text-xs text-muted-foreground">SN als erneuert verbuchen</div>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDismiss(r, 'skipped')}
                className="gap-2 text-red-500 focus:text-red-500"
              >
                <XCircle className="h-4 w-4" />
                <div>
                  <div className="font-medium">Wird nicht verlängert</div>
                  <div className="text-xs text-muted-foreground">Bewusst aus der Liste entfernen</div>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </td>
    </tr>
  )
}

// ── Sortable header ────────────────────────────────────────────────────────────

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
