import { useRef, useEffect } from "react";
import { formatTime } from "@/utils/format";
import { useChatContext } from "@/context/ChatContext";

/**
 * Chat Area Component connected to Context
 * Includes responsive hamburger menu for mobile drawer toggling.
 * @returns {JSX.Element}
 */
export default function ChatArea() {
  const {
    activeChat,
    activeUsername,
    isWebRTCConnected,
    messages,
    messageInput,
    setMessageInput,
    handleSendMessage,
    handleSendImage,
    setIsMobileSidebarOpen,
  } = useChatContext();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (!activeChat) {
    return (
      <div className="flex-1 flex flex-col bg-zinc-950 relative w-full">
        <div className="h-16 border-b border-zinc-800 flex md:hidden items-center px-4 bg-zinc-950/80 backdrop-blur-md z-10 absolute top-0 w-full">
          <button
            onClick={() => setIsMobileSidebarOpen(true)}
            className="p-2 mr-2 text-zinc-400 hover:text-zinc-200 transition-colors"
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
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
          <p className="text-zinc-600 text-sm font-medium">Select a Chat</p>
        </div>
        <div className="flex-1 p-8 pt-24 pb-32 overflow-y-auto custom-scrollbar flex items-center justify-center flex-col text-zinc-600">
          <div className="w-16 h-16 mb-4 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center shadow-inner">
            <svg
              className="w-8 h-8 text-zinc-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <p className="font-medium text-lg text-zinc-300 mb-1">
            Zero Data Retention Area
          </p>
          <p className="text-sm text-center">
            Select a chat or start a new handshake to begin.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-zinc-950 relative w-full">
      <div className="h-16 border-b border-zinc-800 flex items-center px-4 md:px-8 bg-zinc-950/80 backdrop-blur-md z-10 absolute top-0 w-full">
        <div className="flex items-center w-full">
          <button
            onClick={() => setIsMobileSidebarOpen(true)}
            className="md:hidden p-2 mr-2 -ml-2 text-zinc-400 hover:text-zinc-200 transition-colors"
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
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>

          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold shadow-inner">
              {activeUsername?.charAt(0).toUpperCase()}
            </div>
            <div>
              <h3 className="font-semibold text-zinc-100 capitalize">
                {activeUsername}
              </h3>
              <div className="flex items-center gap-1.5 mt-0.5">
                {isWebRTCConnected ? (
                  <span className="text-[10px] text-emerald-500 font-medium">
                    Secured Tunnel Active
                  </span>
                ) : (
                  <span className="text-[10px] text-amber-500 font-medium">
                    Negotiating Keys...
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 p-4 md:p-8 pt-24 pb-32 overflow-y-auto custom-scrollbar">
        <div className="space-y-6">
          {messages?.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.isMine ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] md:max-w-[65%] px-5 py-3 shadow-sm ${
                  msg.isMine
                    ? "bg-indigo-600 text-zinc-50 rounded-2xl rounded-tr-sm"
                    : "bg-zinc-900 border border-zinc-800 text-zinc-200 rounded-2xl rounded-tl-sm"
                }`}
              >
                {msg.isImage ? (
                  <img
                    src={msg.text}
                    alt="p2p-attachment"
                    className="rounded-lg max-w-full h-auto mb-2 border border-white/10"
                  />
                ) : (
                  <p className="text-sm leading-relaxed whitespace-pre-wrap wrap-break-words">
                    {msg.text}
                  </p>
                )}
                <p
                  className={`text-[10px] mt-2 font-medium ${
                    msg.isMine ? "text-indigo-200 text-right" : "text-zinc-500"
                  }`}
                >
                  {formatTime(msg.timestamp)}
                </p>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="p-4 md:p-6 bg-zinc-950/80 backdrop-blur-md border-t border-zinc-800 absolute bottom-0 w-full z-20">
        <form
          onSubmit={handleSendMessage}
          className="flex gap-2 md:gap-3 max-w-5xl mx-auto items-center"
        >
          <input
            type="file"
            accept="image/*"
            ref={imageInputRef}
            onChange={handleSendImage}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => imageInputRef.current?.click()}
            disabled={!isWebRTCConnected}
            className="p-3 text-zinc-400 hover:text-indigo-400 bg-zinc-900 rounded-xl border border-zinc-800 transition-colors disabled:opacity-50"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
              />
            </svg>
          </button>
          <input
            type="text"
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            disabled={!isWebRTCConnected}
            placeholder={isWebRTCConnected ? `Message...` : "Connecting..."}
            className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-100 outline-none focus:ring-1 focus:border-indigo-500 focus:ring-indigo-500 disabled:opacity-50 transition-all placeholder-zinc-600"
          />
          <button
            type="submit"
            disabled={!messageInput.trim() || !isWebRTCConnected}
            className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl px-5 py-3 text-sm font-medium transition-colors disabled:opacity-50 shadow-lg shadow-indigo-500/20"
          >
            <svg
              className="w-5 h-5 md:hidden"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
              />
            </svg>
            <span className="hidden md:inline">Send</span>
          </button>
        </form>
      </div>
    </div>
  );
}
