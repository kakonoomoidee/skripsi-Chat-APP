import React from "react";
import { Sidebar } from "@/components/shared";
import { ChatArea } from "@/components/chat";
import { ChatProvider, useChatContext } from "@/context/ChatContext";
import { useUIStore } from "@/store";
import { useSessionTimeout } from "@/hooks/ui/useSessionTimeout";

/**
 * Responsive Layout Wrapper
 * Controls the sliding drawer sidebar and background overlay for mobile devices.
 * Automatically enforces session timeout due to inactivity.
 *
 * @returns {React.JSX.Element} The chat interface layout.
 */
const ChatLayout = (): React.JSX.Element => {
  const { isMobileSidebarOpen, setIsMobileSidebarOpen, showToast } =
    useUIStore();
  const { logout } = useChatContext();

  useSessionTimeout(() => {
    logout();
    showToast(
      "Session expired due to inactivity. Please login again.",
      "error",
    );
  }, 3600000);

  return (
    <div className="flex h-screen bg-zinc-950 font-sans antialiased selection:bg-indigo-500/30 overflow-hidden relative w-full">
      {isMobileSidebarOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity duration-300"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}

      <div
        className={`fixed md:relative inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out w-[85%] max-w-sm md:w-80 shrink-0 border-r border-zinc-800 bg-zinc-950/95 md:bg-transparent md:translate-x-0 ${
          isMobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <Sidebar />
      </div>

      <div className="flex-1 flex flex-col relative min-w-0 w-full">
        <ChatArea />
      </div>
    </div>
  );
};

/**
 * Main Chat Client View
 * Minimalist container injecting the global context provider.
 *
 * @returns {React.JSX.Element} The root chat application view.
 */
export default function ChatDashboard(): React.JSX.Element {
  return (
    <ChatProvider>
      <ChatLayout />
    </ChatProvider>
  );
}
