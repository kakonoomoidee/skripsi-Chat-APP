import { create } from "zustand";

/**
 * Interface representing an incoming handshake connection request.
 */
export interface HandshakeRequest {
  from: string;
  ephemeralPublicKey: string;
  username?: string;
}

/**
 * Interface representing an active chat session.
 */
export interface ActiveSession {
  address: string;
  username: string;
}

/**
 * Represents the possible states of the peer-to-peer connection lifecycle.
 */
export type ConnectionState = "idle" | "connecting" | "connected" | "offline";

/**
 * Interface defining the global chat state managed by Zustand.
 */
export interface ChatStore {
  activeChat: string | null;
  activeUsername: string;
  activeSessions: ActiveSession[];
  pendingRequests: HandshakeRequest[];
  isSearching: boolean;
  initiators: Record<string, boolean>;
  searchError: string;
  isPeerTyping: boolean;
  activeAreaView: "chat" | "settings";
  connectionStates: Record<string, ConnectionState>;

  setActiveChat: (chatId: string | null) => void;
  setActiveUsername: (username: string) => void;
  setActiveSessions: (sessions: ActiveSession[] | ((prev: ActiveSession[]) => ActiveSession[])) => void;
  setPendingRequests: (requests: HandshakeRequest[] | ((prev: HandshakeRequest[]) => HandshakeRequest[])) => void;
  setIsSearching: (isSearching: boolean) => void;
  setInitiators: (initiators: Record<string, boolean> | ((prev: Record<string, boolean>) => Record<string, boolean>)) => void;
  setSearchError: (error: string) => void;
  setIsPeerTyping: (isTyping: boolean) => void;
  setActiveAreaView: (view: "chat" | "settings") => void;
  setConnectionStates: (states: Record<string, ConnectionState> | ((prev: Record<string, ConnectionState>) => Record<string, ConnectionState>)) => void;
}

/**
 * Zustand store for managing UI-related global chat states.
 */
export const useChatStore = create<ChatStore>((set) => ({
  activeChat: null,
  activeUsername: "",
  activeSessions: [],
  pendingRequests: [],
  isSearching: false,
  initiators: {},
  searchError: "",
  isPeerTyping: false,
  activeAreaView: "chat",
  connectionStates: {},

  setActiveChat: (chatId) => set({ activeChat: chatId }),
  setActiveUsername: (username) => set({ activeUsername: username }),
  setActiveSessions: (sessions) => set((state) => ({ activeSessions: typeof sessions === "function" ? sessions(state.activeSessions) : sessions })),
  setPendingRequests: (requests) => set((state) => ({ pendingRequests: typeof requests === "function" ? requests(state.pendingRequests) : requests })),
  setIsSearching: (isSearching) => set({ isSearching }),
  setInitiators: (initiators) => set((state) => ({ initiators: typeof initiators === "function" ? initiators(state.initiators) : initiators })),
  setSearchError: (error) => set({ searchError: error }),
  setIsPeerTyping: (isTyping) => set({ isPeerTyping: isTyping }),
  setActiveAreaView: (view) => set({ activeAreaView: view }),
  setConnectionStates: (states) => set((state) => ({ connectionStates: typeof states === "function" ? states(state.connectionStates) : states })),
}));
