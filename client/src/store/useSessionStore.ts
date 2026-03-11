import { create } from "zustand";

/**
 * Interface representing the structure of a message being replied to.
 */
export interface ReplyMessage {
  id: string | number;
  text: string;
  isMine: boolean;
  timestamp: number;
}

/**
 * Interface defining the state and actions for the session store.
 */
export interface SessionState {
  messageInput: string;
  setMessageInput: (val: string) => void;
  autoDeleteMode: string;
  setAutoDeleteMode: (mode: string) => void;
  replyingTo: ReplyMessage | null;
  setReplyingTo: (msg: ReplyMessage | null) => void;
}

/**
 * Zustand store to manage volatile session state such as chat inputs,
 * reply context, and auto-delete preferences.
 *
 * @returns {SessionState} The session state and modifier functions.
 */
export const useSessionStore = create<SessionState>((set) => ({
  messageInput: "",

  setMessageInput: (val: string) => set({ messageInput: val }),

  autoDeleteMode: localStorage.getItem("autoDeleteMode") || "never",

  setAutoDeleteMode: (mode: string) => {
    localStorage.setItem("autoDeleteMode", mode);
    set({ autoDeleteMode: mode });
  },

  replyingTo: null,

  setReplyingTo: (msg: ReplyMessage | null) => set({ replyingTo: msg }),
}));
