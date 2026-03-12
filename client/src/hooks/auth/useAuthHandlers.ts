import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ethers } from "ethers";
import axios, { AxiosError } from "axios";
import { useWallet } from "@/hooks/security/useWallet";
import { useAuth } from "@/hooks/auth/useAuth";
import { useRelay } from "@/hooks/network/useRelay";
import { useUIStore } from "@/store";

/**
 * ============================================================================
 * 1. LOGIN HANDLER
 * ============================================================================
 */

/**
 * Custom hook to handle the login flow logic and state.
 * @returns {object} Login state and handler function.
 */
export const useLoginHandler = () => {
  const navigate = useNavigate();
  const { decryptWallet, loading: walletLoading } = useWallet();
  const { login, loading: authLoading } = useAuth();
  const { activeRelay } = useRelay();
  const { showToast } = useUIStore();

  const [password, setPassword] = useState<string>("");
  const isLoading = walletLoading || authLoading;

  /**
   * Validates input, decrypts the local wallet, and authenticates with the relay.
   * @param {React.FormEvent<HTMLFormElement>} e - Form submission event.
   */
  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!password) {
      showToast("Password is required to decrypt your identity.", "error");
      return;
    }

    try {
      console.log("[Auth] Executing login flow...");
      const unlockedWallet = await decryptWallet(password);

      await login(unlockedWallet as unknown as ethers.Wallet, activeRelay);
      navigate("/chat");
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error
          ? err.message
          : "Login failed. Check your password.";
      console.error("[Auth Error] Login failed:", errorMsg);
      showToast(errorMsg, "error");
      setPassword("");
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

/**
 * ============================================================================
 * 2. REGISTER HANDLER
 * ============================================================================
 */

/**
 * Custom hook to handle the registration flow, including username availability checks.
 * @returns {object} Registration state and handler function.
 */
export const useRegisterHandler = () => {
  const { createAndEncryptWallet, loading: walletLoading } = useWallet();
  const { login, register, loading: authLoading } = useAuth();
  const { activeRelay } = useRelay();
  const { showToast } = useUIStore();

  const [username, setUsername] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [seedPhrase, setSeedPhrase] = useState<string | null>(null);

  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);

  const isLoading = walletLoading || authLoading;

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
      } catch (error: unknown) {
        if (error instanceof AxiosError && error.response?.status === 404) {
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

  /**
   * Validates inputs, creates a new wallet, registers on the server, and establishes a session.
   * @param {React.FormEvent<HTMLFormElement>} e - Form submission event.
   */
  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!username.trim() || !password)
      return showToast("Username and Password are required.", "error");
    if (password.length < 6)
      return showToast("Password must be at least 6 characters.", "error");
    if (password !== confirmPassword)
      return showToast("Passwords do not match.", "error");
    if (isAvailable === false)
      return showToast("Username is already taken.", "error");

    try {
      console.log("[Auth] Executing registration flow...");
      const { wallet: newWallet, seedPhrase: generatedSeed } =
        await createAndEncryptWallet(password);
      const walletInstance = newWallet as unknown as ethers.Wallet;

      await register(walletInstance, username.trim(), activeRelay);
      await login(walletInstance, activeRelay);

      setSeedPhrase(generatedSeed);
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error ? err.message : "Registration failed.";
      console.error("[Auth Error] Registration failed:", errorMsg);
      showToast(errorMsg, "error");
    }
  };

  return {
    username,
    setUsername,
    password,
    setPassword,
    confirmPassword,
    setConfirmPassword,
    seedPhrase,
    isChecking,
    isAvailable,
    isLoading,
    walletLoading,
    authLoading,
    handleRegister,
  };
};

/**
 * ============================================================================
 * 3. IMPORT HANDLER
 * ============================================================================
 */

/**
 * Custom hook to handle the identity recovery flow via seed phrase.
 * @returns {object} Import state and handler function.
 */
export const useImportHandler = () => {
  const navigate = useNavigate();
  const { importAndEncryptWallet, loading: walletLoading } = useWallet();
  const { login, loading: authLoading } = useAuth();
  const { activeRelay } = useRelay();
  const { showToast } = useUIStore();

  const [seedImport, setSeedImport] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");

  const isLoading = walletLoading || authLoading;

  /**
   * Validates seed phrase and password, imports wallet to local storage, and authenticates.
   * @param {React.FormEvent<HTMLFormElement>} e - Form submission event.
   */
  const handleImport = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const cleanSeed = seedImport.trim();
    if (!cleanSeed || cleanSeed.split(/\s+/).length !== 12)
      return showToast("Invalid! Must be exactly 12 words.", "error");
    if (!password)
      return showToast(
        "Please set a password to encrypt your local identity.",
        "error",
      );
    if (password.length < 6)
      return showToast("Password must be at least 6 characters.", "error");
    if (password !== confirmPassword)
      return showToast("Passwords do not match.", "error");

    try {
      console.log("[Auth] Executing import flow...");
      const importedWallet = await importAndEncryptWallet(cleanSeed, password);
      await login(importedWallet as unknown as ethers.Wallet, activeRelay);

      showToast("Identity imported securely!", "success");
      navigate("/chat");
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error ? err.message : "Failed to import identity.";
      console.error("[Auth Error] Import failed:", errorMsg);
      showToast(errorMsg, "error");
    }
  };

  return {
    seedImport,
    setSeedImport,
    password,
    setPassword,
    confirmPassword,
    setConfirmPassword,
    isLoading,
    walletLoading,
    authLoading,
    handleImport,
  };
};
