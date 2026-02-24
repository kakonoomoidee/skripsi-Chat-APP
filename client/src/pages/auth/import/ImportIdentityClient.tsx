import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ethers } from "ethers";
import { useWallet } from "@/hooks/useWallet";
import { useAuth } from "@/hooks/useAuth";
import { useRelay } from "@/hooks/useRelay";
import AuthLayout from "../components/AuthLayout";
import WalletDisplay from "../components/WalletDisplay";
import { RelaySelector, PasswordInput } from "@/components/shared"; // Import PasswordInput

export default function ImportIdentityClient() {
  const navigate = useNavigate();
  const {
    address,
    importAndEncryptWallet,
    loading: walletLoading,
  } = useWallet();
  const { login, loading: authLoading } = useAuth();
  const { activeRelay, changeRelay, defaultRelays, addCustomRelay } =
    useRelay();

  const [seedPhrase, setSeedPhrase] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [localError, setLocalError] = useState<string>("");

  const isLoading = walletLoading || authLoading;

  const handleImport = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLocalError("");

    if (!seedPhrase.trim() || !password)
      return setLocalError("Seed Phrase and new Password are required.");
    if (seedPhrase.trim().split(/\s+/).length !== 12)
      return setLocalError("Seed Phrase must be exactly 12 words.");
    if (password.length < 6)
      return setLocalError("Password must be at least 6 characters.");

    try {
      const recoveredWallet = await importAndEncryptWallet(
        seedPhrase.trim(),
        password,
      );
      const walletInstance = recoveredWallet as unknown as ethers.Wallet;
      await login(walletInstance, activeRelay);
      navigate("/chat");
    } catch (err: unknown) {
      setLocalError(
        err instanceof Error ? err.message : "Failed to import identity.",
      );
    }
  };

  return (
    <AuthLayout
      title="Recover Identity"
      subtitle="Import your 12-word seed phrase to restore access."
    >
      <WalletDisplay address={address} />

      {localError && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl">
          {localError}
        </div>
      )}

      <form onSubmit={handleImport} className="space-y-5">
        <div>
          <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-widest mb-2">
            12-Word Seed Phrase
          </label>
          <textarea
            value={seedPhrase}
            onChange={(e) => setSeedPhrase(e.target.value)}
            placeholder="e.g. engage strong senior reason faith renew wrap salmon edge actual right side"
            rows={3}
            className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 text-zinc-100 rounded-xl focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all placeholder:text-zinc-600 resize-none font-mono text-sm shadow-sm"
            disabled={isLoading}
          />
        </div>

        {/* REFACTORED: Using the shared PasswordInput with override props */}
        <PasswordInput
          label="New Encryption Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="To secure your keystore on this device"
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
          disabled={isLoading}
          className="w-full mt-6 bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-3.5 px-4 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/20 active:scale-[0.98]"
        >
          {walletLoading
            ? "Recovering Key..."
            : authLoading
              ? "Authenticating Handshake..."
              : "Import & Login"}
        </button>

        <div className="text-center text-sm text-zinc-500 pt-4 mt-2 border-t border-zinc-800/50">
          Remembered your password?{" "}
          <Link
            to="/login"
            className="text-indigo-400 hover:text-indigo-300 font-semibold transition-colors"
          >
            Back to Login
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
}
