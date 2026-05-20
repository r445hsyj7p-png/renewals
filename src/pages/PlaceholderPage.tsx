import * as React from 'react'
import { Construction } from 'lucide-react'

interface PlaceholderPageProps {
  title: string
  description?: string
}

export function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-6">
      <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-muted">
        <Construction className="h-8 w-8 text-muted-foreground" />
      </div>
      <div className="text-center">
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {description ?? 'This page is under construction. Data will populate once records are imported.'}
        </p>
      </div>
    </div>
  )
}
