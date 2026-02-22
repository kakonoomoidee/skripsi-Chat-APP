import { useState, useCallback } from "react";
import { ethers } from "ethers";

const KEYSTORE_KEY = "chat_app_keystore";

export interface CreateWalletResult {
  wallet: ethers.HDNodeWallet;
  seedPhrase: string;
}

/**
 * 1. Manage local wallet creation, encryption, and decryption
 * @returns {object} { wallet, address, loading, createAndEncryptWallet, decryptWallet, importAndEncryptWallet, resetWallet }
 */
export const useWallet = () => {
  const getStoredAddress = (): string | null => {
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

  const [wallet, setWallet] = useState<
    ethers.Wallet | ethers.HDNodeWallet | null
  >(null);
  const [address, setAddress] = useState<string | null>(getStoredAddress());
  const [loading, setLoading] = useState<boolean>(false);

  /**
   * 2. Create a new burner wallet, extract mnemonic, and encrypt it into local storage
   * @param {string} password - The password to encrypt the keystore
   * @returns {Promise<CreateWalletResult>} Object containing the new wallet instance and the 12-word seed phrase
   */
  const createAndEncryptWallet = async (
    password: string,
  ): Promise<CreateWalletResult> => {
    setLoading(true);
    try {
      const newWallet = ethers.Wallet.createRandom();
      const seedPhrase = newWallet.mnemonic?.phrase || "";

      const keystoreJson = await newWallet.encrypt(password);

      localStorage.setItem(KEYSTORE_KEY, keystoreJson);
      setWallet(newWallet);
      setAddress(newWallet.address);

      return { wallet: newWallet, seedPhrase };
    } finally {
      setLoading(false);
    }
  };

  /**
   * 3. Decrypt an existing wallet from local storage
   * @param {string} password - The password to decrypt the keystore
   * @returns {Promise<ethers.Wallet | ethers.HDNodeWallet>} The decrypted wallet instance
   */
  const decryptWallet = async (password: string) => {
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

  /**
   * 4. Import an existing wallet using a seed phrase and encrypt it into local storage
   * @param {string} seedPhrase - The 12-word mnemonic phrase
   * @param {string} password - The password to encrypt the new keystore
   * @returns {Promise<ethers.HDNodeWallet>} The imported wallet instance
   */
  const importAndEncryptWallet = async (
    seedPhrase: string,
    password: string,
  ) => {
    setLoading(true);
    try {
      const importedWallet = ethers.Wallet.fromPhrase(seedPhrase.trim());
      const keystoreJson = await importedWallet.encrypt(password);

      localStorage.setItem(KEYSTORE_KEY, keystoreJson);
      setWallet(importedWallet);
      setAddress(importedWallet.address);

      return importedWallet;
    } catch {
      throw new Error("Invalid Seed Phrase. Please check your 12 words.");
    } finally {
      setLoading(false);
    }
  };

  /**
   * 5. Wipe wallet data from local storage and reload the app
   * @returns {void}
   */
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
    importAndEncryptWallet,
    resetWallet,
  };
};
