import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground',
        secondary: 'border-transparent bg-secondary text-secondary-foreground',
        destructive: 'border-transparent bg-destructive text-destructive-foreground',
        outline: 'text-foreground',
        critical: 'border-red-500/20 bg-red-500/10 text-red-500',
        high: 'border-orange-500/20 bg-orange-500/10 text-orange-500',
        medium: 'border-yellow-500/20 bg-yellow-500/10 text-yellow-500',
        low: 'border-blue-500/20 bg-blue-500/10 text-blue-500',
        info: 'border-gray-500/20 bg-gray-500/10 text-gray-400',
        success: 'border-green-500/20 bg-green-500/10 text-green-500',
      },
    },
    defaultVariants: { variant: 'default' },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
