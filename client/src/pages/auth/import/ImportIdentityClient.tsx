import { useState, FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ethers } from "ethers";
import { useWallet } from "@/hooks/useWallet";
import { useAuth } from "@/hooks/useAuth";
import AuthLayout from "../components/AuthLayout";
import WalletDisplay from "../components/WalletDisplay";

/**
 * 1. Page for importing an existing identity using a 12-word seed phrase
 * @returns {JSX.Element}
 */
export default function ImportIdentityClient() {
  const navigate = useNavigate();
  const {
    address,
    importAndEncryptWallet,
    resetWallet,
    loading: walletLoading,
  } = useWallet();
  const { login, loading: authLoading } = useAuth();

  const [seedPhrase, setSeedPhrase] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [localError, setLocalError] = useState<string>("");

  const isLoading = walletLoading || authLoading;

  const handleImport = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLocalError("");

    if (!seedPhrase.trim() || !password) {
      setLocalError("Seed Phrase and new Password are required.");
      return;
    }

    if (seedPhrase.trim().split(/\s+/).length !== 12) {
      setLocalError("Seed Phrase must be exactly 12 words.");
      return;
    }

    if (password.length < 6) {
      setLocalError("Password must be at least 6 characters.");
      return;
    }

    try {
      const recoveredWallet = await importAndEncryptWallet(
        seedPhrase,
        password,
      );
      const walletInstance = recoveredWallet as unknown as ethers.Wallet;

      // Login ke relay server pake signature dari wallet yang udah direcover
      await login(walletInstance);

      navigate("/chat");
    } catch (err: unknown) {
      if (err instanceof Error) {
        setLocalError(err.message || "Failed to import identity.");
      } else {
        setLocalError("An unknown error occurred.");
      }
    }
  };

  return (
    <AuthLayout
      title="Recover Identity"
      subtitle="Import your 12-word seed phrase to restore access."
    >
      <WalletDisplay address={address} onReset={resetWallet} />

      {localError && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg">
          {localError}
        </div>
      )}

      <form onSubmit={handleImport} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1">
            12-Word Seed Phrase
          </label>
          <textarea
            value={seedPhrase}
            onChange={(e) => setSeedPhrase(e.target.value)}
            placeholder="e.g. engage strong senior reason faith renew wrap salmon edge actual right side"
            rows={3}
            className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 text-zinc-100 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all placeholder:text-zinc-600 resize-none font-mono text-sm"
            disabled={isLoading}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1">
            New Encryption Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="To secure your keystore on this device"
            className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 text-zinc-100 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all placeholder:text-zinc-600"
            disabled={isLoading}
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/20"
        >
          {walletLoading
            ? "Recovering..."
            : authLoading
              ? "Authenticating..."
              : "Import & Login"}
        </button>

        <div className="text-center text-sm text-zinc-500 mt-4">
          Remembered your password?{" "}
          <Link
            to="/login"
            className="text-indigo-400 hover:text-indigo-300 hover:underline font-medium transition-colors"
          >
            Back to Login
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
}
