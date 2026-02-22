import { useState, useCallback } from "react";
import {
  generateEphemeralKeys,
  deriveSharedSecret,
  encryptMessage as encryptAES,
  decryptMessage as decryptAES,
} from "@/utils/crypto";

/**
 * Custom hook for handling cryptographic operations including ephemeral keys, shared secrets, and AES encryption.
 * @returns {object} { ephemeralPublicKey, computeSecret, encrypt, decrypt, hasSecret }
 */
export const useCrypto = () => {
  const [ephemeralKeyPair] = useState(() => {
    const keys = generateEphemeralKeys();
    console.log("[CryptoHook] Ephemeral Keys Ready");
    return keys;
  });

  const [sharedSecrets, setSharedSecrets] = useState<Record<string, string>>(
    {},
  );

  /**
   * Computes and stores a shared secret using ECDH.
   * @param {string} peerAddress - The wallet address of the peer
   * @param {string} peerPublicKey - The public key of the peer
   * @returns {void}
   */
  const computeSecret = useCallback(
    (peerAddress: string, peerPublicKey: string) => {
      if (!ephemeralKeyPair) return;

      const secret = deriveSharedSecret(
        ephemeralKeyPair.signingKey,
        peerPublicKey,
      );

      if (secret) {
        setSharedSecrets((prev) => ({
          ...prev,
          [peerAddress]: secret,
        }));
        console.log(`[CryptoHook] Secret established with ${peerAddress}`);
      }
    },
    [ephemeralKeyPair],
  );

  /**
   * Encrypts a plaintext message using the stored shared secret.
   * @param {string} peerAddress - The wallet address of the peer
   * @param {string} plainText - The message to encrypt
   * @returns {string | null} The encrypted cipher text
   */
  const encrypt = useCallback(
    (peerAddress: string, plainText: string) => {
      const secret = sharedSecrets[peerAddress];
      if (!secret) throw new Error("Handshake required!");

      return encryptAES(plainText, secret);
    },
    [sharedSecrets],
  );

  /**
   * Decrypts a cipher text message using the stored shared secret.
   * @param {string} peerAddress - The wallet address of the peer
   * @param {string} cipherText - The message to decrypt
   * @returns {string} The decrypted plain text or fallback string
   */
  const decrypt = useCallback(
    (peerAddress: string, cipherText: string) => {
      const secret = sharedSecrets[peerAddress];
      if (!secret) return "Encrypted (Waiting Handshake...)";

      return decryptAES(cipherText, secret);
    },
    [sharedSecrets],
  );

  return {
    ephemeralPublicKey: ephemeralKeyPair?.publicKey,
    computeSecret,
    encrypt,
    decrypt,
    hasSecret: (addr: string) => !!sharedSecrets[addr],
  };
};
