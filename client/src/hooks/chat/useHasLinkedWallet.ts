import { useEffect, useState } from "react";
import { getStoredWalletAddresses } from "@/services/walletBalanceService";
import { WALLET_LINK_CHECK_INTERVAL_MS } from "@/utils/chatInput";

const resolveHasLinkedWallet = (): boolean =>
  Boolean(getStoredWalletAddresses().activeAddress);

/**
 * Tracks whether the user has any linked wallet available in storage.
 *
 * @returns {boolean} True when internal or external wallet is linked.
 */
export const useHasLinkedWallet = (): boolean => {
  const [hasLinkedWallet, setHasLinkedWallet] = useState<boolean>(
    resolveHasLinkedWallet,
  );

  useEffect(() => {
    const updateWalletLinkState = (): void => {
      setHasLinkedWallet(resolveHasLinkedWallet());
    };

    updateWalletLinkState();
    window.addEventListener("storage", updateWalletLinkState);

    const intervalId = window.setInterval(
      updateWalletLinkState,
      WALLET_LINK_CHECK_INTERVAL_MS,
    );

    return () => {
      window.removeEventListener("storage", updateWalletLinkState);
      window.clearInterval(intervalId);
    };
  }, []);

  return hasLinkedWallet;
};
