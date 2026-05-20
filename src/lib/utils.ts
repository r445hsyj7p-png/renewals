import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value)
}

export function formatPercent(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(typeof date === 'string' ? new Date(date) : date)
}

export function formatRelativeDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const now = new Date()
  const diff = d.getTime() - now.getTime()
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24))

  if (days < 0) return `${Math.abs(days)}d ago`
  if (days === 0) return 'Today'
  if (days === 1) return 'Tomorrow'
  if (days <= 30) return `${days}d`
  if (days <= 90) return `${Math.ceil(days / 7)}w`
  return `${Math.ceil(days / 30)}mo`
}

export function daysUntil(date: string | Date): number {
  const d = typeof date === 'string' ? new Date(date) : date
  const now = new Date()
  return Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

export function getSeverityFromDays(days: number): 'critical' | 'high' | 'medium' | 'low' | 'info' {
  if (days <= 0) return 'critical'
  if (days <= 30) return 'critical'
  if (days <= 60) return 'high'
  if (days <= 90) return 'medium'
  if (days <= 180) return 'low'
  return 'info'
}

export function severityColor(severity: 'critical' | 'high' | 'medium' | 'low' | 'info'): string {
  const map = {
    critical: 'text-red-500',
    high: 'text-orange-500',
    medium: 'text-yellow-500',
    low: 'text-blue-500',
    info: 'text-gray-500',
  }
  return map[severity]
}

export function severityBgColor(severity: 'critical' | 'high' | 'medium' | 'low' | 'info'): string {
  const map = {
    critical: 'bg-red-500/10 text-red-500 border-red-500/20',
    high: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
    medium: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
    low: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    info: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
  }
  return map[severity]
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str
  return `${str.slice(0, length)}...`
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 9)
}
