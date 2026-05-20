import * as XLSX from 'xlsx'
import type { RenewalRecord, UploadBatch } from '@/types/renewal.types'
import { generateId } from '@/lib/utils'

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
  selling_entity: 'sellingEntity',
  PRODUCTGROUP: 'productGroup',
}

export interface ParseResult {
  records: RenewalRecord[]
  batch: UploadBatch
  errors: string[]
  duplicates: number
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
            raw: false,
          })

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
                const val = row[xlsxCol]
                if (val !== undefined && val !== null && val !== '') {
                  if (field === 'targetQty' || field === 'renewedQty') {
                    ;(record as Record<string, unknown>)[field] = Number(val) || 0
                  } else if (field === 'expirationDate') {
                    const d = new Date(val as string)
                    ;(record as Record<string, unknown>)[field] = isNaN(d.getTime())
                      ? String(val)
                      : d.toISOString().split('T')[0]
                  } else {
                    ;(record as Record<string, unknown>)[field] = String(val).trim()
                  }
                }
              })

              if (!record.serialNumber && !record.productCode) {
                errors.push(
                  `Row ${i + 2}: Missing required fields (SERIALNUMBER or PRODUCTCODE)`,
                )
              }

              const dupKey =
                (record.serialNumber ?? '') +
                (record.productCode ?? '') +
                (record.expirationDate ?? '')
              if (existingIds.has(dupKey)) duplicates++

              return record as RenewalRecord
            })
            .filter((_, i) => {
              const row = rawData[i]
              return (
                row['PRODUCTCODE'] || row['SERIALNUMBER'] || row['ENDCUSTOMERNAME']
              )
            })

          const batch: UploadBatch = {
            id: generateId(),
            fileName: file.name,
            fileSize: file.size,
            uploadedAt: new Date().toISOString(),
            recordCount: records.length,
            status: errors.length > 0 ? 'error' : 'complete',
            errorMessage: errors.length > 0 ? errors.join('; ') : undefined,
            duplicatesFound: duplicates,
          }

          resolve({ records, batch, errors, duplicates })
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
