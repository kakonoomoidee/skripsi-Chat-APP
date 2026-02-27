import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ethers } from "ethers";
import axios from "axios";
import { useWallet } from "@/hooks/useWallet";
import { useAuth } from "@/hooks/useAuth";
import { useRelay } from "@/hooks/useRelay";
import { useUIStore } from "@/store";

export const useAuthHandlers = () => {
  const navigate = useNavigate();
  const {
    decryptWallet,
    createAndEncryptWallet,
    importAndEncryptWallet,
    loading: walletLoading,
  } = useWallet();

  const { login, register, loading: authLoading } = useAuth();
  const { activeRelay } = useRelay();
  const { showToast } = useUIStore();

  // Shared States
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const isLoading = walletLoading || authLoading;

  // --- LOGIN LOGIC ---
  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!password) {
      showToast("Password is required to decrypt your identity.", "error");
      return;
    }
    try {
      const unlockedWallet = await decryptWallet(password);
      await login(unlockedWallet as unknown as ethers.Wallet, activeRelay);
      navigate("/chat");
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error
          ? err.message
          : "Login failed. Check your password.";
      showToast(errorMsg, "error");
      setPassword("");
    }
  };

  // --- REGISTER LOGIC ---
  const [username, setUsername] = useState("");
  const [seedPhrase, setSeedPhrase] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    if (!username.trim()) {
      setIsAvailable(null);
      return;
    }
    const delayDebounceFn = setTimeout(async () => {
      setIsChecking(true);
      try {
        await axios.get(`${activeRelay}/auth/address/${username.trim()}`);
        setIsAvailable(false);
      } catch (error: any) {
        if (error.response && error.response.status === 404) {
          setIsAvailable(true);
        } else {
          setIsAvailable(null);
        }
      } finally {
        setIsChecking(false);
      }
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [username, activeRelay]);

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!username.trim() || !password) {
      return showToast("Username and Password are required.", "error");
    }
    if (password.length < 6) {
      return showToast("Password must be at least 6 characters.", "error");
    }
    if (password !== confirmPassword) {
      return showToast("Passwords do not match.", "error");
    }
    if (isAvailable === false) {
      return showToast("Username is already taken.", "error");
    }

    try {
      const { wallet: newWallet, seedPhrase: generatedSeed } =
        await createAndEncryptWallet(password);
      const walletInstance = newWallet as unknown as ethers.Wallet;
      await register(walletInstance, username.trim(), activeRelay);
      await login(walletInstance, activeRelay);
      setSeedPhrase(generatedSeed);
    } catch (err: unknown) {
      showToast(
        err instanceof Error ? err.message : "Registration failed.",
        "error",
      );
    }
  };

  // --- IMPORT LOGIC ---
  const [seedImport, setSeedImport] = useState("");

  const handleImport = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const cleanSeed = seedImport.trim();
    if (!cleanSeed || cleanSeed.split(/\s+/).length !== 12) {
      return showToast("Invalid! Must be exactly 12 words.", "error");
    }
    if (!password) {
      return showToast(
        "Please set a password to encrypt your local identity.",
        "error",
      );
    }
    if (password.length < 6) {
      return showToast("Password must be at least 6 characters.", "error");
    }
    if (password !== confirmPassword) {
      return showToast("Passwords do not match.", "error");
    }

    try {
      const importedWallet = await importAndEncryptWallet(cleanSeed, password);
      await login(importedWallet as unknown as ethers.Wallet, activeRelay);
      showToast("Identity imported securely!", "success");
      navigate("/chat");
    } catch (err: unknown) {
      showToast(
        err instanceof Error ? err.message : "Failed to import identity.",
        "error",
      );
    }
  };

  return {
    // Shared
    password,
    setPassword,
    confirmPassword,
    setConfirmPassword,
    isLoading,
    walletLoading,
    authLoading,

    // Login
    handleLogin,

    // Register
    username,
    setUsername,
    seedPhrase,
    isChecking,
    isAvailable,
    handleRegister,

    // Import
    seedImport,
    setSeedImport,
    handleImport,
  };
};
