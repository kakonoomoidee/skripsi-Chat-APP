import React from "react";
import { createPortal } from "react-dom";
import { SeedPhraseModalInput } from "@/components/ui";
import { useSeedInputModal } from "@/hooks/ui/useSeedInputModal";

export interface WithdrawalModalProps {
  isOpen: boolean;
  withdrawAmount: string;
  isWithdrawing: boolean;
  withdrawError: string;
  onClose: () => void;
  onConfirm: (seedPhrase: string) => void;
}

/**
 * Modal interface for confirming an external withdrawal using a seed phrase.
 *
 * @param {WithdrawalModalProps} props - Component properties.
 * @returns {React.JSX.Element | null} The modal UI.
 */
export default function WithdrawalModal({
  isOpen,
  withdrawAmount,
  isWithdrawing,
  withdrawError,
  onClose,
  onConfirm,
}: WithdrawalModalProps): React.JSX.Element | null {
  const { seedInput, setSeedInput, clearSeedInput, canSubmit } =
    useSeedInputModal();

  if (!isOpen || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-200 flex items-center justify-center bg-zinc-950/80 backdrop-blur-sm p-4">
      <div className="bg-zinc-900 border border-indigo-500/30 rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <h3 className="text-lg font-bold text-indigo-400 mb-2">
          Confirm Withdrawal
        </h3>
        <p className="text-xs text-zinc-400 mb-4">
          Enter your 12-word internal wallet seed phrase to authorize sending{" "}
          <strong>{withdrawAmount} ETH</strong>.
        </p>

        <SeedPhraseModalInput
          value={seedInput}
          onChange={setSeedInput}
          disabled={isWithdrawing}
        />

        {withdrawError && (
          <p className="text-[11px] font-medium text-red-400 mb-4 bg-red-500/10 p-2 rounded-lg border border-red-500/20">
            {withdrawError}
          </p>
        )}
        <div className="flex gap-3 mt-4">
          <button
            onClick={() => {
              clearSeedInput();
              onClose();
            }}
            className="flex-1 py-2.5 rounded-xl text-xs font-medium text-zinc-400 hover:bg-zinc-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(seedInput)}
            disabled={!canSubmit || isWithdrawing}
            className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white py-2.5 rounded-xl text-xs font-medium transition-colors disabled:opacity-50"
          >
            {isWithdrawing ? "Processing..." : "Confirm Transfer"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
