import { useState, useEffect, FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ethers } from "ethers";
import { useWallet } from "@/hooks/useWallet";
import { useAuth } from "@/hooks/useAuth";
import AuthLayout from "../components/AuthLayout";
import WalletDisplay from "../components/WalletDisplay";

/**
 * 3. Login page component for unlocking wallet and authenticating
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

  const [password, setPassword] = useState<string>("");
  const [localError, setLocalError] = useState<string>("");

  const isLoading = walletLoading || authLoading;

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/chat");
    }
  }, [isAuthenticated, navigate]);

  const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLocalError("");

    if (!password) {
      setLocalError("Password is required to decrypt your identity.");
      return;
    }

    try {
      const unlockedWallet = await decryptWallet(password);

      // Type casting to bypass ethers HDNodeWallet vs Wallet strictness
      await login(unlockedWallet as unknown as ethers.Wallet);

      navigate("/chat");
    } catch (err: unknown) {
      if (err instanceof Error) {
        setLocalError(err.message || "Login failed.");
      } else {
        setLocalError("An unknown error occurred.");
      }
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

        <button
          type="submit"
          disabled={isLoading || !address}
          className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/20"
        >
          {walletLoading
            ? "Decrypting Key..."
            : authLoading
              ? "Authenticating..."
              : "Decrypt & Login"}
        </button>

        <div className="text-center text-sm text-zinc-500 mt-4">
          Want to create a new identity?{" "}
          <Link
            to="/register"
            className="text-indigo-400 hover:text-indigo-300 hover:underline font-medium transition-colors"
          >
            Register Now
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
}
