import { ethers } from "ethers";
import CryptoJS from "crypto-js";

/**
 * Generates a new pair of ephemeral cryptographic keys using standard secp256k1.
 * @returns {{ privateKey: string, publicKey: string, signingKey: ethers.SigningKey }} The ephemeral key pair.
 */
export const generateEphemeralKeys = () => {
  console.log(
    "[Crypto Engine] Generating new ephemeral key pair (secp256k1)...",
  );
  const wallet = ethers.Wallet.createRandom();

  return {
    privateKey: wallet.privateKey,
    publicKey: wallet.publicKey,
    signingKey: wallet.signingKey,
  };
};

/**
 * Computes the Shared Secret using Elliptic Curve Diffie-Hellman (ECDH) and hashes it.
 * @param {ethers.SigningKey} mySigningKey - The local ephemeral private signing key.
 * @param {string} peerPublicKey - The peer's ephemeral public key.
 * @returns {string | null} The SHA-256 hashed shared secret for AES encryption, or null if computation fails.
 */
export const deriveSharedSecret = (
  mySigningKey: ethers.SigningKey,
  peerPublicKey: string,
): string | null => {
  try {
    console.log("[Crypto Engine] Computing ECDH shared secret...");
    const rawSecret = mySigningKey.computeSharedSecret(peerPublicKey);
    console.log(`[Crypto Engine] Raw shared secret: ${rawSecret}`);

    const aesKey = ethers.sha256(rawSecret);
    console.log(
      `[Crypto Engine] ECDH computation and SHA-256 hashing successful. Derived AES key ready for use : ${aesKey}`,
    );

    return aesKey;
  } catch (error: unknown) {
    console.error("[Crypto Engine Error] ECDH Calculation Failed:", error);
    return null;
  }
};

/**
 * Encrypts a plaintext string using AES-256 symmetric encryption.
 * @param {string} plainText - The message to encrypt.
 * @param {string} secretKey - The symmetric AES key (derived shared secret).
 * @returns {string | null} The encrypted ciphertext, or null if inputs are invalid.
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
 * Decrypts an AES-256 encrypted ciphertext back to plaintext.
 * @param {string} cipherText - The encrypted message.
 * @param {string} secretKey - The symmetric AES key (derived shared secret).
 * @returns {string} The decrypted plaintext, or an error placeholder if decryption fails.
 */
export const decryptMessage = (
  cipherText: string,
  secretKey: string,
): string => {
  if (!cipherText || !secretKey) return "[ERROR_INVALID_INPUT]";

  try {
    const bytes = CryptoJS.AES.decrypt(cipherText, secretKey);
    
    let originalText = "";
    try {
      originalText = bytes.toString(CryptoJS.enc.Utf8);
    } catch (utf8Error: unknown) {
      console.warn(
        "[Crypto Engine Warning] UTF-8 decode error (possibly wrong key or corrupted ciphertext):",
        utf8Error,
      );
      return "[DECRYPTION_FAILED]";
    }

    if (!originalText) {
      console.warn(
        "[Crypto Engine Warning] Decryption yielded empty string. Possible wrong key or corrupted ciphertext.",
      );
      return "[DECRYPTION_FAILED]";
    }

    return originalText;
  } catch (error: unknown) {
    console.error(
      "[Crypto Engine Error] Decryption process threw an error:",
      error,
    );
    return "[ERROR_DECRYPTION_EXCEPTION]";
  }
};
