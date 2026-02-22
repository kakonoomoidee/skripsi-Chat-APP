import { useState, useEffect, FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ethers } from "ethers";
import { useWallet } from "@/hooks/useWallet";
import { useAuth } from "@/hooks/useAuth";
import AuthLayout from "../components/AuthLayout";
import WalletDisplay from "../components/WalletDisplay";

/**
 * 4. Registration page for generating burner wallet and registering username
 * @returns {JSX.Element}
 */
export default function RegisterPage() {
  const navigate = useNavigate();
  const {
    address,
    createAndEncryptWallet,
    resetWallet,
    loading: walletLoading,
  } = useWallet();
  const { register, login, loading: authLoading, isAuthenticated } = useAuth();

  const [username, setUsername] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [localError, setLocalError] = useState<string>("");

  const isLoading = walletLoading || authLoading;

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/chat");
    }
  }, [isAuthenticated, navigate]);

  const handleRegister = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLocalError("");

    if (!username.trim() || !password) {
      setLocalError("Username and Password are required.");
      return;
    }

    if (password.length < 6) {
      setLocalError("Password must be at least 6 characters.");
      return;
    }

    try {
      const newWallet = await createAndEncryptWallet(password);

      // Type casting to bypass ethers HDNodeWallet vs Wallet strictness
      const walletInstance = newWallet as unknown as ethers.Wallet;

      await register(walletInstance, username);
      await login(walletInstance);

      navigate("/chat");
    } catch (err: unknown) {
      if (err instanceof Error) {
        setLocalError(err.message || "Registration failed.");
      } else {
        setLocalError("An unknown error occurred.");
      }
    }
  };

  return (
    <AuthLayout
      title="Create Identity"
      subtitle="Register and secure your identity."
    >
      <WalletDisplay address={address} onReset={resetWallet} />

      {localError && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg">
          {localError}
        </div>
      )}

      <form onSubmit={handleRegister} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1">
            Username
          </label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="e.g. Satoshi"
            className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 text-zinc-100 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all placeholder:text-zinc-600"
            disabled={isLoading}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1">
            Encryption Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="To secure your private key"
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
            ? "Encrypting Key..."
            : authLoading
              ? "Registering..."
              : "Create & Encrypt"}
        </button>

        <div className="text-center text-sm text-zinc-500 mt-4">
          Already registered on this device?{" "}
          <Link
            to="/login"
            className="text-indigo-400 hover:text-indigo-300 hover:underline font-medium transition-colors"
          >
            Go to Login
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
}
