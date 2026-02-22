import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ethers } from "ethers";
import { useWallet } from "@/hooks/useWallet";
import { useAuth } from "@/hooks/useAuth";
import { useRelay } from "@/hooks/useRelay";
import AuthLayout from "../components/AuthLayout";
import WalletDisplay from "../components/WalletDisplay";

/**
 * Main Login component with support for custom infrastructure nodes
 * @returns {JSX.Element}
 */
export default function LoginPage() {
  const navigate = useNavigate();
  const {
    address,
    decryptWallet,
    resetWallet,
    loading: walletLoading,
  } = useWallet();
  const { login, loading: authLoading, isAuthenticated } = useAuth();
  const { activeRelay, changeRelay, defaultRelays, addCustomRelay } =
    useRelay();

  const [password, setPassword] = useState<string>("");
  const [localError, setLocalError] = useState<string>("");

  const isLoading = walletLoading || authLoading;

  useEffect(() => {
    if (isAuthenticated) navigate("/chat");
  }, [isAuthenticated, navigate]);

  /**
   * Decrypt local identity and authenticate via selected relay
   * @param {React.FormEvent<HTMLFormElement>} e - Form submission event
   * @returns {Promise<void>}
   */
  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLocalError("");

    if (!password) {
      setLocalError("Password is required to decrypt your identity.");
      return;
    }

    try {
      const unlockedWallet = await decryptWallet(password);
      await login(unlockedWallet as unknown as ethers.Wallet, activeRelay);
      navigate("/chat");
    } catch (err: unknown) {
      setLocalError(err instanceof Error ? err.message : "Login failed.");
    }
  };

  return (
    <AuthLayout title="Welcome Back" subtitle="Decrypt your identity to login.">
      <WalletDisplay address={address} onReset={resetWallet} />

      {localError && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg">
          {localError}
        </div>
      )}

      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1">
            Encryption Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 text-zinc-100 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all placeholder:text-zinc-600"
            disabled={isLoading || !address}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1">
            Select Network Node
          </label>
          <div className="flex gap-2">
            <select
              value={activeRelay}
              onChange={(e) => changeRelay(e.target.value)}
              disabled={isLoading}
              className="flex-1 w-full px-4 py-3 bg-zinc-950 border border-zinc-800 text-zinc-100 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all cursor-pointer"
            >
              {defaultRelays.map((url: string) => (
                <option key={url} value={url}>
                  {url}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={isLoading}
              onClick={() => {
                const u = prompt(
                  "Enter Custom Relay URL (e.g., http://192.168.1.10:3003):",
                );
                if (u) addCustomRelay(u);
              }}
              className="px-4 bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-indigo-400 rounded-lg transition-colors disabled:opacity-50"
            >
              +
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading || !address}
          className="w-full mt-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/20"
        >
          {walletLoading
            ? "Decrypting Key..."
            : authLoading
              ? "Authenticating..."
              : "Decrypt & Login"}
        </button>

        <div className="text-center text-sm text-zinc-500 mt-4 flex flex-col gap-2">
          <div>
            Want to create a new identity?{" "}
            <Link
              to="/register"
              className="text-indigo-400 hover:text-indigo-300 hover:underline font-medium transition-colors"
            >
              Register Now
            </Link>
          </div>
          <div>
            Moving to a new device?{" "}
            <Link
              to="/import"
              className="text-indigo-400 hover:text-indigo-300 hover:underline font-medium transition-colors"
            >
              Import Identity
            </Link>
          </div>
        </div>
      </form>
    </AuthLayout>
  );
}
