import { useState, useEffect, useCallback } from "react";
import {
  fetchWalletDetailsFromProvider,
  getFallbackWalletDetails,
  resolveRpcUrl,
  type WalletDetails,
} from "@/services/web3WalletService";

/**
 * Interface defining the return values of the useWeb3WalletData hook.
 */
export interface UseWeb3WalletDataReturn {
  walletDetails: WalletDetails | null;
  refreshWalletData: () => Promise<void>;
}

/**
 * Custom hook to manage Web3 Wallet data fetching and auto-refreshing.
 * Automatically polls the network every 5 seconds for updated balances.
 *
 * @param {string | null} address - The wallet address to fetch details for.
 * @param {"internal" | "external" | null} type - The type of the wallet.
 * @returns {UseWeb3WalletDataReturn} The wallet details and a manual refresh function.
 */
export const useWeb3WalletData = (
  address: string | null,
  type: "internal" | "external" | null,
): UseWeb3WalletDataReturn => {
  const [walletDetails, setWalletDetails] = useState<WalletDetails | null>(
    null,
  );

  /**
   * Fetches the latest wallet details from the provider.
   *
   * @returns {Promise<void>} Resolves when the wallet data is fetched.
   */
  const refreshWalletData = useCallback(async (): Promise<void> => {
    if (!address || !type) {
      setWalletDetails(null);
      return;
    }

    try {
      const details = await fetchWalletDetailsFromProvider(
        address,
        type === "external",
        resolveRpcUrl(),
      );
      setWalletDetails(details);
    } catch {
      setWalletDetails(getFallbackWalletDetails());
    }
  }, [address, type]);

  useEffect(() => {
    refreshWalletData();

    if (!address || !type) {
      return;
    }

    const intervalId = setInterval(() => {
      refreshWalletData();
    }, 5000);

    return () => {
      clearInterval(intervalId);
    };
  }, [address, type, refreshWalletData]);

  return {
    walletDetails,
    refreshWalletData,
  };
};
