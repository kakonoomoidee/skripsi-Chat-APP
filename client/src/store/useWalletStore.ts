import { create } from "zustand";

interface WalletState {
  peerWalletAddress: string | null;
  setPeerWalletAddress: (address: string | null) => void;
}

export const useWalletStore = create<WalletState>((set) => ({
  peerWalletAddress: null,
  setPeerWalletAddress: (address: string | null) =>
    set({ peerWalletAddress: address }),
}));
