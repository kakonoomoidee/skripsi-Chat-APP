import { formatTime } from "@/utils/core/format";
import { useSessionStore } from "@/store";
import { useBubbleMenu } from "@/hooks/ui/useBubbleMenu";
import { ReplyBubbleContext } from "@/context/ReplyBubbleContext";
import { ChevronDownIcon, ReplyIcon } from "@/components/icons";
import { createReplyTarget } from "@/utils/chat/bubble";

export const MediaBubble = ({ msg }: { msg: any }) => {
  const setReplyingTo = useSessionStore((state) => state.setReplyingTo);
  const { showMenu, menuRef, closeMenu, toggleMenu } = useBubbleMenu();

  return (
    <div className="relative group w-full flex flex-col">
      <div
        className={`relative flex flex-col max-w-[85vw] md:max-w-[65%] min-w-30 shadow-sm p-1 rounded-2xl ${
          msg.isMine
            ? "bg-indigo-600 rounded-tr-sm self-end"
            : "bg-zinc-800 rounded-tl-sm self-start"
        }`}
      >
        <div className="absolute top-2 right-2 z-20" ref={menuRef}>
          <button
            onClick={toggleMenu}
            className={`p-1 rounded-full bg-black/50 text-white hover:bg-black/70 transition-all opacity-0 group-hover:opacity-100 ${
              showMenu ? "opacity-100" : ""
            }`}
          >
            <ChevronDownIcon className="w-4 h-4" />
          </button>

          {showMenu && (
            <div
              className={`absolute z-50 top-full mt-1 ${
                msg.isMine ? "right-0" : "left-0"
              } bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl w-32 animate-in fade-in zoom-in-95`}
            >
              <button
                onClick={() => {
                  setReplyingTo(createReplyTarget(msg, "Photo"));
                  closeMenu();
                }}
                className="w-full text-left px-3 py-2 text-xs text-zinc-200 hover:bg-zinc-700 rounded-lg transition-colors flex items-center gap-2"
              >
                <ReplyIcon className="w-3.5 h-3.5" />
                Reply
              </button>
            </div>
          )}
        </div>

        {msg.replyTo && (
          <div className="px-1.5 pt-1.5 pb-0.5">
            <ReplyBubbleContext replyTo={msg.replyTo} isMine={msg.isMine} />
          </div>
        )}

        <div className="relative">
          <img
            src={msg.text}
            alt="p2p-attachment"
            className="rounded-xl max-w-full w-auto object-contain"
            style={{ maxHeight: "350px" }}
          />
          <span className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded-md text-[9px] font-medium bg-black/60 text-white/90 backdrop-blur-sm pointer-events-none">
            {formatTime(msg.timestamp)}
          </span>
        </div>
      </div>
    </div>
  );
};
