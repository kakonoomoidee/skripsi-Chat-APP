import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useWallet } from "@/hooks/security/useWallet";
import { useAuth } from "@/hooks/auth/useAuth";
import { useRelay } from "@/hooks/network/useRelay";
import { useRegisterHandler } from "@/hooks/auth/useAuthHandlers";
import { useRelayPing } from "@/hooks/network/useRelayPing";
import AuthLayout from "../components/AuthLayout";
import WalletDisplay from "../components/WalletDisplay";
import {
  RelaySelector,
  PasswordInput,
  RelayStatusBadge,
} from "@/components/shared";
import { WarningIcon } from "@/components/icons";

export default function RegisterPage() {
  const navigate = useNavigate();
  const { address } = useWallet();
  const { isAuthenticated } = useAuth();
  const { activeRelay, changeRelay, defaultRelays, addCustomRelay } =
    useRelay();

  const { isRelayAlive, isPinging } = useRelayPing(activeRelay);
  const {
    username,
    setUsername,
    password,
    setPassword,
    confirmPassword,
    setConfirmPassword,
    seedPhrase,
    isChecking,
    isAvailable,
    isLoading,
    walletLoading,
    authLoading,
    handleRegister,
  } = useRegisterHandler();

  const [isCopied, setIsCopied] = useState(false);

  // REFACTORED: Deteksi error password secara real-time buat UI
  const showPasswordError =
    confirmPassword.length > 0 && password !== confirmPassword;

  useEffect(() => {
    if (isAuthenticated && !seedPhrase) navigate("/chat");
  }, [isAuthenticated, navigate, seedPhrase]);

  const handleCopyAndProceed = () => {
    if (seedPhrase) {
      navigator.clipboard.writeText(seedPhrase);
      setIsCopied(true);
      setTimeout(() => navigate("/chat"), 1500);
    }
  };

  // -------------------------------------------------------------
  // RENDER: Seed Phrase Backup Screen (ULTIMATE REDESIGN VIP)
  // -------------------------------------------------------------
  if (seedPhrase) {
    return (
      <AuthLayout
        title="Secure Your Backup"
        subtitle="Your 12-word recovery phrase is the master key to your identity."
      >
        {/* Warning Alert Box */}
        <div className="flex items-start gap-3 p-4 mb-6 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm leading-relaxed shadow-sm animate-in fade-in slide-in-from-top-2">
          <WarningIcon className="w-5 h-5 shrink-0 mt-0.5 opacity-80" />
          <p>
            Write down these 12 words in order and keep them safe offline.
            <span className="font-semibold text-amber-300 block mt-1">
              Never share this phrase with anyone!
            </span>
          </p>
        </div>

        <div className="bg-zinc-900/40 border border-zinc-800/80 p-5 sm:p-6 rounded-2xl mb-8 relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-1/2 bg-indigo-500/10 blur-3xl pointer-events-none"></div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3 relative z-10">
            {seedPhrase.split(" ").map((word: string, index: number) => (
              <div
                key={index}
                className="flex items-center gap-2.5 bg-zinc-950/80 border border-zinc-800/60 rounded-xl p-2.5 shadow-sm hover:border-indigo-500/50 hover:bg-zinc-900 transition-all duration-200 group"
              >
                <div className="flex items-center justify-center w-6 h-6 rounded-md bg-zinc-800/50 text-[11px] font-bold text-zinc-500 group-hover:text-indigo-400 group-hover:bg-indigo-500/10 transition-colors shrink-0">
                  {index + 1}
                </div>
                <span className="font-mono text-[13px] sm:text-[14px] text-zinc-200 font-medium tracking-wide">
                  {word}
                </span>
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={handleCopyAndProceed}
          className={`w-full font-medium py-4 px-4 rounded-xl transition-all shadow-lg active:scale-[0.98] flex items-center justify-center gap-2 ${
            isCopied
              ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-500/20"
              : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/20"
          }`}
        >
          {isCopied ? (
            <>
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              Copied to Clipboard! Proceeding...
            </>
          ) : (
            <>
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"
                />
              </svg>
              Copy Phrase & Continue
            </>
          )}
        </button>
      </AuthLayout>
    );
  }

  const isButtonDisabled =
    isLoading ||
    isAvailable === false ||
    isChecking ||
    !password ||
    password !== confirmPassword ||
    !isRelayAlive;

  return (
    <AuthLayout
      title="Create Identity"
      subtitle="Register and secure your identity locally."
    >
      {address && <WalletDisplay address={address} />}

      <form onSubmit={handleRegister} className="space-y-4">
        <div>
          <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-widest mb-2">
            Username
          </label>
          <div className="relative">
            <input
              type="text"
              value={username}
              onChange={(e) =>
                setUsername(
                  e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""),
                )
              }
              placeholder="e.g. Satoshi"
              className={`w-full px-4 py-3 bg-zinc-900 border text-zinc-100 rounded-xl outline-none transition-all placeholder:text-zinc-600 pr-10 shadow-sm ${
                isChecking
                  ? "border-amber-500/50"
                  : isAvailable === true
                    ? "border-emerald-500/50 focus:ring-1 focus:ring-emerald-500"
                    : isAvailable === false
                      ? "border-red-500/50 focus:ring-1 focus:ring-red-500"
                      : "border-zinc-800 focus:ring-1 focus:ring-indigo-500"
              }`}
              disabled={isLoading}
            />
            <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
              {isChecking && (
                <span className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></span>
              )}
              {!isChecking && isAvailable === true && (
                <svg
                  className="w-5 h-5 text-emerald-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              )}
              {!isChecking && isAvailable === false && (
                <svg
                  className="w-5 h-5 text-red-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              )}
            </div>
          </div>
          {!isChecking && isAvailable === false && (
            <p className="text-[10px] text-red-400 mt-1.5 ml-1 font-medium animate-in slide-in-from-top-1">
              Username is already taken!
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col">
            <PasswordInput
              label="Set Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min. 6 chars"
              disabled={isLoading}
            />
          </div>
          <div className="flex flex-col">
            <PasswordInput
              label="Confirm Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm password"
              disabled={isLoading}
            />
            {showPasswordError && (
              <p className="text-[10px] text-red-400 mt-1.5 ml-1 font-medium animate-in slide-in-from-top-1">
                Passwords do not match!
              </p>
            )}
          </div>
        </div>

        <div className="relative pt-1">
          <RelayStatusBadge isPinging={isPinging} isRelayAlive={isRelayAlive} />
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
          disabled={isButtonDisabled}
          className="w-full mt-4 bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-3.5 px-4 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/20 active:scale-[0.98]"
        >
          {walletLoading
            ? "Encrypting Key..."
            : authLoading
              ? "Registering Identity..."
              : !isRelayAlive && !isPinging
                ? "Server Offline"
                : "Create & Encrypt"}
        </button>

        <div className="pt-3 mt-1 border-t border-zinc-800/50 text-center text-sm text-zinc-500">
          Already registered on this device?{" "}
          <Link
            to="/login"
            className="text-indigo-400 hover:text-indigo-300 font-semibold transition-colors"
          >
            Go to Login
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
}
