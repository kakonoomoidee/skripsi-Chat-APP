import React from "react";
import { useChatContext } from "@/context/ChatContext";
import type { ConnectionState } from "@/context/ChatContext";
import { MenuIcon, PhoneIcon } from "@/components/icons";
import { useUIStore } from "@/store";
import { CallNotification } from "./CallNotification";
import { InCallModal } from "./modals/InCallModal";
import { GlassBadge } from "@/components/ui";
import { PeerAvatar } from "@/components/ui/PeerAvatar";

/**
 * Returns the status label element for the sub-header, driven by the connection state machine.
 * Priority order: peer typing indicator > connection state.
 *
 * @param {boolean} isTyping - Whether the remote peer is currently typing.
 * @param {ConnectionState} state - The current connection lifecycle state.
 * @returns {React.JSX.Element} The appropriate status indicator element.
 */
const renderStatus = (
  isTyping: boolean,
  state: ConnectionState,
): React.JSX.Element => {
  if (isTyping) {
    return (
      <span className="text-[10px] text-indigo-400 font-medium italic">
        typing...
      </span>
    );
  }
  if (state === "connected") {
    return (
      <span className="text-[10px] text-emerald-500 font-medium">
        Secured Tunnel Active
      </span>
    );
  }
  if (state === "offline") {
    return (
      <span className="text-[10px] text-red-500 font-medium">
        User is offline
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 text-[10px] text-amber-400 font-medium">
      <span className="w-2 h-2 border border-amber-400 border-t-transparent rounded-full animate-spin" />
      Connecting...
    </span>
  );
};

/**
 * Renders the header section of the active chat interface.
 * Displays peer information, connection status, typing indicators, and call controls.
 * The status sub-label is driven entirely by the {@link ConnectionState} machine exposed
 * via ChatContext, removing any direct dependency on the raw `isWebRTCConnected` flag.
 *
 * @returns {React.JSX.Element} The chat header UI component.
 */
export const ChatHeader = (): React.JSX.Element => {
  const {
    activeChat,
    activeUsername,
    isWebRTCConnected,
    connectionStates,
    isPeerTyping,
    initiateCall,
    pendingRequestsTotal,
    unreadTotal,
  } = useChatContext();

  const currentStatus = activeChat ? (connectionStates[activeChat.toLowerCase()] || "idle") : "idle";

  const { setIsMobileSidebarOpen } = useUIStore();

  return (
    <div className="relative h-16 shrink-0 border-b border-zinc-800 flex items-center px-4 md:px-8 bg-zinc-950 w-full z-10 justify-between">
      <CallNotification />
      <InCallModal />

      <div className="flex items-center">
        <button
          onClick={() => setIsMobileSidebarOpen(true)}
          className="md:hidden relative p-2 mr-2 -ml-2 text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          <MenuIcon className="w-6 h-6" />
          <GlassBadge
            count={unreadTotal}
            variant="chat"
            className="absolute -top-1 -right-1"
          />
          <GlassBadge
            count={pendingRequestsTotal}
            variant="request"
            className="absolute -bottom-1 -right-1"
          />
        </button>

        <div className="flex items-center gap-3">
          {activeChat && (
            <PeerAvatar
              peerAddress={activeChat}
              displayName={activeUsername ?? "?"}
              sizeClassName="h-10 w-10"
              className="bg-indigo-600 text-white font-bold shadow-inner"
            />
          )}
          <div>
            <h3 className="font-semibold text-zinc-100 capitalize">
              {activeUsername}
            </h3>
            <div className="flex items-center gap-1.5 mt-0.5">
              {renderStatus(isPeerTyping, currentStatus)}
            </div>
          </div>
        </div>
      </div>

      {isWebRTCConnected && (
        <button
          onClick={initiateCall}
          className="p-2.5 bg-zinc-800/50 hover:bg-zinc-800 text-indigo-400 hover:text-indigo-300 rounded-full transition-colors ml-auto"
        >
          <PhoneIcon className="w-5 h-5" />
        </button>
      )}
    </div>
  );
};
