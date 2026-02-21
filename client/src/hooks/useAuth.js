import { useState } from "react";
import axios from "axios";
import { ethers } from "ethers";

// Ganti sesuai URL Relay Server (cek .env backend)
const API_URL = import.meta.env.VITE_API_URL;

export const useAuth = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("auth_token"));

  // 1. Register (Gasless)
  const register = async (wallet, username) => {
    setLoading(true);
    setError(null);
    try {
      // Create hash like the smart contract does
      // abi.encodePacked(user, username, publicKey)
      const messageHash = ethers.solidityPackedKeccak256(
        ["address", "string", "string"],
        [wallet.address, username, "PUBKEY_PLACEHOLDER"], // Kita pake Pubkey placeholder dulu karena ECDH pake session key
      );

      // Sign the hash (Bytes)
      const signature = await wallet.signMessage(ethers.getBytes(messageHash));

      const response = await axios.post(`${API_URL}/auth/register`, {
        userAddress: wallet.address,
        username,
        publicKey: "PUBKEY_PLACEHOLDER",
        signature,
      });

      return response.data;
    } catch (err) {
      const msg = err.response?.data?.error || err.message;
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  };

  // 2. Login (Challenge-Response)
  const login = async (wallet) => {
    setLoading(true);
    setError(null);
    try {
      // Step A: Request Nonce
      const resNonce = await axios.post(`${API_URL}/auth/challenge`, {
        address: wallet.address,
      });
      const { nonce } = resNonce.data;

      // Step B: Sign Nonce
      const nonceHash = ethers.solidityPackedKeccak256(["string"], [nonce]);
      const signature = await wallet.signMessage(ethers.getBytes(nonceHash));

      // Step C: Verify & Get Token
      const resLogin = await axios.post(`${API_URL}/auth/login`, {
        address: wallet.address,
        signature,
      });

      const { token: newToken } = resLogin.data;

      // Save Token
      localStorage.setItem("auth_token", newToken);
      setToken(newToken);

      return newToken;
    } catch (err) {
      const msg = err.response?.data?.error || err.message;
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  };

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
