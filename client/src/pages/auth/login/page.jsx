import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useWallet } from "../../../hooks/useWallet";
import { useAuth } from "../../../hooks/useAuth";
import AuthLayout from "../components/AuthLayout";
import WalletDisplay from "../components/WalletDisplay";

export default function LoginPage() {
  const navigate = useNavigate();
  const { address, wallet, resetWallet } = useWallet();
  const { login, loading, isAuthenticated } = useAuth();
  const [localError, setLocalError] = useState("");

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/chat");
    }
  }, [isAuthenticated, navigate]);

  const handleLogin = async () => {
    setLocalError("");
    try {
      await login(wallet);
      navigate("/chat");
    } catch (err) {
      setLocalError(
        err.message || "Login failed. You might need to register first.",
      );
    }
  };

  return (
    <AuthLayout
      title="Welcome Back"
      subtitle="Login using your local wallet identity."
    >
      <WalletDisplay address={address} onReset={resetWallet} />

      {localError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-100 text-red-600 text-sm rounded-lg">
          {localError}
        </div>
      )}

      <div className="space-y-4">
        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full bg-slate-900 hover:bg-slate-800 text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Authenticating..." : "Login with Wallet"}
        </button>

        <div className="text-center text-sm text-gray-500 mt-4">
          Don't have an account?{" "}
          <Link
            to="/register"
            className="text-blue-600 hover:underline font-medium"
          >
            Register Now
          </Link>
        </div>
      </div>
    </AuthLayout>
  );
}
