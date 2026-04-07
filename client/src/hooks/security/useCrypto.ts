import { useState, useCallback, useRef } from "react";
import {
  generateEphemeralKeys,
  deriveSharedSecret,
  encryptMessage as encryptAES,
  decryptMessage as decryptAES,
} from "@/utils/crypto";

/**
 * Interface defining the return methods and state for the useCrypto hook.
 */
export interface UseCryptoReturn {
  generateHandshakeKeys: (peerAddress: string) => string;
  computeSecret: (peerAddress: string, peerPublicKey: string) => void;
  encrypt: (peerAddress: string, plainText: string) => string | null;
  decrypt: (peerAddress: string, cipherText: string) => string;
  encryptLocalDB: (plainText: string) => string;
  decryptLocalDB: (cipherText: string) => string;
  removeSecret: (peerAddress: string) => void;
  hasSecret: (addr: string) => boolean;
}

/**
 * Custom hook to manage cryptographic operations for end-to-end encryption (E2EE) and local storage.
 * Handles handshake-wide ECDH ephemeral key generation, shared secret derivation, and AES encryption/decryption.
 * @returns {UseCryptoReturn} Cryptographic state and helper functions.
 */
export const useCrypto = (): UseCryptoReturn => {
  const pendingPrivateKeys = useRef<Record<string, any>>({});
  const [sharedSecrets, setSharedSecrets] = useState<Record<string, string>>(
    {},
  );

  const [localDbKey] = useState(() => {
    let key = localStorage.getItem("securep2p_local_db_key");
    if (!key) {
      const array = new Uint8Array(32);
      window.crypto.getRandomValues(array);
      key = Array.from(array, (byte) =>
        byte.toString(16).padStart(2, "0"),
      ).join("");
      localStorage.setItem("securep2p_local_db_key", key);
      console.log("[Crypto] New local database encryption key generated.");
    }
    return key;
  });

  /**
   * Generates disposable keys for a specific handshake.
   * @param {string} peerAddress - The target peer address.
   * @returns {string} The public key to be sent to the peer.
   */
  const generateHandshakeKeys = useCallback((peerAddress: string): string => {
    const keys = generateEphemeralKeys();
    console.log("=========================================");
    console.log("[Crypto] Phase 3: ECDH Key Generation (Handshake-Wide)");
    console.log("[Crypto] Ephemeral Private Key generated (Secured in memory)");
    console.log(`[Crypto] Ephemeral Public Key generated: ${keys.publicKey}`);
    console.log("=========================================");

    pendingPrivateKeys.current[peerAddress] = keys.signingKey;
    return keys.publicKey;
  }, []);

  /**
   * Derives and stores a shared secret using ECDH with the peer's public key.
   * @param {string} peerAddress - The address of the target peer.
   * @param {string} peerPublicKey - The ephemeral public key provided by the peer.
   * @returns {void}
   */
  const computeSecret = useCallback(
    (peerAddress: string, peerPublicKey: string): void => {
      const mySigningKey = pendingPrivateKeys.current[peerAddress];
      if (!mySigningKey) {
        console.error(
          `[Crypto Error] No pending private key found for peer: ${peerAddress}`,
        );
        return;
      }

      console.log(`[Crypto] Deriving shared secret for peer: ${peerAddress}`);
      const secret = deriveSharedSecret(mySigningKey, peerPublicKey);

      if (secret) {
        setSharedSecrets((prev) => ({ ...prev, [peerAddress]: secret }));
        delete pendingPrivateKeys.current[peerAddress];
        console.log(
          `[Crypto] Shared secret successfully established for peer: ${peerAddress}`,
        );
      } else {
        console.error(
          `[Crypto Error] Failed to derive shared secret for peer: ${peerAddress}`,
        );
      }
    },
    [],
  );

  /**
   * Encrypts a plaintext message using the shared secret established with the peer.
   * @param {string} peerAddress - The address of the target peer.
   * @param {string} plainText - The message to encrypt.
   * @returns {string | null} The encrypted ciphertext, or null if encryption fails.
   * @throws {Error} Throws if no shared secret exists for the peer.
   */
  const encrypt = useCallback(
    (peerAddress: string, plainText: string): string | null => {
      const secret = sharedSecrets[peerAddress];
      if (!secret) {
        console.error(
          `[Crypto Error] Attempted to encrypt without an established handshake for peer: ${peerAddress}`,
        );
        throw new Error("Handshake required!");
      }
      return encryptAES(plainText, secret);
    },
    [sharedSecrets],
  );

  /**
   * Decrypts a ciphertext message using the shared secret established with the peer.
   * @param {string} peerAddress - The address of the sender.
   * @param {string} cipherText - The encrypted message.
   * @returns {string} The decrypted plaintext, or a fallback string if decryption fails.
   */
  const decrypt = useCallback(
    (peerAddress: string, cipherText: string): string => {
      const secret = sharedSecrets[peerAddress];
      if (!secret) return "Encrypted (Waiting Handshake...)";

      const decrypted = decryptAES(cipherText, secret);
      if (
        !decrypted ||
        decrypted.includes("FAILED") ||
        decrypted.includes("ERROR")
      ) {
        console.warn(
          `[Crypto Warning] Decryption failed or yielded empty result for peer: ${peerAddress}`,
        );
      }

      return decrypted || "Decryption Failed";
    },
    [sharedSecrets],
  );

  /**
   * Encrypts data for secure storage in the local IndexedDB.
   * @param {string} plainText - The data to store.
   * @returns {string} The encrypted ciphertext.
   */
  const encryptLocalDB = useCallback(
    (plainText: string): string => {
      const encrypted = encryptAES(plainText, localDbKey);
      return encrypted || "";
    },
    [localDbKey],
  );

  /**
   * Decrypts data retrieved from the local IndexedDB.
   * @param {string} cipherText - The encrypted data from storage.
   * @returns {string} The decrypted plaintext, or the original ciphertext if decryption fails.
   */
  const decryptLocalDB = useCallback(
    (cipherText: string): string => {
      try {
        const decrypted = decryptAES(cipherText, localDbKey);
        return decrypted ? decrypted : cipherText;
      } catch {
        return cipherText;
      }
    },
    [localDbKey],
  );

  /**
   * Deletes the shared secret for a specific peer from memory.
   * @param {string} peerAddress - The address of the peer to remove.
   * @returns {void}
   */
  const removeSecret = useCallback((peerAddress: string): void => {
    setSharedSecrets((prev) => {
      const next = { ...prev };
      delete next[peerAddress.toLowerCase()];
      console.log(
        `[Crypto] Shared secret removed from memory for peer: ${peerAddress}`,
      );
      return next;
    });
  }, []);

  return {
    generateHandshakeKeys,
    computeSecret,
    encrypt,
    decrypt,
    encryptLocalDB,
    decryptLocalDB,
    removeSecret,
    hasSecret: (addr: string) => !!sharedSecrets[addr],
  };
};
