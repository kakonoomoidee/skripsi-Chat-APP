import { useEffect, useState } from "react";
import { fetchActiveWalletBalance } from "@/services/walletBalanceService";

const FALLBACK_RPC_URL = "http://127.0.0.1:7545";

/**
 * Retrieves and tracks the active wallet balance while transfer modal is open.
 *
 * @param {boolean} isOpen - Whether transfer modal is visible.
 * @returns {string | null} Current wallet balance in ETH.
 */
export const useTransferBalance = (isOpen: boolean): string | null => {
  const [currentBalance, setCurrentBalance] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const loadBalance = async (): Promise<void> => {
      try {
        const balance = await fetchActiveWalletBalance(
          import.meta.env.VITE_RPC_URL || FALLBACK_RPC_URL,
        );
        setCurrentBalance(balance);
      } catch (error) {
        console.error("Failed to fetch balance for transfer modal", error);
      }
    };

    loadBalance();
  }, [isOpen]);

  return currentBalance;
};
