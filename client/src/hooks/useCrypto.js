import { useState, useCallback } from "react";
import {
  generateEphemeralKeys,
  deriveSharedSecret,
  encryptMessage as encryptAES,
  decryptMessage as decryptAES,
} from "../utils/crypto";

export const useCrypto = () => {
  const [ephemeralKeyPair] = useState(() => {
    const keys = generateEphemeralKeys();
    console.log("[CryptoHook] Ephemeral Keys Ready");
    return keys;
  });

  const [sharedSecrets, setSharedSecrets] = useState({});

  // 1. Compute Secret
  const computeSecret = useCallback(
    (peerAddress, peerPublicKey) => {
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

  // 2. Encrypt
  const encrypt = useCallback(
    (peerAddress, plainText) => {
      const secret = sharedSecrets[peerAddress];
      if (!secret) throw new Error("Handshake required!");

      return encryptAES(plainText, secret);
    },
    [sharedSecrets],
  );

  // 3. Decrypt
  const decrypt = useCallback(
    (peerAddress, cipherText) => {
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
    hasSecret: (addr) => !!sharedSecrets[addr],
  };
};