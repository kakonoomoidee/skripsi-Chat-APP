import { useState, useCallback } from "react";
import { ethers } from "ethers";
import {
  KEYSTORE_STORAGE_KEY,
  getStoredWalletAddressFromKeystore,
} from "@/utils/security";

/**
 * Interface defining the result of a wallet creation operation.
 */
export interface CreateWalletResult {
  wallet: ethers.HDNodeWallet;
  seedPhrase: string;
}

/**
 * Interface defining the properties and methods returned by the useWallet hook.
 */
export interface UseWalletReturn {
  wallet: ethers.Wallet | ethers.HDNodeWallet | null;
  address: string | null;
  loading: boolean;
  createAndEncryptWallet: (password: string) => Promise<CreateWalletResult>;
  decryptWallet: (
    password: string,
  ) => Promise<ethers.Wallet | ethers.HDNodeWallet>;
  importAndEncryptWallet: (
    seedPhrase: string,
    password: string,
  ) => Promise<ethers.HDNodeWallet>;
  resetWallet: () => void;
}

/**
 * Custom hook to manage local Ethereum wallet creation, encryption, and decryption.
 * Handles the secure storage of the identity keystore in the browser's local storage.
 *
 * @returns {UseWalletReturn} Wallet state and cryptographic management functions.
 */
export const useWallet = (): UseWalletReturn => {
  const [wallet, setWallet] = useState<
    ethers.Wallet | ethers.HDNodeWallet | null
  >(null);
  const [address, setAddress] = useState<string | null>(
    getStoredWalletAddressFromKeystore(
      localStorage.getItem(KEYSTORE_STORAGE_KEY),
    ),
  );
  const [loading, setLoading] = useState<boolean>(false);

  /**
   * Generates a new HD wallet, extracts its mnemonic seed phrase, encrypts the wallet
   * using the provided password, and persists the keystore JSON to local storage.
   *
   * @param {string} password - The password to encrypt the Keystore JSON.
   * @returns {Promise<CreateWalletResult>} Object containing the new wallet instance and the 12-word seed phrase.
   * @throws {Error} Throws if encryption or storage fails.
   */
  const createAndEncryptWallet = async (
    password: string,
  ): Promise<CreateWalletResult> => {
    setLoading(true);
    try {
      console.log("[Wallet Manager] Generating new random HD wallet...");
      const newWallet = ethers.Wallet.createRandom();
      const seedPhrase = newWallet.mnemonic?.phrase || "";

      console.log(
        "[Wallet Manager] Encrypting private key to Keystore JSON...",
      );
      const keystoreJson = await newWallet.encrypt(password);

      localStorage.setItem(KEYSTORE_STORAGE_KEY, keystoreJson);
      setWallet(newWallet);
      setAddress(newWallet.address);

      console.log(
        "[Wallet Manager] Wallet successfully generated and encrypted.",
      );
      return { wallet: newWallet, seedPhrase };
    } finally {
      setLoading(false);
    }
  };

  /**
   * Retrieves the encrypted keystore JSON from local storage and decrypts it
   * using the provided password to instantiate the wallet in memory.
   *
   * @param {string} password - The password used to decrypt the Keystore JSON.
   * @returns {Promise<ethers.Wallet | ethers.HDNodeWallet>} The decrypted wallet instance.
   * @throws {Error} Throws if the keystore is missing, corrupt, or the password is incorrect.
   */
  const decryptWallet = async (
    password: string,
  ): Promise<ethers.Wallet | ethers.HDNodeWallet> => {
    setLoading(true);
    try {
      console.log(
        "[Wallet Manager] Attempting to decrypt local Keystore JSON...",
      );
      const keystoreJson = localStorage.getItem(KEYSTORE_STORAGE_KEY);

      if (!keystoreJson) {
        throw new Error("No Identity found. Please register.");
      }

      const unlockedWallet = await ethers.Wallet.fromEncryptedJson(
        keystoreJson,
        password,
      );

      setWallet(unlockedWallet);
      setAddress(unlockedWallet.address);

      console.log(
        "[Wallet Manager] Wallet successfully decrypted and loaded into memory.",
      );
      return unlockedWallet;
    } catch (error) {
      console.error(
        "[Wallet Manager Error] Decryption failed. Invalid password or corrupt keystore.",
      );
      throw new Error("Invalid password or corrupt Keystore.");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Restores an HD wallet from a 12-word mnemonic seed phrase, encrypts it
   * with a new password, and saves the resulting keystore JSON to local storage.
   *
   * @param {string} seedPhrase - The 12-word BIP39 mnemonic phrase.
   * @param {string} password - The new password to encrypt the Keystore JSON.
   * @returns {Promise<ethers.HDNodeWallet>} The imported wallet instance.
   * @throws {Error} Throws if the seed phrase is invalid or encryption fails.
   */
  const importAndEncryptWallet = async (
    seedPhrase: string,
    password: string,
  ): Promise<ethers.HDNodeWallet> => {
    setLoading(true);
    try {
      console.log("[Wallet Manager] Restoring wallet from seed phrase...");
      const importedWallet = ethers.Wallet.fromPhrase(seedPhrase.trim());

      console.log(
        "[Wallet Manager] Encrypting imported wallet to Keystore JSON...",
      );
      const keystoreJson = await importedWallet.encrypt(password);

      localStorage.setItem(KEYSTORE_STORAGE_KEY, keystoreJson);
      setWallet(importedWallet);
      setAddress(importedWallet.address);

      console.log("[Wallet Manager] Wallet successfully imported and secured.");
      return importedWallet;
    } catch (error) {
      console.error(
        "[Wallet Manager Error] Import failed. Invalid seed phrase format.",
      );
      throw new Error("Invalid Seed Phrase. Please check your 12 words.");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Erases the keystore data from local storage and forces a hard reload of the application
   * to clear any remaining sensitive data from memory.
   *
   * @returns {void}
   */
  const resetWallet = useCallback((): void => {
    console.log(
      "[Wallet Manager] Executing wallet wipe protocol. Purging local storage...",
    );
    localStorage.removeItem(KEYSTORE_STORAGE_KEY);
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
