import { create } from 'zustand'

interface UIStore {
    isMobileMenuOpen: boolean
    toggleMobileMenu: () => void
    setMobileMenuOpen: (isOpen: boolean) => void
}

export const useUIStore = create<UIStore>((set) => ({
    isMobileMenuOpen: false,
    toggleMobileMenu: () => set((state) => ({ isMobileMenuOpen: !state.isMobileMenuOpen })),
    setMobileMenuOpen: (isOpen) => set({ isMobileMenuOpen: isOpen }),
}))
