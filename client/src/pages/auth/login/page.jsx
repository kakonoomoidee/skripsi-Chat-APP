import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useWallet } from "../../../hooks/useWallet";
import { useAuth } from "../../../hooks/useAuth";
import AuthLayout from "../components/AuthLayout";
import WalletDisplay from "../components/WalletDisplay";

export default function LoginPage() {
  const navigate = useNavigate();
  const {
    address,
    decryptWallet,
    resetWallet,
    loading: walletLoading,
  } = useWallet();
  const { login, loading: authLoading, isAuthenticated } = useAuth();

  const [password, setPassword] = useState("");
  const [localError, setLocalError] = useState("");

  const isLoading = walletLoading || authLoading;

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/chat");
    }
  }, [isAuthenticated, navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLocalError("");

    if (!password) {
      setLocalError("Password is required to decrypt your identity.");
      return;
    }

    try {
      // 1. Decrypt wallet pake password dari input
      const unlockedWallet = await decryptWallet(password);

      // 2. Login ke Relay pake wallet yang udah kebuka
      await login(unlockedWallet);

      navigate("/chat");
    } catch (err) {
      setLocalError(err.message || "Login failed.");
    }
  };

  return (
    <AuthLayout title="Welcome Back" subtitle="Decrypt your identity to login.">
      <WalletDisplay address={address} onReset={resetWallet} />

      {localError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-100 text-red-600 text-sm rounded-lg">
          {localError}
        </div>
      )}

      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Encryption Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            disabled={isLoading || !address}
          />
        </div>

        <button
          type="submit"
          disabled={isLoading || !address}
          className="w-full bg-slate-900 hover:bg-slate-800 text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:opacity-50"
        >
          {walletLoading
            ? "Decrypting Key..."
            : authLoading
              ? "Authenticating..."
              : "Decrypt & Login"}
        </button>

        <div className="text-center text-sm text-gray-500 mt-4">
          Want to create a new identity?{" "}
          <Link
            to="/register"
            className="text-blue-600 hover:underline font-medium"
          >
            Register Now
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
}
