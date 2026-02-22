import { ethers } from "ethers";
import CryptoJS from "crypto-js";

/**
 * 1. Generate pair Ephemeral Keys
 * @returns {object} { privateKey, publicKey, signingKey }
 */
export const generateEphemeralKeys = () => {
  const wallet = ethers.Wallet.createRandom();
  return {
    privateKey: wallet.privateKey,
    publicKey: wallet.publicKey,
    signingKey: wallet.signingKey,
  };
};

/**
 * 2. Count Shared Secret (ECDH)
 * compute between my private key with peer's public key, then hash the result to get a fixed-length AES key
 */
export const deriveSharedSecret = (
  mySigningKey: ethers.SigningKey,
  peerPublicKey: string,
): string | null => {
  try {
    const rawSecret = mySigningKey.computeSharedSecret(peerPublicKey);

    const aesKey = ethers.sha256(rawSecret);
    return aesKey;
  } catch (error: unknown) {
    console.error("ECDH Calculation Failed:", error);
    return null;
  }
};

/**
 * 3. encrypt message with AES using the derived secret key
 */
export const encryptMessage = (
  plainText: string,
  secretKey: string,
): string | null => {
  if (!plainText || !secretKey) return null;
  const encrypted = CryptoJS.AES.encrypt(plainText, secretKey).toString();
  return encrypted;
};

/**
 * 4. decrypt message with AES using the derived secret key
 */
export const decryptMessage = (
  cipherText: string,
  secretKey: string,
): string => {
  if (!cipherText || !secretKey) return "[ERROR]";
  try {
    const bytes = CryptoJS.AES.decrypt(cipherText, secretKey);
    const originalText = bytes.toString(CryptoJS.enc.Utf8);

    if (!originalText) return "[DECRYPTION FAILED]";

    return originalText;
  } catch (error: unknown) {
    console.error("Decryption Failed:", error);
    return "[ERROR]";
  }
};
