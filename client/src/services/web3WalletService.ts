import ms from "ms";
import { ethers } from "ethers";
import {
  INTERNAL_TX_WALLET_KEY,
  LINKED_METAMASK_KEY,
} from "@/services/walletBalanceService";

export interface WalletDetails {
  balance: string;
  network: string;
  chainId: string;
}

export interface LinkedWalletState {
  address: string | null;
  type: "internal" | "external" | null;
}

export interface WithdrawalValidationResult {
  valid: boolean;
  error?: string;
  safeMax: number;
}

export const ESTIMATED_GAS_ETH = 0.001;
export const COPIED_STATE_RESET_MS = ms("1.8s");
export const INTERNAL_TX_PRIVATE_KEY_STORAGE_KEY = "internal_tx_pk";

/**
 * Returns linked wallet information from browser storage.
 *
 * @returns {LinkedWalletState} Stored wallet address and type.
 */
export const getLinkedWalletState = (): LinkedWalletState => {
  const externalAddress = localStorage.getItem(LINKED_METAMASK_KEY);
  const internalAddress = localStorage.getItem(INTERNAL_TX_WALLET_KEY);

  if (internalAddress) {
    return { address: internalAddress, type: "internal" };
  }

  if (externalAddress && typeof window.ethereum !== "undefined") {
    return { address: externalAddress, type: "external" };
  }

  return { address: null, type: null };
};

/**
 * Persists internal wallet credentials in local storage.
 *
 * @param {string} address - Internal wallet address.
 * @param {string} encryptedPrivateKey - Encrypted private key.
 * @returns {void}
 */
export const persistInternalWallet = (
  address: string,
  encryptedPrivateKey: string,
): void => {
  localStorage.setItem(INTERNAL_TX_WALLET_KEY, address);
  localStorage.setItem(INTERNAL_TX_PRIVATE_KEY_STORAGE_KEY, encryptedPrivateKey);
};

/**
 * Persists external linked wallet and removes internal credentials.
 *
 * @param {string} address - Linked external wallet address.
 * @returns {void}
 */
export const persistExternalWallet = (address: string): void => {
  localStorage.setItem(LINKED_METAMASK_KEY, address);
  localStorage.removeItem(INTERNAL_TX_WALLET_KEY);
  localStorage.removeItem(INTERNAL_TX_PRIVATE_KEY_STORAGE_KEY);
};

/**
 * Clears both internal and external wallet linkage data.
 *
 * @returns {void}
 */
export const clearWalletLinkage = (): void => {
  localStorage.removeItem(LINKED_METAMASK_KEY);
  localStorage.removeItem(INTERNAL_TX_WALLET_KEY);
  localStorage.removeItem(INTERNAL_TX_PRIVATE_KEY_STORAGE_KEY);
};

/**
 * Resolves RPC URL from runtime config with fallback value.
 *
 * @returns {string} Resolved RPC URL.
 */
export const resolveRpcUrl = (): string =>
  import.meta.env.VITE_RPC_URL || "http://127.0.0.1:7545";

/**
 * Fetches wallet details from provider for display.
 *
 * @param {string} address - Wallet address.
 * @param {boolean} isExternal - Whether wallet uses injected provider.
 * @param {string} rpcUrl - RPC fallback for internal wallet.
 * @returns {Promise<WalletDetails>} Wallet details payload.
 */
export const fetchWalletDetailsFromProvider = async (
  address: string,
  isExternal: boolean,
  rpcUrl: string,
): Promise<WalletDetails> => {
  const provider =
    isExternal && typeof window.ethereum !== "undefined"
      ? new ethers.BrowserProvider(window.ethereum)
      : new ethers.JsonRpcProvider(rpcUrl);

  const network = await provider.getNetwork();
  const balanceWei = await provider.getBalance(address);
  const balanceEth = ethers.formatEther(balanceWei);

  return {
    balance: Number.parseFloat(balanceEth).toFixed(4),
    network: network.name === "unknown" ? "Localhost" : network.name,
    chainId: network.chainId.toString(),
  };
};

/**
 * Builds fallback wallet detail values when provider calls fail.
 *
 * @returns {WalletDetails} Safe wallet details fallback.
 */
export const getFallbackWalletDetails = (): WalletDetails => ({
  balance: "0.0000",
  network: "Unknown",
  chainId: "0",
});

/**
 * Computes safe maximum withdrawal amount after gas reservation.
 *
 * @param {number} currentBalance - Current wallet balance.
 * @param {number} estimatedGas - Reserved gas fee.
 * @returns {number} Safe maximum transferable amount.
 */
export const getSafeMaxWithdrawal = (
  currentBalance: number,
  estimatedGas: number,
): number => Math.max(0, currentBalance - estimatedGas);

/**
 * Validates withdrawal amount/address against wallet limits.
 *
 * @param {string} withdrawAddress - Destination address.
 * @param {string} withdrawAmount - Requested withdrawal amount.
 * @param {string | undefined} walletBalance - Wallet balance string.
 * @param {number} estimatedGas - Reserved gas fee.
 * @returns {WithdrawalValidationResult} Validation result and safe max.
 */
export const validateWithdrawal = (
  withdrawAddress: string,
  withdrawAmount: string,
  walletBalance: string | undefined,
  estimatedGas: number,
): WithdrawalValidationResult => {
  const currentBalance = Number(walletBalance || "0");
  const safeMax = getSafeMaxWithdrawal(currentBalance, estimatedGas);

  if (!ethers.isAddress(withdrawAddress)) {
    return { valid: false, error: "Invalid destination address.", safeMax };
  }

  const numericAmount = Number(withdrawAmount);

  if (Number.isNaN(numericAmount) || numericAmount <= 0) {
    return { valid: false, error: "Invalid withdrawal amount.", safeMax };
  }

  if (numericAmount > safeMax) {
    return {
      valid: false,
      error: `Amount exceeds safe maximum. Max: ${safeMax.toFixed(4)} ETH (after ~${estimatedGas} ETH gas fee).`,
      safeMax,
    };
  }

  return { valid: true, safeMax };
};
