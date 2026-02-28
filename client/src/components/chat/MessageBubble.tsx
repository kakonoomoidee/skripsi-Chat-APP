import {
  AudioBubble,
  CryptoBubble,
  MediaBubble,
  TextBubble,
} from "./bubbles/index";

export interface MessageBubbleProps {
  msg: any;
}

export const MessageBubble = ({ msg }: MessageBubbleProps) => {
  let parsedText = msg.text;
  let replyData = null;

  try {
    const parsed = JSON.parse(msg.text);
    if (parsed.text !== undefined) {
      parsedText = parsed.text;
      replyData = parsed.replyTo || null;
    }
  } catch (e) {}

  const isCryptoTx =
    parsedText?.startsWith("[SENT]") || parsedText?.startsWith("[RECEIVED]");
  const isAudio = parsedText?.startsWith("[AUDIO]");

  const cleanMsg = { ...msg, text: parsedText, replyTo: replyData };

  return (
    <div
      id={`msg-${msg.id}`}
      className={`flex w-full transition-all duration-300 rounded-2xl ${msg.isMine ? "justify-end" : "justify-start"}`}
    >
      {isAudio ? (
        <AudioBubble
          msg={cleanMsg}
          audioSrc={cleanMsg.text.replace("[AUDIO]", "")}
        />
      ) : isCryptoTx ? (
        (() => {
          const txType = cleanMsg.text.startsWith("[SENT]")
            ? "SENT"
            : "RECEIVED";
          const parts = cleanMsg.text.split("\nTx Hash: ");
          const rawAmount = parts[0].replace(`[${txType}] `, "");
          const txHash = parts[1] || "";

          const isVerification = rawAmount.includes("Transfer Verified!");
          const txAmountOrStatus = isVerification
            ? "Verified"
            : rawAmount.replace(" ETH", "");

          return (
            <CryptoBubble
              msg={cleanMsg}
              txType={txType}
              txAmountOrStatus={txAmountOrStatus}
              txHash={txHash}
              isVerification={isVerification}
            />
          );
        })()
      ) : cleanMsg.isImage ? (
        <MediaBubble msg={cleanMsg} />
      ) : (
        <TextBubble msg={cleanMsg} />
      )}
    </div>
  );
};
