import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface UIStore {
    isMobileMenuOpen: boolean
    toggleMobileMenu: () => void
    setMobileMenuOpen: (isOpen: boolean) => void
    isSidebarCollapsed: boolean
    toggleSidebar: () => void
    setSidebarCollapsed: (collapsed: boolean) => void
}

export const useUIStore = create<UIStore>()(
    persist(
        (set) => ({
            isMobileMenuOpen: false,
            toggleMobileMenu: () => set((state) => ({ isMobileMenuOpen: !state.isMobileMenuOpen })),
            setMobileMenuOpen: (isOpen) => set({ isMobileMenuOpen: isOpen }),
            isSidebarCollapsed: false,
            toggleSidebar: () => set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),
            setSidebarCollapsed: (collapsed) => set({ isSidebarCollapsed: collapsed }),
        }),
        {
            name: 'ui-store',
            partialize: (state) => ({ isSidebarCollapsed: state.isSidebarCollapsed }),
        }
    )
)
