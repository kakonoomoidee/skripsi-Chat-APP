import React, { useState } from "react";
import { useChatContext } from "@/context/ChatContext";
import { ChatHeader } from "./ChatHeader";
import { EmptyChatState } from "./EmptyChatState";
import { MessageList } from "./MessageList";
import { ChatInput } from "./ChatInput";
import { TransferModal } from "./modals/TransferModal";
import { useUIStore } from "@/store";

/**
 * Main chat area container orchestrating the header, message list, input, and modals.
 * Conditionally renders the empty state if no active chat session is selected.
 *
 * @returns {React.JSX.Element} The composed chat area interface.
 */
export default function ChatArea(): React.JSX.Element {
  const { activeChat, requestPeerWallet } = useChatContext();
  const { showToast } = useUIStore();
  const [isTransferModalOpen, setIsTransferModalOpen] =
    useState<boolean>(false);

  /**
   * Validates MetaMask linkage and initiates the peer wallet address request via WebRTC.
   *
   * @returns {void}
   */
  const handleOpenTransferModal = (): void => {
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
