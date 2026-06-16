import * as XLSX from 'xlsx'
import type { RenewalRecord, UploadBatch } from '@/types/renewal.types'
import { generateId } from '@/lib/utils'

// Strips all non-alphanumeric characters and uppercases — makes header matching
// tolerant of spaces, underscores, mixed case, and trailing whitespace.
// e.g. "Serial Number", "SERIAL_NUMBER", "serial-number" all → "SERIALNUMBER"
function normalizeKey(s: string): string {
  return s.replace(/[^A-Za-z0-9]/g, '').toUpperCase()
}

// Build a map from normalizedKey → actual XLSX header, taken from the first row
function buildHeaderLookup(row: Record<string, unknown>): Map<string, string> {
  const map = new Map<string, string>()
  for (const key of Object.keys(row)) {
    map.set(normalizeKey(key), key)
  }
  return map
}

// Resolve a column-map key against actual XLSX headers
function resolveKey(xlsxCol: string, lookup: Map<string, string>): string | undefined {
  // Try exact match first, then normalized
  return lookup.get(normalizeKey(xlsxCol))
}

const COLUMN_MAP: Record<string, keyof RenewalRecord> = {
  ASCNAME: 'ascName',
  ASCID: 'ascId',
  ATRSTATUS: 'atrStatus',
  INQTRPULLINPUSHOUTQUARTER: 'inqTrPullInPushOutQuarter',
  RENEWEDSUPPORTTYPE: 'renewedSupportType',
  SAMESAPASC: 'sameSapAsc',
  EXPIREDFISCALQTR: 'expiredFiscalQtr',
  RENEWEDFISCALQTR: 'renewedFiscalQtr',
  AUTHCODE: 'authCode',
  PRODUCTCODE: 'productCode',
  RENEWEDPRODUCTCODE: 'renewedProductCode',
  TARGETQTY: 'targetQty',
  RENEWEDQTY: 'renewedQty',
  REPORTINGFISCALQTR: 'reportingFiscalQtr',
  COUNTRY: 'country',
  THEATRE: 'theatre',
  EXPIRATIONDATE: 'expirationDate',
  ENDCUSTOMERNAME: 'endCustomerName',
  ENDCUSTOMERCOUNTRY: 'endCustomerCountry',
  DISTINAME: 'distiName',
  RESELNAME: 'reselName',
  SERIALNUMBER: 'serialNumber',
  SELLINGENTITY: 'sellingEntity',
  PRODUCTGROUP: 'productGroup',
}

export interface ParseResult {
  records: RenewalRecord[]
  batch: UploadBatch
  errors: string[]
  duplicates: number
  detectedHeaders: string[]
}

export interface ManufacturerParseResult {
  records: RenewalRecord[]
  totalRows: number
  detectedHeaders: string[]
}

const US_DATE_FIELDS = new Set<keyof RenewalRecord>([
  'subscriptionStartDate', 'endOfSaleDate', 'endOfSupportDate', 'deviceShipDate',
])
const NUMERIC_FIELDS = new Set<keyof RenewalRecord>([
  'subscriptionTermDays', 'subscriptionQty', 'subscriptionNetPrice',
  'tcv', 'openAtrAcv', 'primaryQuoteTcv', 'latestQuoteTcv',
])

const MANUFACTURER_COLUMN_MAP: Record<string, keyof RenewalRecord> = {
  SERIALNUMBER: 'serialNumber',
  PRODUCTCODE: 'productCode',
  ENDCUSTOMERACCOUNTNAME: 'endCustomerName',
  DISTRIBUTORNAME: 'distiName',
  AUTHORIZEDRESELLERNAME: 'reselName',
  ENTTHEATRE: 'theatre',
  SUBSCRIPTIONENDDATE: 'expirationDate',
  AUTHCODE: 'authCode',
  FISCALQTR: 'reportingFiscalQtr',
  PRODUCTSUITE: 'productGroup',        // "Product Suite" → productGroup for display grouping
  SUBSCRIPTIONNETPRICETCV: 'tcv',
  SUBSCRIPTIONSTARTDATE: 'subscriptionStartDate',
  SUBSCRIPTIONTERMINDAYS: 'subscriptionTermDays',
  ENDOFSALEDATE: 'endOfSaleDate',
  ENDOFSUPPORTDATE: 'endOfSupportDate',
  DEVICESHIPDATE: 'deviceShipDate',
  SUBSCRIPTIONQTY: 'subscriptionQty',
  RENEWALREP: 'renewalRep',
  ACCOUNTCODE: 'accountCode',
  ACCOUNTOWNER: 'accountOwner',
  ENTAREA: 'entArea',
  ENTREGION: 'entRegion',
  ENTDISTRICT: 'entDistrict',
  ENTTERRITORYNAME: 'entTerritory',
  CONTRACTNUMBER: 'contractNumber',
  OPPORTUNITYID: 'opportunityId',
  CONTRACTID: 'contractId',
  PRODUCTPLATFORM: 'productPlatform',
  PRODUCTSOLUTION: 'productSolution',
  PRODUCTCLASS: 'productClass',
  PRIMARYQUOTESTATUS: 'primaryQuoteStatus',
  LATESTQUOTESTATUS: 'latestQuoteStatus',
  PRIMARYQUOTEFORECASTCATEGORY: 'primaryQuoteForecastCategory',
  LATESTQUOTEFORECASTCATEGORY: 'latestQuoteForecastCategory',
  QUOTEDUNQUOTED: 'quotedUnquoted',
  OPENATRACV: 'openAtrAcv',
}

// Handles JS Date objects (from cellDates:true), Excel serial numbers, US dates, ISO dates
function parseAnyDate(val: unknown): string {
  if (val instanceof Date) {
    return isNaN(val.getTime()) ? '' : val.toISOString().split('T')[0]
  }
  if (typeof val === 'number' && val > 0) {
    // Excel serial number: days since 1899-12-30
    const d = new Date(Math.round((val - 25569) * 86400 * 1000))
    return isNaN(d.getTime()) ? '' : d.toISOString().split('T')[0]
  }
  const str = String(val).trim()
  if (!str) return ''
  // Already ISO
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.slice(0, 10)
  // US MM/DD/YYYY
  const usm = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (usm) return `${usm[3]}-${usm[1].padStart(2, '0')}-${usm[2].padStart(2, '0')}`
  const d = new Date(str)
  return isNaN(d.getTime()) ? str : d.toISOString().split('T')[0]
}

export class XLSXService {
  static async parseFile(
    file: File,
    existingRecords: RenewalRecord[] = [],
  ): Promise<ParseResult> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()

      reader.onload = e => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer)
          const workbook = XLSX.read(data, { type: 'array', cellDates: true })
          const sheetName = workbook.SheetNames[0]
          const worksheet = workbook.Sheets[sheetName]
          const rawData = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
            raw: true,
          })

          if (rawData.length === 0) {
            reject(new Error('The file appears to be empty or has no data rows'))
            return
          }

          // Build case/space-insensitive header lookup from first row
          const headerLookup = buildHeaderLookup(rawData[0])
          const detectedHeaders = [...headerLookup.values()]

          const errors: string[] = []
          const existingIds = new Set(
            existingRecords.map(
              r => (r.serialNumber ?? '') + (r.productCode ?? '') + (r.expirationDate ?? ''),
            ),
          )
          let duplicates = 0

          const records: RenewalRecord[] = rawData
            .map((row, i) => {
              const record: Partial<RenewalRecord> = { id: generateId() }

              Object.entries(COLUMN_MAP).forEach(([xlsxCol, field]) => {
                const actualKey = resolveKey(xlsxCol, headerLookup)
                const val = actualKey ? row[actualKey] : undefined
                if (val === undefined || val === null || val === '') return

                if (field === 'targetQty' || field === 'renewedQty') {
                  ;(record as Record<string, unknown>)[field] = Number(val) || 0
                } else if (field === 'expirationDate') {
                  ;(record as Record<string, unknown>)[field] = parseAnyDate(val)
                } else {
                  ;(record as Record<string, unknown>)[field] = String(val).trim()
                }
              })

              if (!record.serialNumber && !record.productCode) {
                errors.push(`Row ${i + 2}: Missing Serial Number and Product Code`)
              }

              const dupKey =
                (record.serialNumber ?? '') +
                (record.productCode ?? '') +
                (record.expirationDate ?? '')
              if (existingIds.has(dupKey)) duplicates++

              return record as RenewalRecord
            })
            .filter(r => r.productCode || r.serialNumber || r.endCustomerName)

          const batch: UploadBatch = {
            id: generateId(),
            fileName: file.name,
            fileSize: file.size,
            uploadedAt: new Date().toISOString(),
            recordCount: records.length,
            status: errors.length > 0 ? 'error' : 'complete',
            errorMessage: errors.length > 0 ? errors.slice(0, 5).join('; ') : undefined,
            duplicatesFound: duplicates,
          }

          resolve({ records, batch, errors, duplicates, detectedHeaders })
        } catch (err) {
          reject(
            new Error(
              `Failed to parse XLSX: ${err instanceof Error ? err.message : 'Unknown error'}`,
            ),
          )
        }
      }

      reader.onerror = () => reject(new Error('Failed to read file'))
      reader.readAsArrayBuffer(file)
    })
  }

  static async parseEnrichmentFile(file: File): Promise<ManufacturerParseResult> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()

      reader.onload = e => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer)
          // raw:false → dates returned as formatted strings (manufacturer file uses text MM/DD/YYYY)
          const workbook = XLSX.read(data, { type: 'array' })
          const sheetName = workbook.SheetNames[0]
          const worksheet = workbook.Sheets[sheetName]
          const rawData = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { raw: false })

          if (rawData.length === 0) {
            reject(new Error('The file appears to be empty'))
            return
          }

          // Build normalized header lookup from first row
          const headerLookup = buildHeaderLookup(rawData[0])
          const detectedHeaders = [...headerLookup.values()]

          // Special handling: "Product Suite" appears in two map entries — one for productGroup, one for productSuite.
          // We resolve it once here to avoid confusion; normalizeKey("PRODUCTSUITERAW") won't match anything,
          // so we handle productSuite separately in the row loop.
          const records: RenewalRecord[] = []

          for (const row of rawData) {
            const serialNumber = (() => {
              const k = resolveKey('SERIALNUMBER', headerLookup)
              return k ? String(row[k] ?? '').trim() : ''
            })()
            const productCode = (() => {
              const k = resolveKey('PRODUCTCODE', headerLookup)
              return k ? String(row[k] ?? '').trim() : ''
            })()

            // Skip rows where both SN and ProductCode are empty
            if (!serialNumber && !productCode) continue

            const record: Partial<RenewalRecord> = {
              id: generateId(),
              source: 'manufacturer',
              serialNumber,
              productCode,
            }

            for (const [col, field] of Object.entries(MANUFACTURER_COLUMN_MAP)) {
              // Skip the two fields we already set above
              if (field === 'serialNumber' || field === 'productCode') continue
              // PRODUCTSUITERAW is a placeholder key that won't resolve — skip
              if (col === 'PRODUCTSUITERAW') continue

              const actualKey = resolveKey(col, headerLookup)
              const val = actualKey ? row[actualKey] : undefined
              if (val === undefined || val === null || val === '') continue

              if (field === 'expirationDate' || US_DATE_FIELDS.has(field)) {
                const parsed = parseAnyDate(val)
                if (parsed) { (record as Record<string, unknown>)[field] = parsed }
              } else if (NUMERIC_FIELDS.has(field)) {
                const n = typeof val === 'number' ? val : parseFloat(String(val).replace(/[$,\s]/g, ''))
                if (!isNaN(n)) { (record as Record<string, unknown>)[field] = n }
              } else {
                ;(record as Record<string, unknown>)[field] = String(val).trim()
              }
            }

            // productSuite: same source column "Product Suite" — set separately
            const productSuiteKey = resolveKey('PRODUCTSUITE', headerLookup)
            if (productSuiteKey) {
              const psVal = row[productSuiteKey]
              if (psVal !== undefined && psVal !== null && psVal !== '') {
                record.productSuite = String(psVal).trim()
              }
            }

            // openAtrAcv: the column has a trailing space — normalizeKey strips it, so OPENATRACV resolves correctly
            // (already handled in the loop above via OPENATRACV → openAtrAcv)

            records.push(record as RenewalRecord)
          }

          resolve({ records, totalRows: rawData.length, detectedHeaders })
        } catch (err) {
          reject(new Error(`Failed to parse enrichment file: ${err instanceof Error ? err.message : 'Unknown error'}`))
        }
      }

      reader.onerror = () => reject(new Error('Failed to read file'))
      reader.readAsArrayBuffer(file)
    })
  }

  static exportToCSV(
    records: RenewalRecord[],
    filename = 'renewals-export.csv',
  ): void {
    const headers = Object.keys(COLUMN_MAP)
    const rows = records.map(r =>
      Object.values(COLUMN_MAP).map(field => {
        const val = (r as unknown as Record<string, unknown>)[field]
        const str = String(val ?? '')
        // Quote fields that contain commas, double-quotes, or newlines
        return str.search(/[,"\n]/) !== -1 ? `"${str.replace(/"/g, '""')}"` : str
      }),
    )

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  static exportToXLSX(
    records: RenewalRecord[],
    filename = 'renewals-export.xlsx',
  ): void {
    const wsData = records.map(r => {
      const row: Record<string, unknown> = {}
      Object.entries(COLUMN_MAP).forEach(([col, field]) => {
        row[col] = (r as unknown as Record<string, unknown>)[field] ?? ''
      })
      return row
    })

    const ws = XLSX.utils.json_to_sheet(wsData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Renewals')
    XLSX.writeFile(wb, filename)
  }

  static exportFilteredToXLSX(
    records: RenewalRecord[],
    filename = 'renewals-filtered-export.xlsx',
  ): void {
    // Includes computed fields for analytics exports
    const wsData = records.map(r => ({
      ...Object.fromEntries(
        Object.entries(COLUMN_MAP).map(([col, field]) => [
          col,
          (r as unknown as Record<string, unknown>)[field] ?? '',
        ]),
      ),
      DAYS_TO_EXPIRE: r.daysToExpire ?? '',
      SEVERITY: r.severity ?? '',
      RENEWAL_RATE_PCT: r.renewalRate !== undefined ? `${r.renewalRate.toFixed(1)}%` : '',
    }))

    const ws = XLSX.utils.json_to_sheet(wsData)

    // Auto-size columns (approximate)
    const colWidths = Object.keys(wsData[0] ?? {}).map(key => ({
      wch: Math.max(key.length, 12),
    }))
    ws['!cols'] = colWidths

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Renewals')
    XLSX.writeFile(wb, filename)
  }

  /** Validate a file before parsing — returns error message or null */
  static validateFile(file: File): string | null {
    const maxSizeMB = 50
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
    ]
    const allowedExtensions = ['.xlsx', '.xls', '.csv']

    if (file.size > maxSizeMB * 1024 * 1024) {
      return `File size exceeds ${maxSizeMB}MB limit`
    }

    const ext = '.' + file.name.split('.').pop()?.toLowerCase()
    if (!allowedExtensions.includes(ext) && !allowedTypes.includes(file.type)) {
      return `Unsupported file type. Please upload an XLSX, XLS, or CSV file`
    }

    return null
  }
}
