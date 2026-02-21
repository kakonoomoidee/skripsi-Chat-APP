import React from "react";
import { shortenAddress } from "../../../utils/format";

export default function WalletDisplay({ address, onReset }) {
  return (
    <div className="mb-6">
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
        Your Local Identity
      </label>
      <div className="flex items-center justify-between bg-slate-50 p-3 rounded-lg border border-slate-200">
        <span className="font-mono text-sm text-slate-700">
          {address ? shortenAddress(address) : "No Identity (Create below)"}
        </span>
        {address && (
          <button
            type="button"
            onClick={onReset}
            className="text-xs text-red-500 hover:text-red-700 font-medium transition-colors"
          >
            Clear Data
          </button>
        )}
      </div>
      <p className="text-xs text-gray-400 mt-2">
        Secured with AES-256 encryption. We never store your keys.
      </p>
    </div>
  );
}
