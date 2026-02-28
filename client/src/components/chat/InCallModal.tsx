import { useEffect, useState } from "react";
import { useChatContext } from "@/context/ChatContext";

/**
 * Renders a full-screen overlay for active voice calls.
 * @returns {JSX.Element | null} The active call UI overlay.
 */
export const InCallModal = () => {
  const { isInCall, activeUsername, endCall, toggleMute, isMuted } =
    useChatContext();
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isInCall) {
      timer = setInterval(() => setDuration((prev) => prev + 1), 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
      setDuration(0);
    };
  }, [isInCall]);

  if (!isInCall) return null;

  /**
   * Formats elapsed seconds into MM:SS notation.
   * @param {number} secs - Total elapsed seconds.
   * @returns {string} Formatted time string.
   */
  const formatTime = (secs: number): string => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="fixed inset-0 z-99999 bg-zinc-950/95 backdrop-blur-2xl flex flex-col items-center justify-center animate-in fade-in duration-300">
      <div className="flex flex-col items-center mb-16">
        <div className="w-32 h-32 rounded-full bg-indigo-600/20 flex items-center justify-center mb-6 animate-pulse shadow-[0_0_50px_rgba(79,70,229,0.2)]">
          <div className="w-24 h-24 rounded-full bg-indigo-600 flex items-center justify-center text-white text-4xl font-bold shadow-inner">
            {activeUsername?.charAt(0).toUpperCase()}
          </div>
        </div>
        <h2 className="text-3xl font-bold text-white capitalize tracking-wide mb-2">
          {activeUsername}
        </h2>
        <p className="text-indigo-300 font-mono text-xl">
          {formatTime(duration)}
        </p>
      </div>

      <div className="flex items-center gap-8">
        <button
          onClick={toggleMute}
          className={`w-16 h-16 rounded-full flex items-center justify-center transition-all shadow-lg ${
            isMuted
              ? "bg-white text-zinc-900"
              : "bg-zinc-800 text-white hover:bg-zinc-700"
          }`}
        >
          {isMuted ? (
            <svg
              className="w-7 h-7"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
              />
              <line
                x1="4"
                y1="4"
                x2="20"
                y2="20"
                strokeWidth={2}
                strokeLinecap="round"
              />
            </svg>
          ) : (
            <svg
              className="w-7 h-7"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
              />
            </svg>
          )}
        </button>

        <button
          onClick={endCall}
          className="w-20 h-20 rounded-full bg-red-600 text-white hover:bg-red-500 hover:scale-105 flex items-center justify-center transition-all shadow-xl shadow-red-600/30"
        >
          <svg
            className="w-10 h-10 rotate-135"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
              d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
            />
          </svg>
        </button>
      </div>
    </div>
  );
};
