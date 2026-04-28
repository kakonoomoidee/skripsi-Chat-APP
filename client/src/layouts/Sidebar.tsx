import { useState, useRef } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { useChatContext } from "@/context/ChatContext";
import { db } from "@/utils/storage/db";
import {
  LockSessionIcon,
  SearchIcon,
  WarningIcon,
  GhostIcon,
  BanIcon,
  ArchiveIcon,
  ArrowRightIcon,
  ArrowDownIcon,
  MoreVerticalIcon,
  SettingsCogIcon,
} from "@/components/icons";
import { GlassBadge } from "../components/ui/GlassBadge";
import { PeerAvatar } from "../components/ui/PeerAvatar";
import { useUIStore } from "@/store";
import { useChatStore } from "@/store/useChatStore";
import { useCrypto } from "@/hooks/security/useCrypto";
import { useDismissableLayer } from "@/hooks/ui/useDismissableLayer";

/**
 * Interface for contact history stored in localStorage.
 */
interface ContactHistory {
  username: string;
  address: string;
}

/**
 * Main sidebar component.
 *
 * Features:
 * - Application logo header with a 3-dot overflow menu (Settings / Log out).
 * - Search / "Start Chat" panel for peer discovery.
 * - Active session list split into main and archived sub-lists.
 * - Status dot per session row that reflects the full ConnectionState for the
 *   active chat and simple online/offline for all other rows.
 * - Recent history of disconnected peers.
 * - Three-dot context menu per session row for Archive / Unarchive.
 *
 * @returns {React.JSX.Element} The sidebar UI.
 */
export default function Sidebar(): React.JSX.Element {
  const {
    address,
    myUsername,
    activeSessions,
    activeChat,
    switchChat,
    connectionStates,
    targetUsername,
    setTargetUsername,
    isSearching,
    handleConnectPeer,
    logout,
    closeChat,
    searchError,
    unreadCount,
    archiveContact,
    unarchiveContact,
    forceDisconnectPeer,
    removeActiveSession,
    setActiveAreaView,
  } = useChatContext();

  const setConnectionStates = useChatStore(
    (state) => state.setConnectionStates,
  );
  const showToast = useUIStore((state) => state.showToast);
  const { decryptLocalDB } = useCrypto();

  const [headerMenuOpen, setHeaderMenuOpen] = useState<boolean>(false);
  const [showArchived, setShowArchived] = useState<boolean>(false);
  const [openMenuFor, setOpenMenuFor] = useState<string | null>(null);

  const headerMenuRef = useRef<HTMLDivElement>(null);
  const sessionMenuRef = useRef<HTMLDivElement>(null);

  useDismissableLayer({
    enabled: headerMenuOpen,
    ref: headerMenuRef,
    onDismiss: () => setHeaderMenuOpen(false),
  });

  useDismissableLayer({
    enabled: Boolean(openMenuFor),
    ref: sessionMenuRef,
    onDismiss: () => setOpenMenuFor(null),
  });

  const [recentContacts, setRecentContacts] = useState<ContactHistory[]>(() => {
    try {
      const saved = localStorage.getItem("securep2p_recent_contacts");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [prevSessions, setPrevSessions] = useState(activeSessions);

  if (activeSessions !== prevSessions) {
    setPrevSessions(activeSessions);

    if (activeSessions.length > 0) {
      let isChanged = false;
      const updated = [...recentContacts];

      activeSessions.forEach((session) => {
        if (!updated.find((c) => c.username === session.username)) {
          updated.push({
            username: session.username,
            address: session.address,
          });
          isChanged = true;
        }
      });

      if (isChanged) {
        localStorage.setItem(
          "securep2p_recent_contacts",
          JSON.stringify(updated),
        );
        setRecentContacts(updated);
      }
    }
  }

  const clearHistory = (): void => {
    localStorage.removeItem("securep2p_recent_contacts");
    setRecentContacts([]);
  };

  const allContacts = useLiveQuery(() => db.contacts.toArray(), [], []);

  const sessionLastMessagePreview = useLiveQuery(
    async () => {
      const ownerAddress = address?.toLowerCase();
      if (!ownerAddress || activeSessions.length === 0)
        return {} as Record<string, string>;

      const activeChatIds = new Set(
        activeSessions.map((session) => session.address.toLowerCase()),
      );

      const allSessionMessages = await db.messages
        .filter(
          (message) =>
            message.ownerAddress === ownerAddress &&
            activeChatIds.has(message.chatId),
        )
        .toArray();

      const sortedRecentFirst = allSessionMessages.sort(
        (a, b) => b.timestamp - a.timestamp,
      );

      const previews: Record<string, string> = {};

      sortedRecentFirst.forEach((message) => {
        if (previews[message.chatId]) return;
        const decryptedText = decryptLocalDB(message.text);
        let previewText = decryptedText;
        try {
          const parsed = JSON.parse(decryptedText) as {
            type?: unknown;
            text?: unknown;
          };
          if (parsed && typeof parsed === "object" && "type" in parsed) {
            previewText = "Encrypted message...";
          } else if (typeof parsed?.text === "string") {
            previewText = parsed.text;
          }
        } catch {
          previewText = decryptedText;
        }
        const normalizedText = previewText.trim();
        previews[message.chatId] = normalizedText || "Start chatting...";
      });

      activeSessions.forEach((session) => {
        const chatId = session.address.toLowerCase();
        if (!previews[chatId]) {
          previews[chatId] = "Start chatting...";
        }
      });

      return previews;
    },
    [address, activeSessions, decryptLocalDB],
    {} as Record<string, string>,
  );

  const archivedAddresses = new Set(
    (allContacts ?? [])
      .filter((c) => c.isArchived)
      .map((c) => c.address.toLowerCase()),
  );

  const filteredSessions = activeSessions.filter((s) =>
    s.username.toLowerCase().includes(targetUsername.toLowerCase()),
  );

  const mainSessions = filteredSessions.filter(
    (s) => !archivedAddresses.has(s.address.toLowerCase()),
  );

  const archivedSessions = filteredSessions.filter((s) =>
    archivedAddresses.has(s.address.toLowerCase()),
  );

  const isSelfChat =
    targetUsername.trim().toLowerCase() === myUsername?.toLowerCase();

  /**
   * Derives the Tailwind classes for the status indicator dot of a session row based on the connection status.
   *
   * @param {string} status - The connection status string.
   * @returns {string} Tailwind class string for the dot element.
   */
  const getStatusDotClass = (status: string): string => {
    if (status === "connected") {
      return "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.4)]";
    }
    if (status === "connecting") {
      return "bg-amber-400 animate-pulse";
    }
    if (status === "offline") {
      return "bg-red-500 animate-pulse";
    }
    return "bg-zinc-600";
  };

  /**
   * Renders a single session row with avatar, username, address, status dot,
   * unread badge, and a hover-revealed 3-dot context menu for Archive / Unarchive.
   *
   * @param {object}  session    - The active session data.
   * @param {boolean} isArchived - Whether this row belongs to the archived list.
   * @returns {React.JSX.Element} The session row element.
   */
  const renderSessionRow = (
    session: { address: string; username: string },
    isArchived: boolean,
  ): React.JSX.Element => {
    const addr = session.address.toLowerCase();
    const isActive = activeChat?.toLowerCase() === addr;
    const menuOpen = openMenuFor === addr;
    const status = connectionStates[addr] || "idle";
    const lastMessagePreview =
      sessionLastMessagePreview?.[addr] ?? "Start chatting...";

    return (
      <div
        key={session.address}
        className={`p-3 rounded-xl cursor-pointer transition-all flex items-center justify-between group relative ${
          isActive
            ? "bg-indigo-600/10 border border-indigo-500/30"
            : "hover:bg-zinc-900 border border-transparent"
        }`}
      >
        <div
          className="flex items-center gap-3 flex-1 min-w-0"
          onClick={() => switchChat(session)}
        >
          <PeerAvatar
            peerAddress={addr}
            displayName={session.username}
            sizeClassName="w-9 h-9"
            className="group-hover:ring-1 group-hover:ring-zinc-600 transition-all"
          />
          <div className="min-w-0">
            <p className="font-semibold text-sm text-zinc-100 capitalize leading-tight truncate">
              {session.username}
            </p>
            <p className="text-[11px] text-zinc-500 mt-0.5 truncate">
              {lastMessagePreview}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full ${getStatusDotClass(status)}`}
          />
          <GlassBadge count={unreadCount[addr] ?? 0} variant="chat" />

          <div className="relative">
            <button
              id={`session-menu-${addr}`}
              onClick={(e) => {
                e.stopPropagation();
                setOpenMenuFor(menuOpen ? null : addr);
              }}
              className="p-1 rounded-full text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800 transition-colors opacity-100 md:opacity-0 md:group-hover:opacity-100"
              title="More options"
            >
              <MoreVerticalIcon className="w-3.5 h-3.5" />
            </button>

            {menuOpen && (
              <div
                ref={sessionMenuRef}
                className="absolute right-0 top-full mt-1 w-36 bg-zinc-900 text-zinc-300 border border-zinc-700 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-1"
                onMouseLeave={() => setOpenMenuFor(null)}
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    forceDisconnectPeer(addr);
                    removeActiveSession(addr);
                    setConnectionStates((prev) => ({
                      ...prev,
                      [addr]: "idle",
                    }));
                    if (activeChat?.toLowerCase() === addr) {
                      closeChat();
                    }
                    showToast(
                      "Session terminated and moved to history.",
                      "info",
                    );
                    setOpenMenuFor(null);
                  }}
                  className="w-full text-left text-xs text-red-300 px-4 py-2.5 hover:bg-zinc-800 transition-colors flex items-center gap-2"
                >
                  <BanIcon className="w-3.5 h-3.5" />
                  <span>Disconnect</span>
                </button>
                {isArchived ? (
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      await unarchiveContact(addr);
                      setOpenMenuFor(null);
                    }}
                    className="w-full text-left text-xs text-zinc-300 px-4 py-2.5 hover:bg-zinc-800 transition-colors"
                  >
                    Unarchive
                  </button>
                ) : (
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      await archiveContact(addr);
                      setOpenMenuFor(null);
                    }}
                    className="w-full text-left text-xs text-zinc-300 px-4 py-2.5 hover:bg-zinc-800 transition-colors flex items-center gap-2 group"
                  >
                    <ArchiveIcon className="w-3.5 h-3.5 text-zinc-400 transition-colors group-hover:text-zinc-200" />
                    <span>Archive</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full h-full flex flex-col bg-zinc-950/90 backdrop-blur-xl">
      <div className="p-5 flex items-center justify-between border-b border-zinc-800/50 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <LockSessionIcon className="w-5 h-5 text-white" />
          </div>
          <h2 className="text-lg font-bold text-zinc-100 tracking-tight">
            Secure<span className="text-indigo-400">P2P</span>
          </h2>
        </div>

        <div className="relative" ref={headerMenuRef}>
          <button
            id="sidebar-overflow-menu-btn"
            onClick={() => setHeaderMenuOpen((v) => !v)}
            className="p-2 rounded-full text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
            title="More options"
          >
            <MoreVerticalIcon className="w-4 h-4" />
          </button>

          {headerMenuOpen && (
            <div
              id="sidebar-overflow-menu"
              className="absolute right-0 top-full mt-2 w-44 bg-zinc-800/95 backdrop-blur-sm border border-zinc-700 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-1"
            >
              <button
                onClick={() => {
                  setActiveAreaView("settings");
                  setHeaderMenuOpen(false);
                }}
                className="w-full text-left text-sm text-zinc-200 px-4 py-3 hover:bg-zinc-700/70 transition-colors flex items-center gap-2.5"
              >
                <SettingsCogIcon className="w-4 h-4 text-zinc-400" />
                <span>Settings</span>
              </button>
              <div className="border-t border-zinc-700/50" />
              <button
                onClick={() => {
                  setHeaderMenuOpen(false);
                  logout();
                }}
                className="w-full text-left text-sm text-red-400 px-4 py-3 hover:bg-zinc-700/70 transition-colors flex items-center gap-2.5"
              >
                <LockSessionIcon className="w-4 h-4" />
                Log out
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col">
        <div className="p-4 flex flex-col h-full">
          <div className="relative mb-4 group shrink-0">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-indigo-400 transition-colors" />
            <input
              type="text"
              placeholder="Search or start new chat..."
              value={targetUsername}
              onChange={(e) => setTargetUsername(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-4 py-2 text-sm text-zinc-100 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all placeholder-zinc-600"
            />
          </div>

          {targetUsername && filteredSessions.length === 0 && (
            <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-4 mb-4 text-center shrink-0">
              <p className="text-xs text-zinc-400 mb-3">
                No active session with{" "}
                <span className="text-zinc-200 font-semibold">
                  {targetUsername}
                </span>
              </p>

              {isSelfChat ? (
                <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-medium py-2.5 rounded-lg flex items-center justify-center gap-2">
                  <WarningIcon className="w-4 h-4" />
                  Cannot handshake yourself
                </div>
              ) : searchError ? (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium py-2.5 rounded-lg flex flex-col items-center justify-center gap-1">
                  <div className="flex items-center gap-1.5">
                    <WarningIcon className="w-3.5 h-3.5" />
                    {searchError}
                  </div>
                  <span className="text-[10px] opacity-70">
                    Check the username and try again
                  </span>
                </div>
              ) : (
                <button
                  onClick={handleConnectPeer}
                  disabled={isSearching}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium py-2.5 rounded-lg transition-colors disabled:opacity-50 shadow-sm flex items-center justify-center"
                >
                  {isSearching ? (
                    <>
                      <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                      Searching Network...
                    </>
                  ) : (
                    "Start Chat"
                  )}
                </button>
              )}
            </div>
          )}

          <div className="space-y-1.5 flex-1">
            {mainSessions.map((session) => renderSessionRow(session, false))}

            {recentContacts.filter(
              (rc) => !activeSessions.some((as) => as.username === rc.username),
            ).length > 0 &&
              !targetUsername && (
                <div className="pt-4">
                  <div className="px-2 flex justify-between items-center mb-2">
                    <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">
                      Recent History
                    </label>
                    <button
                      onClick={clearHistory}
                      className="text-[9px] font-semibold text-zinc-500 hover:text-red-400 transition-colors uppercase tracking-widest"
                    >
                      Clear
                    </button>
                  </div>
                  <div className="space-y-1">
                    {recentContacts
                      .filter(
                        (rc) =>
                          !activeSessions.some(
                            (as) => as.username === rc.username,
                          ),
                      )
                      .map((contact) => (
                        <div
                          key={contact.username}
                          onClick={() => setTargetUsername(contact.username)}
                          className="p-2.5 rounded-xl cursor-pointer hover:bg-zinc-900 border border-transparent transition-all flex items-center justify-between group"
                        >
                          <div className="flex items-center gap-3 opacity-50 group-hover:opacity-100 transition-opacity">
                            <PeerAvatar
                              peerAddress={contact.address}
                              displayName={contact.username}
                              sizeClassName="w-8 h-8"
                              className="border border-zinc-700/50"
                            />
                            <div>
                              <p className="font-medium text-sm text-zinc-300 capitalize leading-tight">
                                {contact.username}
                              </p>
                              <p className="font-mono text-[9px] text-zinc-600 mt-0.5">
                                Disconnected
                              </p>
                            </div>
                          </div>
                          <ArrowRightIcon className="w-4 h-4 text-zinc-600 group-hover:text-indigo-400 transition-colors" />
                        </div>
                      ))}
                  </div>
                </div>
              )}

            {activeSessions.length === 0 &&
              recentContacts.length === 0 &&
              !targetUsername && (
                <div className="h-full flex flex-col items-center justify-center text-zinc-600 space-y-2 mt-10">
                  <GhostIcon className="w-8 h-8 opacity-20" />
                  <p className="text-xs">No active sessions or history.</p>
                </div>
              )}
          </div>

          {archivedSessions.length > 0 && (
            <div className="mt-4 shrink-0">
              <button
                onClick={() => setShowArchived((v) => !v)}
                className="w-full flex items-center justify-between px-2 py-2 rounded-xl hover:bg-zinc-900 transition-colors"
              >
                <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">
                  Archived ({archivedSessions.length})
                </span>
                <ArrowDownIcon
                  className={`w-3.5 h-3.5 text-zinc-500 transition-transform ${
                    showArchived ? "rotate-180" : ""
                  }`}
                />
              </button>

              {showArchived && (
                <div className="space-y-1.5 mt-1">
                  {archivedSessions.map((session) =>
                    renderSessionRow(session, true),
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
