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
    }),
    {
      name: 'renewal-store',
      // Only persist data — filters and UI state are session-scoped
      partialize: (state) => ({
        records: state.records,
        uploadBatches: state.uploadBatches,
      }),
    },
  ),
)
