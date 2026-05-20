import * as React from 'react'
import { RouterProvider } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { router } from './router'
import { useTheme } from './hooks/use-theme'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      retry: 1,
    },
  },
})

function ThemeInitializer() {
  useTheme()
  return null
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeInitializer />
      <RouterProvider router={router} />
      <Toaster
        position="bottom-right"
        richColors
        closeButton
        toastOptions={{
          style: {
            background: 'var(--popover)',
            border: '1px solid var(--border)',
            color: 'var(--popover-foreground)',
          },
        }}
      />
    </QueryClientProvider>
  )
}

export default App
