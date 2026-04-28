import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import ms from "ms";
import { useWallet } from "@/hooks/security/useWallet";
import { useAuth } from "@/hooks/auth/useAuth";
import { useRelay } from "@/hooks/network/useRelay";
import { useRegisterHandler } from "@/hooks/auth/useAuthHandlers";
import { useRelayPing } from "@/hooks/network/useRelayPing";
import AuthRelayControl from "@/components/ui/AuthRelayControl";
import { copyTextWithFallback } from "@/utils/clipboard";
import AuthLayout from "@/layouts/AuthLayout";
import WalletDisplay from "@/components/auth/WalletDisplay";
import {
  RelaySelector,
  PasswordInput,
  RelayStatusBadge,
  SeedPhraseGrid,
  validatePasswordSecurity,
} from "@/components/ui";
import { WarningIcon } from "@/components/icons";

const COPY_AND_CONTINUE_DELAY_MS = ms("1500ms");

/**
 * Registration page component handling identity creation and seed phrase backup.
 * Enforces strong password requirements before allowing registration.
 *
 * @returns {React.JSX.Element}
 */
export default function RegisterPage(): React.JSX.Element {
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
  } = useRegisterHandler(activeRelay);

  const [isCopied, setIsCopied] = useState(false);

  const isPasswordStrong = validatePasswordSecurity(password);
  const showPasswordError =
    confirmPassword.length > 0 && password !== confirmPassword;

  useEffect(() => {
    if (isAuthenticated && !seedPhrase) navigate("/chat");
  }, [isAuthenticated, navigate, seedPhrase]);

  /**
   * Handles copying the seed phrase to the clipboard with a fallback for insecure HTTP contexts.
   *
   * @returns {void}
   */
  const handleCopyAndProceed = (): void => {
    if (!seedPhrase) return;

    copyTextWithFallback(seedPhrase)
      .catch(() => undefined)
      .finally(() => {
        setIsCopied(true);
        setTimeout(() => navigate("/chat"), COPY_AND_CONTINUE_DELAY_MS);
      });
  };

  if (seedPhrase) {
    return (
      <AuthLayout
        title="Secure Your Backup"
        subtitle="Your 12-word recovery phrase is the master key to your identity."
      >
        <div className="flex items-start gap-3 p-4 mb-6 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 text-sm leading-relaxed">
          <WarningIcon className="w-5 h-5 shrink-0 mt-0.5 text-amber-500" />
          <p>
            Write down these 12 words in order and keep them safe offline.
            <span className="font-semibold text-amber-500 block mt-1">
              Never share this phrase with anyone!
            </span>
          </p>
        </div>

        <div className="mb-8">
          <SeedPhraseGrid phrase={seedPhrase} />
        </div>

        <button
          onClick={handleCopyAndProceed}
          className={`w-full font-medium py-3.5 px-4 rounded-xl transition-all shadow-sm active:scale-[0.98] flex items-center justify-center gap-2 ${
            isCopied
              ? "bg-emerald-600 hover:bg-emerald-500 text-white"
              : "bg-indigo-600 hover:bg-indigo-500 text-white"
          }`}
        >
          {isCopied
            ? "Copied to Clipboard! Proceeding..."
            : "Copy Phrase & Continue"}
        </button>
      </AuthLayout>
    );
  }

  const isButtonDisabled =
    isLoading ||
    isAvailable === false ||
    isChecking ||
    !isPasswordStrong ||
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
              placeholder="Strong password required"
              disabled={isLoading}
              showRules={true}
            />
          </div>
          <div className="flex flex-col">
            <PasswordInput
              label="Confirm Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm password"
              disabled={isLoading || !isPasswordStrong}
              error={showPasswordError ? "Passwords do not match" : undefined}
            />
          </div>
        </div>

        <AuthRelayControl
          activeRelay={activeRelay}
          defaultRelays={defaultRelays}
          changeRelay={changeRelay}
          addCustomRelay={addCustomRelay}
          size="md"
        />

        <button
          type="submit"
          disabled={isButtonDisabled}
          className="w-full mt-4 bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-3.5 px-4 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm active:scale-[0.98]"
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
