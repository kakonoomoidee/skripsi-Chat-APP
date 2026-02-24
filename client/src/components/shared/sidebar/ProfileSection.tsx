import { useState } from "react";
import { shortenAddress } from "@/utils/format";

export interface ProfileSectionProps {
  myUsername: string;
  address: string | null;
  isConnected: boolean;
}

/**
 * 1. Profile Section Component
 * Displays the user's local identity, username, and real-time relay connection status.
 * @param {ProfileSectionProps} props - The profile data and connection state
 * @returns {JSX.Element}
 */
export default function ProfileSection({
  myUsername,
  address,
  isConnected,
}: ProfileSectionProps) {
  const [isCopied, setIsCopied] = useState<boolean>(false);

  const handleCopyAddress = () => {
    if (!address) return;
    navigator.clipboard.writeText(address);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div>
      <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-widest mb-2">
        My Profile
      </label>
      <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
        <div className="flex justify-between items-center mb-1">
          <p className="font-semibold text-sm text-zinc-100 capitalize">
            {myUsername}
          </p>
          <button
            onClick={handleCopyAddress}
            className="text-[10px] bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-2 py-1 rounded transition-colors"
          >
            {isCopied ? "Copied!" : "Copy PK"}
          </button>
        </div>
        <p className="font-mono text-[11px] text-zinc-500 mb-3">
          {shortenAddress(address || "")}
        </p>
        <div className="flex items-center pt-3 border-t border-zinc-800/50 gap-2">
          <span
            className={`w-2 h-2 rounded-full ${isConnected ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-red-500"}`}
          ></span>
          <span className="text-[11px] font-medium text-zinc-400">
            {isConnected ? "Relay Connected" : "Disconnected"}
          </span>
        </div>
      </div>
    </div>
  );
}
