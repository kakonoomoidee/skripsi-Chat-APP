import React from "react";
import {
  AudioBubble,
  CryptoBubble,
  MediaBubble,
  TextBubble,
  DocumentBubble,
} from "./bubbles/index";

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
  let parsedText = msg.text;
  let replyData = null;
  let docData: { fileName: string; fileData: string } | null = null;

  try {
    const parsed = JSON.parse(msg.text);
    if (parsed.type === "DOCUMENT") {
      docData = { fileName: parsed.fileName, fileData: parsed.fileData };
    } else if (parsed.text !== undefined) {
      parsedText = parsed.text;
      replyData = parsed.replyTo || null;
    }
  } catch {}

  const isCryptoTx =
    parsedText?.startsWith("[SENT]") || parsedText?.startsWith("[RECEIVED]");
  const isAudio = parsedText?.startsWith("[AUDIO]");

  const cleanMsg: ChatMessage = {
    ...msg,
    text: parsedText,
    replyTo: replyData,
  };

  let bubbleContent: React.JSX.Element;

  if (isAudio) {
    bubbleContent = (
      <AudioBubble
        msg={cleanMsg}
        audioSrc={cleanMsg.text.replace("[AUDIO]", "")}
      />
    );
  } else if (isCryptoTx) {
    const txType = cleanMsg.text.startsWith("[SENT]") ? "SENT" : "RECEIVED";
    const parts = cleanMsg.text.split("\nTx Hash: ");
    const rawAmount = parts[0].replace(`[${txType}] `, "");
    const txHash = parts[1] || "";

    const isVerification = rawAmount.includes("Transfer Verified!");
    const txAmountOrStatus = isVerification
      ? "Verified"
      : rawAmount.replace(" ETH", "");

    bubbleContent = (
      <CryptoBubble
        msg={cleanMsg}
        txType={txType}
        txAmountOrStatus={txAmountOrStatus}
        txHash={txHash}
        isVerification={isVerification}
      />
    );
  } else if (docData) {
    bubbleContent = (
      <DocumentBubble
        msg={cleanMsg}
        fileName={docData.fileName}
        fileData={docData.fileData}
      />
    );
  } else if (cleanMsg.isImage) {
    bubbleContent = <MediaBubble msg={cleanMsg} />;
  } else {
    bubbleContent = <TextBubble msg={cleanMsg} />;
  }

  return (
    <div
      id={`msg-${msg.id}`}
      className={`flex w-full transition-all duration-300 rounded-2xl ${
        msg.isMine ? "justify-end" : "justify-start"
      }`}
    >
      {bubbleContent}
    </div>
  );
};
