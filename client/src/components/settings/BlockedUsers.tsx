import React from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/utils/db";
import { shortenAddress } from "@/utils/format";
import { BanIcon } from "@/components/icons";

/**
 * Renders the list of blocked users and provides functionality to unblock them.
 *
 * @returns {React.JSX.Element} The Blocked Users component.
 */
export default function BlockedUsers(): React.JSX.Element {
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
    <>
      <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800/60">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-md bg-indigo-500/10 border border-indigo-500/15 flex items-center justify-center">
            <BanIcon className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <h3 className="text-[11px] font-bold text-zinc-300 uppercase tracking-[0.12em]">
            Blocked Users
          </h3>
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
            <li
              key={contact.address}
              className="flex items-center justify-between px-5 py-3 gap-3 hover:bg-zinc-800/30 transition-colors"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-400 font-bold text-xs shrink-0">
                  {(contact.username ?? "?").charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-zinc-200 capitalize truncate">
                    {contact.username ?? "Unknown"}
                  </p>
                  <p className="font-mono text-[9px] text-zinc-600 truncate">
                    {shortenAddress(contact.address)}
                  </p>
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
            <BanIcon className="w-6 h-6 text-zinc-600" />
          </div>
          <div className="text-center">
            <p className="text-xs font-semibold text-zinc-500">
              No blocked users
            </p>
            <p className="text-[10px] text-zinc-700 uppercase tracking-widest mt-1">
              Everything looks clear
            </p>
          </div>
        </div>
      )}
    </>
  );
}
