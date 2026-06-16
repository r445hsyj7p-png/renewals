export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info'
export type ATRStatus = 'RENEWED' | 'EXPIRED' | 'PENDING' | 'AT_RISK' | string
export type Theatre = 'AMERICAS' | 'EMEA' | 'APJC' | string

export interface RenewalRecord {
  id: string
  ascName: string
  ascId: string
  atrStatus: ATRStatus
  inqTrPullInPushOutQuarter: string
  renewedSupportType: string
  sameSapAsc: string
  expiredFiscalQtr: string
  renewedFiscalQtr: string
  authCode: string
  productCode: string
  renewedProductCode: string
  targetQty: number
  renewedQty: number
  reportingFiscalQtr: string
  country: string
  theatre: Theatre
  expirationDate: string
  endCustomerName: string
  endCustomerCountry: string
  distiName: string
  reselName: string
  serialNumber: string
  sellingEntity: string
  productGroup: string
  // Computed fields
  daysToExpire?: number
  severity?: Severity
  renewalRate?: number
  uploadBatchId?: string
  createdAt?: string
  // Dismissal — set locally, survives re-import via serialNumber+productCode key
  dismissed?: boolean
  dismissedReason?: 'renewed' | 'skipped'
  dismissedAt?: string
  // Manufacturer enrichment (joined by Serial Number)
  renewalRep?: string
  accountCode?: string
  accountOwner?: string
  entArea?: string
  entRegion?: string
  entDistrict?: string
  entTerritory?: string
  contractNumber?: string
  opportunityId?: string
  contractId?: string
  productPlatform?: string
  productSuite?: string
  productSolution?: string
  productClass?: string
  subscriptionStartDate?: string
  subscriptionTermDays?: number
  endOfSaleDate?: string
  endOfSupportDate?: string
  deviceShipDate?: string
  subscriptionQty?: number
  subscriptionNetPrice?: number
  tcv?: number
  primaryQuoteStatus?: string
  latestQuoteStatus?: string
  primaryQuoteForecastCategory?: string
  latestQuoteForecastCategory?: string
  quotedUnquoted?: string
  openAtrAcv?: number
  primaryQuoteTcv?: number
  latestQuoteTcv?: number
  enrichedAt?: string
}

export interface UploadBatch {
  id: string
  fileName: string
  fileSize: number
  uploadedAt: string
  recordCount: number
  status: 'processing' | 'complete' | 'error'
  errorMessage?: string
  duplicatesFound?: number
}

export interface KPIData {
  totalRenewals: number
  upcomingRenewals: number
  renewalRate: number
  churnRate: number
  riskAccounts: number
  expiringThisQuarter: number
  expiringNext30Days: number
  expiringNext90Days: number
  forecastedRenewals: number
  totalRecords: number
  criticalCount: number
  highCount: number
}

export interface QuarterlyData {
  quarter: string
  renewed: number
  expired: number
  pending: number
  renewalRate: number
  total: number
}

export interface TheatreData {
  theatre: string
  count: number
  renewalRate: number
  value: number
}

export interface ProductGroupData {
  productGroup: string
  count: number
  renewalRate: number
  renewed: number
  expired: number
}

export interface CustomerAnalytics {
  customerId: string
  customerName: string
  country: string
  theatre: string
  totalContracts: number
  renewedContracts: number
  expiredContracts: number
  renewalRate: number
  riskScore: number
  lastRenewalDate: string
  nextExpirationDate: string
}

export interface ForecastData {
  quarter: string
  actual: number | null
  forecast: number
  lower: number
  upper: number
}

export interface FilterState {
  search: string
  fiscalQuarter: string[]
  country: string[]
  theatre: string[]
  productGroup: string[]
  customer: string[]
  distributor: string[]
  status: string[]
  severity: string[]
  dateRange: { from: string | null; to: string | null }
}

export interface TableState {
  pagination: { pageIndex: number; pageSize: number }
  sorting: Array<{ id: string; desc: boolean }>
  columnVisibility: Record<string, boolean>
  columnPinning: { left: string[]; right: string[] }
}
