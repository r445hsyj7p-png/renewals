import * as React from 'react'
import { Badge } from '@/components/ui/badge'
import type { Severity } from '@/types/renewal.types'

interface SeverityBadgeProps {
  severity: Severity
  label?: string
}

const SEVERITY_LABELS: Record<Severity, string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
  info: 'Info',
}

export function SeverityBadge({ severity, label }: SeverityBadgeProps) {
  return (
    <Badge variant={severity}>
      {label ?? SEVERITY_LABELS[severity]}
    </Badge>
  )
}

export function StatusBadge({ status }: { status: string }) {
  const normalized = status?.toUpperCase()
  if (normalized === 'RENEWED') return <Badge variant="success">Renewed</Badge>
  if (normalized === 'EXPIRED') return <Badge variant="destructive">Expired</Badge>
  if (normalized === 'PENDING') return <Badge variant="medium">Pending</Badge>
  if (normalized === 'AT_RISK') return <Badge variant="high">At Risk</Badge>
  return <Badge variant="info">{status}</Badge>
}
