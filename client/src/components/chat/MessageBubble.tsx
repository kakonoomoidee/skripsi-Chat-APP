import {
  AudioBubble,
  CryptoBubble,
  MediaBubble,
  TextBubble,
} from "./bubbles/index";

export interface MessageBubbleProps {
  msg: any;
}

/**
 * 1. Router Component that renders the correct bubble type based on message content.
 * @param {MessageBubbleProps} props - The message data
 * @returns {JSX.Element}
 */
export const MessageBubble = ({ msg }: MessageBubbleProps) => {
  const isCryptoTx =
    msg.text?.startsWith("[SENT]") || msg.text?.startsWith("[RECEIVED]");
  const isAudio = msg.text?.startsWith("[AUDIO]");

  return (
    <div
      className={`flex w-full ${msg.isMine ? "justify-end" : "justify-start"}`}
    >
      {isAudio ? (
        <AudioBubble msg={msg} audioSrc={msg.text.replace("[AUDIO]", "")} />
      ) : isCryptoTx ? (
        (() => {
          const txType = msg.text.startsWith("[SENT]") ? "SENT" : "RECEIVED";
          const parts = msg.text.split("\nTx Hash: ");
          const rawAmount = parts[0].replace(`[${txType}] `, "");
          const txHash = parts[1] || "";

          const isVerification = rawAmount.includes("Transfer Verified!");
          const txAmountOrStatus = isVerification
            ? "Verified"
            : rawAmount.replace(" ETH", "");

          return (
            <CryptoBubble
              msg={msg}
              txType={txType}
              txAmountOrStatus={txAmountOrStatus}
              txHash={txHash}
              isVerification={isVerification}
            />
          );
        })()
      ) : msg.isImage ? (
        <MediaBubble msg={msg} />
      ) : (
        <TextBubble msg={msg} />
      )}
    </div>
  );
};
