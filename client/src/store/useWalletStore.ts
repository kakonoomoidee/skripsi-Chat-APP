import { create } from "zustand";

/**
 * Interface defining the state and modifier actions for the peer's cryptographic wallet.
 */
export interface WalletState {
  peerWalletAddress: string | null;
  pendingPeerWalletRequestAddress: string | null;
  setPeerWalletAddress: (address: string | null) => void;
  setPendingPeerWalletRequestAddress: (address: string | null) => void;
}

/**
 * Zustand store to manage the temporary state of the peer's resolved cryptocurrency wallet address.
 * Utilized primarily for executing direct MetaMask transactions over the P2P network.
 *
 * @returns {WalletState} The wallet state and modifier functions.
 */
export const useWalletStore = create<WalletState>((set) => ({
  peerWalletAddress: null,
  pendingPeerWalletRequestAddress: null,

  setPeerWalletAddress: (address: string | null) => {
    if (address) {
      console.log(
        `[Wallet Store] Peer wallet address resolved and stored: ${address}`,
      );
    } else {
      console.log("[Wallet Store] Peer wallet address cleared from memory.");
    }
    set({ peerWalletAddress: address });
  },

  setPendingPeerWalletRequestAddress: (address: string | null) => {
    set({ pendingPeerWalletRequestAddress: address });
  },
}));
