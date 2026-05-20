import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface SidebarStore {
  collapsed: boolean
  mobileOpen: boolean
  setCollapsed: (collapsed: boolean) => void
  setMobileOpen: (open: boolean) => void
  toggle: () => void
}

export const useSidebar = create<SidebarStore>()(
  persist(
    (set, get) => ({
      collapsed: false,
      mobileOpen: false,
      setCollapsed: (collapsed) => set({ collapsed }),
      setMobileOpen: (mobileOpen) => set({ mobileOpen }),
      toggle: () => set({ collapsed: !get().collapsed }),
    }),
    {
      name: 'sidebar-state',
      partialize: (state) => ({ collapsed: state.collapsed }),
    }
  )
)
