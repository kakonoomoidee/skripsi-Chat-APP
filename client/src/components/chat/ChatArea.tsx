import { useRef, useEffect, useState } from "react";
import { formatTime } from "@/utils/format";
import { useChatContext } from "@/context/ChatContext";
import { createPortal } from "react-dom";

/**
 * Chat Area Component connected to Context
 * Includes direct WebRTC cryptocurrency transfer capabilities and Ultra-Premium Tx Cards.
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
    requestPeerWallet,
    peerWalletAddress,
    handleSendCrypto,
    showToast,
  } = useChatContext();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [transferAmount, setTransferAmount] = useState("");

  // Auto-scroll to bottom logic
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleOpenTransferModal = () => {
    if (!localStorage.getItem("linked_metamask")) {
      showToast(
        "Please link your MetaMask wallet in Security Settings first.",
        "error",
      );
      return;
    }
    requestPeerWallet();
    setIsTransferModalOpen(true);
  };

  const executeTransfer = () => {
    handleSendCrypto(transferAmount);
    setIsTransferModalOpen(false);
    setTransferAmount("");
  };

  if (!activeChat) {
    return (
      <div className="flex flex-col bg-zinc-950 w-full h-full overflow-hidden">
        <div className="h-16 shrink-0 border-b border-zinc-800 flex md:hidden items-center px-4 bg-zinc-950 w-full">
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
        <div className="flex-1 min-h-0 p-8 overflow-y-auto custom-scrollbar flex items-center justify-center flex-col text-zinc-600">
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
    <div className="flex flex-col bg-zinc-950 w-full h-full overflow-hidden relative">
      <div className="h-16 shrink-0 border-b border-zinc-800 flex items-center px-4 md:px-8 bg-zinc-950 w-full z-10">
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

      <div className="flex-1 min-h-0 px-4 md:px-8 py-6 overflow-y-auto custom-scrollbar">
        <div className="space-y-6">
          {messages?.map((msg) => {
            const isCryptoTx =
              msg.text?.startsWith("[SENT]") ||
              msg.text?.startsWith("[RECEIVED]");
            let txType = "";
            let txAmountOrStatus = "";
            let txHash = "";
            let isVerification = false;

            if (isCryptoTx) {
              txType = msg.text.startsWith("[SENT]") ? "SENT" : "RECEIVED";
              const parts = msg.text.split("\nTx Hash: ");
              const rawAmount = parts[0].replace(`[${txType}] `, "");
              txHash = parts[1] || "";

              // Fix bug "Verified! ETH" by tracking if it's a verification message
              if (rawAmount.includes("Transfer Verified!")) {
                isVerification = true;
                txAmountOrStatus = "Verified";
              } else {
                txAmountOrStatus = rawAmount.replace(" ETH", "");
              }
            }

            return (
              <div
                key={msg.id}
                className={`flex w-full ${msg.isMine ? "justify-end" : "justify-start"}`}
              >
                {!isCryptoTx ? (
                  /* REFACTORED: Upgraded text & image messages to match the premium theme */
                  <div
                    className={`relative flex flex-col max-w-[85%] md:max-w-[65%] min-w-20 shadow-lg backdrop-blur-md ${
                      msg.isMine
                        ? "bg-linear-to-br from-indigo-500/90 to-indigo-600/90 text-white rounded-2xl rounded-tr-sm border border-indigo-400/30"
                        : "bg-linear-to-br from-zinc-800/95 to-zinc-900/95 text-zinc-100 rounded-2xl rounded-tl-sm border border-zinc-700/50"
                    } ${msg.isImage ? "p-1.5" : "px-4 py-3"}`}
                  >
                    {msg.isImage ? (
                      // Edge-to-edge image padding styling
                      <div className="relative">
                        <img
                          src={msg.text}
                          alt="p2p-attachment"
                          className="rounded-[10px] max-w-full h-auto object-cover"
                        />
                        {/* Image Timestamp Overlay */}
                        <span className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded text-[9px] font-medium bg-black/50 text-white/90 backdrop-blur-sm">
                          {formatTime(msg.timestamp)}
                        </span>
                      </div>
                    ) : (
                      <>
                        <p className="text-sm leading-relaxed wrap-break-words whitespace-pre-wrap">
                          {msg.text}
                        </p>
                        {/* Text Timestamp */}
                        <span
                          className={`text-[9px] mt-1.5 font-medium select-none ${
                            msg.isMine
                              ? "text-indigo-200 text-right"
                              : "text-zinc-500 text-left"
                          }`}
                        >
                          {formatTime(msg.timestamp)}
                        </span>
                      </>
                    )}
                  </div>
                ) : (
                  /* REFACTORED: Fixed Tx Card Layout */
                  <div
                    className={`mt-2 mb-1 p-5 rounded-3xl border backdrop-blur-xl flex flex-col gap-4 min-w-65 sm:min-w-[320px] max-w-[85%] relative overflow-hidden shadow-2xl ${
                      msg.isMine
                        ? "bg-linear-to-br from-indigo-900/50 to-purple-900/30 border-indigo-500/40"
                        : "bg-linear-to-br from-emerald-900/50 to-teal-900/30 border-emerald-500/40"
                    }`}
                  >
                    <div
                      className={`absolute -right-8 -top-8 w-32 h-32 rounded-full blur-3xl opacity-40 pointer-events-none ${
                        msg.isMine ? "bg-indigo-500" : "bg-emerald-500"
                      }`}
                    ></div>

                    <div className="flex items-center justify-between relative z-10">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center border shadow-sm ${
                            msg.isMine
                              ? "bg-indigo-500/20 border-indigo-500/30 text-indigo-300"
                              : "bg-emerald-500/20 border-emerald-500/30 text-emerald-300"
                          }`}
                        >
                          {msg.isMine ? (
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2.5}
                                d="M5 10l7-7m0 0l7 7m-7-7v18"
                              />
                            </svg>
                          ) : (
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2.5}
                                d="M19 14l-7 7m0 0l-7-7m7 7V3"
                              />
                            </svg>
                          )}
                        </div>
                        <span
                          className={`text-[11px] font-bold uppercase tracking-widest ${
                            msg.isMine ? "text-indigo-200" : "text-emerald-200"
                          }`}
                        >
                          {txType === "SENT"
                            ? "Transfer Sent"
                            : "Transfer Received"}
                        </span>
                      </div>
                      <div
                        className={`flex items-center justify-center w-6 h-6 rounded-full bg-black/20 ${msg.isMine ? "text-indigo-400" : "text-emerald-400"}`}
                      >
                        {isVerification ? (
                          <svg
                            className="w-3.5 h-3.5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={3}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        ) : (
                          <svg
                            className="w-3.5 h-3.5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2.5}
                              d="M13 10V3L4 14h7v7l9-11h-7z"
                            />
                          </svg>
                        )}
                      </div>
                    </div>

                    <div className="flex items-end gap-1.5 relative z-10 my-1">
                      <h4
                        className={`text-4xl font-black tracking-tighter leading-none ${
                          msg.isMine ? "text-white" : "text-emerald-50"
                        }`}
                      >
                        {txAmountOrStatus}
                      </h4>
                      {/* Hanya nampilin "ETH" kalo statusnya bukan Verification */}
                      {!isVerification && (
                        <span
                          className={`text-lg font-bold pb-0.5 ${
                            msg.isMine ? "text-indigo-300" : "text-emerald-300"
                          }`}
                        >
                          ETH
                        </span>
                      )}
                    </div>

                    <div className="w-full relative z-10 mt-1 mb-1">
                      <p
                        className={`text-[9px] font-semibold mb-1.5 uppercase tracking-widest ${
                          msg.isMine
                            ? "text-indigo-300/70"
                            : "text-emerald-300/70"
                        }`}
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
                        <svg
                          className={`w-4 h-4 shrink-0 opacity-50 group-hover:opacity-100 transition-opacity ${
                            msg.isMine ? "text-indigo-300" : "text-emerald-300"
                          }`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                          />
                        </svg>
                      </div>
                    </div>

                    {/* Timestamp dipindah ke kontainer bawah biar gak nabrak */}
                    <div className="flex justify-end w-full relative z-10 mt-1">
                      <span
                        className={`text-[9px] font-medium select-none ${
                          msg.isMine
                            ? "text-indigo-300/70"
                            : "text-emerald-300/70"
                        }`}
                      >
                        {formatTime(msg.timestamp)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="shrink-0 p-4 md:p-6 border-t border-zinc-800 bg-zinc-950 w-full z-20">
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
            onClick={handleOpenTransferModal}
            disabled={!isWebRTCConnected}
            className="p-3 text-emerald-500 hover:text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-xl border border-emerald-500/20 transition-colors disabled:opacity-50 shrink-0"
            title="Transfer Crypto"
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
                d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => imageInputRef.current?.click()}
            disabled={!isWebRTCConnected}
            className="p-3 text-zinc-400 hover:text-indigo-400 bg-zinc-900 rounded-xl border border-zinc-800 transition-colors disabled:opacity-50 shrink-0"
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
            className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-100 outline-none focus:ring-1 focus:border-indigo-500 focus:ring-indigo-500 disabled:opacity-50 transition-all placeholder-zinc-600 min-w-0"
          />
          <button
            type="submit"
            disabled={!messageInput.trim() || !isWebRTCConnected}
            className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl px-4 md:px-5 py-3 text-sm font-medium transition-colors disabled:opacity-50 shadow-lg shadow-indigo-500/20 shrink-0 flex items-center justify-center"
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

      {isTransferModalOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div className="fixed inset-0 z-100 flex items-center justify-center bg-zinc-950/80 backdrop-blur-sm p-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
              <h3 className="text-lg font-bold text-zinc-100 mb-1">
                Transfer Crypto to {activeUsername}
              </h3>

              {!peerWalletAddress ? (
                <div className="flex flex-col items-center justify-center py-6">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500 mb-4"></div>
                  <p className="text-xs text-zinc-400 text-center">
                    Requesting {activeUsername}'s wallet address via WebRTC...
                  </p>
                  <button
                    onClick={() => setIsTransferModalOpen(false)}
                    className="mt-4 text-xs text-red-400 hover:text-red-300 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <>
                  <p className="text-[10px] text-zinc-400 mb-4 break-all bg-zinc-950 p-2 rounded-lg border border-zinc-800">
                    <span className="font-semibold text-zinc-300">
                      Target Address:
                    </span>
                    <br />
                    {peerWalletAddress}
                  </p>
                  <div className="mb-6">
                    <label className="block text-xs font-medium text-zinc-400 mb-2">
                      Amount (ETH)
                    </label>
                    <input
                      type="number"
                      step="0.0001"
                      value={transferAmount}
                      onChange={(e) => setTransferAmount(e.target.value)}
                      placeholder="e.g. 0.05"
                      className="w-full bg-zinc-950 border border-zinc-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-3 py-2.5 text-sm text-zinc-200 outline-none transition-all placeholder:text-zinc-700"
                      autoComplete="off"
                    />
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setIsTransferModalOpen(false)}
                      className="flex-1 py-2.5 rounded-xl text-xs font-medium text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={executeTransfer}
                      disabled={
                        !transferAmount || isNaN(Number(transferAmount))
                      }
                      className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 rounded-xl text-xs font-medium transition-colors disabled:opacity-50 shadow-lg shadow-emerald-500/20"
                    >
                      Send via MetaMask
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
