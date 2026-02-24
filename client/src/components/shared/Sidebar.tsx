import { useState } from "react";
import { shortenAddress } from "@/utils/format";
import { useChatContext } from "@/context/ChatContext";
import RelaySelector from "./RelaySelector";
import ProfileSection from "./sidebar/ProfileSection";
import SecuritySection from "./sidebar/SecuritySection";

/**
 * 3. Global Sidebar Component connected to Context
 * @returns {JSX.Element}
 */
export default function Sidebar() {
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
    autoDeleteMode,
    handleModeChange,
    handleExportChat,
    handleImportChat,
    logout,
  } = useChatContext();

  const [activeTab, setActiveTab] = useState<"chats" | "requests" | "settings">(
    "chats",
  );

  const filteredSessions = activeSessions.filter((s) =>
    s.username.toLowerCase().includes(targetUsername.toLowerCase()),
  );

  return (
    <div className="w-80 bg-zinc-950/90 flex flex-col border-r border-zinc-800 backdrop-blur-xl h-full">
      <div className="p-5 flex items-center gap-3 border-b border-zinc-800/50">
        <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/20">
          <svg
            className="w-5 h-5 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
        </div>
        <h2 className="text-lg font-bold text-zinc-100 tracking-tight">
          Secure<span className="text-indigo-400">P2P</span>
        </h2>
      </div>

      <div className="flex px-4 pt-4 gap-1 border-b border-zinc-800/50">
        <button
          onClick={() => setActiveTab("chats")}
          className={`flex-1 pb-3 text-xs font-semibold uppercase tracking-widest transition-colors ${activeTab === "chats" ? "text-indigo-400 border-b-2 border-indigo-500" : "text-zinc-500 hover:text-zinc-300"}`}
        >
          Chats
        </button>
        <button
          onClick={() => setActiveTab("requests")}
          className={`flex-1 pb-3 text-xs font-semibold uppercase tracking-widest transition-colors flex justify-center items-center gap-1.5 ${activeTab === "requests" ? "text-amber-400 border-b-2 border-amber-500" : "text-zinc-500 hover:text-zinc-300"}`}
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
          className={`flex-1 pb-3 text-xs font-semibold uppercase tracking-widest transition-colors ${activeTab === "settings" ? "text-zinc-100 border-b-2 border-zinc-300" : "text-zinc-500 hover:text-zinc-300"}`}
        >
          Settings
        </button>
      </div>

      <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] flex flex-col">
        {activeTab === "chats" && (
          <div className="p-4 flex flex-col h-full">
            <div className="relative mb-4 group">
              <svg
                className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500 group-focus-within:text-indigo-400 transition-colors"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                type="text"
                placeholder="Search or start new chat..."
                value={targetUsername}
                onChange={(e) => setTargetUsername(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-4 py-2 text-sm text-zinc-100 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all placeholder-zinc-600"
              />
            </div>

            {targetUsername && filteredSessions.length === 0 && (
              <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-4 mb-4 text-center">
                <p className="text-xs text-zinc-400 mb-3">
                  No active session with{" "}
                  <span className="text-zinc-200 font-semibold">
                    {targetUsername}
                  </span>
                </p>
                <button
                  onClick={handleConnectPeer}
                  disabled={isSearching}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium py-2 rounded-lg transition-colors disabled:opacity-50"
                >
                  {isSearching ? "Searching Network..." : "Start Handshake"}
                </button>
              </div>
            )}

            <div className="space-y-1.5 flex-1">
              {filteredSessions.map((session) => (
                <div
                  key={session.address}
                  onClick={() => switchChat(session)}
                  className={`p-3 rounded-xl cursor-pointer transition-all flex items-center justify-between group ${activeChat === session.address ? "bg-indigo-600/10 border border-indigo-500/30" : "hover:bg-zinc-900 border border-transparent"}`}
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
                    className={`w-2 h-2 rounded-full ${connectedPeers.includes(session.address.toLowerCase()) ? "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.4)]" : "bg-amber-500 animate-pulse"}`}
                  ></div>
                </div>
              ))}
              {activeSessions.length === 0 && !targetUsername && (
                <div className="h-full flex flex-col items-center justify-center text-zinc-600 space-y-2 mt-10">
                  <svg
                    className="w-8 h-8 opacity-20"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                    />
                  </svg>
                  <p className="text-xs">No active sessions.</p>
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
            <RelaySelector
              activeRelay={activeRelay}
              defaultRelays={defaultRelays}
              changeRelay={changeRelay}
              addCustomRelay={addCustomRelay}
            />
            <SecuritySection
              autoDeleteMode={autoDeleteMode}
              handleModeChange={handleModeChange}
              handleExportChat={handleExportChat}
              handleImportChat={handleImportChat}
            />
            <div className="pt-4 border-t border-zinc-800/50">
              <button
                onClick={logout}
                className="w-full text-xs font-medium text-red-400 hover:text-red-300 bg-red-500/5 hover:bg-red-500/10 py-2.5 rounded-xl border border-red-500/10 transition-colors flex items-center justify-center gap-2"
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
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
                Sign Out / Lock
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
