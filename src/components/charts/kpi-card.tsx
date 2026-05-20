import * as React from 'react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface KPICardProps {
  title: string
  value: string | number
  description?: string
  trend?: number
  trendLabel?: string
  icon?: React.ElementType
  severity?: 'success' | 'warning' | 'danger' | 'info' | 'default'
  className?: string
  suffix?: string
  loading?: boolean
}

export function KPICard({
  title, value, description, trend, trendLabel, icon: Icon,
  severity = 'default', className, suffix, loading = false,
}: KPICardProps) {
  const trendPositive = trend !== undefined && trend > 0
  const trendNegative = trend !== undefined && trend < 0
  const trendNeutral = trend === 0

  const severityMap = {
    success: 'text-green-500',
    warning: 'text-yellow-500',
    danger: 'text-red-500',
    info: 'text-blue-500',
    default: 'text-foreground',
  }

  if (loading) {
    return (
      <Card className={cn('relative overflow-hidden', className)}>
        <CardContent className="p-5">
          <div className="animate-pulse space-y-3">
            <div className="h-3 w-24 rounded bg-muted" />
            <div className="h-8 w-20 rounded bg-muted" />
            <div className="h-3 w-32 rounded bg-muted" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn('relative overflow-hidden transition-shadow hover:shadow-md', className)}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</p>
            <div className="flex items-baseline gap-1">
              <span className={cn('text-3xl font-bold tabular-nums', severityMap[severity])}>
                {value}
              </span>
              {suffix && <span className="text-sm text-muted-foreground">{suffix}</span>}
            </div>
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
          </div>
          {Icon && (
            <div className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
              severity === 'success' && 'bg-green-500/10',
              severity === 'warning' && 'bg-yellow-500/10',
              severity === 'danger' && 'bg-red-500/10',
              severity === 'info' && 'bg-blue-500/10',
              severity === 'default' && 'bg-muted',
            )}>
              <Icon className={cn('h-5 w-5', severityMap[severity])} />
            </div>
          )}
        </div>
        {trend !== undefined && (
          <div className="mt-3 flex items-center gap-1 text-xs">
            {trendPositive && <TrendingUp className="h-3.5 w-3.5 text-green-500" />}
            {trendNegative && <TrendingDown className="h-3.5 w-3.5 text-red-500" />}
            {trendNeutral && <Minus className="h-3.5 w-3.5 text-muted-foreground" />}
            <span className={cn(
              'font-medium',
              trendPositive && 'text-green-500',
              trendNegative && 'text-red-500',
              trendNeutral && 'text-muted-foreground',
            )}>
              {trend > 0 ? '+' : ''}{trend}%
            </span>
            {trendLabel && <span className="text-muted-foreground">{trendLabel}</span>}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
