import { shortenAddress } from "@/utils/core/format";

interface WalletDisplayProps {
  address: string | null;
}

/**
 * Component to display the current local wallet identity securely
 * @returns {JSX.Element}
 */
export default function WalletDisplay({ address }: WalletDisplayProps) {
  return (
    <div className="mb-6">
      <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-widest mb-2">
        Local Identity
      </label>
      <div className="flex items-center justify-between bg-zinc-950 p-3.5 rounded-xl border border-zinc-800 shadow-sm">
        <span className="font-mono text-sm text-zinc-300">
          {address ? shortenAddress(address) : "No Identity Found"}
        </span>
      </div>
      <p className="text-xs text-zinc-500 mt-2.5">
        Secured locally with AES-256. Keys never leave this device.
      </p>
    </div>
  );
}
