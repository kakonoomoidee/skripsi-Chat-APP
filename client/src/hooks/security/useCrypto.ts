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
  const [, setSharedSecrets] = useState<Record<string, string>>(
    {},
  );
  const sharedSecretsRef = useRef<Record<string, string>>({});

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
        sharedSecretsRef.current[peerAddress] = secret;
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
      const secret = sharedSecretsRef.current[peerAddress];
      if (!secret) {
        console.error(
          `[Crypto Error] Attempted to encrypt without an established handshake for peer: ${peerAddress}`,
        );
        throw new Error("Handshake required!");
      }

      const cipherText = encryptAES(plainText, secret);

      // Mute the annoying logs for system-level messages (Typing, Wallet Requests, etc)
      const isSystemMessage =
        plainText.includes('"type":"TYPING"') ||
        plainText.includes('"type":"WALLET_REQUEST"') ||
        plainText.includes('"type":"WALLET_RESPONSE"') ||
        plainText.includes('"type":"CALL_OFFER"') ||
        plainText.includes('"type":"CALL_ACCEPTED"') ||
        plainText.includes('"type":"CALL_REJECTED"') ||
        plainText.includes('"type":"CALL_ENDED"');

      if (!isSystemMessage) {
        console.log("-----------------------------------------");
        console.log("[Phase 4: AES-256 Encryption - Sending Message]");
        console.log(
          `[AES PROOF] Shared Secret Key  : ${secret.substring(0, 20)}...`,
        );
        console.log(
          `[AES PROOF] Original Plaintext : ${plainText.length > 50 ? plainText.substring(0, 50) + "... [TRUNCATED]" : plainText}`,
        );
        console.log(
          `[AES PROOF] Ciphertext Output  : ${cipherText ? cipherText.substring(0, 50) + "... [TRUNCATED]" : "null"}`,
        );
        console.log("[AES PROOF] Transmitting via WebRTC Data Channel...");
        console.log("-----------------------------------------");
      }

      return cipherText;
    },
    [],
  );

  /**
   * Decrypts a ciphertext message using the shared secret established with the peer.
   * @param {string} peerAddress - The address of the sender.
   * @param {string} cipherText - The encrypted message.
   * @returns {string} The decrypted plaintext, or a fallback string if decryption fails.
   */
  const decrypt = useCallback(
    (peerAddress: string, cipherText: string): string => {
      const secret = sharedSecretsRef.current[peerAddress];
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
        return "Decryption Failed";
      }

      // Mute the annoying logs for system-level messages
      const isSystemMessage =
        decrypted.includes('"type":"TYPING"') ||
        decrypted.includes('"type":"WALLET_REQUEST"') ||
        decrypted.includes('"type":"WALLET_RESPONSE"') ||
        decrypted.includes('"type":"CALL_OFFER"') ||
        decrypted.includes('"type":"CALL_ACCEPTED"') ||
        decrypted.includes('"type":"CALL_REJECTED"') ||
        decrypted.includes('"type":"CALL_ENDED"');

      if (!isSystemMessage) {
        console.log("-----------------------------------------");
        console.log("[Phase 4: AES-256 Decryption - Receiving Message]");
        console.log(
          `[AES PROOF] Shared Secret Key : ${secret.substring(0, 20)}...`,
        );
        console.log(
          `[AES PROOF] Received Ciphertext: ${cipherText.length > 50 ? cipherText.substring(0, 50) + "... [TRUNCATED]" : cipherText}`,
        );
        console.log(
          `[AES PROOF] Decrypted Plaintext: ${decrypted.length > 50 ? decrypted.substring(0, 50) + "... [TRUNCATED]" : decrypted}`,
        );
        console.log("-----------------------------------------");
      }

      return decrypted;
    },
    [],
  );

  /**
   * Encrypts data for secure storage in the local IndexedDB.
   * @param {string} plainText - The data to store.
   * @returns {string} The encrypted ciphertext.
   */
  const encryptLocalDB = useCallback(
    (plainText: string): string => {
      const encrypted = encryptAES(plainText, localDbKey);

      // Filter out typing indicators from DB storage logs too, just in case
      if (!plainText.includes('"type":"TYPING"')) {
        console.log(
          `[Data-at-Rest PROOF] Storing encrypted data to IndexedDB. Ciphertext: ${encrypted ? encrypted.substring(0, 30) + "... [TRUNCATED]" : ""}`,
        );
      }

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
    delete sharedSecretsRef.current[peerAddress.toLowerCase()];
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
    hasSecret: (addr: string) => !!sharedSecretsRef.current[addr],
  };
};
