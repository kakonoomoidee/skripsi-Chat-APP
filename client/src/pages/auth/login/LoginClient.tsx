import { useEffect } from "react"; // REFACTORED: React, useState dicabut karena ga dipake
import { useNavigate, Link } from "react-router-dom";
import { useWallet } from "@/hooks/useWallet";
import { useAuth } from "@/hooks/useAuth";
import { useRelay } from "@/hooks/useRelay";
import { useAuthHandlers } from "@/hooks/useAuthHandlers";
import { useRelayPing } from "@/hooks/useRelayPing"; // Import hook ping kita

import AuthLayout from "../components/AuthLayout";
import WalletDisplay from "../components/WalletDisplay";
import {
  RelaySelector,
  PasswordInput,
  RelayStatusBadge,
} from "@/components/shared";

export default function LoginPage() {
  const navigate = useNavigate();

  const { address, loading: walletLoading } = useWallet();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { activeRelay, changeRelay, defaultRelays, addCustomRelay } =
    useRelay();

  const { isRelayAlive, isPinging } = useRelayPing(activeRelay);

  const { password, setPassword, isLoading, handleLogin } = useAuthHandlers();

  useEffect(() => {
    if (isAuthenticated) navigate("/chat");
  }, [isAuthenticated, navigate]);

  const isButtonDisabled =
    isLoading ||
    walletLoading ||
    authLoading ||
    !address ||
    !password ||
    !isRelayAlive;

  return (
    <AuthLayout
      title="Welcome Back"
      subtitle="Decrypt your local identity to establish a secure connection."
    >
      <WalletDisplay address={address} />

      <form onSubmit={handleLogin} className="space-y-6">
        <PasswordInput
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={isLoading || !address}
        />

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
          className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-3.5 px-4 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/20 active:scale-[0.98] mt-2"
        >
          {walletLoading
            ? "Decrypting Key..."
            : authLoading
              ? "Authenticating Handshake..."
              : !isRelayAlive && !isPinging
                ? "Server Offline"
                : "Decrypt & Connect"}
        </button>

        <div className="pt-4 border-t border-zinc-800/50 flex flex-col gap-2 text-center text-sm text-zinc-500">
          <div>
            Want to create a new identity?{" "}
            <Link
              to="/register"
              className="text-indigo-400 hover:text-indigo-300 font-semibold transition-colors"
            >
              Register Now
            </Link>
          </div>
          <div>
            Moving to a new device?{" "}
            <Link
              to="/import"
              className="text-indigo-400 hover:text-indigo-300 font-semibold transition-colors"
            >
              Import Backup
            </Link>
          </div>
        </div>
      </form>
    </AuthLayout>
  );
}
