import { ethers } from "ethers";

export const INTERNAL_TX_WALLET_KEY = "internal_tx_wallet";
export const LINKED_METAMASK_KEY = "linked_metamask";

export interface StoredWalletAddresses {
  internalAddress: string | null;
  externalAddress: string | null;
  activeAddress: string | null;
}

/**
 * Reads wallet addresses from browser storage and resolves active preference.
 *
 * @returns {StoredWalletAddresses} Wallet addresses from storage.
 */
export const getStoredWalletAddresses = (): StoredWalletAddresses => {
  const externalAddress = localStorage.getItem(LINKED_METAMASK_KEY);
  const internalAddress = localStorage.getItem(INTERNAL_TX_WALLET_KEY);

  return {
    internalAddress,
    externalAddress,
    activeAddress: internalAddress || externalAddress,
  };
};

/**
 * Fetches the active wallet balance and returns a fixed ETH string.
 *
 * @param {string} rpcUrl - RPC URL used for internal wallet reads.
 * @returns {Promise<string | null>} Fixed ETH balance or null when no active wallet exists.
 */
export const fetchActiveWalletBalance = async (
  rpcUrl: string,
): Promise<string | null> => {
  const { activeAddress, internalAddress, externalAddress } =
    getStoredWalletAddresses();

  if (!activeAddress) return null;

  let provider: ethers.BrowserProvider | ethers.JsonRpcProvider;

  if (internalAddress) {
    provider = new ethers.JsonRpcProvider(rpcUrl);
  } else if (externalAddress && typeof window.ethereum !== "undefined") {
    provider = new ethers.BrowserProvider(window.ethereum);
  } else {
    throw new Error("No valid provider found");
  }

  const balanceWei = await provider.getBalance(activeAddress);
  const balanceEth = ethers.formatEther(balanceWei);
  return Number.parseFloat(balanceEth).toFixed(4);
};
