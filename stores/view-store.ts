// Simple localStorage-based view state management
// No external dependencies needed

export type ViewMode = 'table' | 'kanban'

const STORAGE_KEY = 'signature8-clients-view-mode'

export const ViewStore = {
  getViewMode: (): ViewMode => {
    if (typeof window === 'undefined') return 'table'
    const stored = localStorage.getItem(STORAGE_KEY)
    return (stored === 'kanban' || stored === 'table') ? stored : 'table'
  },
  
  setViewMode: (mode: ViewMode): void => {
    if (typeof window === 'undefined') return
    localStorage.setItem(STORAGE_KEY, mode)
  }
}
