import React, { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { useChatContext } from "@/context/ChatContext";
import { ChatHeader } from "./ChatHeader";
import { EmptyChatState } from "./EmptyChatState";
import { MessageList } from "./MessageList";
import { ChatInput } from "./ChatInput";
import { TransferModal } from "./modals/TransferModal";
import { useUIStore } from "@/store";
import { db } from "@/utils/storage/db";
import { ShieldCheckIcon, WarningIcon } from "@/components/icons";
import { hasLinkedWallet } from "@/services/walletBalanceService";

/**
 * Main chat area container orchestrating the header, message list, input, and modals.
 *
 * When the active chat's contact status is `'pending'` (or no record exists), a
 * sticky banner is rendered below the header prompting the user to Accept or Block
 * the incoming contact before the conversation is considered trusted.
 *
 * @returns {React.JSX.Element} The composed chat area interface.
 */
export default function ChatArea(): React.JSX.Element {
  const {
    activeChat,
    requestPeerWallet,
    acceptContact,
    blockContact,
    forceDisconnectPeer,
    closeChat,
  } = useChatContext();
  const { showToast } = useUIStore();
  const [isTransferModalOpen, setIsTransferModalOpen] =
    useState<boolean>(false);

  const contactRecord = useLiveQuery(
    () => (activeChat ? db.contacts.get(activeChat.toLowerCase()) : undefined),
    [activeChat],
  );

  /**
   * Validates transaction wallet linkage and initiates the peer wallet address request via WebRTC.
   *
   * @returns {void}
   */
  const handleOpenTransferModal = (): void => {
    if (!hasLinkedWallet()) {
      showToast(
        "Please link a transaction wallet in Security Settings first.",
        "error",
      );
      return;
    }

    requestPeerWallet();
    setIsTransferModalOpen(true);
  };

  /**
   * Accepts the contact request, marking the peer as trusted in the local database.
   *
   * @returns {Promise<void>}
   */
  const handleAccept = async (): Promise<void> => {
    if (!activeChat) return;
    await acceptContact(activeChat);
  };

  /**
   * Blocks the contact, disconnects the active WebRTC session, and returns the user
   * to the empty chat state.
   *
   * @returns {Promise<void>}
   */
  const handleBlock = async (): Promise<void> => {
    if (!activeChat) return;
    await blockContact(activeChat);
    forceDisconnectPeer(activeChat);
    closeChat();
    showToast("Contact blocked.", "error");
  };

  if (!activeChat) return <EmptyChatState />;

  const isPending = !contactRecord || contactRecord.status === "pending";

  return (
    <div className="flex flex-col bg-zinc-950 w-full h-full overflow-hidden relative">
      <ChatHeader />

      {isPending && (
        <div className="shrink-0 mx-4 mt-3 mb-1 bg-amber-500/10 border border-amber-500/25 rounded-2xl px-4 py-3 flex items-center justify-between gap-3 animate-in slide-in-from-top-2 fade-in">
          <div className="flex items-center gap-2.5 min-w-0">
            <WarningIcon className="w-4 h-4 text-amber-400 shrink-0" />
            <p className="text-xs text-zinc-300 leading-snug">
              <span className="font-semibold text-amber-300">
                New contact request.
              </span>{" "}
              Do you want to start chatting?
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              id="contact-accept-btn"
              onClick={handleAccept}
              className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/25 px-3 py-1.5 rounded-lg transition-colors"
            >
              <ShieldCheckIcon className="w-3.5 h-3.5" />
              Accept
            </button>
            <button
              id="contact-block-btn"
              onClick={handleBlock}
              className="text-xs font-semibold text-red-400 bg-red-500/10 hover:bg-red-500/20 border border-red-500/25 px-3 py-1.5 rounded-lg transition-colors"
            >
              Block
            </button>
          </div>
        </div>
      )}

      <MessageList />
      <ChatInput onOpenTransferModal={handleOpenTransferModal} />
      <TransferModal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
      />
    </div>
  );
}
