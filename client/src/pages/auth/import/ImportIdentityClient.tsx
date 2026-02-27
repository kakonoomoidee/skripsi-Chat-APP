import { useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useWallet } from "@/hooks/useWallet";
import { useAuth } from "@/hooks/useAuth";
import { useRelay } from "@/hooks/useRelay";
import { useAuthHandlers } from "@/hooks/useAuthHandlers";
import { useRelayPing } from "@/hooks/useRelayPing";
import AuthLayout from "../components/AuthLayout";
import WalletDisplay from "../components/WalletDisplay";
import {
  RelaySelector,
  PasswordInput,
  RelayStatusBadge,
} from "@/components/shared";

export default function ImportIdentityClient() {
  const navigate = useNavigate();
  const { address } = useWallet();
  const { isAuthenticated } = useAuth();
  const { activeRelay, changeRelay, defaultRelays, addCustomRelay } =
    useRelay();

  const { isRelayAlive, isPinging } = useRelayPing(activeRelay);
  const {
    seedImport,
    setSeedImport,
    password,
    setPassword,
    confirmPassword,
    setConfirmPassword,
    isLoading,
    walletLoading,
    authLoading,
    handleImport,
  } = useAuthHandlers();

  const showPasswordError =
    confirmPassword.length > 0 && password !== confirmPassword;

  useEffect(() => {
    if (isAuthenticated) navigate("/chat");
  }, [isAuthenticated, navigate]);

  const isButtonDisabled =
    isLoading ||
    !seedImport.trim() ||
    !password ||
    password !== confirmPassword ||
    !isRelayAlive;

  return (
    <AuthLayout
      title="Recover Identity"
      subtitle="Import your 12-word seed phrase to restore your decentralized identity on this device."
    >
      {/* Wallet Display is hidden if there's no address to save space */}
      {address && <WalletDisplay address={address} />}

      <form onSubmit={handleImport} className="space-y-4">
        {/* Seed Phrase Textarea */}
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">
              12-Word Seed Phrase
            </label>
            <span
              className={`text-[10px] font-mono ${
                seedImport.trim().split(/\s+/).length === 12 &&
                seedImport.length > 0
                  ? "text-emerald-400"
                  : "text-zinc-500"
              }`}
            >
              {seedImport.length > 0
                ? seedImport.trim().split(/\s+/).length
                : 0}{" "}
              / 12
            </span>
          </div>
          <textarea
            value={seedImport}
            onChange={(e) => setSeedImport(e.target.value)}
            placeholder="e.g. apple banana cat dog elephant frog grape hat ice juice kite lemon"
            rows={2}
            className="w-full px-4 py-2.5 bg-zinc-900 border border-zinc-800 text-zinc-100 rounded-xl focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all placeholder:text-zinc-600 resize-none font-mono text-xs shadow-sm leading-relaxed custom-scrollbar"
            disabled={isLoading}
          />
        </div>

        {/* Set New Local Password */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col">
            <PasswordInput
              label="New Password"
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

        {/* Relay Server Selector */}
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

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isButtonDisabled}
          className="w-full mt-4 bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-3.5 px-4 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/20 active:scale-[0.98]"
        >
          {walletLoading
            ? "Recovering Key..."
            : authLoading
              ? "Authenticating Handshake..."
              : !isRelayAlive && !isPinging
                ? "Server Offline"
                : "Import & Connect"}
        </button>

        {/* Links */}
        <div className="pt-3 mt-1 border-t border-zinc-800/50 flex flex-col gap-2 text-center text-sm text-zinc-500">
          <div>
            Don't have an identity yet?{" "}
            <Link
              to="/register"
              className="text-indigo-400 hover:text-indigo-300 font-semibold transition-colors"
            >
              Register Here
            </Link>
          </div>
          <div>
            Remembered your password?{" "}
            <Link
              to="/login"
              className="text-indigo-400 hover:text-indigo-300 font-semibold transition-colors"
            >
              Go to Login
            </Link>
          </div>
        </div>
      </form>
    </AuthLayout>
  );
}
