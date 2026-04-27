import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ethers } from "ethers";
import axios, { AxiosError } from "axios";
import ms from "ms";
import { useWallet } from "@/hooks/security/useWallet";
import { useAuth } from "@/hooks/auth/useAuth";
import { useRelay } from "@/hooks/network/useRelay";
import { useUIStore } from "@/store";

const USERNAME_CHECK_DEBOUNCE_MS = ms("500ms");
const REQUIRED_SEED_WORD_COUNT = 12;
const MIN_PASSWORD_LENGTH = 6;

type AuthWallet = ethers.Wallet | ethers.HDNodeWallet;

const getErrorMessage = (error: unknown, fallback: string): string => {
  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
};

const getPasswordValidationError = (
  password: string,
  confirmPassword: string,
): string | null => {
  if (!password) {
    return "Username and Password are required.";
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    return "Password must be at least 6 characters.";
  }

  if (password !== confirmPassword) {
    return "Passwords do not match.";
  }

  return null;
};

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

      await login(unlockedWallet as AuthWallet, activeRelay);
      navigate("/chat");
    } catch (err: unknown) {
      const errorMsg = getErrorMessage(
        err,
        "Login failed. Check your password.",
      );
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
export const useRegisterHandler = (activeRelay: string) => {
  const { createAndEncryptWallet, loading: walletLoading } = useWallet();
  const { login, register, loading: authLoading } = useAuth();
  const { showToast } = useUIStore();

  const [username, setUsername] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [seedPhrase, setSeedPhrase] = useState<string | null>(null);

  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);

  const isLoading = walletLoading || authLoading;

  useEffect(() => {
    const normalizedUsername = username.trim();

    if (!normalizedUsername || !activeRelay) {
      setIsAvailable(null);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setIsChecking(true);
      try {
        await axios.get(`${activeRelay}/auth/address/${normalizedUsername}`);
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
    }, USERNAME_CHECK_DEBOUNCE_MS);

    return () => clearTimeout(delayDebounceFn);
  }, [username, activeRelay]);

  /**
   * Validates inputs, creates a new wallet, registers on the server, and establishes a session.
   * @param {React.FormEvent<HTMLFormElement>} e - Form submission event.
   */
  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const normalizedUsername = username.trim();

    if (!normalizedUsername)
      return showToast("Username and Password are required.", "error");
    const passwordError = getPasswordValidationError(password, confirmPassword);
    if (passwordError) return showToast(passwordError, "error");
    if (isAvailable === false)
      return showToast("Username is already taken.", "error");
    if (!activeRelay) return showToast("No active relay selected.", "error");

    try {
      console.log("[Auth] Executing registration flow...");
      const { wallet: newWallet, seedPhrase: generatedSeed } =
        await createAndEncryptWallet(password);
      const walletInstance = newWallet as AuthWallet;

      await register(walletInstance, normalizedUsername, activeRelay);
      await login(walletInstance, activeRelay);

      setSeedPhrase(generatedSeed);
    } catch (err: unknown) {
      const errorMsg = getErrorMessage(err, "Registration failed.");
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
export const useImportHandler = (activeRelay: string) => {
  const navigate = useNavigate();
  const { importAndEncryptWallet, loading: walletLoading } = useWallet();
  const { login, loading: authLoading } = useAuth();
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
    if (
      !cleanSeed ||
      cleanSeed.split(/\s+/).length !== REQUIRED_SEED_WORD_COUNT
    )
      return showToast("Invalid! Must be exactly 12 words.", "error");
    if (!password)
      return showToast(
        "Please set a password to encrypt your local identity.",
        "error",
      );
    if (password.length < MIN_PASSWORD_LENGTH)
      return showToast("Password must be at least 6 characters.", "error");
    if (password !== confirmPassword)
      return showToast("Passwords do not match.", "error");
    if (!activeRelay) return showToast("No active relay selected.", "error");

    try {
      console.log("[Auth] Executing import flow...");
      const importedWallet = await importAndEncryptWallet(cleanSeed, password);
      await login(importedWallet as AuthWallet, activeRelay);

      showToast("Identity imported securely!", "success");
      navigate("/chat");
    } catch (err: unknown) {
      const errorMsg = getErrorMessage(err, "Failed to import identity.");
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
