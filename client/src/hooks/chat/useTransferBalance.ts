import { useEffect, useState } from "react";
import { fetchActiveWalletBalance } from "@/services/walletBalanceService";
import { resolveRpcUrl } from "@/services/web3WalletService";

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
        const balance = await fetchActiveWalletBalance(resolveRpcUrl());
        setCurrentBalance(balance);
      } catch (error) {
        console.error("Failed to fetch balance for transfer modal", error);
      }
    };

    loadBalance();
  }, [isOpen]);

  return currentBalance;
};
