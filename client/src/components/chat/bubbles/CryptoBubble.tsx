import { formatTime } from "@/utils/format";
import { useUIStore, useSessionStore } from "@/store";
import { useState, useRef, useEffect } from "react";
import { ReplyBubbleContext } from "@/context/ReplyBubbleContext";
import {
  ChevronDownIcon,
  ReplyIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  CheckIcon,
  BoltIcon,
  CopyIcon,
} from "@/components/icons";

export const CryptoBubble = ({
  msg,
  txType,
  txAmountOrStatus,
  txHash,
  isVerification,
}: {
  msg: any;
  txType: string;
  txAmountOrStatus: string;
  txHash: string;
  isVerification: boolean;
}) => {
  const { showToast } = useUIStore();
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
        className={`mt-2 mb-1 p-5 rounded-3xl border backdrop-blur-xl flex flex-col gap-4 min-w-65 sm:min-w-[320px] max-w-[85%] relative overflow-hidden shadow-2xl ${
          msg.isMine
            ? "bg-linear-to-br from-indigo-900/50 to-purple-900/30 border-indigo-500/40 self-end"
            : "bg-linear-to-br from-emerald-900/50 to-teal-900/30 border-emerald-500/40 self-start"
        }`}
      >
        <div className="absolute top-2 right-2 z-30" ref={menuRef}>
          <button
            onClick={() => setShowMenu(!showMenu)}
            className={`p-1 rounded-full bg-black/50 text-white hover:bg-black/70 transition-all opacity-0 group-hover:opacity-100 ${
              showMenu ? "opacity-100" : ""
            }`}
          >
            <ChevronDownIcon className="w-4 h-4" />
          </button>

          {showMenu && (
            <div
              className={`absolute z-50 top-full mt-1 right-0 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl w-32 animate-in fade-in zoom-in-95`}
            >
              <button
                onClick={() => {
                  setReplyingTo({
                    id: msg.id,
                    text: "Crypto Transfer",
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

        <div
          className={`absolute -right-8 -top-8 w-32 h-32 rounded-full blur-3xl opacity-40 pointer-events-none ${msg.isMine ? "bg-indigo-500" : "bg-emerald-500"}`}
        ></div>

        <div className="relative z-20">
          {msg.replyTo && (
            <div className="mb-3">
              <ReplyBubbleContext replyTo={msg.replyTo} isMine={msg.isMine} />
            </div>
          )}
        </div>

        <div className="flex items-center justify-between relative z-10">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center border shadow-sm ${msg.isMine ? "bg-indigo-500/20 border-indigo-500/30 text-indigo-300" : "bg-emerald-500/20 border-emerald-500/30 text-emerald-300"}`}
            >
              {msg.isMine ? (
                <ArrowUpIcon className="w-4 h-4" />
              ) : (
                <ArrowDownIcon className="w-4 h-4" />
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
              <CheckIcon className="w-3.5 h-3.5" />
            ) : (
              <BoltIcon className="w-3.5 h-3.5" />
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
            className={`flex items-center justify-between p-3 rounded-xl text-[10px] font-mono cursor-pointer transition-all active:scale-[0.98] group ${
              msg.isMine
                ? "bg-black/40 hover:bg-black/60 border border-indigo-500/20 text-indigo-100"
                : "bg-black/30 hover:bg-black/50 border border-emerald-500/20 text-emerald-100"
            }`}
          >
            <span className="truncate mr-3">{txHash}</span>
            <CopyIcon
              className={`w-4 h-4 shrink-0 opacity-50 group-hover:opacity-100 transition-opacity ${msg.isMine ? "text-indigo-300" : "text-emerald-300"}`}
            />
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
    </div>
  );
};
