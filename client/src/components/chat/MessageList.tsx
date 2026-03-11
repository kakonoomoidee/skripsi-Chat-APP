import React, { useEffect, useRef } from "react";
import { useChatContext } from "@/context/ChatContext";
import { MessageBubble } from "./MessageBubble";

/**
 * Container component for iterating over and displaying the active chat's message history.
 * Automatically scrolls to the bottom of the view when new messages are added to the state.
 *
 * @returns {React.JSX.Element} The scrollable message list UI.
 */
export const MessageList = (): React.JSX.Element => {
  const { messages } = useChatContext();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex-1 min-h-0 px-4 md:px-8 py-6 overflow-y-auto custom-scrollbar">
      <div className="space-y-2">
        {messages?.map((msg) => (
          <MessageBubble key={msg.id} msg={msg} />
        ))}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
};
