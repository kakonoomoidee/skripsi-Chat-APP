import { useChatContext } from "@/context/ChatContext";

/**
 * Renders a floating notification for incoming voice calls.
 * @returns {JSX.Element | null} The notification UI element.
 */
export const CallNotification = () => {
  const { isIncomingCall, activeUsername, acceptCall, declineCall } =
    useChatContext();

  if (!isIncomingCall) return null;

  return (
    <div className="absolute top-20 right-4 md:right-8 z-50 bg-zinc-900/95 backdrop-blur-md border border-zinc-700 p-4 rounded-2xl shadow-2xl w-72 animate-in slide-in-from-top-5 fade-in duration-300">
      <div className="flex flex-col items-center mb-4">
        <div className="w-14 h-14 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xl font-bold shadow-inner mb-3 animate-pulse">
          {activeUsername?.charAt(0).toUpperCase()}
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
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        <button
          onClick={acceptCall}
          className="w-12 h-12 rounded-full bg-emerald-500 text-white hover:bg-emerald-400 hover:scale-105 flex items-center justify-center transition-all shadow-lg shadow-emerald-500/30"
        >
          <svg
            className="w-6 h-6"
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
