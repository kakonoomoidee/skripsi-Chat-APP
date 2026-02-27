import { formatTime } from "@/utils/format";

export const TextBubble = ({ msg }: { msg: any }) => {
  return (
    <div
      className={`relative flex flex-col max-w-[85%] md:max-w-[65%] min-w-20 shadow-lg backdrop-blur-md px-4 py-3 ${
        msg.isMine
          ? "bg-linear-to-br from-indigo-500/90 to-indigo-600/90 text-white rounded-2xl rounded-tr-sm border border-indigo-400/30"
          : "bg-linear-to-br from-zinc-800/95 to-zinc-900/95 text-zinc-100 rounded-2xl rounded-tl-sm border border-zinc-700/50"
      }`}
    >
      <p className="text-sm leading-relaxed wrap-break-words whitespace-pre-wrap">
        {msg.text}
      </p>
      <span
        className={`text-[9px] mt-1.5 font-medium select-none ${
          msg.isMine ? "text-indigo-200 text-right" : "text-zinc-500 text-left"
        }`}
      >
        {formatTime(msg.timestamp)}
      </span>
    </div>
  );
};
