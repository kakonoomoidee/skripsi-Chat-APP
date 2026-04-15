import React, { useState } from "react";
import { shortenAddress } from "@/utils/format";
import { useChatContext } from "@/context/ChatContext";

import RelaySelector from "./RelaySelector";
import ProfileSection from "./sidebar/ProfileSection";
import SecuritySection from "./sidebar/SecuritySection";
import {
  LockSessionIcon,
  SearchIcon,
  WarningIcon,
  GhostIcon,
  ArrowRightIcon,
} from "@/components/icons";

/**
 * Interface for contact history.
 */
interface ContactHistory {
  username: string;
  address: string;
}

/**
 * Main sidebar component for navigation, displaying active sessions, pending requests, and settings.
 *
 * @returns {React.JSX.Element} The sidebar UI.
 */
export default function Sidebar(): React.JSX.Element {
  const {
    myUsername,
    address,
    isConnected,
    activeRelay,
    defaultRelays,
    changeRelay,
    addCustomRelay,
    activeSessions,
    activeChat,
    switchChat,
    connectedPeers,
    targetUsername,
    setTargetUsername,
    isSearching,
    handleConnectPeer,
    pendingRequests,
    handleAcceptRequest,
    handleRejectRequest,
    logout,
    searchError,
  } = useChatContext();


  const [activeTab, setActiveTab] = useState<"chats" | "requests" | "settings">(
    "chats",
  );

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

  const filteredSessions = activeSessions.filter((s) =>
    s.username.toLowerCase().includes(targetUsername.toLowerCase()),
  );

  const isSelfChat =
    targetUsername.trim().toLowerCase() === myUsername?.toLowerCase();

  return (
    <>
      <div className="w-full h-full flex flex-col bg-zinc-950/90 backdrop-blur-xl">
        <div className="p-5 flex items-center gap-3 border-b border-zinc-800/50 shrink-0">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <LockSessionIcon className="w-5 h-5 text-white" />
          </div>
          <h2 className="text-lg font-bold text-zinc-100 tracking-tight">
            Secure<span className="text-indigo-400">P2P</span>
          </h2>
        </div>

        <div className="flex px-4 pt-4 gap-1 border-b border-zinc-800/50 shrink-0">
          <button
            onClick={() => setActiveTab("chats")}
            className={`flex-1 pb-3 text-xs font-semibold uppercase tracking-widest transition-colors ${
              activeTab === "chats"
                ? "text-indigo-400 border-b-2 border-indigo-500"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            Chats
          </button>
          <button
            onClick={() => setActiveTab("requests")}
            className={`flex-1 pb-3 text-xs font-semibold uppercase tracking-widest transition-colors flex justify-center items-center gap-1.5 ${
              activeTab === "requests"
                ? "text-amber-400 border-b-2 border-amber-500"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            Requests
            {pendingRequests.length > 0 && (
              <span className="bg-amber-500 text-amber-950 rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-bold">
                {pendingRequests.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("settings")}
            className={`flex-1 pb-3 text-xs font-semibold uppercase tracking-widest transition-colors ${
              activeTab === "settings"
                ? "text-zinc-100 border-b-2 border-zinc-300"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            Settings
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col">
          {activeTab === "chats" && (
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
                          <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></span>
                          Searching Network...
                        </>
                      ) : (
                        "Start Handshake"
                      )}
                    </button>
                  )}
                </div>
              )}

              <div className="space-y-1.5 flex-1">
                {filteredSessions.map((session) => (
                  <div
                    key={session.address}
                    onClick={() => switchChat(session)}
                    className={`p-3 rounded-xl cursor-pointer transition-all flex items-center justify-between group ${
                      activeChat === session.address
                        ? "bg-indigo-600/10 border border-indigo-500/30"
                        : "hover:bg-zinc-900 border border-transparent"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-300 font-bold group-hover:bg-zinc-700 transition-colors">
                        {session.username.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-zinc-100 capitalize leading-tight">
                          {session.username}
                        </p>
                        <p className="font-mono text-[10px] text-zinc-500 mt-0.5">
                          {shortenAddress(session.address)}
                        </p>
                      </div>
                    </div>
                    <div
                      className={`w-2 h-2 rounded-full ${
                        connectedPeers.includes(session.address.toLowerCase())
                          ? "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.4)]"
                          : "bg-amber-500 animate-pulse"
                      }`}
                    ></div>
                  </div>
                ))}

                {recentContacts.filter(
                  (rc) =>
                    !activeSessions.some((as) => as.username === rc.username),
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
                              onClick={() =>
                                setTargetUsername(contact.username)
                              }
                              className="p-2.5 rounded-xl cursor-pointer hover:bg-zinc-900 border border-transparent transition-all flex items-center justify-between group"
                            >
                              <div className="flex items-center gap-3 opacity-50 group-hover:opacity-100 transition-opacity">
                                <div className="w-8 h-8 rounded-full bg-zinc-800/50 border border-zinc-700/50 flex items-center justify-center text-zinc-400 font-bold text-xs">
                                  {contact.username.charAt(0).toUpperCase()}
                                </div>
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
            </div>
          )}

          {activeTab === "requests" && (
            <div className="p-4">
              {pendingRequests.length > 0 ? (
                <div className="space-y-3">
                  {pendingRequests.map((req, index) => (
                    <div
                      key={index}
                      className="bg-zinc-900 p-4 rounded-xl border border-amber-500/20 shadow-sm relative overflow-hidden"
                    >
                      <div className="absolute top-0 left-0 w-1 h-full bg-amber-500"></div>
                      <p className="font-semibold text-sm text-zinc-100 capitalize">
                        {req.username}
                      </p>
                      <p className="font-mono text-[10px] text-zinc-500 mb-4 mt-0.5">
                        {shortenAddress(req.from)}
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            handleAcceptRequest(req);
                            setActiveTab("chats");
                          }}
                          className="flex-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-medium py-2 rounded-lg transition-colors border border-emerald-500/20"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => handleRejectRequest(req.from)}
                          className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 text-xs font-medium py-2 rounded-lg transition-colors"
                        >
                          Ignore
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center text-zinc-600 mt-10">
                  <p className="text-xs">No pending requests.</p>
                </div>
              )}
            </div>
          )}

          {activeTab === "settings" && (
            <div className="p-4 space-y-5">
              <ProfileSection
                myUsername={myUsername}
                address={address}
                isConnected={isConnected}
              />

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

              <div className="pt-4 border-t border-zinc-800/50">
                <button
                  onClick={logout}
                  className="w-full text-xs font-medium text-zinc-400 hover:text-zinc-200 bg-zinc-900 hover:bg-zinc-800 py-2.5 rounded-xl border border-zinc-800 transition-colors flex items-center justify-center gap-2"
                >
                  <LockSessionIcon className="w-3.5 h-3.5" />
                  Lock Session
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

    </>
  );
}
