import { useSessionStore } from "@/store";
import { useChatContext } from "@/context/ChatContext";

/**
 * Renders the preview box above the chat input when replying to a message.
 * @returns {JSX.Element | null} The reply preview component.
 */
export const ReplyPreview = () => {
  const { replyingTo, setReplyingTo } = useSessionStore();
  const { activeUsername } = useChatContext();

  if (!replyingTo) return null;

  return (
    <div className="bg-zinc-900 border-l-4 border-indigo-500 rounded-xl p-3 flex justify-between items-start animate-in slide-in-from-bottom-2 fade-in shadow-md">
      <div className="flex-1 overflow-hidden pr-2">
        <p className="text-xs font-bold text-indigo-400 mb-1">
          Replying to {replyingTo.isMine ? "You" : activeUsername}
        </p>
        <p className="text-xs text-zinc-300 line-clamp-2 leading-snug">
          {replyingTo.text}
        </p>
      </div>
      <button
        onClick={() => setReplyingTo(null)}
        className="text-zinc-500 hover:text-red-400 p-1 bg-zinc-800/50 hover:bg-zinc-800 rounded-full transition-colors"
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
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
    </div>
  );
};
