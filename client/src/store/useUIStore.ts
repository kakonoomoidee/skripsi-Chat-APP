import { create } from "zustand";

interface UIState {
  isMobileSidebarOpen: boolean;
  setIsMobileSidebarOpen: (isOpen: boolean) => void;

  toast: { show: boolean; msg: string; type: "error" | "success" };
  showToast: (msg: string, type?: "error" | "success") => void;
  hideToast: () => void;

  seedModal: {
    isOpen: boolean;
    type: "import" | "export" | "wipe";
    payload?: string;
  };
  setSeedModal: (config: {
    isOpen: boolean;
    type: "import" | "export" | "wipe";
    payload?: string;
  }) => void;
  closeSeedModal: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  isMobileSidebarOpen: true,
  setIsMobileSidebarOpen: (isOpen: boolean) =>
    set({ isMobileSidebarOpen: isOpen }),

  toast: { show: false, msg: "", type: "error" },
  showToast: (msg: string, type: "error" | "success" = "error") => {
    set({ toast: { show: true, msg, type } });
    setTimeout(() => {
      set((state) => ({ toast: { ...state.toast, show: false } }));
    }, 3500);
  },
  hideToast: () => set((state) => ({ toast: { ...state.toast, show: false } })),

  seedModal: { isOpen: false, type: "export" },
  setSeedModal: (config) => set({ seedModal: config }),
  closeSeedModal: () =>
    set({ seedModal: { isOpen: false, type: "export", payload: undefined } }),
}));
