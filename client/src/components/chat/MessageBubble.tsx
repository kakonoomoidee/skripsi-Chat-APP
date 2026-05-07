import React, { useRef } from "react";
import {
  AudioBubble,
  CryptoBubble,
  MediaBubble,
  TextBubble,
  DocumentBubble,
} from "./bubbles/index";
import { MessageStatus } from "@/utils/storage/db";
import { parseMessageBubbleData } from "@/utils/chat/messageBubble";
import { useMessageVisibility } from "@/hooks/chat/useMessageVisibility";

/**
 * Interface defining the structure of a chat message.
 */
export interface ChatMessage {
  id?: number;
  ownerAddress: string;
  chatId: string;
  text: string;
  isMine: boolean;
  timestamp: number;
  isImage?: boolean;
  status?: MessageStatus;
  replyTo?: {
    id: string | number;
    text: string;
    isMine: boolean;
    timestamp: number;
  } | null;
}

/**
 * Interface defining the properties for the MessageBubble component.
 */
export interface MessageBubbleProps {
  msg: ChatMessage;
}

/**
 * A routing component that parses raw message text and delegates rendering
 * to the appropriate specific bubble component based on the content type.
 *
 * @param {MessageBubbleProps} props - Component properties containing the raw message object.
 * @returns {React.JSX.Element} The appropriately formatted message bubble.
 */
export const MessageBubble = ({
  msg,
}: MessageBubbleProps): React.JSX.Element => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  useMessageVisibility(wrapperRef, msg);

  const {
    parsedText,
    replyData,
    documentData,
    cryptoData,
    legacyCryptoData,
    isAudio,
    audioSource,
  } = parseMessageBubbleData(msg.text);

  const cleanMsg: ChatMessage = {
    ...msg,
    text: parsedText,
    replyTo: replyData,
  };

  let bubbleContent: React.JSX.Element;

  if (isAudio) {
    bubbleContent = <AudioBubble msg={cleanMsg} audioSrc={audioSource} />;
  } else if (cryptoData) {
    bubbleContent = (
      <CryptoBubble
        msg={cleanMsg}
        txType={cleanMsg.isMine ? "SENT" : "RECEIVED"}
        txAmountOrStatus={cryptoData.amount || "0"}
        txHash={cryptoData.hash}
        isVerification={false}
      />
    );
  } else if (legacyCryptoData) {
    bubbleContent = (
      <CryptoBubble
        msg={cleanMsg}
        txType={legacyCryptoData.txType}
        txAmountOrStatus={legacyCryptoData.txAmountOrStatus}
        txHash={legacyCryptoData.txHash}
        isVerification={legacyCryptoData.isVerification}
      />
    );
  } else if (documentData) {
    bubbleContent = (
      <DocumentBubble
        msg={cleanMsg}
        fileName={documentData.fileName}
        fileData={documentData.fileData}
      />
    );
  } else if (cleanMsg.isImage) {
    bubbleContent = <MediaBubble msg={cleanMsg} />;
  } else {
    bubbleContent = <TextBubble msg={cleanMsg} />;
  }

  return (
    <div
      ref={wrapperRef}
      id={`msg-${msg.id}`}
      className={`flex w-full transition-all duration-300 rounded-2xl ${
        msg.isMine ? "justify-end" : "justify-start"
      }`}
    >
      {bubbleContent}
    </div>
  );
};
