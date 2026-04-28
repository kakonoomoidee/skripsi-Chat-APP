import React, { useState } from "react";
import { createPortal } from "react-dom";
import { WarningIcon } from "@/components/icons";
import SeedPhraseGrid from "./SeedPhraseGrid";
import { copyTextWithFallback } from "@/utils/platform/clipboard";
import { SEED_MODAL_PROCEED_DELAY_MS } from "@/utils/auth/seedPhrase";

interface SeedPhraseModalProps {
  seedPhrase: string;
  title?: string;
  subtitle?: string;
  onClose: () => void;
  onProceed?: () => void;
  proceedText?: string;
}

/**
 * Renders a modal overlay displaying the seed phrase grid with a clipboard copy fallback.
 * @param {SeedPhraseModalProps} props - The modal properties.
 * @returns {React.JSX.Element | null} The modal portal or null if document is undefined.
 */
export default function SeedPhraseModal({
  seedPhrase,
  title = "Secure Your Backup",
  subtitle = "Write down these 12 words in order and keep them safe offline.",
  onClose,
  onProceed,
  proceedText = "I have saved this phrase",
}: SeedPhraseModalProps): React.JSX.Element | null {
  const [isCopied, setIsCopied] = useState(false);

  if (typeof document === "undefined") return null;

  /**
   * Copies the seed phrase to the clipboard with a fallback for insecure HTTP environments and executes the proceed action.
   * @returns {void}
   */
  const handleCopyAndProceed = (): void => {
    if (!seedPhrase) return;

    const proceed = () => {
      setIsCopied(true);
      setTimeout(() => {
        if (onProceed) {
          onProceed();
        } else {
          onClose();
        }
      }, SEED_MODAL_PROCEED_DELAY_MS);
    };

    copyTextWithFallback(seedPhrase)
      .then(proceed)
      .catch((error) => {
        console.error("Failed to copy phrase", error);
        proceed();
      });
  };

  return createPortal(
    <div className="fixed inset-0 z-200 flex items-center justify-center bg-zinc-950/80 backdrop-blur-sm p-4">
      <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl w-full max-w-lg shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <h3 className="text-xl font-bold text-zinc-100 mb-2">{title}</h3>

        <div className="flex items-start gap-3 p-4 mb-6 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-300 text-xs leading-relaxed">
          <WarningIcon className="w-5 h-5 shrink-0 mt-0.5 text-amber-500" />
          <p>
            {subtitle}
            <span className="font-semibold text-amber-500 block mt-1">
              Never share this phrase with anyone!
            </span>
          </p>
        </div>

        <div className="mb-6">
          <SeedPhraseGrid phrase={seedPhrase} />
        </div>

        <button
          onClick={handleCopyAndProceed}
          className="w-full font-medium py-3.5 px-4 rounded-xl transition-all shadow-sm active:scale-[0.98] flex items-center justify-center gap-2 text-sm bg-indigo-600 hover:bg-indigo-500 text-white"
        >
          {isCopied ? "Copied to Clipboard!" : proceedText}
        </button>
      </div>
    </div>,
    document.body,
  );
}
