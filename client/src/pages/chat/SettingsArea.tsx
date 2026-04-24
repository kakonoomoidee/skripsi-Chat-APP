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
import {
  ShieldCheckIcon,
  WarningIcon,
  XIcon,
  ImportIcon,
  ExportIcon,
  TrashIcon,
  LockSessionIcon,
} from "@/components/icons";

/**
 * Renders a consistent card section header with an icon and label.
 *
 * @param {{ icon: React.ReactNode; label: string }} props
 * @returns {React.JSX.Element}
 */
const CardHeader = ({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: string;
}): React.JSX.Element => (
  <div className="flex items-center gap-2.5 px-5 py-4 border-b border-zinc-800/60">
    <div className="w-6 h-6 rounded-md bg-indigo-500/10 border border-indigo-500/15 flex items-center justify-center shrink-0">
      {icon}
    </div>
    <h3 className="text-[11px] font-bold text-zinc-300 uppercase tracking-[0.12em]">
      {label}
    </h3>
  </div>
);

/**
 * Full-panel Settings view matching the image_11 high-fidelity specification.
 *
 * @returns {React.JSX.Element}
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

  const [autoBackupMode, setAutoBackupMode] = useState<string>(
    () => localStorage.getItem("securep2p_auto_backup_mode") || "never",
  );

  const isIncognito = autoDeleteMode === "close";

  const deleteOptions = [
    { value: "never", label: "Never" },
    { value: "30", label: "Older than 30 Days" },
    { value: "7", label: "Older than 7 Days" },
    { value: "3", label: "Older than 3 Days" },
    { value: "1", label: "Older than 24 Hours" },
    { value: "close", label: "Burn on Close" },
  ];

  const backupOptions = [
    { value: "never", label: "Never" },
    { value: "1", label: "Daily" },
    { value: "3", label: "Every 3 Days" },
    { value: "7", label: "Weekly" },
    { value: "30", label: "Monthly" },
  ];

  const blockedContacts = useLiveQuery(
    () => db.contacts.where("status").equals("blocked").toArray(),
    [],
    [],
  );


  /**
   * Resets a blocked contact to `'pending'` so they can re-initiate a handshake.
   *
   * @param {string} peerAddress - The wallet address to unblock.
   * @returns {Promise<void>}
   */
  const handleUnblock = async (peerAddress: string): Promise<void> => {
    const existing = await db.contacts.get(peerAddress);
    if (!existing) return;
    await db.contacts.put({ ...existing, status: "pending" });
  };

  return (
    <div className="flex flex-col h-full bg-[#0d0d10] w-full overflow-hidden">

      <div className="h-14 shrink-0 border-b border-zinc-800/60 flex items-center px-5 bg-[#0d0d10]/95 backdrop-blur-sm justify-between z-10">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveAreaView("chat")}
            className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-100 hover:bg-zinc-800 transition-all"
          >
            <XIcon className="w-4 h-4" />
          </button>
          <span className="text-xs font-semibold text-zinc-400 tracking-wide">
            Settings
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? "bg-emerald-400" : "bg-red-500"}`} />
          <span className="text-[10px] text-zinc-600">
            {isConnected ? "Relay Online" : "Disconnected"}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="p-5 space-y-4">

          <div className="bg-zinc-900/60 border border-zinc-800/70 rounded-2xl px-5 py-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-600 to-purple-700 flex items-center justify-center text-white font-bold text-lg shadow-lg shrink-0 ring-2 ring-indigo-500/20">
              {myUsername?.charAt(0)?.toUpperCase() ?? "?"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-bold text-zinc-100 capitalize">{myUsername}</p>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Online
                </span>
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <p className="font-mono text-[10px] text-zinc-500 truncate">{address ?? "—"}</p>
              </div>
            </div>
            <button className="shrink-0 flex items-center gap-1.5 text-xs font-semibold text-zinc-400 border border-zinc-700 hover:border-indigo-500/50 hover:text-indigo-400 px-3 py-2 rounded-xl transition-all">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
              </svg>
              Edit Profile
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

            <div className="lg:col-span-3 bg-zinc-900/60 border border-zinc-800/70 rounded-2xl overflow-visible">
              <CardHeader
                label="Web3 Wallet Configuration"
                icon={
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3" />
                  </svg>
                }
              />
              <div className="px-5 py-4">
                <Web3Wallet />
              </div>
            </div>

            <div className="lg:col-span-2 flex flex-col gap-4 relative z-50">

              <div className="bg-zinc-900/60 border border-zinc-800/70 rounded-2xl overflow-visible relative z-20">
                <CardHeader
                  label="Data Management"
                  icon={
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375" />
                    </svg>
                  }
                />

                <div className="divide-y divide-zinc-800/50">

                  <div className="px-4 py-3 flex items-center justify-between gap-2 relative z-[60]">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-zinc-200">Message Retention</p>
                      <p className="text-[10px] text-zinc-600 mt-0.5">Auto-delete older messages</p>
                    </div>
                    <div className="w-52 shrink-0">
                      <GlassDropdown
                        value={autoDeleteMode}
                        options={deleteOptions}
                        onChange={(val) => {
                          handleModeChange({ target: { value: val } } as any);
                          showToast(`Retention updated`, "success");
                        }}
                      />
                    </div>
                  </div>

                  <div className="px-4 py-3 space-y-2 relative z-[20]">
                    <div>
                      <p className="text-xs font-semibold text-zinc-200">Data Backup</p>
                      <p className="text-[10px] text-zinc-600 mt-0.5">Sync local state to decentralized cloud</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (isIncognito) showToast("Disable Incognito Mode to import.", "error");
                          else fileInputRef.current?.click();
                        }}
                        className={`flex-1 text-xs font-semibold py-2 rounded-xl border flex items-center justify-center gap-1.5 transition-colors ${
                          isIncognito
                            ? "opacity-50 cursor-not-allowed bg-zinc-900 border-zinc-800 text-zinc-600"
                            : "bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-zinc-700"
                        }`}
                      >
                        <ImportIcon className="w-3.5 h-3.5" /> Import
                      </button>
                      <button
                        onClick={handleExportChat}
                        className="flex-1 text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 py-2 rounded-xl border border-zinc-700 flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <ExportIcon className="w-3.5 h-3.5" /> Export
                      </button>
                    </div>
                    <input type="file" accept=".securep2p" ref={fileInputRef} onChange={handleImportChat} className="hidden" />
                  </div>

                  <div className="px-4 py-3 space-y-2 relative z-[40]">
                    <p className="text-xs font-semibold text-zinc-200">Auto-Backup</p>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <GlassDropdown
                          value={autoBackupMode}
                          options={backupOptions}
                          onChange={(val) => {
                            setAutoBackupMode(val);
                            localStorage.setItem("securep2p_auto_backup_mode", val);
                            showToast(`Schedule updated`, "success");
                          }}
                        />
                      </div>
                      <span className={`shrink-0 text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                        autoBackupMode === "never"
                          ? "text-zinc-500 bg-zinc-800/50 border-zinc-700/50"
                          : "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                      }`}>
                        {autoBackupMode === "never" ? "Inactive" : "Active"}
                      </span>
                    </div>
                  </div>

                </div>
              </div>

              <div className="bg-zinc-900/60 border border-zinc-800/70 rounded-2xl overflow-visible relative z-10">
                <CardHeader
                  label="Network Node"
                  icon={
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253" />
                    </svg>
                  }
                />
                <div className="px-4 py-3 flex items-center justify-between">
                  <span className="font-mono text-xs text-zinc-300 truncate">{activeRelay}</span>
                  <span className={`shrink-0 ml-2 text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 border ${
                    isConnected
                      ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                      : "text-red-400 bg-red-500/10 border-red-500/20"
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? "bg-emerald-400" : "bg-red-400"}`} />
                    {isConnected ? "Active" : "Offline"}
                  </span>
                </div>
                <div className="px-4 pb-4 overflow-visible relative z-[50]">
                  <RelaySelector
                    activeRelay={activeRelay}
                    defaultRelays={defaultRelays}
                    changeRelay={changeRelay}
                    addCustomRelay={addCustomRelay}
                  />
                </div>
              </div>

            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-6">

            <div className="bg-zinc-900/60 border border-zinc-800/70 rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800/60">
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-md bg-indigo-500/10 border border-indigo-500/15 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                    </svg>
                  </div>
                  <h3 className="text-[11px] font-bold text-zinc-300 uppercase tracking-[0.12em]">Blocked Users</h3>
                </div>
                {blockedContacts && blockedContacts.length > 0 && (
                  <span className="text-[10px] font-bold text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-full">
                    {blockedContacts.length} blocked
                  </span>
                )}
              </div>

              {blockedContacts && blockedContacts.length > 0 ? (
                <ul className="divide-y divide-zinc-800/50">
                  {blockedContacts.map((contact) => (
                    <li key={contact.address} className="flex items-center justify-between px-5 py-3 gap-3 hover:bg-zinc-800/30 transition-colors">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-400 font-bold text-xs shrink-0">
                          {(contact.username ?? "?").charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-zinc-200 capitalize truncate">{contact.username ?? "Unknown"}</p>
                          <p className="font-mono text-[9px] text-zinc-600 truncate">{shortenAddress(contact.address)}</p>
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
              ) : (
                <div className="flex flex-col items-center justify-center py-14 gap-3">
                  <div className="w-12 h-12 rounded-full bg-zinc-800/50 border border-zinc-700/30 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                    </svg>
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-semibold text-zinc-500">No blocked users</p>
                    <p className="text-[10px] text-zinc-700 uppercase tracking-widest mt-1">Everything looks clear</p>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-zinc-900/60 border border-zinc-800/70 rounded-2xl overflow-hidden">
              <CardHeader
                label="Security & Privacy"
                icon={<ShieldCheckIcon className="w-3.5 h-3.5 text-red-400" />}
              />
              <div className="px-5 py-4 space-y-4">
                <div className="bg-red-950/40 border border-red-500/20 rounded-xl p-4 space-y-3">
                  <p className="text-xs font-bold text-red-400">Wipe Local Identity</p>
                  <p className="text-[11px] text-zinc-500 leading-relaxed">
                    Permanently clear your private keys, message cache, and contact metadata from this device. This cannot be undone.
                  </p>
                  <button
                    onClick={handleWipeData}
                    className="w-full bg-red-600 hover:bg-red-500 text-white text-xs font-bold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <TrashIcon className="w-3.5 h-3.5" />
                    Purge All Local Data
                  </button>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-zinc-800/50">
                  <p className="text-xs font-semibold text-zinc-400">Encryption Layer</p>
                  <span className="font-mono text-xs font-bold text-indigo-400">AES-256-GCM</span>
                </div>
                <button
                  onClick={logout}
                  className="w-full flex items-center justify-center gap-2 text-xs font-semibold text-zinc-400 hover:text-zinc-200 border border-zinc-800 hover:border-zinc-600 hover:bg-zinc-800 py-2.5 rounded-xl transition-all"
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
          <div className="fixed inset-0 z-[300] flex items-center justify-center bg-zinc-950/90 backdrop-blur-sm p-4">
            <div className={`bg-zinc-900 border rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200 ${seedModal.type === "wipe" ? "border-red-500/30" : "border-zinc-800"}`}>
              <div className="flex items-center gap-3 mb-2">
                {seedModal.type === "wipe" && (
                  <div className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center shrink-0 text-red-400">
                    <WarningIcon className="w-5 h-5" />
                  </div>
                )}
                <h3 className={`text-lg font-bold ${seedModal.type === "wipe" ? "text-red-400" : "text-zinc-100"}`}>
                  {seedModal.type === "export" ? "Encrypt Backup" : seedModal.type === "import" ? "Decrypt Backup" : "Confirm Data Wipe"}
                </h3>
              </div>
              <p className="text-xs text-zinc-400 mb-4">Enter your 12-word identity seed phrase to authenticate.</p>
              <SeedPhraseModalInput value={seedInput} onChange={setSeedInput} />
              {modalError && (
                <p className="text-[11px] font-medium text-red-400 mt-4 bg-red-500/10 p-2 rounded-lg border border-red-500/20">
                  {modalError}
                </p>
              )}
              <div className="flex gap-3 mt-4">
                <button onClick={closeSeedModal} className="flex-1 py-2.5 rounded-xl text-xs font-medium text-zinc-400 hover:bg-zinc-800 transition-colors">
                  Cancel
                </button>
                <button
                  onClick={submitSeedModal}
                  disabled={!seedInput.trim()}
                  className={`flex-1 text-white py-2.5 rounded-xl text-xs font-medium transition-colors disabled:opacity-50 ${seedModal.type === "wipe" ? "bg-red-600 hover:bg-red-500" : "bg-indigo-600 hover:bg-indigo-500"}`}
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
