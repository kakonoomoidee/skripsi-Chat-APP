import React from "react";
import { useChatContext } from "@/context/ChatContext";
import { XIcon, PhoneIcon } from "@/components/icons";
import { getCallDisplayInitial } from "@/utils/media/call";

/**
 * Renders a floating notification modal for incoming WebRTC voice calls.
 * Displays the caller's username and provides action buttons to accept or decline the call.
 *
 * @returns {React.JSX.Element | null} The notification UI element, or null if there is no incoming call.
 */
export const CallNotification = (): React.JSX.Element | null => {
  const { isIncomingCall, activeUsername, acceptCall, declineCall } =
    useChatContext();

  if (!isIncomingCall) return null;

  return (
    <div className="absolute top-20 right-4 md:right-8 z-50 bg-zinc-900/95 backdrop-blur-md border border-zinc-700 p-4 rounded-2xl shadow-2xl w-72 animate-in slide-in-from-top-5 fade-in duration-300">
      <div className="flex flex-col items-center mb-4">
        <div className="w-14 h-14 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xl font-bold shadow-inner mb-3 animate-pulse">
          {getCallDisplayInitial(activeUsername)}
        </div>
        <h3 className="font-semibold text-zinc-100 capitalize text-lg">
          {activeUsername}
        </h3>
        <p className="text-zinc-400 text-sm">Incoming Voice Call...</p>
      </div>

      <div className="flex justify-center gap-6 mt-2">
        <button
          onClick={declineCall}
          className="w-12 h-12 rounded-full bg-red-500/20 text-red-500 hover:bg-red-500 hover:text-white flex items-center justify-center transition-all shadow-lg"
        >
          <XIcon className="w-6 h-6" />
        </button>

        <button
          onClick={acceptCall}
          className="w-12 h-12 rounded-full bg-emerald-500 text-white hover:bg-emerald-400 hover:scale-105 flex items-center justify-center transition-all shadow-lg shadow-emerald-500/30"
        >
          <PhoneIcon className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
};
