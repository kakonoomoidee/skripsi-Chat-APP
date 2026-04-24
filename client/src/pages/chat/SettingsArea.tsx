import React from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { useChatContext } from "@/context/ChatContext";
import { db } from "@/utils/db";
import { shortenAddress } from "@/utils/format";
import ProfileSection from "@/layouts/sidebar/ProfileSection";
import SecuritySection from "@/layouts/sidebar/SecuritySection";
import RelaySelector from "@/components/ui/RelaySelector";
import { ShieldCheckIcon, WarningIcon, XIcon } from "@/components/icons";

/**
 * Full-panel Settings view rendered to the right of the Sidebar.
 *
 * Sections:
 * - Profile: username, address, relay connection status
 * - Security: wallet, network node, data security sub-sections
 * - Blocked Users: live-queried from the Dexie `contacts` table,
 *   with an "Unblock" action that resets the peer's status to `'pending'`.
 *
 * @returns {React.JSX.Element} The settings area panel.
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

  const blockedContacts = useLiveQuery(
    () => db.contacts.where("status").equals("blocked").toArray(),
    [],
    [],
  );

  /**
   * Resets a blocked contact's status to `'pending'`, making them visible
   * in the contact request banner again if they re-initiate a handshake.
   *
   * @param {string} peerAddress - The lowercase wallet address to unblock.
   * @returns {Promise<void>}
   */
  const handleUnblock = async (peerAddress: string): Promise<void> => {
    const existing = await db.contacts.get(peerAddress);
    if (!existing) return;
    await db.contacts.put({
      ...existing,
      status: "pending",
    });
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950 w-full overflow-hidden">
      <div className="h-16 shrink-0 border-b border-zinc-800 flex items-center px-6 md:px-8 bg-zinc-950 justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveAreaView("chat")}
            className="p-2 rounded-full text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
            title="Back to chat"
          >
            <XIcon className="w-5 h-5" />
          </button>
          <h2 className="text-base font-bold text-zinc-100 tracking-tight">
            Settings
          </h2>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="max-w-2xl mx-auto px-6 md:px-8 py-8 space-y-8">

          <section>
            <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-widest mb-3">
              My Profile
            </label>
            <div className="bg-zinc-900/60 backdrop-blur-sm border border-zinc-800 rounded-2xl p-5">
              <ProfileSection
                myUsername={myUsername}
                address={address}
                isConnected={isConnected}
              />
            </div>
          </section>

          <section>
            <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-widest mb-3">
              Security & Network
            </label>
            <div className="bg-zinc-900/60 backdrop-blur-sm border border-zinc-800 rounded-2xl p-5">
              <SecuritySection
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
          </section>

          <section>
            <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-widest mb-3">
              Blocked Users
            </label>
            <div className="bg-zinc-900/60 backdrop-blur-sm border border-zinc-800 rounded-2xl overflow-hidden">
              {blockedContacts && blockedContacts.length > 0 ? (
                <ul className="divide-y divide-zinc-800/70">
                  {blockedContacts.map((contact) => (
                    <li
                      key={contact.address}
                      className="flex items-center justify-between px-5 py-4 group hover:bg-zinc-800/40 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-400 font-bold text-sm shrink-0">
                          {(contact.username ?? "?").charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-zinc-200 capitalize truncate">
                            {contact.username ?? "Unknown"}
                          </p>
                          <p className="font-mono text-[10px] text-zinc-500 mt-0.5">
                            {shortenAddress(contact.address)}
                          </p>
                        </div>
                        <span className="ml-2 shrink-0 inline-flex items-center gap-1 text-[10px] font-semibold text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-full">
                          <WarningIcon className="w-3 h-3" />
                          Blocked
                        </span>
                      </div>
                      <button
                        onClick={() => handleUnblock(contact.address)}
                        className="shrink-0 ml-4 flex items-center gap-1.5 text-xs font-semibold text-emerald-400 border border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/15 px-3 py-1.5 rounded-lg transition-colors"
                      >
                        <ShieldCheckIcon className="w-3.5 h-3.5" />
                        Unblock
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-zinc-600 gap-2">
                  <ShieldCheckIcon className="w-8 h-8 opacity-30" />
                  <p className="text-xs font-medium">No blocked users.</p>
                </div>
              )}
            </div>
          </section>

          <section className="pb-8">
            <div className="bg-zinc-900/60 backdrop-blur-sm border border-zinc-800 rounded-2xl p-5">
              <button
                onClick={logout}
                className="w-full text-sm font-medium text-red-400 hover:text-red-300 bg-red-500/5 hover:bg-red-500/10 border border-red-500/20 py-3 rounded-xl transition-colors"
              >
                Sign Out
              </button>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}
