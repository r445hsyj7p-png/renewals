import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { RenewalRecord, UploadBatch, FilterState } from '@/types/renewal.types'

interface RenewalStore {
  // ── State ──────────────────────────────────────────────────────────────────
  records: RenewalRecord[]
  uploadBatches: UploadBatch[]
  filters: FilterState
  selectedBatchId: string | null

  // ── Actions ────────────────────────────────────────────────────────────────
  setRecords: (records: RenewalRecord[]) => void
  addRecords: (records: RenewalRecord[], batch: UploadBatch) => void
  updateRecord: (id: string, updates: Partial<RenewalRecord>) => void
  dismissRecord: (id: string, reason: 'renewed' | 'skipped') => void
  restoreRecord: (id: string) => void
  removeRecord: (id: string) => void
  removeBatch: (batchId: string) => void
  setFilters: (filters: Partial<FilterState>) => void
  resetFilters: () => void
  setSelectedBatch: (batchId: string | null) => void
  clearAll: () => void
  importManufacturerRecords: (manufacturerRecords: RenewalRecord[]) => void
}

const defaultFilters: FilterState = {
  search: '',
  fiscalQuarter: [],
  country: [],
  theatre: [],
  productGroup: [],
  customer: [],
  distributor: [],
  status: [],
  severity: [],
  dateRange: { from: null, to: null },
}

export const useRenewalStore = create<RenewalStore>()(
  persist(
    (set) => ({
      // ── Initial state ──────────────────────────────────────────────────────
      records: [],
      uploadBatches: [],
      filters: defaultFilters,
      selectedBatchId: null,

      // ── Implementations ────────────────────────────────────────────────────
      setRecords: (records) => set({ records }),

      addRecords: (records, batch) =>
        set(state => ({
          records: [...state.records, ...records],
          uploadBatches: [...state.uploadBatches, batch],
        })),

      updateRecord: (id, updates) =>
        set(state => ({
          records: state.records.map(r => (r.id === id ? { ...r, ...updates } : r)),
        })),

      dismissRecord: (id, reason) =>
        set(state => ({
          records: state.records.map(r =>
            r.id === id
              ? { ...r, dismissed: true, dismissedReason: reason, dismissedAt: new Date().toISOString() }
              : r
          ),
        })),

      restoreRecord: (id) =>
        set(state => ({
          records: state.records.map(r =>
            r.id === id
              ? { ...r, dismissed: false, dismissedReason: undefined, dismissedAt: undefined }
              : r
          ),
        })),

      removeRecord: (id) =>
        set(state => ({
          records: state.records.filter(r => r.id !== id),
        })),

      removeBatch: (batchId) =>
        set(state => ({
          records: state.records.filter(r => r.uploadBatchId !== batchId),
          uploadBatches: state.uploadBatches.filter(b => b.id !== batchId),
        })),

      setFilters: (filters) =>
        set(state => ({
          filters: { ...state.filters, ...filters },
        })),

      resetFilters: () => set({ filters: defaultFilters }),

      setSelectedBatch: (batchId) => set({ selectedBatchId: batchId }),

      clearAll: () =>
        set({ records: [], uploadBatches: [], filters: defaultFilters, selectedBatchId: null }),

      importManufacturerRecords: (manufacturerRecords) =>
        set(state => {
          // Build lookup of existing records by SN+ProductCode for matching
          const existingKey = (sn: string, pc: string) => `${sn}||${pc}`
          const existingMap = new Map(
            state.records.map(r => [existingKey(r.serialNumber ?? '', r.productCode ?? ''), r.id])
          )

          const updatedRecords = [...state.records]
          const idSet = new Set(state.records.map(r => r.id))

          const enrichFields: (keyof RenewalRecord)[] = [
            'tcv', 'renewalRep', 'accountCode', 'accountOwner', 'entArea', 'entRegion',
            'entDistrict', 'entTerritory', 'contractNumber', 'opportunityId', 'contractId',
            'productPlatform', 'productSuite', 'productSolution', 'productClass',
            'subscriptionStartDate', 'subscriptionTermDays', 'endOfSaleDate', 'endOfSupportDate',
            'deviceShipDate', 'subscriptionQty', 'primaryQuoteStatus', 'latestQuoteStatus',
            'primaryQuoteForecastCategory', 'latestQuoteForecastCategory', 'quotedUnquoted',
            'openAtrAcv', 'reportingFiscalQtr',
          ]

          for (const mfr of manufacturerRecords) {
            const key = existingKey(mfr.serialNumber ?? '', mfr.productCode ?? '')
            const existingId = existingMap.get(key)

            if (existingId) {
              // Enrich existing record
              const idx = updatedRecords.findIndex(r => r.id === existingId)
              if (idx >= 0) {
                const merged: RenewalRecord = { ...updatedRecords[idx], enrichedAt: new Date().toISOString() }
                for (const field of enrichFields) {
                  const val = (mfr as unknown as Record<string, unknown>)[field as string]
                  if (val !== undefined && val !== null && val !== '') {
                    (merged as unknown as Record<string, unknown>)[field as string] = val
                  }
                }
                updatedRecords[idx] = merged
              }
            } else {
              // Add as new record (not already in store)
              if (!idSet.has(mfr.id)) {
                updatedRecords.push({ ...mfr, enrichedAt: new Date().toISOString() })
                idSet.add(mfr.id)
              }
            }
          }

          return { records: updatedRecords }
        }),
    }),
    {
      name: 'renewal-store',
      partialize: (state) => ({
        // Manufacturer-sourced records are session-only — re-import each session.
        // This keeps localStorage well under the 5–10 MB quota even for large datasets.
        records: state.records.filter(r => r.source !== 'manufacturer'),
        uploadBatches: state.uploadBatches,
      }),
      storage: {
        getItem: (name) => {
          try {
            const v = localStorage.getItem(name)
            return v ? JSON.parse(v) : null
          } catch {
            return null
          }
        },
        setItem: (name, value) => {
          try {
            localStorage.setItem(name, JSON.stringify(value))
          } catch (e) {
            // Quota exceeded — clear and retry with just the most recent records
            if (e instanceof DOMException && e.name === 'QuotaExceededError') {
              try {
                localStorage.removeItem(name)
                const parsed = typeof value === 'string' ? JSON.parse(value) : value
                if (parsed?.state?.records) {
                  // Keep only the last 2000 records to stay under quota
                  parsed.state.records = parsed.state.records.slice(-2000)
                }
                localStorage.setItem(name, JSON.stringify(parsed))
              } catch {
                // If still failing, clear entirely
                localStorage.removeItem(name)
              }
            }
          }
        },
        removeItem: (name) => localStorage.removeItem(name),
      },
    },
  ),
)
