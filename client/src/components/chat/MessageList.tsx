import React, { useRef } from "react";
import { useChatContext } from "@/context/ChatContext";
import { MessageBubble } from "./MessageBubble";
import { UnreadDivider } from "./UnreadDivider";
import { useSmartScroll } from "@/hooks/chat/useSmartScroll";
import { ChevronDownIcon } from "@/components/icons";

/**
 * Container component for iterating over and displaying the active chat's
 * message history. On initial load it anchors the viewport to the pre-computed
 * entry point message identified by `entryPointId`. An "Unread Messages"
 * divider is rendered directly above the first unread peer message. A floating
 * action button appears when the user scrolls up, allowing them to jump to the
 * latest message.
 *
 * @returns {React.JSX.Element} The scrollable message list UI with divider and FAB.
 */
export const MessageList = (): React.JSX.Element => {
  const {
    messages,
    activeChat,
    entryPointId,
    scrollSettledRef,
  } = useChatContext();

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { isAtBottom, scrollToBottom } = useSmartScroll(
    scrollContainerRef,
    messagesEndRef,
    messages,
    activeChat,
    entryPointId,
    scrollSettledRef,
  );

  const firstUnreadId = messages.find(
    (m) => !m.isMine && m.status !== "read",
  )?.id;

  return (
    <div className="relative flex-1 min-h-0">
      <div
        ref={scrollContainerRef}
        className="h-full px-4 md:px-8 py-6 overflow-y-auto custom-scrollbar"
      >
        <div className="min-h-full flex flex-col justify-end space-y-2">
          {messages?.map((msg) => (
            <React.Fragment key={msg.id}>
              {firstUnreadId !== undefined && msg.id === firstUnreadId && (
                <UnreadDivider />
              )}
              <MessageBubble msg={msg} />
            </React.Fragment>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {!isAtBottom && (
        <button
          id="scroll-to-bottom-fab"
          onClick={scrollToBottom}
          aria-label="Scroll to latest message"
          className="absolute bottom-4 right-6 z-10 flex items-center justify-center w-9 h-9 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-300 shadow-lg hover:bg-zinc-700 hover:text-white transition-all duration-200 animate-in fade-in zoom-in-95"
        >
          <ChevronDownIcon className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
