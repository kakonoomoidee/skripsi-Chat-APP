import { useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useWallet } from "@/hooks/security/useWallet";
import { useAuth } from "@/hooks/auth/useAuth";
import { useRelay } from "@/hooks/network/useRelay";
import { useImportHandler } from "@/hooks/auth/useAuthHandlers";
import { useRelayPing } from "@/hooks/network/useRelayPing";
import AuthRelayControl from "@/components/ui/AuthRelayControl";
import AuthLayout from "@/layouts/AuthLayout";
import WalletDisplay from "@/components/auth/WalletDisplay";
import {
  PasswordInput,
  SeedPhraseInput,
  validatePasswordSecurity,
} from "@/components/ui";

/**
 * Renders the import identity client interface for recovering an existing user identity.
 * Validates seed phrases, strict password requirements, and handles the cryptographic restoration process.
 *
 * @returns {React.JSX.Element} The Import Identity Client page component.
 */
export default function ImportIdentityClient(): React.JSX.Element {
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
  } = useImportHandler(activeRelay);

  const isPasswordStrong = validatePasswordSecurity(password);
  const showPasswordError =
    confirmPassword.length > 0 && password !== confirmPassword;

  useEffect(() => {
    if (isAuthenticated) navigate("/chat");
  }, [isAuthenticated, navigate]);

  const isButtonDisabled =
    isLoading ||
    !seedImport.trim() ||
    !isPasswordStrong ||
    password !== confirmPassword ||
    !isRelayAlive;

  return (
    <AuthLayout
      title="Recover Identity"
      subtitle="Import your 12-word seed phrase to restore your decentralized identity on this device."
    >
      {address && <WalletDisplay address={address} />}

      <form onSubmit={handleImport} className="space-y-4">
        <SeedPhraseInput
          value={seedImport}
          onChange={setSeedImport}
          disabled={isLoading}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col">
            <PasswordInput
              label="New Password"
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
