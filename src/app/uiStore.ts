import { create } from 'zustand'

type UiState = {
  isNavigationOpen: boolean
  closeNavigation: () => void
  toggleNavigation: () => void
}

export const useUiStore = create<UiState>((set) => ({
  isNavigationOpen: false,
  closeNavigation: () => set({ isNavigationOpen: false }),
  toggleNavigation: () =>
    set((state) => ({ isNavigationOpen: !state.isNavigationOpen })),
}))
