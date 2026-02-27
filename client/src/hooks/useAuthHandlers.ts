import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ethers } from "ethers";
import { useWallet } from "@/hooks/useWallet";
import { useAuth } from "@/hooks/useAuth";
import { useRelay } from "@/hooks/useRelay";
import { useUIStore } from "@/store";

/**
 * Custom hook to encapsulate authentication logic (Login, Register, Import)
 * Separates business logic from UI components.
 */
export const useAuthHandlers = () => {
  const navigate = useNavigate();
  // REFACTORED: Ambil 'loading' dan alias jadi 'walletLoading' biar nggak bentrok
  const { decryptWallet, loading: walletLoading } = useWallet();
  // REFACTORED: Ambil 'loading' dan alias jadi 'authLoading'
  const { login, loading: authLoading } = useAuth();

  const { activeRelay } = useRelay();
  const { showToast } = useUIStore();

  const [password, setPassword] = useState("");

  const isLoading = walletLoading || authLoading;

  /**
   * Handles the login process: decrypts wallet and authenticates
   */
  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!password) {
      showToast("Password is required to decrypt your identity.", "error");
      return;
    }

    try {
      // 1. Decrypt Wallet (This might throw if password is wrong)
      const unlockedWallet = await decryptWallet(password);

      // 2. Authenticate with server
      await login(unlockedWallet as unknown as ethers.Wallet, activeRelay);

      // 3. Success! Move to chat
      navigate("/chat");
    } catch (err: unknown) {
      // Tembak error pake Toast
      const errorMsg =
        err instanceof Error
          ? err.message
          : "Login failed. Check your password.";
      showToast(errorMsg, "error");
      setPassword(""); // Kosongin password biar user ngetik ulang
    }
  };

  return {
    password,
    setPassword,
    isLoading,
    walletLoading,
    authLoading,
    handleLogin,
  };
};
