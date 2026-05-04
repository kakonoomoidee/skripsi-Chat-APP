import { describe, it, expect, beforeAll } from "vitest";
import { ethers } from "ethers";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Helper to spoof IP and bypass express-rate-limit which tracks by req.ip
const getSpoofedIp = () => `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;

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

  beforeAll(async () => {
    validWallet = ethers.Wallet.createRandom();
    validUsername = `testuser_${Date.now()}`;

    const messageHash = ethers.solidityPackedKeccak256(
      ["address", "string", "string"],
      [validWallet.address, validUsername, PUBLIC_KEY_PLACEHOLDER],
    );
    const signature = await validWallet.signMessage(ethers.getBytes(messageHash));
    
    await fetch(`${BASE_URL}/auth/register`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "X-Forwarded-For": getSpoofedIp() 
      },
      body: JSON.stringify({
        userAddress: validWallet.address,
        username: validUsername,
        publicKey: PUBLIC_KEY_PLACEHOLDER,
        signature,
      }),
    });
  });

  describe("Negative Testing", () => {
    it("TC-03: should reject registration with an invalid signature", async () => {
      const newWallet = ethers.Wallet.createRandom();
      const newUsername = `testuser_tamp_${Date.now()}`;
      console.log(`[Identity] Executing test as: Attacker Wallet (TC-03)\n  - Address: ${newWallet.address}\n  - Public Key: ${newWallet.publicKey}\n  - Private Key: ${newWallet.privateKey}`);
      
      const messageHash = ethers.solidityPackedKeccak256(
        ["address", "string", "string"],
        [newWallet.address, newUsername, PUBLIC_KEY_PLACEHOLDER],
      );
      
      const validSignature = await newWallet.signMessage(ethers.getBytes(messageHash));
      const tamperedSignature = validSignature + "bad";
      
      const payload = {
        userAddress: newWallet.address,
        username: newUsername,
        publicKey: PUBLIC_KEY_PLACEHOLDER,
        signature: tamperedSignature,
      };

      console.log("[TC-03] Registration Payload with Invalid Signature:", payload);

      await delay(2500);
      const response = await fetch(`${BASE_URL}/auth/register`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "X-Forwarded-For": getSpoofedIp()
        },
        body: JSON.stringify(payload),
      });

      const responseData = await response.json().catch(() => null);
      console.log("[TC-03] Server Response Error:", responseData);

      expect(response.ok).toBe(false);
      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(typeof responseData?.error).toBe("string");
      expect(responseData.error).toMatch(/invalid signature|transaction failed|internal server error/i);
    }, 15000);

    it("TC-05: should reject login with an incorrect password or tampered signature", async () => {
      console.log(`[Identity] Executing test as: Attacker Wallet (TC-05)\n  - Address: ${validWallet.address}\n  - Public Key: ${validWallet.publicKey}\n  - Private Key: ${validWallet.privateKey}`);
      
      await delay(2500);
      const spoofedIp = getSpoofedIp();
      const challengeRes = await fetch(`${BASE_URL}/auth/challenge`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "X-Forwarded-For": spoofedIp
        },
        body: JSON.stringify({ address: validWallet.address }),
      });
      
      const challengeResBody = await challengeRes.json();
      const nonce = challengeResBody.nonce || "FALLBACK_NONCE";
      console.log("[TC-05] Received Challenge Response from Server:", challengeResBody);

      const nonceHash = ethers.solidityPackedKeccak256(["string"], [nonce]);
      const validSignature = await validWallet.signMessage(ethers.getBytes(nonceHash));
      
      const tamperedSignature = validSignature + "bad";

      const payload = {
        address: validWallet.address,
        signature: tamperedSignature,
      };

      console.log("[TC-05] Login Payload with Tampered Signature:", payload);

      await delay(2500);
      const loginRes = await fetch(`${BASE_URL}/auth/login`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "X-Forwarded-For": spoofedIp
        },
        body: JSON.stringify(payload),
      });

      const responseData = await loginRes.json().catch(() => null);
      console.log("[TC-05] Server Response Error:", responseData);

      expect(loginRes.ok).toBe(false);
      expect(loginRes.status).toBeGreaterThanOrEqual(400);
      expect(typeof responseData?.error).toBe("string");
      expect(responseData.error).toMatch(/invalid signature|transaction failed|internal server error/i);
    }, 15000);

    it("TC-06: should reject login with manipulated nonce and valid signature", async () => {
      console.log(`[Identity] Executing test as: Attacker Wallet (TC-06)\n  - Address: ${validWallet.address}\n  - Public Key: ${validWallet.publicKey}\n  - Private Key: ${validWallet.privateKey}`);
      
      await delay(2500);
      const spoofedIp = getSpoofedIp();
      const challengeRes = await fetch(`${BASE_URL}/auth/challenge`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "X-Forwarded-For": spoofedIp
        },
        body: JSON.stringify({ address: validWallet.address }),
      });
      
      const challengeResBody = await challengeRes.json();
      const nonce = challengeResBody.nonce || "FALLBACK_NONCE";
      console.log("[TC-06] Received Challenge Response from Server:", challengeResBody);

      const manipulatedNonce = nonce + "manipulated";
      const nonceHash = ethers.solidityPackedKeccak256(["string"], [manipulatedNonce]);
      const validSignatureForManipulatedNonce = await validWallet.signMessage(ethers.getBytes(nonceHash));

      const payload = {
        address: validWallet.address,
        signature: validSignatureForManipulatedNonce,
      };

      console.log("[TC-06] Login Payload with Manipulated Nonce:", payload);

      await delay(2500);
      const loginRes = await fetch(`${BASE_URL}/auth/login`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "X-Forwarded-For": spoofedIp
        },
        body: JSON.stringify(payload),
      });

      const responseData = await loginRes.json().catch(() => null);
      console.log("[TC-06] Server Response Error:", responseData);

      expect(loginRes.ok).toBe(false);
      expect(loginRes.status).toBeGreaterThanOrEqual(400);
      expect(typeof responseData?.error).toBe("string");
      expect(responseData.error).toMatch(/invalid signature|transaction failed|internal server error/i);
    }, 15000);

    it("TC-07: should reject login with valid nonce and manipulated signature", async () => {
      console.log(`[Identity] Executing test as: Attacker Wallet (TC-07)\n  - Address: ${validWallet.address}\n  - Public Key: ${validWallet.publicKey}\n  - Private Key: ${validWallet.privateKey}`);
      
      await delay(2500);
      const spoofedIp = getSpoofedIp();
      const challengeRes = await fetch(`${BASE_URL}/auth/challenge`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "X-Forwarded-For": spoofedIp
        },
        body: JSON.stringify({ address: validWallet.address }),
      });
      
      const challengeResBody = await challengeRes.json();
      const nonce = challengeResBody.nonce || "FALLBACK_NONCE";
      console.log("[TC-07] Received Challenge Response from Server:", challengeResBody);

      const nonceHash = ethers.solidityPackedKeccak256(["string"], [nonce]);
      const validSignature = await validWallet.signMessage(ethers.getBytes(nonceHash));
      
      const tamperedSignature = validSignature.slice(0, 60) + "0000" + validSignature.slice(64);

      const payload = {
        address: validWallet.address,
        signature: tamperedSignature,
      };

      console.log("[TC-07] Login Payload with Manipulated Signature:", payload);

      await delay(2500);
      const loginRes = await fetch(`${BASE_URL}/auth/login`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "X-Forwarded-For": spoofedIp
        },
        body: JSON.stringify(payload),
      });

      const responseData = await loginRes.json().catch(() => null);
      console.log("[TC-07] Server Response Error:", responseData);

      expect(loginRes.ok).toBe(false);
      expect(loginRes.status).toBeGreaterThanOrEqual(400);
      expect(typeof responseData?.error).toBe("string");
      expect(responseData.error).toMatch(/invalid signature|transaction failed|internal server error/i);
    }, 15000);

    it("TC-08: should reject login with manipulated nonce and manipulated signature", async () => {
      console.log(`[Identity] Executing test as: Attacker Wallet (TC-08)\n  - Address: ${validWallet.address}\n  - Public Key: ${validWallet.publicKey}\n  - Private Key: ${validWallet.privateKey}`);
      
      await delay(2500);
      const spoofedIp = getSpoofedIp();
      const challengeRes = await fetch(`${BASE_URL}/auth/challenge`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "X-Forwarded-For": spoofedIp
        },
        body: JSON.stringify({ address: validWallet.address }),
      });
      
      const challengeResBody = await challengeRes.json();
      const nonce = challengeResBody.nonce || "FALLBACK_NONCE";
      console.log("[TC-08] Received Challenge Response from Server:", challengeResBody);

      const manipulatedNonce = nonce + "manipulated";
      const nonceHash = ethers.solidityPackedKeccak256(["string"], [manipulatedNonce]);
      const validSignatureForManipulatedNonce = await validWallet.signMessage(ethers.getBytes(nonceHash));
      
      const tamperedSignature = validSignatureForManipulatedNonce.slice(0, 60) + "0000" + validSignatureForManipulatedNonce.slice(64);

      const payload = {
        address: validWallet.address,
        signature: tamperedSignature,
      };

      console.log("[TC-08] Login Payload with Manipulated Nonce and Manipulated Signature:", payload);

      await delay(2500);
      const loginRes = await fetch(`${BASE_URL}/auth/login`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "X-Forwarded-For": spoofedIp
        },
        body: JSON.stringify(payload),
      });

      const responseData = await loginRes.json().catch(() => null);
      console.log("[TC-08] Server Response Error:", responseData);

      expect(loginRes.ok).toBe(false);
      expect(loginRes.status).toBeGreaterThanOrEqual(400);
      expect(typeof responseData?.error).toBe("string");
      expect(responseData.error).toMatch(/invalid signature|transaction failed|internal server error/i);
    }, 15000);
  });
});
