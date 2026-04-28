import { ethers } from "ethers";

export const LOCAL_DB_ENCRYPTION_KEY_STORAGE_KEY = "securep2p_local_db_key";
export const KEYSTORE_STORAGE_KEY = "chat_app_keystore";

export const CRYPTO_SYSTEM_MESSAGE_TYPES = new Set([
  "TYPING",
  "WALLET_REQUEST",
  "WALLET_RESPONSE",
  "CALL_OFFER",
  "CALL_ACCEPTED",
  "CALL_REJECTED",
  "CALL_ENDED",
]);

export const isCryptoSystemMessage = (text: string): boolean => {
  const normalized = text.trim();
  if (!normalized.startsWith("{")) {
    return false;
  }

  try {
    const parsed = JSON.parse(normalized) as { type?: unknown };
    return (
      typeof parsed.type === "string" &&
      CRYPTO_SYSTEM_MESSAGE_TYPES.has(parsed.type)
    );
  } catch {
    return false;
  }
};

export const getOrCreateLocalDbEncryptionKey = (): string => {
  const existingKey = localStorage.getItem(LOCAL_DB_ENCRYPTION_KEY_STORAGE_KEY);
  if (existingKey) {
    return existingKey;
  }

  const array = new Uint8Array(32);
  window.crypto.getRandomValues(array);
  const key = Array.from(array, (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
  localStorage.setItem(LOCAL_DB_ENCRYPTION_KEY_STORAGE_KEY, key);
  return key;
};

export const getStoredWalletAddressFromKeystore = (
  keystoreJson: string | null,
): string | null => {
  if (!keystoreJson) {
    return null;
  }

  try {
    const parsed = JSON.parse(keystoreJson) as { address?: unknown };
    return typeof parsed.address === "string" && parsed.address
      ? ethers.getAddress(parsed.address)
      : null;
  } catch {
    return null;
  }
};
