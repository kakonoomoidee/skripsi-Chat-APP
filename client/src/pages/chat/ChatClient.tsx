import { Sidebar } from "@/components/shared";
import { ChatArea } from "@/components/chat";
import { ChatProvider } from "@/context/ChatContext";

/**
 * 5. Main Chat Client View
 * Minimalist layout wrapper injecting the global context.
 * @returns {JSX.Element}
 */
export default function ChatDashboard() {
  return (
    <ChatProvider>
      <div className="flex h-screen bg-zinc-950 font-sans antialiased selection:bg-indigo-500/30">
        <Sidebar />
        <ChatArea />
      </div>
    </ChatProvider>
  );
}
