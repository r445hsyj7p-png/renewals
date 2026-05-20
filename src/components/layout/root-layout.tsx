import * as React from 'react'
import { Outlet } from 'react-router-dom'
import { AppSidebar } from './sidebar'
import { AppHeader } from './header'
import { useSidebar } from '@/hooks/use-sidebar'
import { cn } from '@/lib/utils'

export function RootLayout() {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <AppSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <AppHeader />
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
