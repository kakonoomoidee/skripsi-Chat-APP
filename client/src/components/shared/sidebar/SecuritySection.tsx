import { ChangeEvent, useRef, useState, useEffect } from "react";

// ==========================================
// ICON COMPONENTS
// ==========================================
const ChevronDownIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M19.5 8.25l-7.5 7.5-7.5-7.5"
    />
  </svg>
);

const ImportIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
    />
  </svg>
);

const ExportIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
    />
  </svg>
);

const InfoIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

// ==========================================
// MAIN COMPONENT
// ==========================================
export interface SecuritySectionProps {
  autoDeleteMode: string;
  handleModeChange: (e: ChangeEvent<HTMLSelectElement>) => void;
  handleExportChat: () => void;
  handleImportChat: (e: ChangeEvent<HTMLInputElement>) => void;
}

/**
 * Security & Data Section Component
 * Manages chat history retention policies using custom dropdowns and file handlers.
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
  const containerRef = useRef<HTMLDivElement>(null);

  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [showInfo, setShowInfo] = useState<boolean>(false);

  const deleteOptions = [
    { value: "never", label: "Auto-Delete: Never" },
    { value: "30", label: "Delete Older than 30 Days" },
    { value: "7", label: "Delete Older than 7 Days" },
    { value: "3", label: "Delete Older than 3 Days" },
    { value: "1", label: "Delete Older than 24 Hours" },
    { value: "close", label: "Burn on Close (Incognito)" },
  ];

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setShowInfo(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleOptionSelect = (value: string) => {
    const syntheticEvent = {
      target: { value },
    } as ChangeEvent<HTMLSelectElement>;
    handleModeChange(syntheticEvent);
    setIsOpen(false);
  };

  const activeLabel =
    deleteOptions.find((opt) => opt.value === autoDeleteMode)?.label ||
    "Select Mode";

  return (
    <div ref={containerRef}>
      <div className="flex items-center gap-1.5 mb-2 relative">
        <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">
          Security & Data
        </label>

        <button
          type="button"
          onClick={() => {
            setShowInfo(!showInfo);
            setIsOpen(false);
          }}
          className={`transition-colors focus:outline-none ${showInfo ? "text-indigo-400" : "text-zinc-500 hover:text-zinc-300"}`}
        >
          <InfoIcon className="w-3.5 h-3.5" />
        </button>

        {showInfo && (
          <div className="absolute left-0 top-6 z-50 w-64 p-3 bg-zinc-800 border border-zinc-700 rounded-xl shadow-xl text-xs text-zinc-300 leading-relaxed animate-in fade-in slide-in-from-bottom-1 duration-150">
            <strong>Auto-Delete</strong> only removes messages from your local
            device. Due to the P2P architecture, it cannot delete messages
            stored on your peer's device.
          </div>
        )}
      </div>

      <div className="relative mb-3">
        <button
          type="button"
          onClick={() => {
            setIsOpen(!isOpen);
            setShowInfo(false);
          }}
          className={`w-full bg-zinc-900 border ${isOpen ? "border-indigo-500 ring-1 ring-indigo-500" : "border-zinc-800"} text-zinc-300 text-xs rounded-xl pl-3 pr-8 py-2.5 outline-none text-left transition-all shadow-sm flex items-center justify-between`}
        >
          <span className="truncate">{activeLabel}</span>
          <ChevronDownIcon
            className={`w-4 h-4 text-zinc-500 transition-transform duration-200 absolute right-3 ${isOpen ? "rotate-180 text-indigo-400" : ""}`}
          />
        </button>

        {isOpen && (
          <div className="absolute z-50 w-full mt-2 bg-zinc-900 border border-zinc-800 rounded-xl shadow-xl shadow-black/50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
            <ul className="py-1">
              {deleteOptions.map((opt) => (
                <li key={opt.value}>
                  <button
                    type="button"
                    onClick={() => handleOptionSelect(opt.value)}
                    className={`w-full text-left px-4 py-2.5 text-xs transition-colors ${
                      autoDeleteMode === opt.value
                        ? "bg-indigo-600/10 text-indigo-400 font-medium"
                        : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                    }`}
                  >
                    {opt.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
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
          <ImportIcon className="w-3.5 h-3.5" />
          Import
        </button>
        <button
          onClick={handleExportChat}
          className="flex-1 text-xs font-medium bg-zinc-900 hover:bg-zinc-800 text-zinc-300 py-2.5 rounded-xl border border-zinc-800 transition-colors flex items-center justify-center gap-1.5 shadow-sm"
        >
          <ExportIcon className="w-3.5 h-3.5" />
          Export
        </button>
      </div>
    </div>
  );
}
