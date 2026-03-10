import { useState } from "react";
import axios from "axios";
import { ethers } from "ethers";

/**
 * Custom hook to manage Web3 authentication state and logic.
 * @returns Auth state and methods (register, login, logout).
 */
export const useAuth = () => {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(
    localStorage.getItem("auth_token"),
  );

  /**
   * Registers a new user via gasless meta-transaction by signing a payload.
   * @param {ethers.Wallet} wallet - The user's wallet instance.
   * @param {string} username - The chosen username.
   * @param {string} relayUrl - The active relay server URL.
   * @returns {Promise<any>} The server response data.
   */
  const register = async (
    wallet: ethers.Wallet,
    username: string,
    relayUrl: string,
  ) => {
    setLoading(true);
    setError(null);
    try {
      // --- Registration & Local Wallet Generation ---
      console.log("=========================================");
      console.log("[Phase 1: Registration & Local Wallet Generation]");
      console.log("[SSI PROOF] Public Key (Address):", wallet.address);
      console.log(
        "[SSI PROOF] Private Key (Remains Local):",
        wallet.privateKey,
      );

      const messageHash = ethers.solidityPackedKeccak256(
        ["address", "string", "string"],
        [wallet.address, username, "PUBKEY_PLACEHOLDER"],
      );
      console.log("[ECDSA PROOF] Registration Message Hash:", messageHash);

      const signature = await wallet.signMessage(ethers.getBytes(messageHash));
      console.log("[ECDSA PROOF] Digital Signature:", signature);
      console.log(
        "Transmitting data (excluding Private Key) to Smart Contract / Server...",
      );
      console.log("=========================================");
      // ----------------------------------------------

      const response = await axios.post(`${relayUrl}/auth/register`, {
        userAddress: wallet.address,
        username,
        publicKey: "PUBKEY_PLACEHOLDER",
        signature,
      });

      console.log("[REGISTRATION SUCCESS] Server response:", response.data);
      return response.data;
    } catch (err: unknown) {
      let msg = "An unknown error occurred";
      if (axios.isAxiosError(err)) {
        msg = err.response?.data?.error || err.message;
      } else if (err instanceof Error) {
        msg = err.message;
      }
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Authenticates a user using a cryptographic challenge-response mechanism.
   * @param {ethers.Wallet} wallet - The user's wallet instance.
   * @param {string} relayUrl - The active relay server URL.
   * @returns {Promise<string>} The generated JWT token.
   */
  const login = async (wallet: ethers.Wallet, relayUrl: string) => {
    setLoading(true);
    setError(null);
    try {
      console.log("=========================================");
      console.log("[Phase 2: Challenge-Response Authentication (Login)]");
      console.log(
        "Requesting Challenge from server for address:",
        wallet.address,
      );

      const resNonce = await axios.post(`${relayUrl}/auth/challenge`, {
        address: wallet.address,
      });
      const { nonce } = resNonce.data;

      // --- (CHALLENGE-RESPONSE) ---
      console.log("[SSI PROOF] Challenge (Nonce) received from server:", nonce);

      const nonceHash = ethers.solidityPackedKeccak256(["string"], [nonce]);
      console.log("[ECDSA PROOF] Hashing Nonce:", nonceHash);

      const signature = await wallet.signMessage(ethers.getBytes(nonceHash));
      console.log(
        "[ECDSA PROOF] Response: Digital Signature of Nonce:",
        signature,
      );
      console.log(
        "Sending Signature back to server for verification (ecrecover)...",
      );
      console.log("=========================================");
      // ----------------------------------------------

      const resLogin = await axios.post(`${relayUrl}/auth/login`, {
        address: wallet.address,
        signature,
      });

      const { token: newToken } = resLogin.data;
      console.log(
        "[LOGIN SUCCESS] Verification successful, JWT Token received!",
      );

      localStorage.setItem("auth_token", newToken);
      setToken(newToken);

      return newToken;
    } catch (err: unknown) {
      let msg = "An unknown error occurred";
      if (axios.isAxiosError(err)) {
        msg = err.response?.data?.error || err.message;
      } else if (err instanceof Error) {
        msg = err.message;
      }
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Clears the authentication token from local storage to log the user out.
   */
  const logout = () => {
    localStorage.removeItem("auth_token");
    setToken(null);
    console.log("[LOGOUT] Session cleared from local storage.");
  };

  return {
    token,
    loading,
    error,
    register,
    login,
    logout,
    isAuthenticated: !!token,
  };
};
