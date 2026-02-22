import { useState } from "react";
import axios from "axios";
import { ethers } from "ethers";

const API_URL = import.meta.env.VITE_API_URL;

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
   * @returns {Promise<any>} The server response data.
   */
  const register = async (wallet: ethers.Wallet, username: string) => {
    setLoading(true);
    setError(null);
    try {
      const messageHash = ethers.solidityPackedKeccak256(
        ["address", "string", "string"],
        [wallet.address, username, "PUBKEY_PLACEHOLDER"],
      );

      const signature = await wallet.signMessage(ethers.getBytes(messageHash));

      const response = await axios.post(`${API_URL}/auth/register`, {
        userAddress: wallet.address,
        username,
        publicKey: "PUBKEY_PLACEHOLDER",
        signature,
      });

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
   * @returns {Promise<string>} The generated JWT token.
   */
  const login = async (wallet: ethers.Wallet) => {
    setLoading(true);
    setError(null);
    try {
      const resNonce = await axios.post(`${API_URL}/auth/challenge`, {
        address: wallet.address,
      });
      const { nonce } = resNonce.data;

      const nonceHash = ethers.solidityPackedKeccak256(["string"], [nonce]);
      const signature = await wallet.signMessage(ethers.getBytes(nonceHash));

      const resLogin = await axios.post(`${API_URL}/auth/login`, {
        address: wallet.address,
        signature,
      });

      const { token: newToken } = resLogin.data;

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
