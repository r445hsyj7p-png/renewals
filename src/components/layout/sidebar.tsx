import * as React from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, TrendingUp, BarChart3, RefreshCw, AlertTriangle,
  Users, Package, Activity, Settings, Upload, Database, LogOut,
  Moon, Sun, ChevronDown, Building2, ShieldCheck, Layers,
  ChevronRight, X, Menu
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip'
import { useTheme } from '@/hooks/use-theme'
import { useSidebar } from '@/hooks/use-sidebar'

interface NavItem {
  label: string
  href: string
  icon: React.ElementType
  badge?: number
}

interface NavGroup {
  label: string
  items: NavItem[]
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Overview',
    items: [
      { label: 'Executive Dashboard', href: '/', icon: LayoutDashboard },
      { label: 'KPI Overview', href: '/overview/kpi', icon: Activity },
      { label: 'Renewal Trends', href: '/overview/trends', icon: TrendingUp },
      { label: 'Forecasting', href: '/overview/forecasting', icon: BarChart3 },
    ],
  },
  {
    label: 'Renewals',
    items: [
      { label: 'Upcoming Renewals', href: '/renewals/upcoming', icon: RefreshCw },
      { label: 'Risk Renewals', href: '/renewals/risks', icon: ShieldCheck },
    ],
  },
  {
    label: 'Customers',
    items: [
      { label: 'Customer Analytics', href: '/customers/analytics', icon: Users },
      { label: 'Top Customers', href: '/customers/top', icon: Building2 },
    ],
  },
  {
    label: 'Products',
    items: [
      { label: 'Product Analytics', href: '/products/analytics', icon: Package },
    ],
  },
  {
    label: 'Administration',
    items: [
      { label: 'Import Data', href: '/admin/import', icon: Upload },
      { label: 'Upload History', href: '/admin/uploads', icon: Layers },
      { label: 'Data Management', href: '/admin/data', icon: Database },
      { label: 'System Settings', href: '/admin/settings', icon: Settings },
    ],
  },
]

export function AppSidebar() {
  const { collapsed, setCollapsed, mobileOpen, setMobileOpen } = useSidebar()
  const { theme, setTheme } = useTheme()
  const location = useLocation()
  const navigate = useNavigate()

  const handleNavClick = (href: string) => {
    navigate(href)
    setMobileOpen(false)
  }

  const isActive = (href: string) => {
    if (href === '/') return location.pathname === '/'
    return location.pathname.startsWith(href)
  }

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={cn(
          'fixed left-0 top-0 z-50 flex h-full flex-col border-r border-sidebar-border bg-sidebar-background transition-all duration-300',
          collapsed ? 'w-[60px]' : 'w-[240px]',
          'lg:relative lg:z-auto',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Header */}
        <div className={cn('flex h-14 items-center border-b border-sidebar-border px-3', collapsed ? 'justify-center' : 'justify-between')}>
          {!collapsed && (
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary">
                <RefreshCw className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-bold text-sm text-sidebar-foreground">RenewalIQ</span>
            </div>
          )}
          {collapsed && (
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary">
              <RefreshCw className="h-4 w-4 text-primary-foreground" />
            </div>
          )}
          <div className="flex items-center gap-1">
            {!collapsed && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent lg:hidden"
                onClick={() => setMobileOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent hidden lg:flex"
              onClick={() => setCollapsed(!collapsed)}
            >
              {collapsed ? <ChevronRight className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 px-2 py-2">
          <TooltipProvider delayDuration={0}>
            {NAV_GROUPS.map((group) => (
              <div key={group.label} className="mb-4">
                {!collapsed && (
                  <p className="mb-1 px-2 text-xs font-bold uppercase tracking-wider text-sidebar-foreground/40">
                    {group.label}
                  </p>
                )}
                {collapsed && <div className="mb-1 h-px bg-sidebar-border mx-1" />}
                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    const Icon = item.icon
                    const active = isActive(item.href)
                    const btn = (
                      <button
                        key={item.href}
                        onClick={() => handleNavClick(item.href)}
                        className={cn(
                          'flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors',
                          collapsed ? 'justify-center px-0' : '',
                          active
                            ? 'bg-sidebar-accent text-sidebar-foreground font-medium'
                            : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground'
                        )}
                      >
                        <Icon className={cn('shrink-0', collapsed ? 'h-4.5 w-4.5' : 'h-4 w-4')} />
                        {!collapsed && <span className="truncate">{item.label}</span>}
                        {!collapsed && item.badge && (
                          <span className="ml-auto flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                            {item.badge}
                          </span>
                        )}
                      </button>
                    )

                    if (collapsed) {
                      return (
                        <Tooltip key={item.href}>
                          <TooltipTrigger asChild>{btn}</TooltipTrigger>
                          <TooltipContent side="right" className="text-xs">{item.label}</TooltipContent>
                        </Tooltip>
                      )
                    }
                    return btn
                  })}
                </div>
              </div>
            ))}
          </TooltipProvider>
        </ScrollArea>

        {/* Footer */}
        <div className="border-t border-sidebar-border p-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={cn(
                  'flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-sidebar-accent',
                  collapsed ? 'justify-center' : ''
                )}
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                  AE
                </div>
                {!collapsed && (
                  <div className="flex-1 text-left min-w-0">
                    <p className="truncate text-sm font-medium text-sidebar-foreground">Admin User</p>
                    <p className="truncate text-xs text-sidebar-foreground/50">admin@company.com</p>
                  </div>
                )}
                {!collapsed && <ChevronDown className="h-3.5 w-3.5 text-sidebar-foreground/50 shrink-0" />}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side={collapsed ? 'right' : 'top'} align="start" className="w-52">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/admin/settings')}>
                <Settings className="h-4 w-4" /> Settings
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
                {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive focus:text-destructive">
                <LogOut className="h-4 w-4" /> Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>
    </>
  )
}
