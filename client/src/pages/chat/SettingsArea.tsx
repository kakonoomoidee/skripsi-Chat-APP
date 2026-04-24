import React, { useState, useRef } from "react";
import { createPortal } from "react-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { useChatContext } from "@/context/ChatContext";
import { db } from "@/utils/db";
import { shortenAddress } from "@/utils/format";
import { useSecurityHandlers } from "@/hooks/security/useSecurityHandlers";
import GlassDropdown from "@/components/ui/GlassDropdown";
import { SeedPhraseModalInput } from "@/components/ui";
import RelaySelector from "@/components/ui/RelaySelector";
import Web3Wallet from "@/layouts/sidebar/security/Web3Wallet";
import NetworkNode from "@/layouts/sidebar/security/NetworkNode";
import {
  ShieldCheckIcon,
  WarningIcon,
  XIcon,
  CopyIcon,
  ImportIcon,
  ExportIcon,
  InfoIcon,
  TrashIcon,
  LockSessionIcon,
} from "@/components/icons";

/**
 * Section heading component used inside the Settings area for consistent
 * visual hierarchy across all cards.
 *
 * @param {{ label: string }} props - Section title text.
 * @returns {React.JSX.Element}
 */
const SectionLabel = ({ label }: { label: string }): React.JSX.Element => (
  <p className="text-[10px] font-bold text-indigo-400/80 uppercase tracking-[0.15em] mb-3">
    {label}
  </p>
);

/**
 * Thin divider used between composable card rows.
 *
 * @returns {React.JSX.Element}
 */
const Divider = (): React.JSX.Element => (
  <div className="border-t border-zinc-800/60" />
);

/**
 * Full-panel, space-filling Settings view rendered to the right of the Sidebar.
 *
 * Layout philosophy:
 * - Uses a responsive two-column grid for the upper section so no empty voids appear.
 * - Smaller focused cards (Security, Blocked Users) each span the full grid width below.
 * - All data-management logic is inlined directly from DataSecurity to give full
 *   layout control without fighting the old sidebar-oriented sizing.
 *
 * @returns {React.JSX.Element} The full-panel settings interface.
 */
export default function SettingsArea(): React.JSX.Element {
  const {
    myUsername,
    address,
    isConnected,
    activeRelay,
    defaultRelays,
    changeRelay,
    addCustomRelay,
    setActiveAreaView,
    logout,
  } = useChatContext();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    autoDeleteMode,
    handleModeChange,
    handleExportChat,
    handleImportChat,
    handleWipeData,
    seedModal,
    closeSeedModal,
    seedInput,
    setSeedInput,
    modalError,
    submitSeedModal,
    showToast,
  } = useSecurityHandlers();

  const [showSecurityInfo, setShowSecurityInfo] = useState<boolean>(false);
  const [showBackupInfo, setShowBackupInfo] = useState<boolean>(false);
  const [autoBackupMode, setAutoBackupMode] = useState<string>(() => {
    return localStorage.getItem("securep2p_auto_backup_mode") || "never";
  });
  const [copiedAddr, setCopiedAddr] = useState<string | null>(null);

  const isIncognito = autoDeleteMode === "close";

  const deleteOptions = [
    { value: "never", label: "Auto-Delete: Never" },
    { value: "30", label: "Delete Older than 30 Days" },
    { value: "7", label: "Delete Older than 7 Days" },
    { value: "3", label: "Delete Older than 3 Days" },
    { value: "1", label: "Delete Older than 24 Hours" },
    { value: "close", label: "Burn on Close (Incognito)" },
  ];

  const backupOptions = [
    { value: "never", label: "Auto-Backup: Never" },
    { value: "1", label: "Daily (Every 24 Hours)" },
    { value: "3", label: "Every 3 Days" },
    { value: "7", label: "Weekly (Every 7 Days)" },
    { value: "30", label: "Monthly (Every 30 Days)" },
  ];

  const blockedContacts = useLiveQuery(
    () => db.contacts.where("status").equals("blocked").toArray(),
    [],
    [],
  );

  /**
   * Copies a wallet address to the clipboard and briefly shows a "Copied" state.
   *
   * @param {string} addr - The address string to copy.
   * @returns {void}
   */
  const handleCopyAddress = (addr: string): void => {
    navigator.clipboard.writeText(addr);
    setCopiedAddr(addr);
    setTimeout(() => setCopiedAddr(null), 1800);
  };

  /**
   * Resets a blocked contact's status to `'pending'`, allowing them to
   * re-initiate a handshake that will surface the contact banner again.
   *
   * @param {string} peerAddress - The lowercase wallet address to unblock.
   * @returns {Promise<void>}
   */
  const handleUnblock = async (peerAddress: string): Promise<void> => {
    const existing = await db.contacts.get(peerAddress);
    if (!existing) return;
    await db.contacts.put({ ...existing, status: "pending" });
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950 w-full overflow-hidden">

      <div className="h-16 shrink-0 border-b border-zinc-800/70 flex items-center px-5 md:px-7 bg-zinc-950/95 backdrop-blur-sm justify-between z-10">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setActiveAreaView("chat")}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-all"
            title="Back to chat"
          >
            <XIcon className="w-4 h-4" />
          </button>
          <h2 className="text-sm font-bold text-zinc-100 tracking-tight">
            Settings
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full ${
              isConnected
                ? "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]"
                : "bg-red-500"
            }`}
          />
          <span className="text-[11px] font-medium text-zinc-500">
            {isConnected ? "Relay Online" : "Disconnected"}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="p-5 md:p-7 space-y-5">

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

            <div className="lg:col-span-2 bg-zinc-900/60 backdrop-blur-sm border border-zinc-800/80 rounded-2xl overflow-hidden">
              <div className="px-5 pt-4 pb-3">
                <SectionLabel label="My Identity" />
              </div>
              <Divider />
              <div className="px-5 py-4 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-gradient-to-br from-indigo-600 to-indigo-800 flex items-center justify-center text-white font-bold text-lg shadow-lg shrink-0">
                    {myUsername?.charAt(0)?.toUpperCase() ?? "?"}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-zinc-100 capitalize truncate">
                      {myUsername}
                    </p>
                    <p className="text-[10px] text-zinc-500 font-mono mt-0.5 truncate">
                      {shortenAddress(address ?? "")}
                    </p>
                  </div>
                  <button
                    onClick={() => handleCopyAddress(address ?? "")}
                    className="ml-auto p-1.5 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-all shrink-0"
                    title="Copy address"
                  >
                    <CopyIcon className="w-3.5 h-3.5" />
                  </button>
                </div>

                {address && (
                  <div className="bg-zinc-950/60 rounded-xl p-3 border border-zinc-800/50">
                    <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest mb-1.5">
                      Public Address
                    </p>
                    <div className="flex items-center gap-2">
                      <p className="font-mono text-[10px] text-zinc-300 break-all leading-relaxed flex-1">
                        {address}
                      </p>
                      <button
                        onClick={() => handleCopyAddress(address)}
                        className="shrink-0 text-zinc-600 hover:text-indigo-400 transition-colors"
                      >
                        {copiedAddr === address ? (
                          <span className="text-[9px] font-bold text-emerald-400">
                            Copied!
                          </span>
                        ) : (
                          <CopyIcon className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="lg:col-span-3 bg-zinc-900/60 backdrop-blur-sm border border-zinc-800/80 rounded-2xl overflow-visible relative z-[100]">
              <div className="px-5 pt-4 pb-3">
                <SectionLabel label="Network Node" />
              </div>
              <Divider />
              <div className="px-5 py-4">
                <NetworkNode
                  nodeSelector={
                    <RelaySelector
                      activeRelay={activeRelay}
                      defaultRelays={defaultRelays}
                      changeRelay={changeRelay}
                      addCustomRelay={addCustomRelay}
                    />
                  }
                />
              </div>
            </div>
          </div>

          <div className="bg-zinc-900/60 backdrop-blur-sm border border-zinc-800/80 rounded-2xl overflow-hidden">
            <div className="px-5 pt-4 pb-3">
              <SectionLabel label="Web3 Transaction Wallet" />
            </div>
            <Divider />
            <div className="px-5 py-4">
              <Web3Wallet />
            </div>
          </div>

          <div className="bg-zinc-900/60 backdrop-blur-sm border border-zinc-800/80 rounded-2xl overflow-visible">
            <div className="px-5 pt-4 pb-3">
              <SectionLabel label="Data Management" />
            </div>
            <Divider />

            <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-zinc-800/60">
              <div className="px-5 py-4 space-y-3 relative z-[50]">
                <div className="flex items-center gap-1.5 relative">
                  <p className="text-xs font-semibold text-zinc-300">
                    Message Retention
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowSecurityInfo(!showSecurityInfo)}
                    className={`transition-colors focus:outline-none ${
                      showSecurityInfo
                        ? "text-indigo-400"
                        : "text-zinc-600 hover:text-zinc-400"
                    }`}
                  >
                    <InfoIcon className="w-3.5 h-3.5" />
                  </button>
                  {showSecurityInfo && (
                    <div className="absolute left-0 top-6 z-50 w-60 p-3 bg-zinc-800 border border-zinc-700 rounded-xl shadow-xl text-xs text-zinc-300 leading-relaxed animate-in fade-in slide-in-from-top-1">
                      <strong>Auto-Delete</strong> only removes messages from
                      your local device.
                    </div>
                  )}
                </div>
                <p className="text-[11px] text-zinc-500 leading-relaxed">
                  Control how long encrypted messages are stored locally. All
                  deletions are permanent and only affect your device.
                </p>
                <GlassDropdown
                  value={autoDeleteMode}
                  options={deleteOptions}
                  onChange={(val) => {
                    handleModeChange({ target: { value: val } } as any);
                    const selectedOpt = deleteOptions.find(
                      (opt) => opt.value === val,
                    );
                    showToast(`Policy updated: ${selectedOpt?.label}`, "success");
                  }}
                />
              </div>

              <div className="px-5 py-4 space-y-3 relative z-[40]">
                <div className="flex items-center gap-1.5 relative">
                  <p className="text-xs font-semibold text-zinc-300">
                    Data Backup
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowBackupInfo(!showBackupInfo)}
                    className={`transition-colors focus:outline-none ${
                      showBackupInfo
                        ? "text-indigo-400"
                        : "text-zinc-600 hover:text-zinc-400"
                    }`}
                  >
                    <InfoIcon className="w-3.5 h-3.5" />
                  </button>
                  {showBackupInfo && (
                    <div className="absolute left-0 top-6 z-50 w-60 p-3 bg-zinc-800 border border-zinc-700 rounded-xl shadow-xl text-xs text-zinc-300 leading-relaxed animate-in fade-in slide-in-from-top-1">
                      Export chats and identity as an encrypted file, or import
                      to restore data on a new device.
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
                    className={`flex-1 text-xs font-medium py-2.5 rounded-xl border transition-colors flex items-center justify-center gap-1.5 ${
                      isIncognito
                        ? "bg-zinc-950 border-zinc-800/50 text-zinc-600 cursor-not-allowed opacity-60"
                        : "bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700"
                    }`}
                  >
                    <ImportIcon className="w-3.5 h-3.5" />
                    Import
                  </button>
                  <button
                    onClick={handleExportChat}
                    className="flex-1 text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300 py-2.5 rounded-xl border border-zinc-700 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <ExportIcon className="w-3.5 h-3.5" />
                    Export
                  </button>
                </div>
                <input
                  type="file"
                  accept=".securep2p"
                  ref={fileInputRef}
                  onChange={handleImportChat}
                  className="hidden"
                />
                <GlassDropdown
                  value={autoBackupMode}
                  options={backupOptions}
                  onChange={(val) => {
                    setAutoBackupMode(val);
                    localStorage.setItem("securep2p_auto_backup_mode", val);
                    const selectedOpt = backupOptions.find(
                      (opt) => opt.value === val,
                    );
                    showToast(
                      `Schedule set: ${selectedOpt?.label}`,
                      "success",
                    );
                  }}
                />
              </div>
            </div>
          </div>

          <div className="bg-zinc-900/60 backdrop-blur-sm border border-zinc-800/80 rounded-2xl overflow-visible">
            <div className="px-5 pt-4 pb-3 flex items-center justify-between">
              <SectionLabel label="Blocked Users" />
              {blockedContacts && blockedContacts.length > 0 && (
                <span className="text-[10px] font-bold text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-full mb-3">
                  {blockedContacts.length} blocked
                </span>
              )}
            </div>
            <Divider />

            {blockedContacts && blockedContacts.length > 0 ? (
              <>
                <p className="text-[11px] text-zinc-500 px-5 pt-3 pb-1 leading-relaxed">
                  Unblocking a user allows them to re-initiate a handshake.
                  You will see a contact request banner before any messages
                  are exchanged.
                </p>
                <ul className="divide-y divide-zinc-800/60">
                  {blockedContacts.map((contact) => (
                    <li
                      key={contact.address}
                      className="flex items-center justify-between px-5 py-3.5 gap-4 hover:bg-zinc-800/30 transition-colors group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-full bg-zinc-800 border border-zinc-700/50 flex items-center justify-center text-zinc-400 font-bold text-sm shrink-0">
                          {(contact.username ?? "?").charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-zinc-200 capitalize truncate">
                            {contact.username ?? "Unknown"}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <p className="font-mono text-[10px] text-zinc-500 truncate">
                              {shortenAddress(contact.address)}
                            </p>
                            <button
                              onClick={() =>
                                handleCopyAddress(contact.address)
                              }
                              className="text-zinc-600 hover:text-zinc-300 transition-colors"
                              title="Copy address"
                            >
                              {copiedAddr === contact.address ? (
                                <span className="text-[9px] font-bold text-emerald-400">
                                  Copied!
                                </span>
                              ) : (
                                <CopyIcon className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleUnblock(contact.address)}
                        className="shrink-0 text-xs font-semibold text-zinc-300 border border-zinc-700 hover:border-emerald-500/50 hover:text-emerald-400 hover:bg-emerald-500/5 px-3 py-1.5 rounded-lg transition-all"
                      >
                        Unblock
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 gap-2 text-zinc-600">
                <ShieldCheckIcon className="w-7 h-7 opacity-25" />
                <p className="text-xs font-medium">No blocked users.</p>
                <p className="text-[10px] text-zinc-700">
                  Blocked contacts will appear here.
                </p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pb-8">

            <div className="bg-zinc-900/60 backdrop-blur-sm border border-red-500/15 rounded-2xl overflow-hidden">
              <div className="px-5 pt-4 pb-3">
                <SectionLabel label="Danger Zone" />
              </div>
              <Divider />
              <div className="px-5 py-4 space-y-2">
                <p className="text-xs font-semibold text-zinc-300">
                  Wipe Local Identity
                </p>
                <p className="text-[11px] text-zinc-500 leading-relaxed">
                  Permanently deletes all local messages, your identity keystore,
                  and linked wallets. This action is irreversible.
                </p>
                <button
                  onClick={handleWipeData}
                  className="mt-1 w-full flex items-center justify-center gap-2 text-xs font-bold text-red-400 hover:text-red-300 border border-red-500/25 hover:border-red-500/50 hover:bg-red-500/5 py-2.5 rounded-xl transition-all"
                >
                  <TrashIcon className="w-3.5 h-3.5" />
                  Wipe Local Identity
                </button>
              </div>
            </div>

            <div className="bg-zinc-900/60 backdrop-blur-sm border border-zinc-800/80 rounded-2xl overflow-hidden">
              <div className="px-5 pt-4 pb-3">
                <SectionLabel label="Session" />
              </div>
              <Divider />
              <div className="px-5 py-4 space-y-2">
                <p className="text-xs font-semibold text-zinc-300">
                  Lock Session
                </p>
                <p className="text-[11px] text-zinc-500 leading-relaxed">
                  Signs you out and clears the session token. Your local messages
                  and identity remain intact.
                </p>
                <button
                  onClick={logout}
                  className="mt-1 w-full flex items-center justify-center gap-2 text-xs font-bold text-zinc-300 hover:text-zinc-100 border border-zinc-700 hover:border-zinc-500 hover:bg-zinc-800 py-2.5 rounded-xl transition-all"
                >
                  <LockSessionIcon className="w-3.5 h-3.5" />
                  Sign Out
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>

      {seedModal.isOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div className="fixed inset-0 z-200 flex items-center justify-center bg-zinc-950/85 backdrop-blur-sm p-4">
            <div
              className={`bg-zinc-900 border rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200 ${
                seedModal.type === "wipe"
                  ? "border-red-500/30"
                  : "border-zinc-800"
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                {seedModal.type === "wipe" && (
                  <div className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center shrink-0 text-red-400">
                    <WarningIcon className="w-5 h-5" />
                  </div>
                )}
                <h3
                  className={`text-lg font-bold ${
                    seedModal.type === "wipe"
                      ? "text-red-400"
                      : "text-zinc-100"
                  }`}
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
                  onClick={closeSeedModal}
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
    </div>
  );
}
