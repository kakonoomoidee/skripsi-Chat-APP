import { formatTime } from "@/utils/format";

export const MediaBubble = ({ msg }: { msg: any }) => {
  return (
    <div
      className={`relative flex flex-col max-w-[85%] md:max-w-[65%] min-w-20 shadow-lg backdrop-blur-md p-1.5 ${
        msg.isMine
          ? "bg-linear-to-br from-indigo-500/90 to-indigo-600/90 rounded-2xl rounded-tr-sm border border-indigo-400/30"
          : "bg-linear-to-br from-zinc-800/95 to-zinc-900/95 rounded-2xl rounded-tl-sm border border-zinc-700/50"
      }`}
    >
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
    </div>
  );
};
