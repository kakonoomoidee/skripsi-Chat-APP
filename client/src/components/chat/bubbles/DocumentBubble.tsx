import { formatTime } from "@/utils/format";
import { DocumentIcon, ChevronDownIcon, ReplyIcon } from "@/components/icons";
import { useSessionStore } from "@/store";
import { useState, useRef, useEffect } from "react";
import { ReplyBubbleContext } from "../context/ReplyBubbleContext";

export const DocumentBubble = ({
  msg,
  fileName,
  fileData,
}: {
  msg: any;
  fileName: string;
  fileData: string;
}) => {
  const setReplyingTo = useSessionStore((state) => state.setReplyingTo);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node))
        setShowMenu(false);
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setShowMenu(false);
    };
    if (showMenu) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscape);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [showMenu]);

  return (
    <div className="relative group w-full flex flex-col">
      <div
        className={`relative flex flex-col min-w-37.5 max-w-[85vw] md:max-w-[20rem] shadow-sm px-3 py-2 ${
          msg.isMine
            ? "bg-indigo-600 text-white rounded-2xl rounded-tr-sm self-end"
            : "bg-zinc-800 text-zinc-100 rounded-2xl rounded-tl-sm self-start"
        }`}
      >
        <div className="absolute top-1 right-1 z-20" ref={menuRef}>
          <button
            onClick={() => setShowMenu(!showMenu)}
            className={`p-0.5 rounded-full bg-black/20 text-white hover:bg-black/40 transition-all opacity-0 group-hover:opacity-100 ${
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
                  setReplyingTo({
                    id: msg.id,
                    text: `Document: ${fileName}`,
                    isMine: msg.isMine,
                    timestamp: msg.timestamp,
                  });
                  setShowMenu(false);
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
          <ReplyBubbleContext replyTo={msg.replyTo} isMine={msg.isMine} />
        )}

        <div className="flex items-center gap-3 p-2 bg-black/20 rounded-xl mb-1 border border-white/5 pr-6 mt-1">
          <div className="w-10 h-10 rounded-lg bg-indigo-500/20 text-indigo-100 flex items-center justify-center shrink-0 shadow-inner">
            <DocumentIcon className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate text-zinc-100">
              {fileName}
            </p>
            <a
              href={fileData}
              download={fileName}
              className="text-[10px] text-indigo-300 hover:text-indigo-100 uppercase tracking-wider font-bold mt-0.5 block transition-colors"
            >
              Download
            </a>
          </div>
        </div>
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
