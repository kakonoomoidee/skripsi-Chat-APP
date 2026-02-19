import { ethers } from "ethers";
import CryptoJS from "crypto-js";

/**
 * 1. Generate Pasangan Kunci Sementara (Ephemeral Key)
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
 * 2. Hitung Shared Secret (ECDH)
 * Menggabungkan Private Key Kita + Public Key Lawan = Rahasia Bersama
 */
export const deriveSharedSecret = (mySigningKey, peerPublicKey) => {
  try {
    // ECDH Magic terjadi di sini
    const rawSecret = mySigningKey.computeSharedSecret(peerPublicKey);

    // Hash hasilnya biar jadi format Key AES 256-bit yang valid (32 bytes)
    const aesKey = ethers.sha256(rawSecret);
    return aesKey;
  } catch (error) {
    console.error("ECDH Calculation Failed:", error);
    return null;
  }
};

/**
 * 3. Enkripsi Pesan (AES)
 */
export const encryptMessage = (plainText, secretKey) => {
  if (!plainText || !secretKey) return null;
  const encrypted = CryptoJS.AES.encrypt(plainText, secretKey).toString();
  return encrypted;
};

/**
 * 4. Dekripsi Pesan (AES)
 */
export const decryptMessage = (cipherText, secretKey) => {
  if (!cipherText || !secretKey) return null;
  try {
    const bytes = CryptoJS.AES.decrypt(cipherText, secretKey);
    const originalText = bytes.toString(CryptoJS.enc.Utf8);

    // Validasi kalau hasil decrypt kosong (berarti key salah/corrupt)
    if (!originalText) return "[DECRYPTION FAILED]";

    return originalText;
  } catch (error) {
    console.error("Decryption Failed:", error);
    return "[ERROR]";
  }
};
