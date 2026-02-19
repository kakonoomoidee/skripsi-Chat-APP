import { useState, useCallback } from "react";
import { ethers } from "ethers";

const LOCAL_STORAGE_KEY = "chat_app_private_key";

export const useWallet = () => {
  const [wallet] = useState(() => {
    const storedKey = localStorage.getItem(LOCAL_STORAGE_KEY);

    if (storedKey) {
      return new ethers.Wallet(storedKey);
    } else {
      const _wallet = ethers.Wallet.createRandom();
      localStorage.setItem(LOCAL_STORAGE_KEY, _wallet.privateKey);
      return _wallet;
    }
  });

  // Derived state (No need for separate useState for address)
  const address = wallet.address;

  const signMessage = useCallback(
    async (message) => {
      if (!wallet) throw new Error("Wallet not initialized");
      return await wallet.signMessage(message);
    },
    [wallet],
  );

  const resetWallet = useCallback(() => {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    window.location.reload();
  }, []);

  return {
    wallet,
    address,
    loading: false, // Wallet is now instant, always false
    signMessage,
    resetWallet,
  };
};
