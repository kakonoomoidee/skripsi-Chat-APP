import React from "react";
import { useUIStore } from "@/store";
import { useChatContext } from "@/context/ChatContext";
import { MenuIcon, LockIcon, LockSessionIcon } from "@/components/icons";
import { HamburgerNotificationBadge } from "./HamburgerNotificationBadge";

/**
 * Renders the placeholder view when no active chat session is selected.
 * Includes a branded header area with a mobile hamburger menu and global unread badge.
 *
 * @returns {React.JSX.Element} The empty state UI.
 */
export const EmptyChatState = (): React.JSX.Element => {
  const { setIsMobileSidebarOpen } = useUIStore();
  const { unreadTotal, pendingRequests } = useChatContext();

  return (
    <div className="flex flex-col bg-zinc-950 w-full h-full overflow-hidden">
      <div className="h-16 shrink-0 border-b border-zinc-800 flex items-center px-4 md:px-8 bg-zinc-950 w-full justify-between">
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
        </div>

        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-indigo-600/20 border border-indigo-500/30 rounded-lg flex items-center justify-center shadow-inner">
            <LockSessionIcon className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="flex flex-col">
            <h2 className="text-[15px] font-bold text-zinc-100 tracking-tight leading-tight">
              Secure<span className="text-indigo-400">P2P</span>
            </h2>
            <span className="text-[10px] text-zinc-500 font-medium tracking-wide uppercase">
              Decentralized Encrypted Chat
            </span>
          </div>
        </div>
      </div>


      <div className="flex-1 min-h-0 p-8 overflow-y-auto custom-scrollbar flex items-center justify-center flex-col text-zinc-600">
        <div className="w-16 h-16 mb-4 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center shadow-inner">
          <LockIcon className="w-8 h-8 text-zinc-500" />
        </div>
        <p className="font-medium text-lg text-zinc-300 mb-1">
          Zero Data Retention Area
        </p>
        <p className="text-sm text-center">
          Select a chat or start a new handshake to begin.
        </p>
      </div>
    </div>
  );
};
