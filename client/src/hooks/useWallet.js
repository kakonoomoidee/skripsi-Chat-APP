import { useState, useCallback } from "react";
import { ethers } from "ethers";

const KEYSTORE_KEY = "chat_app_keystore";

export const useWallet = () => {
  const getStoredAddress = () => {
    const keystore = localStorage.getItem(KEYSTORE_KEY);
    if (keystore) {
      try {
        const parsed = JSON.parse(keystore);
        return parsed.address ? `0x${parsed.address}` : null;
      } catch {
        return null;
      }
    }
    return null;
  };

  const [wallet, setWallet] = useState(null);
  const [address, setAddress] = useState(getStoredAddress());
  const [loading, setLoading] = useState(false);

  const createAndEncryptWallet = async (password) => {
    setLoading(true);
    try {
      const newWallet = ethers.Wallet.createRandom();
      const keystoreJson = await newWallet.encrypt(password);

      localStorage.setItem(KEYSTORE_KEY, keystoreJson);
      setWallet(newWallet);
      setAddress(newWallet.address);

      return newWallet;
    } finally {
      setLoading(false);
    }
  };

  const decryptWallet = async (password) => {
    setLoading(true);
    try {
      const keystoreJson = localStorage.getItem(KEYSTORE_KEY);
      if (!keystoreJson) throw new Error("No Identity found. Please register.");

      const unlockedWallet = await ethers.Wallet.fromEncryptedJson(
        keystoreJson,
        password,
      );

      setWallet(unlockedWallet);
      setAddress(unlockedWallet.address);

      return unlockedWallet;
    } catch {
      throw new Error("Invalid password or corrupt Keystore.");
    } finally {
      setLoading(false);
    }
  };

  const resetWallet = useCallback(() => {
    localStorage.removeItem(KEYSTORE_KEY);
    window.location.reload();
  }, []);

  return {
    wallet,
    address,
    loading,
    createAndEncryptWallet,
    decryptWallet,
    resetWallet,
  };
};
