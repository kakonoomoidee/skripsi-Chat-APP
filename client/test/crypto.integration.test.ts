import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import {
  generateEphemeralKeys,
  deriveSharedSecret,
  encryptMessage,
  decryptMessage,
} from "../src/utils/crypto/crypto";

/**
 * Integration Test Suite for Cryptographic Utilities (ECDH & AES)
 * Targets: client/src/utils/crypto/crypto.ts
 */
describe("Cryptographic Utilities - ECDH Integration", () => {
  const plainText = "Strictly confidential thesis data";
  let aliceSharedSecret: string;
  let bobSharedSecret: string;
  let validCiphertext: string;

  beforeAll(() => {
    const aliceKeys = generateEphemeralKeys();
    const bobKeys = generateEphemeralKeys();

    const aliceSecret = deriveSharedSecret(
      aliceKeys.signingKey,
      bobKeys.publicKey,
    );
    const bobSecret = deriveSharedSecret(
      bobKeys.signingKey,
      aliceKeys.publicKey,
    );

    if (aliceSecret && bobSecret) {
      aliceSharedSecret = aliceSecret;
      bobSharedSecret = bobSecret;
    }

    console.log("[Setup] Alice Public Key:", aliceKeys.publicKey);
    console.log("[Setup] Bob Public Key:", bobKeys.publicKey);
    console.log("[Setup] Alice Shared Secret:", aliceSharedSecret);
    console.log("[Setup] Bob Shared Secret:", bobSharedSecret);

    expect(aliceSharedSecret).toBeDefined();
    expect(bobSharedSecret).toBeDefined();
    expect(aliceSharedSecret).toStrictEqual(bobSharedSecret);
  });

  describe("Positive Testing", () => {
    it("TC-10: should successfully encrypt a text message", () => {
      const result = encryptMessage(plainText, aliceSharedSecret);

      console.log("[TC-10] Plaintext Input:", plainText);
      console.log("[TC-10] Alice Shared Secret:", aliceSharedSecret);
      console.log("[TC-10] Encryption Result (Ciphertext):", result);

      expect(result).toBeTruthy();
      expect(result).not.toBe(plainText);
      expect(typeof result).toBe("string");

      validCiphertext = result as string;
    });

    it("TC-11: should successfully decrypt a message on the receiver side", () => {
      const result = decryptMessage(validCiphertext, bobSharedSecret);

      console.log("[TC-11] Valid Ciphertext Input:", validCiphertext);
      console.log("[TC-11] Bob Shared Secret:", bobSharedSecret);
      console.log("[TC-11] Decryption Result (Plaintext):", result);

      expect(result).toBe(plainText);
    });
  });

  describe("Negative Testing", () => {
    let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
    let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

    beforeAll(() => {
      consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    });

    afterAll(() => {
      consoleErrorSpy.mockRestore();
      consoleWarnSpy.mockRestore();
    });

    it("TC-12: should fail decryption with an incorrect or tampered shared secret", () => {
      const charlieKeys = generateEphemeralKeys();
      const charlieSecret = deriveSharedSecret(
        charlieKeys.signingKey,
        charlieKeys.publicKey,
      );
      const wrongSharedSecret = charlieSecret as string;

      const result = decryptMessage(validCiphertext, wrongSharedSecret);

      console.log(
        "[TC-12] Charlie Generated Shared Secret:",
        wrongSharedSecret,
      );
      console.log("[TC-12] Decryption Result:", result);

      expect(["[DECRYPTION_FAILED]", "[ERROR_DECRYPTION_EXCEPTION]"]).toContain(
        result,
      );
    });

    it("TC-13: should fail decryption of a tampered message", () => {
      const tamperedCiphertext =
        validCiphertext.slice(0, Math.floor(validCiphertext.length / 2)) +
        "X" +
        validCiphertext.slice(Math.floor(validCiphertext.length / 2) + 1);

      const result = decryptMessage(tamperedCiphertext, bobSharedSecret);

      console.log("[TC-13] Tampered Ciphertext:", tamperedCiphertext);
      console.log("[TC-13] Decryption Result:", result);

      expect(["[DECRYPTION_FAILED]", "[ERROR_DECRYPTION_EXCEPTION]"]).toContain(
        result,
      );
    });
  });
});
