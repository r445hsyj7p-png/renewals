import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, Search, Menu, Command, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useSidebar } from '@/hooks/use-sidebar'
import { useRenewalStore } from '@/store/renewal.store'
import { RenewalService } from '@/services/renewal.service'
import { cn } from '@/lib/utils'

export function AppHeader() {
  const { setMobileOpen, collapsed } = useSidebar()
  const { records } = useRenewalStore()
  const [searchOpen, setSearchOpen] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState('')
  const navigate = useNavigate()

  const kpis = React.useMemo(() => {
    if (!records.length) return null
    return RenewalService.calculateKPIs(records)
  }, [records])

  const notificationCount = kpis ? kpis.criticalCount + kpis.highCount : 0

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setSearchOpen(true)
      }
      if (e.key === 'Escape') setSearchOpen(false)
    }
    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [])

  return (
    <header className={cn(
      'sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/95 backdrop-blur px-4 transition-all'
    )}>
      {/* Mobile menu trigger */}
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 lg:hidden"
        onClick={() => setMobileOpen(true)}
      >
        <Menu className="h-4 w-4" />
      </Button>

      {/* Search */}
      <div className="flex-1 max-w-xl">
        {searchOpen ? (
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              autoFocus
              placeholder="Search renewals, customers, products..."
              className="pl-8 pr-8 h-8 bg-muted border-0"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setSearchOpen(false)
                  setSearchQuery('')
                }
                if (e.key === 'Enter' && searchQuery.trim()) {
                  navigate(`/renewals/upcoming?search=${encodeURIComponent(searchQuery)}`)
                  setSearchOpen(false)
                  setSearchQuery('')
                }
              }}
            />
            <button
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={() => { setSearchOpen(false); setSearchQuery('') }}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setSearchOpen(true)}
            className="flex h-8 w-full max-w-sm items-center gap-2 rounded-md border border-border bg-muted px-3 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <Search className="h-3.5 w-3.5" />
            <span>Search...</span>
            <kbd className="ml-auto inline-flex h-5 select-none items-center gap-1 rounded border border-border bg-background px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
              <Command className="h-2.5 w-2.5" />K
            </kbd>
          </button>
        )}
      </div>

      {/* Right side */}
      <div className="ml-auto flex items-center gap-2">
        {/* Notifications */}
        <Button variant="ghost" size="icon" className="relative h-8 w-8" onClick={() => navigate('/renewals/risks')}>
          <Bell className="h-4 w-4" />
          {notificationCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-white">
              {notificationCount > 9 ? '9+' : notificationCount}
            </span>
          )}
        </Button>

        {/* KPI quick stats */}
        {kpis && (
          <div className="hidden items-center gap-3 border-l border-border pl-3 md:flex">
            <div className="text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Renewal Rate</p>
              <p className={cn('text-sm font-bold tabular-nums', kpis.renewalRate >= 80 ? 'text-green-500' : kpis.renewalRate >= 60 ? 'text-yellow-500' : 'text-red-500')}>
                {kpis.renewalRate}%
              </p>
            </div>
            <div className="text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">At Risk</p>
              <p className="text-sm font-bold tabular-nums text-orange-500">{kpis.riskAccounts}</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Expiring</p>
              <p className="text-sm font-bold tabular-nums text-red-500">{kpis.expiringNext30Days}</p>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
