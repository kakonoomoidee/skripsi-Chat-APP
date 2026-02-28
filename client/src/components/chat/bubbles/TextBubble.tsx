import { formatTime } from "@/utils/format";
import { useSessionStore } from "@/store";
import { useState } from "react";
import { useChatContext } from "@/context/ChatContext";

export const TextBubble = ({ msg }: { msg: any }) => {
  const setReplyingTo = useSessionStore((state) => state.setReplyingTo);
  const { activeUsername } = useChatContext();
  const [showMenu, setShowMenu] = useState(false);

  const handleScrollToMessage = (replyId: string) => {
    const targetEl = document.getElementById(`msg-${replyId}`);
    if (targetEl) {
      targetEl.scrollIntoView({ behavior: "smooth", block: "center" });

      targetEl.classList.add("bg-indigo-500/40", "scale-[1.02]", "z-10");

      setTimeout(() => {
        targetEl.classList.remove("bg-indigo-500/40", "scale-[1.02]", "z-10");
      }, 1000);
    }
  };

  return (
    <div className="relative group w-full flex flex-col">
      <div
        className={`relative flex flex-col min-w-25 max-w-[85vw] md:max-w-104 shadow-sm px-3 py-2 ${
          msg.isMine
            ? "bg-indigo-600 text-white rounded-2xl rounded-tr-sm self-end"
            : "bg-zinc-800 text-zinc-100 rounded-2xl rounded-tl-sm self-start"
        }`}
      >
        {/* CHEVRON BUTTON DI POJOK KANAN ATAS DALEM BUBBLE */}
        <div className="absolute top-1 right-1 z-20">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className={`p-0.5 rounded-full bg-black/20 text-white hover:bg-black/40 transition-all md:opacity-0 group-hover:opacity-100 ${showMenu ? "opacity-100" : "opacity-70"}`}
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>

          {showMenu && (
            <div
              className={`absolute z-50 top-full mt-1 ${msg.isMine ? "right-0" : "left-0"} bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl w-32 animate-in fade-in zoom-in-95`}
            >
              <button
                onClick={() => {
                  setReplyingTo({
                    id: msg.id,
                    text: msg.text,
                    isMine: msg.isMine,
                  });
                  setShowMenu(false);
                }}
                className="w-full text-left px-3 py-2 text-xs text-zinc-200 hover:bg-zinc-700 rounded-lg transition-colors flex items-center gap-2"
              >
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
                  />
                </svg>
                Reply
              </button>
            </div>
          )}
        </div>

        {msg.replyTo && (
          <div
            onClick={() => handleScrollToMessage(msg.replyTo.id)}
            className={`mb-1.5 p-1.5 rounded-lg border-l-4 text-xs cursor-pointer hover:opacity-100 transition-all pr-6 ${msg.isMine ? "bg-black/20 border-indigo-300 opacity-90" : "bg-black/20 border-indigo-500 opacity-90"}`}
          >
            <p
              className={`font-bold mb-0.5 text-[10px] ${msg.isMine ? "text-indigo-200" : "text-indigo-400"}`}
            >
              {msg.replyTo.isMine ? "You" : activeUsername}
            </p>
            <p className="line-clamp-1 text-white/90 leading-snug">
              {msg.replyTo.text}
            </p>
          </div>
        )}

        <p className="text-[13px] leading-relaxed wrap-break-words whitespace-pre-wrap pr-5">
          {msg.text}
        </p>

        <span
          className={`text-[9px] mt-1 font-medium select-none ${
            msg.isMine
              ? "text-indigo-200 text-right"
              : "text-zinc-400 text-left"
          }`}
        >
          {formatTime(msg.timestamp)}
        </span>
      </div>
    </div>
  );
};
