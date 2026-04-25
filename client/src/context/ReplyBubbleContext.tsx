import { useChatContext } from "@/context/ChatContext";
import ms from "ms";

interface ReplyBubbleContextProps {
  replyTo: {
    id: string;
    text: string;
    isMine: boolean;
    timestamp?: number;
  };
  isMine: boolean;
}

/**
 * Renders the contextual reply snippet inside a chat bubble.
 * Uses high-precision P2P timestamp matching to find the exact message.
 * @param {ReplyBubbleContextProps} props - Component properties.
 * @returns {JSX.Element} The reply snippet component.
 */
export const ReplyBubbleContext = ({
  replyTo,
  isMine,
}: ReplyBubbleContextProps) => {
  const { activeUsername, messages } = useChatContext();

  /**
   * Evaluates the closest message by timestamp delta and scrolls into view.
   * @returns {void}
   */
  const handleScrollToMessage = (): void => {
    let targetEl = document.getElementById(`msg-${replyTo.id}`);

    if (!targetEl && replyTo.timestamp) {
      const targetIsMine = !replyTo.isMine;

      let closestMsg: any = null;
      let minDiff = Infinity;

      messages.forEach((m) => {
        if (m.isMine === targetIsMine) {
          const diff = Math.abs(m.timestamp - (replyTo.timestamp || 0));
          if (diff < minDiff && diff < 15000) {
            minDiff = diff;
            closestMsg = m;
          }
        }
      });

      if (closestMsg) {
        targetEl = document.getElementById(`msg-${closestMsg.id}`);
      }
    }

    if (targetEl) {
      targetEl.scrollIntoView({ behavior: "smooth", block: "center" });
      targetEl.classList.add("bg-indigo-500/40", "scale-[1.02]", "z-10");
      setTimeout(() => {
        targetEl?.classList.remove("bg-indigo-500/40", "scale-[1.02]", "z-10");
      }, ms("1s"));
    }
  };

  return (
    <div
      onClick={handleScrollToMessage}
      className={`mb-1.5 p-1.5 rounded-lg border-l-4 text-xs cursor-pointer hover:opacity-100 transition-all pr-6 ${
        isMine
          ? "bg-black/20 border-indigo-300 opacity-90"
          : "bg-black/20 border-indigo-500 opacity-90"
      }`}
    >
      <p
        className={`font-bold mb-0.5 text-[10px] ${
          isMine ? "text-indigo-200" : "text-indigo-400"
        }`}
      >
        {replyTo.isMine ? "You" : activeUsername}
      </p>
      <p className="line-clamp-1 text-white/90 leading-snug">{replyTo.text}</p>
    </div>
  );
};
