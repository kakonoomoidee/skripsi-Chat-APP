import { useState, useCallback } from "react";
import {
  generateEphemeralKeys,
  deriveSharedSecret,
  encryptMessage as encryptAES,
  decryptMessage as decryptAES,
} from "@/utils/crypto";

/**
 * Custom hook for handling cryptographic operations including ephemeral keys, shared secrets, and AES encryption.
 * @returns {object} { ephemeralPublicKey, computeSecret, encrypt, decrypt, hasSecret, encryptLocalDB, decryptLocalDB }
 */
export const useCrypto = () => {
  const [ephemeralKeyPair] = useState(() => {
    const keys = generateEphemeralKeys();
    console.log("=========================================");
    console.log("[Phase 3: ECDH Key Generation (Local)]");
    console.log(
      "[ECDH PROOF] Ephemeral Private Key generated (Hidden in Memory)",
    );
    console.log("[ECDH PROOF] Ephemeral Public Key generated:", keys.publicKey);
    console.log("=========================================");
    return keys;
  });

  const [sharedSecrets, setSharedSecrets] = useState<Record<string, string>>(
    {},
  );

  // --- JALAN NINJA 2: MASTER KEY LOKAL BUAT INDEXED DB ---
  const [localDbKey] = useState(() => {
    let key = localStorage.getItem("securep2p_local_db_key");
    if (!key) {
      const array = new Uint8Array(32);
      window.crypto.getRandomValues(array);
      key = Array.from(array, (byte) =>
        byte.toString(16).padStart(2, "0"),
      ).join("");
      localStorage.setItem("securep2p_local_db_key", key);
      console.log("=========================================");
      console.log("[Local Database Security]");
      console.log(
        "[DATA AT REST] Master Key Generated for IndexedDB Encryption",
      );
      console.log("=========================================");
    }
    return key;
  });

  const computeSecret = useCallback(
    (peerAddress: string, peerPublicKey: string) => {
      if (!ephemeralKeyPair) return;

      console.log("=========================================");
      console.log("[Phase 3: ECDH Shared Secret Computation]");
      console.log("[ECDH ALGORITHM] Peer Public Key   :", peerPublicKey);
      console.log("[ECDH ALGORITHM] Local Private Key : [SECURE IN MEMORY]");
      console.log(
        "[ECDH ALGORITHM] Executing Elliptic Curve Multiplication...",
      );

      const secret = deriveSharedSecret(
        ephemeralKeyPair.signingKey,
        peerPublicKey,
      );

      if (secret) {
        setSharedSecrets((prev) => ({
          ...prev,
          [peerAddress]: secret,
        }));
        console.log("[ECDH SUCCESS] Shared Secret successfully derived!");
        console.log(
          "[ECDH SUCCESS] Resulting AES-256 Key (Hex):",
          secret.substring(0, 32) + "...",
        );
        console.log("=========================================");
      }
    },
    [ephemeralKeyPair],
  );

  const encrypt = useCallback(
    (peerAddress: string, plainText: string) => {
      const secret = sharedSecrets[peerAddress];
      if (!secret) throw new Error("Handshake required!");
      return encryptAES(plainText, secret);
    },
    [sharedSecrets],
  );

  const decrypt = useCallback(
    (peerAddress: string, cipherText: string) => {
      const secret = sharedSecrets[peerAddress];
      if (!secret) return "Encrypted (Waiting Handshake...)";
      return decryptAES(cipherText, secret);
    },
    [sharedSecrets],
  );

  // --- FUNGSI ENCRYPT & DECRYPT DATABASE LOKAL ---
  const encryptLocalDB = useCallback(
    (plainText: string): string => {
      const encrypted = encryptAES(plainText, localDbKey);
      return encrypted || "";
    },
    [localDbKey],
  );

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

  return {
    ephemeralPublicKey: ephemeralKeyPair?.publicKey,
    computeSecret,
    encrypt,
    decrypt,
    encryptLocalDB,
    decryptLocalDB,
    hasSecret: (addr: string) => !!sharedSecrets[addr],
  };
};
