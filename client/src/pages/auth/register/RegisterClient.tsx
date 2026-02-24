import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ethers } from "ethers";
import axios from "axios";
import { useWallet } from "@/hooks/useWallet";
import { useAuth } from "@/hooks/useAuth";
import { useRelay } from "@/hooks/useRelay";
import AuthLayout from "../components/AuthLayout";
import WalletDisplay from "../components/WalletDisplay";
import { RelaySelector, PasswordInput } from "@/components/shared"; // Import PasswordInput

export default function RegisterPage() {
  const navigate = useNavigate();
  const {
    address,
    createAndEncryptWallet,
    loading: walletLoading,
  } = useWallet();
  const { register, login, loading: authLoading, isAuthenticated } = useAuth();
  const { activeRelay, changeRelay, defaultRelays, addCustomRelay } =
    useRelay();

  const [username, setUsername] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [localError, setLocalError] = useState<string>("");
  const [seedPhrase, setSeedPhrase] = useState<string | null>(null);

  const [isChecking, setIsChecking] = useState(false);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  const isLoading = walletLoading || authLoading;

  useEffect(() => {
    if (isAuthenticated && !seedPhrase) navigate("/chat");
  }, [isAuthenticated, navigate, seedPhrase]);

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
        if (error.response && error.response.status === 404)
          setIsAvailable(true);
        else setIsAvailable(null);
      } finally {
        setIsChecking(false);
      }
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [username, activeRelay]);

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLocalError("");

    if (!username.trim() || !password)
      return setLocalError("Username and Password are required.");
    if (password.length < 6)
      return setLocalError("Password must be at least 6 characters.");
    if (isAvailable === false)
      return setLocalError(
        "Username is already taken. Please choose another one.",
      );

    try {
      const { wallet: newWallet, seedPhrase: generatedSeed } =
        await createAndEncryptWallet(password);
      const walletInstance = newWallet as unknown as ethers.Wallet;
      await register(walletInstance, username.trim(), activeRelay);
      await login(walletInstance, activeRelay);
      setSeedPhrase(generatedSeed);
    } catch (err: unknown) {
      setLocalError(
        err instanceof Error ? err.message : "Registration failed.",
      );
    }
  };

  const handleCopyAndProceed = () => {
    if (seedPhrase) {
      navigator.clipboard.writeText(seedPhrase);
      setIsCopied(true);
      setTimeout(() => navigate("/chat"), 1500);
    }
  };

  if (seedPhrase) {
    return (
      <AuthLayout
        title="Save Your Backup Phrase"
        subtitle="This is the ONLY way to recover your account if you lose your device."
      >
        <div className="bg-amber-500/10 border border-amber-500/30 p-6 rounded-2xl mb-6 shadow-inner">
          <p className="text-amber-400 text-sm font-medium mb-5 text-center px-4 leading-relaxed">
            Write down these 12 words in order. Do not share them with anyone!
          </p>
          <div className="grid grid-cols-3 gap-3">
            {seedPhrase.split(" ").map((word, index) => (
              <div
                key={index}
                className="bg-zinc-950 px-3 py-2.5 rounded-xl border border-zinc-800 text-[13px] font-mono text-zinc-200 shadow-sm flex flex-col items-center justify-center relative overflow-hidden group hover:border-indigo-500/50 transition-colors"
              >
                <span className="text-zinc-600 text-[9px] select-none absolute top-1 left-2 font-sans font-bold">
                  {index + 1}
                </span>
                <span className="mt-2">{word}</span>
              </div>
            ))}
          </div>
        </div>
        <button
          onClick={handleCopyAndProceed}
          className={`w-full font-medium py-3.5 px-4 rounded-xl transition-all shadow-lg active:scale-[0.98] flex items-center justify-center gap-2 ${isCopied ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-500/20" : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/20"}`}
        >
          {isCopied ? (
            <>
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              Copied to Clipboard! Proceeding...
            </>
          ) : (
            <>
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"
                />
              </svg>
              Copy & Continue
            </>
          )}
        </button>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Create Identity"
      subtitle="Register and secure your identity locally."
    >
      <WalletDisplay address={address} />

      {localError && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl">
          {localError}
        </div>
      )}

      <form onSubmit={handleRegister} className="space-y-5">
        <div>
          <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-widest mb-2">
            Username
          </label>
          <div className="relative">
            <input
              type="text"
              value={username}
              onChange={(e) =>
                setUsername(
                  e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""),
                )
              }
              placeholder="e.g. Satoshi"
              className={`w-full px-4 py-3 bg-zinc-900 border text-zinc-100 rounded-xl outline-none transition-all placeholder:text-zinc-600 pr-10 shadow-sm ${isChecking ? "border-amber-500/50" : isAvailable === true ? "border-emerald-500/50 focus:ring-1 focus:ring-emerald-500" : isAvailable === false ? "border-red-500/50 focus:ring-1 focus:ring-red-500" : "border-zinc-800 focus:ring-1 focus:ring-indigo-500"}`}
              disabled={isLoading}
            />
            <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
              {isChecking && (
                <span className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></span>
              )}
              {!isChecking && isAvailable === true && (
                <svg
                  className="w-5 h-5 text-emerald-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              )}
              {!isChecking && isAvailable === false && (
                <svg
                  className="w-5 h-5 text-red-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              )}
            </div>
          </div>
          {!isChecking && isAvailable === false && (
            <p className="text-xs text-red-400 mt-2 font-medium">
              Username is already taken!
            </p>
          )}
        </div>

        {/* REFACTORED: Using the shared PasswordInput with custom placeholder */}
        <PasswordInput
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="To secure your private key"
          disabled={isLoading}
        />

        <div className="-mt-1">
          <RelaySelector
            activeRelay={activeRelay}
            defaultRelays={defaultRelays}
            changeRelay={changeRelay}
            addCustomRelay={addCustomRelay}
            size="md"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading || isAvailable === false || isChecking}
          className="w-full mt-6 bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-3.5 px-4 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/20 active:scale-[0.98]"
        >
          {walletLoading
            ? "Encrypting Key..."
            : authLoading
              ? "Registering Identity..."
              : "Create & Encrypt"}
        </button>

        <div className="pt-4 mt-2 border-t border-zinc-800/50 text-center text-sm text-zinc-500">
          Already registered on this device?{" "}
          <Link
            to="/login"
            className="text-indigo-400 hover:text-indigo-300 font-semibold transition-colors"
          >
            Go to Login
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
}
