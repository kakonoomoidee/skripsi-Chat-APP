import { formatTime } from "@/utils/format";
import { useChatContext } from "@/context/ChatContext";

export interface MessageBubbleProps {
  msg: any;
}

/**
 * Renders individual message bubbles (Text, Image, Audio, or Crypto Transaction).
 * @param {MessageBubbleProps} props - The message data
 * @returns {JSX.Element}
 */
export const MessageBubble = ({ msg }: MessageBubbleProps) => {
  const { showToast } = useChatContext();

  const isCryptoTx =
    msg.text?.startsWith("[SENT]") || msg.text?.startsWith("[RECEIVED]");
  const isAudio = msg.text?.startsWith("[AUDIO]");

  let txType = "";
  let txAmountOrStatus = "";
  let txHash = "";
  let isVerification = false;
  let audioSrc = "";

  if (isCryptoTx) {
    txType = msg.text.startsWith("[SENT]") ? "SENT" : "RECEIVED";
    const parts = msg.text.split("\nTx Hash: ");
    const rawAmount = parts[0].replace(`[${txType}] `, "");
    txHash = parts[1] || "";

    if (rawAmount.includes("Transfer Verified!")) {
      isVerification = true;
      txAmountOrStatus = "Verified";
    } else {
      txAmountOrStatus = rawAmount.replace(" ETH", "");
    }
  } else if (isAudio) {
    audioSrc = msg.text.replace("[AUDIO]", "");
  }

  return (
    <div
      className={`flex w-full ${msg.isMine ? "justify-end" : "justify-start"}`}
    >
      {/* 1. AUDIO MESSAGE */}
      {isAudio ? (
        <div
          className={`relative flex flex-col max-w-[85%] md:max-w-[65%] min-w-50 px-4 py-3 shadow-lg backdrop-blur-md ${
            msg.isMine
              ? "bg-linear-to-br from-indigo-500/90 to-indigo-600/90 text-white rounded-2xl rounded-tr-sm border border-indigo-400/30"
              : "bg-linear-to-br from-zinc-800/95 to-zinc-900/95 text-zinc-100 rounded-2xl rounded-tl-sm border border-zinc-700/50"
          }`}
        >
          <audio controls src={audioSrc} className="w-full h-8 outline-none" />
          <span
            className={`text-[9px] mt-2 font-medium select-none ${msg.isMine ? "text-indigo-200 text-right" : "text-zinc-500 text-left"}`}
          >
            {formatTime(msg.timestamp)}
          </span>
        </div>
      ) : /* 2. CRYPTO TX MESSAGE */
      isCryptoTx ? (
        <div
          className={`mt-2 mb-1 p-5 rounded-3xl border backdrop-blur-xl flex flex-col gap-4 min-w-65 sm:min-w-[320px] max-w-[85%] relative overflow-hidden shadow-2xl ${
            msg.isMine
              ? "bg-linear-to-br from-indigo-900/50 to-purple-900/30 border-indigo-500/40"
              : "bg-linear-to-br from-emerald-900/50 to-teal-900/30 border-emerald-500/40"
          }`}
        >
          <div
            className={`absolute -right-8 -top-8 w-32 h-32 rounded-full blur-3xl opacity-40 pointer-events-none ${msg.isMine ? "bg-indigo-500" : "bg-emerald-500"}`}
          ></div>
          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-2.5">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center border shadow-sm ${msg.isMine ? "bg-indigo-500/20 border-indigo-500/30 text-indigo-300" : "bg-emerald-500/20 border-emerald-500/30 text-emerald-300"}`}
              >
                {msg.isMine ? (
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2.5}
                      d="M5 10l7-7m0 0l7 7m-7-7v18"
                    />
                  </svg>
                ) : (
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2.5}
                      d="M19 14l-7 7m0 0l-7-7m7 7V3"
                    />
                  </svg>
                )}
              </div>
              <span
                className={`text-[11px] font-bold uppercase tracking-widest ${msg.isMine ? "text-indigo-200" : "text-emerald-200"}`}
              >
                {txType === "SENT" ? "Transfer Sent" : "Transfer Received"}
              </span>
            </div>
            <div
              className={`flex items-center justify-center w-6 h-6 rounded-full bg-black/20 ${msg.isMine ? "text-indigo-400" : "text-emerald-400"}`}
            >
              {isVerification ? (
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={3}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              ) : (
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              )}
            </div>
          </div>
          <div className="flex items-end gap-1.5 relative z-10 my-1">
            <h4
              className={`text-4xl font-black tracking-tighter leading-none ${msg.isMine ? "text-white" : "text-emerald-50"}`}
            >
              {txAmountOrStatus}
            </h4>
            {!isVerification && (
              <span
                className={`text-lg font-bold pb-0.5 ${msg.isMine ? "text-indigo-300" : "text-emerald-300"}`}
              >
                ETH
              </span>
            )}
          </div>
          <div className="w-full relative z-10 mt-1 mb-1">
            <p
              className={`text-[9px] font-semibold mb-1.5 uppercase tracking-widest ${msg.isMine ? "text-indigo-300/70" : "text-emerald-300/70"}`}
            >
              Transaction Hash
            </p>
            <div
              onClick={() => {
                navigator.clipboard.writeText(txHash);
                showToast("Tx Hash Copied to Clipboard!", "success");
              }}
              className={`flex items-center justify-between p-3 rounded-xl text-[10px] font-mono cursor-pointer transition-all active:scale-[0.98] group ${msg.isMine ? "bg-black/40 hover:bg-black/60 border border-indigo-500/20 text-indigo-100" : "bg-black/30 hover:bg-black/50 border border-emerald-500/20 text-emerald-100"}`}
            >
              <span className="truncate mr-3">{txHash}</span>
              <svg
                className={`w-4 h-4 shrink-0 opacity-50 group-hover:opacity-100 transition-opacity ${msg.isMine ? "text-indigo-300" : "text-emerald-300"}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
            </div>
          </div>
          <div className="flex justify-end w-full relative z-10 mt-1">
            <span
              className={`text-[9px] font-medium select-none ${msg.isMine ? "text-indigo-300/70" : "text-emerald-300/70"}`}
            >
              {formatTime(msg.timestamp)}
            </span>
          </div>
        </div>
      ) : (
        /* 3. TEXT OR IMAGE MESSAGE */
        <div
          className={`relative flex flex-col max-w-[85%] md:max-w-[65%] min-w-20 shadow-lg backdrop-blur-md ${
            msg.isMine
              ? "bg-linear-to-br from-indigo-500/90 to-indigo-600/90 text-white rounded-2xl rounded-tr-sm border border-indigo-400/30"
              : "bg-linear-to-br from-zinc-800/95 to-zinc-900/95 text-zinc-100 rounded-2xl rounded-tl-sm border border-zinc-700/50"
          } ${msg.isImage ? "p-1.5" : "px-4 py-3"}`}
        >
          {msg.isImage ? (
            <div className="relative">
              <img
                src={msg.text}
                alt="p2p-attachment"
                className="rounded-[10px] max-w-full h-auto object-cover"
              />
              <span className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded text-[9px] font-medium bg-black/50 text-white/90 backdrop-blur-sm">
                {formatTime(msg.timestamp)}
              </span>
            </div>
          ) : (
            <>
              <p className="text-sm leading-relaxed wrap-break-words whitespace-pre-wrap">
                {msg.text}
              </p>
              <span
                className={`text-[9px] mt-1.5 font-medium select-none ${msg.isMine ? "text-indigo-200 text-right" : "text-zinc-500 text-left"}`}
              >
                {formatTime(msg.timestamp)}
              </span>
            </>
          )}
        </div>
      )}
    </div>
  );
};
