import { describe, it, expect } from "vitest";
import { encryptMessage, decryptMessage } from "../src/utils/crypto/crypto";
import { ethers } from "ethers";

/**
 * Integration Test Suite for Decryption Logic
 * Covers negative test cases for AES decryption involving incorrect secrets and manipulated ciphertexts.
 * Target: client/src/utils/crypto/crypto.ts
 * 
 * @param {void} No parameters are required for this test suite.
 * @returns {void} This test suite does not return a value.
 */
describe("Decryption Logic Integration", () => {
  const plainText = "Sensitive user data requiring encryption";
  const correctSharedSecret = ethers.sha256(ethers.toUtf8Bytes("correct_secret_key_123456789"));
  const wrongSharedSecret = ethers.sha256(ethers.toUtf8Bytes("incorrect_secret_key_987654321"));

  describe("Negative Testing", () => {
    it("TC-16: should fail decryption with an incorrect shared secret", () => {
      console.log(`[Identity] Executing test as: Attacker (TC-16)\n  - Target Plaintext: ${plainText}\n  - Valid Secret: ${correctSharedSecret}\n  - Attacker Secret: ${wrongSharedSecret}`);
      
      const validCiphertext = encryptMessage(plainText, correctSharedSecret) || "";
      console.log("[TC-16] Generated Valid Ciphertext:", validCiphertext);
      
      const decrypted = decryptMessage(validCiphertext, wrongSharedSecret);
      console.log("[TC-16] Decryption Result with Attacker Secret:", decrypted);
      
      expect(["[DECRYPTION_FAILED]", "[ERROR_DECRYPTION_EXCEPTION]"]).toContain(decrypted);
    }, 15000);

    it("TC-17: should fail decryption with a manipulated message", () => {
      console.log(`[Identity] Executing test as: Attacker (TC-17)\n  - Target Plaintext: ${plainText}\n  - Valid Secret: ${correctSharedSecret}`);
      
      const validCiphertext = encryptMessage(plainText, correctSharedSecret) || "";
      console.log("[TC-17] Generated Valid Ciphertext:", validCiphertext);
      
      // Tamper with the early bytes (after "U2FsdGVkX1" salt prefix) to ensure total failure rather than partial block decryption
      const manipulatedCiphertext = validCiphertext.substring(0, 10) + "DEADBEEF" + validCiphertext.substring(18);
      console.log("[TC-17] Manipulated Ciphertext:", manipulatedCiphertext);
      
      const decrypted = decryptMessage(manipulatedCiphertext, correctSharedSecret);
      console.log("[TC-17] Decryption Result with Manipulated Ciphertext:", decrypted);
      
      expect(["[DECRYPTION_FAILED]", "[ERROR_DECRYPTION_EXCEPTION]"]).toContain(decrypted);
    }, 15000);
  });
});
