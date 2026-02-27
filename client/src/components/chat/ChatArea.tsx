import { useState } from "react";
import { useChatContext } from "@/context/ChatContext";
import { ChatHeader } from "./ChatHeader";
import { EmptyChatState } from "./EmptyChatState";
import { MessageList } from "./MessageList";
import { ChatInput } from "./ChatInput";
import { TransferModal } from "./TransferModal";

/**
 * Main layout wrapper for the active chat session.
 * REFACTORED: Now utilizes modular architecture for cleaner maintenance.
 * @returns {JSX.Element}
 */
export default function ChatArea() {
  const { activeChat, requestPeerWallet, showToast } = useChatContext();
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);

  const handleOpenTransferModal = () => {
    if (!localStorage.getItem("linked_metamask")) {
      showToast(
        "Please link your MetaMask wallet in Security Settings first.",
        "error",
      );
      return;
    }
    requestPeerWallet();
    setIsTransferModalOpen(true);
  };

  if (!activeChat) return <EmptyChatState />;

  return (
    <div className="flex flex-col bg-zinc-950 w-full h-full overflow-hidden relative">
      <ChatHeader />
      <MessageList />
      <ChatInput onOpenTransferModal={handleOpenTransferModal} />
      <TransferModal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
      />
    </div>
  );
}
