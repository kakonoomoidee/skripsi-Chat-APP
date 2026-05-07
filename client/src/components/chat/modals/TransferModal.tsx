import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useChatContext } from "@/context/ChatContext";
import { useWalletStore } from "@/store";
import { XIcon } from "@/components/icons";
import { useTransferBalance } from "@/hooks/chat/useTransferBalance";
import {
  getP2PTransferValidationState,
  getSafeMaxTransfer,
  TRANSFER_REQUEST_TIMEOUT_MS,
  ESTIMATED_GAS_ETH,
  assertSelfTransferAllowed,
} from "@/utils/commerce/transfer";

/**
 * Interface defining the properties for the TransferModal component.
 */
export interface TransferModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Renders a modal overlay for executing cryptocurrency transfers over the P2P network.
 * Handles peer wallet resolution, balance validation, and timeout states for both internal and external wallets.
 *
 * @param {TransferModalProps} props - Component properties.
 * @returns {React.JSX.Element | null} The transfer modal UI, or null if closed.
 */
export const TransferModal = ({
  isOpen,
  onClose,
}: TransferModalProps): React.JSX.Element | null => {
  const { activeUsername, handleSendCrypto } = useChatContext();
  const { peerWalletAddress } = useWalletStore();

  const [transferAmount, setTransferAmount] = useState<string>("");
  const currentBalance = useTransferBalance(isOpen);
  const [requestTimeout, setRequestTimeout] = useState<boolean>(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isOpen && !peerWalletAddress) {
      setRequestTimeout(false);
      timer = setTimeout(() => {
        setRequestTimeout(true);
      }, TRANSFER_REQUEST_TIMEOUT_MS);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [isOpen, peerWalletAddress]);

  if (!isOpen || typeof document === "undefined") return null;

  const { isInsufficientFunds, isDisabled, safeMax } =
    getP2PTransferValidationState(
      transferAmount,
      currentBalance,
      ESTIMATED_GAS_ETH,
    );

  /**
   * Sets the transfer amount to the maximum safe value: balance minus the
   * estimated gas fee. If the balance is insufficient to cover even the fee,
   * the amount is set to zero to prevent invalid submissions.
   *
   * @returns {void}
   */
  const handleMaxAmount = (): void => {
    const numericBalance = Number.parseFloat(currentBalance || "0");
    const maxSafe = getSafeMaxTransfer(numericBalance, ESTIMATED_GAS_ETH);
    setTransferAmount(maxSafe > 0 ? maxSafe.toFixed(4) : "0");
  };

  /**
   * Triggers the Web3 transaction sequence if validations pass.
   * Also validates that sender and receiver are different addresses.
   *
   * @returns {void}
   */
  const executeTransfer = (): void => {
    if (isDisabled || !peerWalletAddress) return;

    try {
      // Validate self-transfer before executing
      assertSelfTransferAllowed(
        localStorage.getItem("internalTxWallet") ||
          (typeof window.ethereum !== "undefined" ? "connected" : null),
        peerWalletAddress,
      );

      handleSendCrypto(transferAmount);
      setTransferAmount("");
      onClose();
    } catch (error: any) {
      // Self-transfer error is caught, but we keep the modal open
      // The error is typically handled by the crypto hooks
      console.error("Transfer validation failed:", error.message);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-zinc-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl animate-in zoom-in-95 duration-200">
        <h3 className="text-lg font-bold text-zinc-100 mb-1">
          Transfer Crypto to {activeUsername}
        </h3>

        {!peerWalletAddress ? (
          <div className="flex flex-col items-center justify-center py-6">
            {!requestTimeout ? (
              <>
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500 mb-4"></div>
                <p className="text-xs text-zinc-400 text-center">
                  Requesting {activeUsername}'s wallet address via WebRTC...
                </p>
              </>
            ) : (
              <>
                <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center text-red-400 mb-4">
                  <XIcon className="w-6 h-6" />
                </div>
                <p className="text-sm font-medium text-zinc-200 text-center mb-1">
                  Request Timeout
                </p>
                <p className="text-xs text-zinc-400 text-center px-4">
                  {activeUsername} has not linked a transaction wallet or is not
                  responding.
                </p>
              </>
            )}
            <button
              onClick={onClose}
              className="mt-6 px-6 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-xs font-medium text-zinc-300 transition-colors"
            >
              {requestTimeout ? "Close" : "Cancel"}
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
                  className={`w-full bg-zinc-950 border focus:ring-1 rounded-xl px-3 py-2.5 pr-14 text-sm text-zinc-200 outline-none transition-all placeholder:text-zinc-700 ${
                    isInsufficientFunds
                      ? "border-red-500/50 focus:border-red-500 focus:ring-red-500/30"
                      : "border-zinc-800 focus:border-indigo-500 focus:ring-indigo-500/30"
                  }`}
                  autoComplete="off"
                />
                <button
                  type="button"
                  onClick={handleMaxAmount}
                  disabled={!currentBalance || safeMax <= 0}
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-indigo-600/20 hover:bg-indigo-600/40 disabled:opacity-40 disabled:cursor-not-allowed text-[9px] font-bold text-indigo-300 px-2 py-0.5 rounded-md transition-colors border border-indigo-500/30"
                >
                  MAX
                </button>
              </div>

              <p className="text-[10px] text-zinc-600 flex items-center gap-1 mt-1.5 ml-1">
                Est. network fee: ~{ESTIMATED_GAS_ETH} ETH
              </p>

              {isInsufficientFunds && (
                <p className="text-[10px] text-red-400 mt-1.5 ml-1 animate-in slide-in-from-top-1">
                  Insufficient funds. Max: {safeMax.toFixed(4)} ETH (after gas
                  fee).
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
                Send Crypto
              </button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
};
