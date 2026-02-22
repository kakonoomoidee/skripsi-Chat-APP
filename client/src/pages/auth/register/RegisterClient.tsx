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

  const [seedPhrase, setSeedPhrase] = useState<string | null>(null);

  const isLoading = walletLoading || authLoading;

  useEffect(() => {
    if (isAuthenticated && !seedPhrase) {
      navigate("/chat");
    }
  }, [isAuthenticated, navigate, seedPhrase]);

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
      const { wallet: newWallet, seedPhrase: generatedSeed } =
        await createAndEncryptWallet(password);

      const walletInstance = newWallet as unknown as ethers.Wallet;

      await register(walletInstance, username);
      await login(walletInstance);

      setSeedPhrase(generatedSeed);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setLocalError(err.message || "Registration failed.");
      } else {
        setLocalError("An unknown error occurred.");
      }
    }
  };

  const handleCopyAndProceed = () => {
    if (seedPhrase) {
      navigator.clipboard.writeText(seedPhrase);
      alert("Seed phrase copied! Please store it securely.");
      navigate("/chat");
    }
  };

  if (seedPhrase) {
    return (
      <AuthLayout
        title="Save Your Backup Phrase"
        subtitle="This is the ONLY way to recover your account if you lose your device."
      >
        <div className="bg-amber-500/10 border border-amber-500/30 p-5 rounded-xl mb-6">
          <p className="text-amber-400 text-sm font-medium mb-4 text-center">
            Write down these 12 words in order. Do not share them with anyone!
          </p>
          <div className="grid grid-cols-3 gap-3">
            {seedPhrase.split(" ").map((word, index) => (
              <div
                key={index}
                className="bg-zinc-900/50 px-2 py-2 rounded-lg border border-zinc-800 text-sm text-center font-mono text-zinc-300"
              >
                <span className="text-zinc-600 mr-2 text-xs select-none">
                  {index + 1}.
                </span>
                {word}
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={handleCopyAndProceed}
          className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-3 px-4 rounded-lg transition-colors shadow-lg shadow-indigo-500/20"
        >
          I Saved It, Continue
        </button>
      </AuthLayout>
    );
  }

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
