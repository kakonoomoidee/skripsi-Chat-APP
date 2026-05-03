import { describe, it, expect, beforeAll } from "vitest";
import { ethers } from "ethers";

/**
 * Integration Test Suite for Authentication (Registration & Login)
 * Target: client/src/services/api/authService.ts
 * Environment: http://127.0.0.1:3001
 */
describe("Authentication API Integration", () => {
  const BASE_URL = "http://127.0.0.1:3001";
  const PUBLIC_KEY_PLACEHOLDER = "PUBKEY_PLACEHOLDER";
  
  let validWallet: ethers.HDNodeWallet;
  let validUsername: string;

  beforeAll(() => {
    validWallet = ethers.Wallet.createRandom();
    validUsername = `testuser_${Date.now()}`;
  });

  describe("Positive Testing", () => {
    it("TC-01: should register a new identity with valid data", async () => {
      const messageHash = ethers.solidityPackedKeccak256(
        ["address", "string", "string"],
        [validWallet.address, validUsername, PUBLIC_KEY_PLACEHOLDER],
      );
      
      const signature = await validWallet.signMessage(ethers.getBytes(messageHash));
      
      const payload = {
        userAddress: validWallet.address,
        username: validUsername,
        publicKey: PUBLIC_KEY_PLACEHOLDER,
        signature,
      };

      console.log("[TC-01] Registration Payload:", payload);

      const response = await fetch(`${BASE_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const responseData = await response.json();
      console.log("[TC-01] Server Response:", responseData);

      expect(response.ok).toBe(true);
      expect(response.status).toBeGreaterThanOrEqual(200);
      expect(response.status).toBeLessThan(300);
      if (responseData.success !== undefined) {
        expect(responseData.success).toBe(true);
      }
    });

    it("TC-04: should login successfully with correct credentials", async () => {
      const challengeRes = await fetch(`${BASE_URL}/auth/challenge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: validWallet.address }),
      });
      
      const { nonce } = await challengeRes.json();
      console.log("[TC-04] Received Nonce from Server:", nonce);

      const nonceHash = ethers.solidityPackedKeccak256(["string"], [nonce]);
      const signature = await validWallet.signMessage(ethers.getBytes(nonceHash));

      const payload = {
        address: validWallet.address,
        signature,
      };

      console.log("[TC-04] Login Payload:", payload);

      const loginRes = await fetch(`${BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const responseData = await loginRes.json();
      console.log("[TC-04] Server Response:", responseData);

      expect(loginRes.ok).toBe(true);
      expect(loginRes.status).toBeGreaterThanOrEqual(200);
      expect(loginRes.status).toBeLessThan(300);
      expect(responseData).toHaveProperty("token");
    });
  });

  describe("Negative Testing", () => {
    it("TC-02: should reject registration with a duplicate username", async () => {
      const duplicateWallet = ethers.Wallet.createRandom();
      
      const messageHash = ethers.solidityPackedKeccak256(
        ["address", "string", "string"],
        [duplicateWallet.address, validUsername, PUBLIC_KEY_PLACEHOLDER],
      );
      
      const signature = await duplicateWallet.signMessage(ethers.getBytes(messageHash));
      
      const payload = {
        userAddress: duplicateWallet.address,
        username: validUsername,
        publicKey: PUBLIC_KEY_PLACEHOLDER,
        signature,
      };

      console.log("[TC-02] Duplicate Registration Payload:", payload);

      const response = await fetch(`${BASE_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const responseData = await response.json().catch(() => null);
      console.log("[TC-02] Server Response Error:", responseData);

      expect(response.ok).toBe(false);
      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(responseData).toBeDefined();
    });

    it("TC-03: should reject registration with a tampered signature", async () => {
      const newWallet = ethers.Wallet.createRandom();
      const newUsername = `testuser_tamp_${Date.now()}`;
      
      const messageHash = ethers.solidityPackedKeccak256(
        ["address", "string", "string"],
        [newWallet.address, newUsername, PUBLIC_KEY_PLACEHOLDER],
      );
      
      const validSignature = await newWallet.signMessage(ethers.getBytes(messageHash));
      const tamperedSignature = validSignature + "hackme";
      
      const payload = {
        userAddress: newWallet.address,
        username: newUsername,
        publicKey: PUBLIC_KEY_PLACEHOLDER,
        signature: tamperedSignature,
      };

      console.log("[TC-03] Registration Payload with Tampered Signature:", payload);

      const response = await fetch(`${BASE_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const responseData = await response.json().catch(() => null);
      console.log("[TC-03] Server Response Error:", responseData);

      expect(response.ok).toBe(false);
      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(responseData).toBeDefined();
    });

    it("TC-05: should reject login with an incorrect password or tampered signature", async () => {
      const challengeRes = await fetch(`${BASE_URL}/auth/challenge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: validWallet.address }),
      });
      
      const { nonce } = await challengeRes.json();
      console.log("[TC-05] Received Nonce from Server:", nonce);

      const nonceHash = ethers.solidityPackedKeccak256(["string"], [nonce]);
      const validSignature = await validWallet.signMessage(ethers.getBytes(nonceHash));
      
      const tamperedSignature = validSignature + "bad";

      const payload = {
        address: validWallet.address,
        signature: tamperedSignature,
      };

      console.log("[TC-05] Login Payload with Tampered Signature:", payload);

      const loginRes = await fetch(`${BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const responseData = await loginRes.json().catch(() => null);
      console.log("[TC-05] Server Response Error:", responseData);

      expect(loginRes.ok).toBe(false);
      expect(loginRes.status).toBeGreaterThanOrEqual(400);
      expect(responseData).toBeDefined();
    });
  });
});
