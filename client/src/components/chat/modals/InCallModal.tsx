import React, { useEffect, useState } from "react";
import { useChatContext } from "@/context/ChatContext";
import { PhoneIcon, MicIcon, MicOffIcon } from "@/components/icons";
import { formatDuration } from "@/utils/format";

/**
 * Renders a full-screen overlay for active voice calls.
 * Displays call duration and controls for muting or ending the session.
 *
 * @returns {React.JSX.Element | null} The active call UI overlay, or null if not in a call.
 */
export const InCallModal = (): React.JSX.Element | null => {
  const { isInCall, activeUsername, endCall, toggleMute, isMuted } =
    useChatContext();
  const [duration, setDuration] = useState<number>(0);

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
          {formatDuration(duration)}
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
            <MicOffIcon className="w-7 h-7" />
          ) : (
            <MicIcon className="w-7 h-7" />
          )}
        </button>

        <button
          onClick={endCall}
          className="w-20 h-20 rounded-full bg-red-600 text-white hover:bg-red-500 hover:scale-105 flex items-center justify-center transition-all shadow-xl shadow-red-600/30"
        >
          <PhoneIcon className="w-10 h-10 rotate-135" />
        </button>
      </div>
    </div>
  );
};
