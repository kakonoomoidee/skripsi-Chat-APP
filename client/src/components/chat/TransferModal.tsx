import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { ethers } from "ethers";
import { useChatContext } from "@/context/ChatContext";
import { useWalletStore } from "@/store";

export interface TransferModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TransferModal = ({ isOpen, onClose }: TransferModalProps) => {
  const { activeUsername, handleSendCrypto } = useChatContext();
  const { peerWalletAddress } = useWalletStore();
  const [transferAmount, setTransferAmount] = useState("");

  // State for balance validation
  const [currentBalance, setCurrentBalance] = useState<string | null>(null);

  // Fetch balance when modal opens
  useEffect(() => {
    const getBalance = async () => {
      const savedAddress = localStorage.getItem("linked_metamask");
      if (isOpen && savedAddress && typeof window.ethereum !== "undefined") {
        try {
          const provider = new ethers.BrowserProvider(window.ethereum);
          const balanceWei = await provider.getBalance(savedAddress);
          const balanceEth = ethers.formatEther(balanceWei);
          setCurrentBalance(parseFloat(balanceEth).toFixed(4));
        } catch (err) {
          console.error("Failed to fetch balance for modal", err);
        }
      }
    };
    getBalance();
  }, [isOpen]);

  if (!isOpen || typeof document === "undefined") return null;

  const numericAmount = Number(transferAmount);
  const numericBalance = Number(currentBalance);

  // Validation flags
  const isInvalidAmount =
    !transferAmount || isNaN(numericAmount) || numericAmount <= 0;
  const isInsufficientFunds =
    currentBalance !== null && numericAmount > numericBalance;
  const isDisabled = isInvalidAmount || isInsufficientFunds;

  const executeTransfer = () => {
    if (isDisabled) return;
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
              {/* REFACTORED: Balance Indicator Upgrade */}
              <div className="flex justify-between items-center mb-2">
                <label className="block text-xs font-medium text-zinc-400">
                  Amount (ETH)
                </label>
                {currentBalance && (
                  <div
                    className={`text-[11px] font-mono font-semibold px-2.5 py-1 rounded-lg border transition-colors ${
                      isInsufficientFunds
                        ? "bg-red-500/10 text-red-400 border-red-500/30"
                        : "bg-indigo-500/10 text-indigo-300 border-indigo-500/30"
                    }`}
                  >
                    Balance: {currentBalance}
                  </div>
                )}
              </div>

              <div className="relative">
                {/* CSS to hide number input spinners (arrows) */}
                <style>{`
                  input[type=number]::-webkit-inner-spin-button, 
                  input[type=number]::-webkit-outer-spin-button { 
                    -webkit-appearance: none; 
                    margin: 0; 
                  }
                  input[type=number] {
                    -moz-appearance: textfield;
                  }
                `}</style>
                <input
                  type="number"
                  step="0.0001"
                  min="0"
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(e.target.value)}
                  placeholder="e.g. 0.05"
                  className={`w-full bg-zinc-950 border focus:ring-1 rounded-xl px-3 py-2.5 text-sm text-zinc-200 outline-none transition-all placeholder:text-zinc-700 ${
                    isInsufficientFunds
                      ? "border-red-500/50 focus:border-red-500 focus:ring-red-500/30"
                      : "border-zinc-800 focus:border-indigo-500 focus:ring-indigo-500/30"
                  }`}
                  autoComplete="off"
                />
              </div>
              {/* Error Message */}
              {isInsufficientFunds && (
                <p className="text-[10px] text-red-400 mt-1.5 ml-1 animate-in slide-in-from-top-1">
                  Insufficient funds for this transaction.
                </p>
              )}
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
                disabled={isDisabled}
                className={`flex-1 py-2.5 rounded-xl text-xs font-medium transition-all duration-200 shadow-lg ${
                  isDisabled
                    ? "bg-zinc-800 text-zinc-500 cursor-not-allowed shadow-none"
                    : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-500/20"
                }`}
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
