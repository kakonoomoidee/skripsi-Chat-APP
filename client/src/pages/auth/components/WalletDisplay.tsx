import { shortenAddress } from "@/utils/format";

/**
 * 2. Component to display the current local wallet identity
 * @param {string | null} address - The wallet address to display
 * @param {Function} onReset - Callback function to clear the local data
 * @returns {JSX.Element}
 */

interface WalletDisplayProps {
  address: string | null;
  onReset: () => void;
}

export default function WalletDisplay({
  address,
  onReset,
}: WalletDisplayProps) {
  return (
    <div className="mb-6">
      <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-2">
        Local Identity
      </label>
      <div className="flex items-center justify-between bg-zinc-950 p-3 rounded-lg border border-zinc-800">
        <span className="font-mono text-sm text-zinc-300">
          {address ? shortenAddress(address) : "No Identity Found"}
        </span>
        {address && (
          <button
            type="button"
            onClick={onReset}
            className="text-xs text-red-400 hover:text-red-300 font-medium transition-colors bg-red-400/10 hover:bg-red-400/20 px-2 py-1 rounded"
          >
            Clear Data
          </button>
        )}
      </div>
      <p className="text-xs text-zinc-600 mt-2">
        Secured locally with AES-256. Keys never leave this device.
      </p>
    </div>
  );
}
