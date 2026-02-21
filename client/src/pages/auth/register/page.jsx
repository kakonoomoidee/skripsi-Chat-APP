import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useWallet } from "../../../hooks/useWallet";
import { useAuth } from "../../../hooks/useAuth";
import AuthLayout from "../components/AuthLayout";
import WalletDisplay from "../components/WalletDisplay";

export default function RegisterPage() {
  const navigate = useNavigate();
  const { address, wallet, resetWallet } = useWallet();
  const { register, login, loading, isAuthenticated } = useAuth();

  const [username, setUsername] = useState("");
  const [localError, setLocalError] = useState("");

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/chat");
    }
  }, [isAuthenticated, navigate]);

  const handleRegister = async (e) => {
    e.preventDefault();
    setLocalError("");

    if (!username.trim()) {
      setLocalError("Username cannot be empty.");
      return;
    }

    try {
      await register(wallet, username);
      await login(wallet); // Auto login after register
      navigate("/chat");
    } catch (err) {
      setLocalError(err.message || "Registration failed.");
    }
  };

  return (
    <AuthLayout
      title="Create Identity"
      subtitle="Register your wallet to the blockchain."
    >
      <WalletDisplay address={address} onReset={resetWallet} />

      {localError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-100 text-red-600 text-sm rounded-lg">
          {localError}
        </div>
      )}

      <form onSubmit={handleRegister} className="space-y-4">
        <div>
          <label
            htmlFor="username"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Choose a Username
          </label>
          <input
            id="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="e.g. Satoshi"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
            disabled={loading}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Registering..." : "Register & Login"}
        </button>

        <div className="text-center text-sm text-gray-500 mt-4">
          Already registered?{" "}
          <Link
            to="/login"
            className="text-slate-900 hover:underline font-medium"
          >
            Back to Login
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
}
