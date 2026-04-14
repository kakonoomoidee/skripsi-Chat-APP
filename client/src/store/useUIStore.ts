import { create } from "zustand";

/**
 * Type definition for available toast notification themes.
 */
export type ToastType = "error" | "success" | "info";

/**
 * Type definition for the seed phrase modal operations.
 */
export type SeedModalType = "import" | "export" | "wipe";

/**
 * Interface representing the state of a toast notification.
 */
export interface ToastState {
  show: boolean;
  msg: string;
  type: ToastType;
}

/**
 * Interface representing the state of the seed phrase verification modal.
 */
export interface SeedModalState {
  isOpen: boolean;
  type: SeedModalType;
  payload?: string;
}

/**
 * Interface defining the global UI state and modifier actions.
 */
export interface UIState {
  isMobileSidebarOpen: boolean;
  setIsMobileSidebarOpen: (isOpen: boolean) => void;
  hasUnread: boolean;
  setHasUnread: (hasUnread: boolean) => void;
  toast: ToastState;
  showToast: (msg: string, type?: ToastType) => void;
  hideToast: () => void;
  seedModal: SeedModalState;
  setSeedModal: (config: SeedModalState) => void;
  closeSeedModal: () => void;
}

/**
 * Zustand store to manage global UI components such as mobile sidebars,
 * toast notifications, and secure modals.
 *
 * @returns {UIState} The global UI state and modifier functions.
 */
export const useUIStore = create<UIState>((set) => ({
  isMobileSidebarOpen: true,

  setIsMobileSidebarOpen: (isOpen: boolean) =>
    set({ isMobileSidebarOpen: isOpen }),

  hasUnread: false,

  setHasUnread: (hasUnread: boolean) => set({ hasUnread }),

  toast: { show: false, msg: "", type: "error" },

  showToast: (msg: string, type: ToastType = "error") => {
    console.log(
      `[UI Store] Displaying toast notification | Type: ${type} | Message: ${msg}`,
    );
    set({ toast: { show: true, msg, type } });

    setTimeout(() => {
      set((state) => ({ toast: { ...state.toast, show: false } }));
    }, 3500);
  },

  hideToast: () => set((state) => ({ toast: { ...state.toast, show: false } })),

  seedModal: { isOpen: false, type: "export" },

  setSeedModal: (config: SeedModalState) => set({ seedModal: config }),

  closeSeedModal: () =>
    set({ seedModal: { isOpen: false, type: "export", payload: undefined } }),
}));
