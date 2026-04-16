import React from "react";
import { useChatContext } from "@/context/ChatContext";
import { MenuIcon, PhoneIcon } from "@/components/icons";
import { useUIStore } from "@/store";
import { CallNotification } from "./CallNotification";
import { InCallModal } from "./modals/InCallModal";
import { HamburgerNotificationBadge } from "./HamburgerNotificationBadge";

/**
 * Renders the header section of the active chat interface.
 * Displays peer information, connection status, typing indicators, and call controls.
 *
 * @returns {React.JSX.Element} The chat header UI component.
 */
export const ChatHeader = (): React.JSX.Element => {
  const {
    activeUsername,
    isWebRTCConnected,
    isPeerTyping,
    initiateCall,
    pendingRequests,
    unreadTotal,
  } = useChatContext();

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
          <HamburgerNotificationBadge unreadTotal={unreadTotal} />
          {pendingRequests.length > 0 && unreadTotal === 0 && (
            <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-orange-500 rounded-full border-2 border-zinc-950"></span>
          )}
        </button>


        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold shadow-inner">
            {activeUsername?.charAt(0).toUpperCase()}
          </div>
          <div>
            <h3 className="font-semibold text-zinc-100 capitalize">
              {activeUsername}
            </h3>
            <div className="flex items-center gap-1.5 mt-0.5">
              {isPeerTyping ? (
                <span className="text-[10px] text-indigo-400 font-medium italic">
                  typing...
                </span>
              ) : isWebRTCConnected ? (
                <span className="text-[10px] text-emerald-500 font-medium">
                  Secured Tunnel Active
                </span>
              ) : (
                <span className="text-[10px] text-amber-500 font-medium">
                  Negotiating Keys...
                </span>
              )}
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
