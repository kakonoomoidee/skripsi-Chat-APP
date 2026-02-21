import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useWallet } from "../../../hooks/useWallet";
import { useAuth } from "../../../hooks/useAuth";
import AuthLayout from "../components/AuthLayout";
import WalletDisplay from "../components/WalletDisplay";

export default function RegisterPage() {
  const navigate = useNavigate();
  const {
    address,
    createAndEncryptWallet,
    resetWallet,
    loading: walletLoading,
  } = useWallet();
  const { register, login, loading: authLoading, isAuthenticated } = useAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [localError, setLocalError] = useState("");

  const isLoading = walletLoading || authLoading;

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/chat");
    }
  }, [isAuthenticated, navigate]);

  const handleRegister = async (e) => {
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
      // 1. Generate & Encrypt Wallet locally
      const newWallet = await createAndEncryptWallet(password);

      // 2. Register to Blockchain
      await register(newWallet, username);

      // 3. Auto Login
      await login(newWallet);

      navigate("/chat");
    } catch (err) {
      setLocalError(err.message || "Registration failed.");
    }
  };

  return (
    <AuthLayout
      title="Create Identity"
      subtitle="Register and secure your identity."
    >
      <WalletDisplay address={address} onReset={resetWallet} />

      {localError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-100 text-red-600 text-sm rounded-lg">
          {localError}
        </div>
      )}

      <form onSubmit={handleRegister} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Username
          </label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="e.g. Satoshi"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            disabled={isLoading}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Encryption Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="To secure your private key"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            disabled={isLoading}
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:opacity-50"
        >
          {walletLoading
            ? "Encrypting Key..."
            : authLoading
              ? "Registering..."
              : "Create & Encrypt"}
        </button>

        <div className="text-center text-sm text-gray-500 mt-4">
          Already registered on this device?{" "}
          <Link
            to="/login"
            className="text-slate-900 hover:underline font-medium"
          >
            Go to Login
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
}
