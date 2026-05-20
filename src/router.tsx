import * as React from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { RootLayout } from '@/components/layout/root-layout'
import { ExecutiveDashboard } from '@/pages/overview/ExecutiveDashboard'
import { UpcomingRenewals } from '@/pages/renewals/UpcomingRenewals'
import { RiskRenewals } from '@/pages/renewals/RiskRenewals'
import { CustomerAnalytics } from '@/pages/customers/CustomerAnalytics'
import { ProductAnalytics } from '@/pages/products/ProductAnalytics'
import { ForecastingPage } from '@/pages/analytics/ForecastingPage'
import { ImportData } from '@/pages/admin/ImportData'
import { PlaceholderPage } from '@/pages/PlaceholderPage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      { index: true, element: <ExecutiveDashboard /> },

      // Overview
      { path: 'overview/forecasting', element: <ForecastingPage /> },

      // Renewals
      { path: 'renewals/upcoming', element: <UpcomingRenewals /> },
      { path: 'renewals/risks', element: <RiskRenewals /> },

      // Customers
      { path: 'customers/analytics', element: <CustomerAnalytics /> },

      // Products
      { path: 'products/analytics', element: <ProductAnalytics /> },

      // Admin
      { path: 'admin/import', element: <ImportData /> },
      { path: 'admin/uploads', element: <PlaceholderPage title="Upload History" /> },
      { path: 'admin/data', element: <PlaceholderPage title="Data Management" /> },
      { path: 'admin/settings', element: <PlaceholderPage title="System Settings" /> },

      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
])
