import { useState } from "react";
import { createPortal } from "react-dom";
import { useChatContext } from "@/context/ChatContext";

export interface TransferModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Renders the modal overlay for handling peer-to-peer crypto transfers.
 * @param {TransferModalProps} props - Controls visibility and closure.
 * @returns {JSX.Element | null}
 */
export const TransferModal = ({ isOpen, onClose }: TransferModalProps) => {
  const { activeUsername, peerWalletAddress, handleSendCrypto } =
    useChatContext();
  const [transferAmount, setTransferAmount] = useState("");

  if (!isOpen || typeof document === "undefined") return null;

  const executeTransfer = () => {
    handleSendCrypto(transferAmount);
    setTransferAmount("");
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-zinc-950/80 backdrop-blur-sm p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <h3 className="text-lg font-bold text-zinc-100 mb-1">
          Transfer Crypto to {activeUsername}
        </h3>

        {!peerWalletAddress ? (
          <div className="flex flex-col items-center justify-center py-6">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500 mb-4"></div>
            <p className="text-xs text-zinc-400 text-center">
              Requesting {activeUsername}'s wallet address via WebRTC...
            </p>
            <button
              onClick={onClose}
              className="mt-4 text-xs text-red-400 hover:text-red-300 transition-colors"
            >
              Cancel
            </button>
          </div>
        ) : (
          <>
            <p className="text-[10px] text-zinc-400 mb-4 break-all bg-zinc-950 p-2 rounded-lg border border-zinc-800">
              <span className="font-semibold text-zinc-300">
                Target Address:
              </span>
              <br />
              {peerWalletAddress}
            </p>
            <div className="mb-6">
              <label className="block text-xs font-medium text-zinc-400 mb-2">
                Amount (ETH)
              </label>
              <input
                type="number"
                step="0.0001"
                value={transferAmount}
                onChange={(e) => setTransferAmount(e.target.value)}
                placeholder="e.g. 0.05"
                className="w-full bg-zinc-950 border border-zinc-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-3 py-2.5 text-sm text-zinc-200 outline-none transition-all placeholder:text-zinc-700"
                autoComplete="off"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl text-xs font-medium text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={executeTransfer}
                disabled={!transferAmount || isNaN(Number(transferAmount))}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 rounded-xl text-xs font-medium transition-colors disabled:opacity-50 shadow-lg shadow-emerald-500/20"
              >
                Send via MetaMask
              </button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
};
