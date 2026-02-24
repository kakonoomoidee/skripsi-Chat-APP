import { ChangeEvent, useRef } from "react";

export interface SecuritySectionProps {
  autoDeleteMode: string;
  handleModeChange: (e: ChangeEvent<HTMLSelectElement>) => void;
  handleExportChat: () => void;
  handleImportChat: (e: ChangeEvent<HTMLInputElement>) => void;
}

/**
 * 1. Security & Data Section Component
 * Manages chat history retention policies and encrypted backup import/export.
 * @param {SecuritySectionProps} props - Methods and state for data management
 * @returns {JSX.Element}
 */
export default function SecuritySection({
  autoDeleteMode,
  handleModeChange,
  handleExportChat,
  handleImportChat,
}: SecuritySectionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div>
      <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-widest mb-2">
        Security & Data
      </label>
      <div className="relative mb-3 group">
        <select
          value={autoDeleteMode}
          onChange={handleModeChange}
          className="w-full appearance-none bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs rounded-xl pl-3 pr-8 py-2.5 outline-none cursor-pointer focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-sm"
        >
          <option value="never">Auto-Delete: Never</option>
          <option value="30">Delete Older than 30 Days</option>
          <option value="7">Delete Older than 7 Days</option>
          <option value="3">Delete Older than 3 Days</option>
          <option value="1">Delete Older than 24 Hours</option>
          <option value="close">Burn on Close (Incognito)</option>
        </select>
        <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-zinc-600 group-focus-within:text-indigo-400 transition-colors">
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
      </div>

      <input
        type="file"
        accept=".securep2p"
        ref={fileInputRef}
        onChange={handleImportChat}
        className="hidden"
      />

      <div className="flex gap-2">
        <button
          onClick={triggerFileInput}
          className="flex-1 text-xs font-medium bg-zinc-900 hover:bg-zinc-800 text-zinc-300 py-2.5 rounded-xl border border-zinc-800 transition-colors flex items-center justify-center gap-1.5 shadow-sm"
        >
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16v1a3 3 0 013-3h10a3 3 0 013 3v1m-4-8l-4-4m0 0L8 8m4-4v12"
            />
          </svg>
          Import
        </button>
        <button
          onClick={handleExportChat}
          className="flex-1 text-xs font-medium bg-zinc-900 hover:bg-zinc-800 text-zinc-300 py-2.5 rounded-xl border border-zinc-800 transition-colors flex items-center justify-center gap-1.5 shadow-sm"
        >
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
            />
          </svg>
          Export
        </button>
      </div>
    </div>
  );
}
