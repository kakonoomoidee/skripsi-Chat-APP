import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ethers } from "ethers";
import { useWallet } from "@/hooks/useWallet";
import { useAuth } from "@/hooks/useAuth";
import { useRelay } from "@/hooks/useRelay";
import AuthLayout from "../components/AuthLayout";
import WalletDisplay from "../components/WalletDisplay";
import { RelaySelector } from "@/components/shared";

export default function LoginPage() {
  const navigate = useNavigate();
  // REFACTORED: resetWallet removed from here
  const { address, decryptWallet, loading: walletLoading } = useWallet();
  const { login, loading: authLoading, isAuthenticated } = useAuth();
  const { activeRelay, changeRelay, defaultRelays, addCustomRelay } =
    useRelay();

  const [password, setPassword] = useState<string>("");
  const [localError, setLocalError] = useState<string>("");

  const isLoading = walletLoading || authLoading;

  useEffect(() => {
    if (isAuthenticated) navigate("/chat");
  }, [isAuthenticated, navigate]);

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
    <AuthLayout
      title="Welcome Back"
      subtitle="Decrypt your local identity to establish a secure connection."
    >
      {/* REFACTORED: Only pass address */}
      <WalletDisplay address={address} />

      {localError && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl mb-4">
          {localError}
        </div>
      )}

      <form onSubmit={handleLogin} className="space-y-5">
        <div>
          <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-widest mb-2">
            Encryption Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 text-zinc-100 rounded-xl focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all placeholder:text-zinc-600 shadow-sm"
            disabled={isLoading || !address}
          />
        </div>

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
          disabled={isLoading || !address}
          className="w-full mt-6 bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-3.5 px-4 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/20 active:scale-[0.98]"
        >
          {walletLoading
            ? "Decrypting Key..."
            : authLoading
              ? "Authenticating Handshake..."
              : "Decrypt & Connect"}
        </button>

        <div className="pt-4 mt-2 border-t border-zinc-800/50 flex flex-col gap-2 text-center text-sm text-zinc-500">
          <div>
            Want to create a new identity?{" "}
            <Link
              to="/register"
              className="text-indigo-400 hover:text-indigo-300 font-semibold transition-colors"
            >
              Register Now
            </Link>
          </div>
          <div>
            Moving to a new device?{" "}
            <Link
              to="/import"
              className="text-indigo-400 hover:text-indigo-300 font-semibold transition-colors"
            >
              Import Backup
            </Link>
          </div>
        </div>
      </form>
    </AuthLayout>
  );
}
