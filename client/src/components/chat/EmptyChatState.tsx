import React from "react";
import { useUIStore } from "@/store";
import { MenuIcon, LockIcon } from "@/components/icons";

/**
 * Renders the placeholder view when no active chat session is selected.
 *
 * @returns {React.JSX.Element} The empty state UI.
 */
export const EmptyChatState = (): React.JSX.Element => {
  const { setIsMobileSidebarOpen } = useUIStore();

  return (
    <div className="flex flex-col bg-zinc-950 w-full h-full overflow-hidden">
      <div className="h-16 shrink-0 border-b border-zinc-800 flex md:hidden items-center px-4 bg-zinc-950 w-full">
        <button
          onClick={() => setIsMobileSidebarOpen(true)}
          className="p-2 mr-2 text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          <MenuIcon className="w-6 h-6" />
        </button>
        <p className="text-zinc-600 text-sm font-medium">Select a Chat</p>
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
