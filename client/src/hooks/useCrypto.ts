import { useState, useCallback } from "react";
import {
  generateEphemeralKeys,
  deriveSharedSecret,
  encryptMessage as encryptAES,
  decryptMessage as decryptAES,
} from "@/utils/crypto";

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

  const [localDbKey] = useState(() => {
    let key = localStorage.getItem("securep2p_local_db_key");
    if (!key) {
      const array = new Uint8Array(32);
      window.crypto.getRandomValues(array);
      key = Array.from(array, (byte) =>
        byte.toString(16).padStart(2, "0"),
      ).join("");
      localStorage.setItem("securep2p_local_db_key", key);
    }
    return key;
  });

  const computeSecret = useCallback(
    (peerAddress: string, peerPublicKey: string) => {
      if (!ephemeralKeyPair) return;
      const secret = deriveSharedSecret(
        ephemeralKeyPair.signingKey,
        peerPublicKey,
      );
      if (secret) {
        setSharedSecrets((prev) => ({ ...prev, [peerAddress]: secret }));
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

  const removeSecret = useCallback((peerAddress: string) => {
    setSharedSecrets((prev) => {
      const next = { ...prev };
      delete next[peerAddress.toLowerCase()];
      return next;
    });
  }, []);

  return {
    ephemeralPublicKey: ephemeralKeyPair?.publicKey,
    computeSecret,
    encrypt,
    decrypt,
    encryptLocalDB,
    decryptLocalDB,
    removeSecret,
    hasSecret: (addr: string) => !!sharedSecrets[addr],
  };
};
