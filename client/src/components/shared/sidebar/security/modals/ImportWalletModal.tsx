import React, { useState } from "react";
import { createPortal } from "react-dom";

export interface ImportWalletModalProps {
  isOpen: boolean;
  isConnecting: boolean;
  onClose: () => void;
  onImport: (phrase: string) => void;
  importError: string;
}

/**
 * Modal interface for importing an existing internal transaction wallet.
 *
 * @param {ImportWalletModalProps} props - Component properties.
 * @returns {React.JSX.Element | null} The modal UI.
 */
export default function ImportWalletModal({
  isOpen,
  isConnecting,
  onClose,
  onImport,
  importError,
}: ImportWalletModalProps): React.JSX.Element | null {
  const [importSeedInput, setImportSeedInput] = useState<string>("");

  if (!isOpen || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-200 flex items-center justify-center bg-zinc-950/80 backdrop-blur-sm p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <h3 className="text-lg font-bold text-zinc-100 mb-2">
          Import Internal Wallet
        </h3>
        <textarea
          value={importSeedInput}
          onChange={(e) => setImportSeedInput(e.target.value)}
          placeholder="e.g. apple banana cat dog elephant frog grape hat ice juice kite lemon"
          className="w-full h-24 bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-sm text-zinc-200 outline-none transition-all resize-none mb-2 focus:border-indigo-500 focus:ring-1"
        />
        {importError && (
          <p className="text-[11px] font-medium text-red-400 mb-4 bg-red-500/10 p-2 rounded-lg border border-red-500/20">
            {importError}
          </p>
        )}
        <div className="flex gap-3 mt-4">
          <button
            onClick={() => {
              setImportSeedInput("");
              onClose();
            }}
            className="flex-1 py-2.5 rounded-xl text-xs font-medium text-zinc-400 hover:bg-zinc-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onImport(importSeedInput)}
            disabled={!importSeedInput.trim() || isConnecting}
            className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white py-2.5 rounded-xl text-xs font-medium transition-colors disabled:opacity-50"
          >
            {isConnecting ? "Importing..." : "Import"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
