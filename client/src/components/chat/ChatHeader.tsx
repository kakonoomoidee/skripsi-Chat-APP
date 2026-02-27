import { useChatContext } from "@/context/ChatContext";
import { MenuIcon } from "../icons/index";

/**
 * Renders the top header of the chat area displaying active peer status.
 * @returns {JSX.Element}
 */
export const ChatHeader = () => {
  const { activeUsername, isWebRTCConnected, setIsMobileSidebarOpen } =
    useChatContext();

  return (
    <div className="h-16 shrink-0 border-b border-zinc-800 flex items-center px-4 md:px-8 bg-zinc-950 w-full z-10">
      <div className="flex items-center w-full">
        <button
          onClick={() => setIsMobileSidebarOpen(true)}
          className="md:hidden p-2 mr-2 -ml-2 text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          <MenuIcon className="w-6 h-6" />
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
              {isWebRTCConnected ? (
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
    </div>
  );
};
