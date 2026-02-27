import { create } from "zustand";

interface SessionState {
  messageInput: string;
  setMessageInput: (val: string) => void;

  autoDeleteMode: string;
  setAutoDeleteMode: (mode: string) => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  messageInput: "",
  setMessageInput: (val: string) => set({ messageInput: val }),

  autoDeleteMode: localStorage.getItem("autoDeleteMode") || "never",
  setAutoDeleteMode: (mode: string) => {
    localStorage.setItem("autoDeleteMode", mode);
    set({ autoDeleteMode: mode });
  },
}));
