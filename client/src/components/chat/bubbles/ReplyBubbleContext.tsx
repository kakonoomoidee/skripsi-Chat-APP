import { useChatContext } from "@/context/ChatContext";

interface ReplyBubbleContextProps {
  replyTo: {
    id: string;
    text: string;
    isMine: boolean;
    timestamp?: number;
  };
  isMine: boolean;
}

export const ReplyBubbleContext = ({
  replyTo,
  isMine,
}: ReplyBubbleContextProps) => {
  const { activeUsername, messages } = useChatContext();

  const handleScrollToMessage = (): void => {
    let targetEl = document.getElementById(`msg-${replyTo.id}`);

    if (!targetEl && replyTo.timestamp) {
      const targetIsMine = !replyTo.isMine;

      const targetMsg = messages.find((m) => {
        const isSameOwnership = m.isMine === targetIsMine;
        const isTimeClose =
          Math.abs(m.timestamp - (replyTo.timestamp || 0)) < 15000;
        return isSameOwnership && isTimeClose;
      });

      if (targetMsg) {
        targetEl = document.getElementById(`msg-${targetMsg.id}`);
      }
    }

    if (targetEl) {
      targetEl.scrollIntoView({ behavior: "smooth", block: "center" });
      targetEl.classList.add("bg-indigo-500/40", "scale-[1.02]", "z-10");
      setTimeout(() => {
        targetEl.classList.remove("bg-indigo-500/40", "scale-[1.02]", "z-10");
      }, 1000);
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
