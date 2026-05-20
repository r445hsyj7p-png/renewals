import * as React from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { RootLayout } from '@/components/layout/root-layout'
import { ExecutiveDashboard } from '@/pages/overview/ExecutiveDashboard'
import { UpcomingRenewals } from '@/pages/renewals/UpcomingRenewals'
import { RiskRenewals } from '@/pages/renewals/RiskRenewals'
import { CustomerAnalytics } from '@/pages/customers/CustomerAnalytics'
import { ProductAnalytics } from '@/pages/products/ProductAnalytics'
import { ForecastingPage } from '@/pages/analytics/ForecastingPage'
import { TheatreAnalysis } from '@/pages/analytics/TheatreAnalysis'
import { ImportData } from '@/pages/admin/ImportData'
import { PlaceholderPage } from '@/pages/PlaceholderPage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      { index: true, element: <ExecutiveDashboard /> },

      // Overview
      { path: 'overview/kpi', element: <PlaceholderPage title="KPI Overview" description="Key performance indicators across all renewal dimensions." /> },
      { path: 'overview/trends', element: <PlaceholderPage title="Renewal Trends" description="Historical trend analysis for renewals." /> },
      { path: 'overview/forecasting', element: <ForecastingPage /> },

      // Renewals
      { path: 'renewals/upcoming', element: <UpcomingRenewals /> },
      { path: 'renewals/expiring', element: <PlaceholderPage title="Expiring Contracts" description="Contracts nearing expiration requiring action." /> },
      { path: 'renewals/pipeline', element: <PlaceholderPage title="Renewal Pipeline" description="Track renewal deals through their lifecycle stages." /> },
      { path: 'renewals/risks', element: <RiskRenewals /> },

      // Customers
      { path: 'customers/analytics', element: <CustomerAnalytics /> },
      { path: 'customers/top', element: <PlaceholderPage title="Top Customers" description="Highest-value customers ranked by contract volume." /> },
      { path: 'customers/churn', element: <PlaceholderPage title="Churn Risks" description="Customers at elevated risk of non-renewal." /> },

      // Products
      { path: 'products/analytics', element: <ProductAnalytics /> },
      { path: 'products/trends', element: <PlaceholderPage title="Product Trends" description="Renewal trend analysis by product line." /> },
      { path: 'products/rates', element: <PlaceholderPage title="Renewal Rates" description="Renewal rate tracking per product and product group." /> },

      // Analytics
      { path: 'analytics/forecasting', element: <ForecastingPage /> },
      { path: 'analytics/quarterly', element: <PlaceholderPage title="Quarterly Trends" description="Quarter-over-quarter renewal performance analysis." /> },
      { path: 'analytics/theatre', element: <TheatreAnalysis /> },
      { path: 'analytics/country', element: <PlaceholderPage title="Country Analysis" description="Renewal performance breakdown by country." /> },

      // Admin
      { path: 'admin/import', element: <ImportData /> },
      { path: 'admin/uploads', element: <PlaceholderPage title="Upload History" description="All historical data import batches and their status." /> },
      { path: 'admin/data', element: <PlaceholderPage title="Data Management" description="Manage, clean and deduplicate renewal records." /> },
      { path: 'admin/settings', element: <PlaceholderPage title="System Settings" description="Configure platform preferences and integrations." /> },

      // Catch-all
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
])
