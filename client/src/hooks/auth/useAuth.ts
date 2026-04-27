import { useState, useCallback } from "react";
import { ethers } from "ethers";
import {
  type AuthResponse,
  getApiErrorMessage,
  loginWithSignature,
  registerIdentity,
  requestAuthChallenge,
} from "@/services/api";

const AUTH_TOKEN_KEY = "auth_token";
const LAST_ACTIVITY_KEY = "securep2p_last_activity";
const PUBLIC_KEY_PLACEHOLDER = "PUBKEY_PLACEHOLDER";

type AuthWallet = ethers.Wallet | ethers.HDNodeWallet;

const saveSessionToken = (token: string): void => {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
  localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
};

const clearSessionToken = (): void => {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(LAST_ACTIVITY_KEY);
};

/**
 * Interface representing the hook's return values and methods.
 */
export interface UseAuthReturn {
  token: string | null;
  loading: boolean;
  error: string | null;
  register: (
    wallet: AuthWallet,
    username: string,
    relayUrl: string,
  ) => Promise<AuthResponse>;
  login: (wallet: AuthWallet, relayUrl: string) => Promise<string>;
  logout: () => void;
  isAuthenticated: boolean;
}

/**
 * Custom hook to manage Web3-based authentication state and logic.
 * Handles identity registration, challenge-response login via ECDSA, and session management.
 *
 * @returns {UseAuthReturn} Authentication state and handler functions.
 */
export const useAuth = (): UseAuthReturn => {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(
    localStorage.getItem(AUTH_TOKEN_KEY),
  );

  /**
   * Registers a new decentralized identity via a gasless meta-transaction payload signature.
   *
   * @param {ethers.Wallet} wallet - The user's active wallet instance used for signing.
   * @param {string} username - The chosen alphanumeric username.
   * @param {string} relayUrl - The HTTP URL of the active relay server.
   * @returns {Promise<AuthResponse>} The server's registration response data.
   * @throws {Error} Throws an error if the network request or signing process fails.
   */
  const register = async (
    wallet: AuthWallet,
    username: string,
    relayUrl: string,
  ): Promise<AuthResponse> => {
    setLoading(true);
    setError(null);
    try {
      console.log("=========================================");
      console.log("[AUTH LOG] Phase 1: Registration Initiated");
      console.log(`[AUTH LOG] Target Relay: ${relayUrl}`);
      console.log(`[AUTH LOG] Target Username: ${username}`);
      console.log(`[AUTH LOG] Signer Address: ${wallet.address}`);

      const messageHash = ethers.solidityPackedKeccak256(
        ["address", "string", "string"],
        [wallet.address, username, PUBLIC_KEY_PLACEHOLDER],
      );

      console.log("[AUTH LOG] Constructed Message Hash:", messageHash);

      const signature = await wallet.signMessage(ethers.getBytes(messageHash));

      console.log("[AUTH LOG] ECDSA Signature Generated:", signature);
      console.log("[AUTH LOG] Transmitting payload to relay server...");

      const response = await registerIdentity(relayUrl, {
        userAddress: wallet.address,
        username,
        publicKey: PUBLIC_KEY_PLACEHOLDER,
        signature,
      });

      console.log("[AUTH LOG] Registration Successful. Response:", response);
      console.log("=========================================");

      return response;
    } catch (err: unknown) {
      const msg = getApiErrorMessage(
        err,
        "An unknown error occurred during registration.",
      );
      setError(msg);
      console.error("[AUTH ERROR] Registration Failed:", msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Authenticates a user using a cryptographic challenge-response protocol.
   * Fetches a nonce, signs it locally, and verifies the signature on the server.
   *
   * @param {ethers.Wallet} wallet - The user's active wallet instance used for signing.
   * @param {string} relayUrl - The HTTP URL of the active relay server.
   * @returns {Promise<string>} The generated JSON Web Token (JWT) string upon successful login.
   * @throws {Error} Throws an error if the challenge fetch, signature, or verification fails.
   */
  const login = async (
    wallet: AuthWallet,
    relayUrl: string,
  ): Promise<string> => {
    setLoading(true);
    setError(null);
    try {
      console.log("=========================================");
      console.log("[AUTH LOG] Phase 2: Login Initiated (Challenge-Response)");
      console.log(`[AUTH LOG] Signer Address: ${wallet.address}`);
      console.log(
        `[AUTH LOG] Requesting nonce from: ${relayUrl}/auth/challenge`,
      );

      const { nonce } = await requestAuthChallenge(relayUrl, wallet.address);

      console.log(`[AUTH LOG] Nonce Received: ${nonce}`);

      const nonceHash = ethers.solidityPackedKeccak256(["string"], [nonce]);
      const signature = await wallet.signMessage(ethers.getBytes(nonceHash));

      console.log(
        "[AUTH LOG] Nonce signed successfully. Transmitting signature for verification to relay server ->",
        signature,
      );

      const { token: newToken } = await loginWithSignature(relayUrl, {
        address: wallet.address,
        signature,
      });

      console.log(
        "[AUTH LOG] Server Verification Passed. JWT Token acquired :",
        newToken,
      );
      console.log("=========================================");

      saveSessionToken(newToken);
      setToken(newToken);

      return newToken;
    } catch (err: unknown) {
      const msg = getApiErrorMessage(
        err,
        "An unknown error occurred during login.",
      );
      setError(msg);
      console.error("[AUTH ERROR] Login Failed:", msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Terminates the active session by removing the authentication token from local storage
   * and updating the local state.
   *
   * @returns {void}
   */
  const logout = useCallback((): void => {
    clearSessionToken();
    setToken(null);
    console.log(
      "[AUTH LOG] Session Terminated. Token and activity timestamp removed from local storage.",
    );
  }, []);

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
