import React, { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useSecurityHandlers } from "@/hooks/security/useSecurityHandlers";
import { useDismissablePopover } from "@/hooks/ui/useDismissablePopover";
import GlassDropdown from "@/components/ui/GlassDropdown";
import { SeedPhraseModalInput } from "@/components/ui";
import { updateLastExportTime } from "@/utils/exportUtils";
import {
  BACKUP_OPTIONS,
  DELETE_OPTIONS,
  findOptionLabel,
  getStoredAutoBackupMode,
  setStoredAutoBackupMode,
} from "@/utils/dataSecurity";
import {
  ImportIcon,
  ExportIcon,
  InfoIcon,
  TrashIcon,
  WarningIcon,
} from "@/components/icons";

/**
 * Renders the data security, backup, and retention policy interface.
 *
 * @returns {React.JSX.Element} The Data Security component.
 */
export default function DataSecurity(): React.JSX.Element {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const securityInfo = useDismissablePopover();
  const backupInfo = useDismissablePopover();

  const {
    autoDeleteMode,
    handleModeChange,
    handleExportChat,
    handleImportChat,
    handleWipeData,
    handleCancelSeedModal,
    seedModal,
    seedInput,
    setSeedInput,
    modalError,
    submitSeedModal,
    showToast,
  } = useSecurityHandlers();

  const [autoBackupMode, setAutoBackupMode] = useState<string>(
    getStoredAutoBackupMode,
  );

  const isIncognito = autoDeleteMode === "close";

  return (
    <>
      <div className="flex flex-col h-full w-full shrink-0">
        <div className="space-y-4 w-full">
          <div>
            <div
              className="flex items-center gap-1.5 mb-2 relative"
              ref={securityInfo.containerRef}
            >
              <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">
                Message Retention
              </label>
              <button
                type="button"
                onClick={securityInfo.toggle}
                className={`transition-colors focus:outline-none ${securityInfo.isOpen ? "text-indigo-400" : "text-zinc-500 hover:text-zinc-300"}`}
              >
                <InfoIcon className="w-3.5 h-3.5" />
              </button>
              {securityInfo.isOpen && (
                <div className="absolute left-0 bottom-6 mb-2 z-40 w-64 p-3 bg-zinc-800 border border-zinc-700 rounded-xl shadow-xl text-xs text-zinc-300 leading-relaxed animate-in fade-in slide-in-from-bottom-1">
                  <strong>Auto-Delete</strong> only removes messages from your
                  local device.
                </div>
              )}
            </div>
            <GlassDropdown
              value={autoDeleteMode}
              options={DELETE_OPTIONS}
              onChange={(val) => {
                handleModeChange({ target: { value: val } } as any);
                const selectedLabel = findOptionLabel(DELETE_OPTIONS, val);
                showToast(`Policy updated: ${selectedLabel}`, "success");
              }}
            />
          </div>

          <div>
            <div
              className="flex items-center gap-1.5 mb-2 relative"
              ref={backupInfo.containerRef}
            >
              <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">
                Data Backup
              </label>
              <button
                type="button"
                onClick={backupInfo.toggle}
                className={`transition-colors focus:outline-none ${backupInfo.isOpen ? "text-indigo-400" : "text-zinc-500 hover:text-zinc-300"}`}
              >
                <InfoIcon className="w-3.5 h-3.5" />
              </button>
              {backupInfo.isOpen && (
                <div className="absolute left-0 bottom-6 mb-2 z-40 w-64 p-3 bg-zinc-800 border border-zinc-700 rounded-xl shadow-xl text-xs text-zinc-300 leading-relaxed animate-in fade-in slide-in-from-bottom-1">
                  Export chats and identity as an encrypted file, or import to
                  restore data.
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  if (isIncognito)
                    showToast(
                      "Disable Incognito Mode to import data.",
                      "error",
                    );
                  else fileInputRef.current?.click();
                }}
                className={`flex-1 text-xs font-medium py-2.5 rounded-xl border transition-colors flex items-center justify-center gap-1.5 shadow-sm ${
                  isIncognito
                    ? "bg-zinc-950 border-zinc-800/50 text-zinc-600 cursor-not-allowed opacity-60"
                    : "bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border-zinc-800"
                }`}
              >
                <ImportIcon className="w-3.5 h-3.5" /> Import
              </button>
              <button
                onClick={handleExportChat}
                className="flex-1 text-xs font-medium bg-zinc-900 hover:bg-zinc-800 text-zinc-300 py-2.5 rounded-xl border border-zinc-800 transition-colors flex items-center justify-center gap-1.5 shadow-sm"
              >
                <ExportIcon className="w-3.5 h-3.5" /> Export
              </button>
            </div>
            <input
              type="file"
              accept=".securep2p"
              ref={fileInputRef}
              onChange={handleImportChat}
              className="hidden"
            />
            <div className="mt-3">
              <GlassDropdown
                value={autoBackupMode}
                options={BACKUP_OPTIONS}
                onChange={(val) => {
                  setAutoBackupMode(val);
                  setStoredAutoBackupMode(val);
                  updateLastExportTime();
                  const selectedLabel = findOptionLabel(BACKUP_OPTIONS, val);
                  showToast(`Schedule set: ${selectedLabel}`, "success");
                }}
              />
            </div>
          </div>

          <div className="pt-2 border-t border-zinc-800/50">
            <button
              onClick={handleWipeData}
              className="w-full text-xs font-semibold text-red-400 hover:text-red-300 bg-red-500/5 hover:bg-red-500/10 py-2.5 rounded-xl border border-red-500/10 transition-colors flex items-center justify-center gap-2"
            >
              <TrashIcon className="w-3.5 h-3.5" /> Wipe Local Identity
            </button>
          </div>
        </div>
      </div>

      {seedModal.isOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div className="fixed inset-0 z-200 flex items-center justify-center bg-zinc-950/80 backdrop-blur-sm p-4">
            <div
              className={`bg-zinc-900 border rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200 ${seedModal.type === "wipe" ? "border-red-500/30" : "border-zinc-800"}`}
            >
              <div className="flex items-center gap-3 mb-2">
                {seedModal.type === "wipe" && (
                  <div className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center shrink-0 text-red-400">
                    <WarningIcon className="w-5 h-5" />
                  </div>
                )}
                <h3
                  className={`text-lg font-bold ${seedModal.type === "wipe" ? "text-red-400" : "text-zinc-100"}`}
                >
                  {seedModal.type === "export"
                    ? "Encrypt Backup"
                    : seedModal.type === "import"
                      ? "Decrypt Backup"
                      : "Confirm Data Wipe"}
                </h3>
              </div>
              <p className="text-xs text-zinc-400 mb-4">
                Enter your 12-word identity seed phrase to authenticate.
              </p>

              <SeedPhraseModalInput value={seedInput} onChange={setSeedInput} />

              {modalError && (
                <p className="text-[11px] font-medium text-red-400 mt-4 bg-red-500/10 p-2 rounded-lg border border-red-500/20">
                  {modalError}
                </p>
              )}
              <div className="flex gap-3 mt-4">
                <button
                  onClick={handleCancelSeedModal}
                  className="flex-1 py-2.5 rounded-xl text-xs font-medium text-zinc-400 hover:bg-zinc-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={submitSeedModal}
                  disabled={!seedInput.trim()}
                  className={`flex-1 text-white py-2.5 rounded-xl text-xs font-medium transition-colors disabled:opacity-50 ${
                    seedModal.type === "wipe"
                      ? "bg-red-600 hover:bg-red-500"
                      : "bg-indigo-600 hover:bg-indigo-500"
                  }`}
                >
                  {seedModal.type === "wipe" ? "Wipe Data" : "Confirm"}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
