import React, { useRef, useState, useEffect } from "react";
import { useChatContext } from "@/context/ChatContext";
import { useSessionStore, useUIStore } from "@/store";
import {
  AttachmentIcon,
  CryptoIcon,
  SendIcon,
  MicIcon,
  TrashIcon,
  DocumentIcon,
  CameraIcon,
  GalleryIcon,
} from "../icons/index";
import { CameraModal } from "./CameraModal";
import { ReplyPreview } from "./bubbles/ReplyPreview";

export interface ChatInputProps {
  onOpenTransferModal: () => void;
}

/**
 * Checks file signature to prevent executable uploads hidden with safe extensions.
 * Fully refactored to support all variants of JPEG/JPG headers.
 * @param {File} file - The file to evaluate.
 * @returns {Promise<boolean>} Evaluation status.
 */
const isFileSignatureSafe = (file: File): Promise<boolean> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = (e) => {
      if (!e.target || !e.target.result) return resolve(false);
      const arr = new Uint8Array(e.target.result as ArrayBuffer).subarray(0, 4);
      let header = "";
      for (let i = 0; i < arr.length; i++) {
        header += arr[i].toString(16).padStart(2, "0");
      }

      // Check for common image and document signatures
      const safeHeaders = [
        "25504446", // PDF
        "504b0304", // DOCX/XLSX
        "89504e47", // PNG
        "47494638", // GIF
        "52494646", // WEBP/AVI
      ];

      // JPEG/JPG is tricky, it usually starts with FFD8FF, the 4th byte can vary
      const isJpeg = header.toLowerCase().startsWith("ffd8ff");

      const isSafe =
        isJpeg || safeHeaders.some((h) => header.toLowerCase().startsWith(h));
      resolve(isSafe || file.type.startsWith("text/"));
    };
    reader.readAsArrayBuffer(file.slice(0, 4));
  });
};

/**
 * Formats duration time string.
 * @param {number} time - Duration in seconds.
 * @returns {string} Formatted MM:SS string.
 */
const formatDuration = (time: number): string => {
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
};

export const ChatInput = ({ onOpenTransferModal }: ChatInputProps) => {
  const {
    isWebRTCConnected,
    handleSendMessage: originalHandleSendMessage,
    handleSendImage,
    handleSendAudio,
    handleSendDocument,
    handleSendCameraPhoto,
    handleTyping,
  } = useChatContext();

  const { messageInput, setMessageInput, replyingTo } = useSessionStore();
  const { showToast } = useUIStore();

  const imageInputRef = useRef<HTMLInputElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const attachMenuRef = useRef<HTMLDivElement>(null);

  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number>(0);
  const barsRef = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        attachMenuRef.current &&
        !attachMenuRef.current.contains(event.target as Node)
      ) {
        setShowAttachMenu(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setShowAttachMenu(false);
      }
    };

    if (showAttachMenu) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [showAttachMenu]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height =
        scrollHeight > 100 ? "100px" : `${scrollHeight}px`;
    }
  }, [messageInput]);

  useEffect(() => {
    if (replyingTo && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [replyingTo]);

  /**
   * Custom message handler to inject replyingTo timestamp logic.
   * @param {React.SyntheticEvent} e - Form event.
   * @returns {void}
   */
  const handleSendMessageWrapper = (e: React.SyntheticEvent): void => {
    e.preventDefault();
    if (!messageInput.trim() || !isWebRTCConnected) return;

    // Call the original handleSendMessage from context, it already reads replyingTo state.
    // The timestamp logic will be handled inside ChatContext.tsx now.
    originalHandleSendMessage(e as any);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>): void => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (messageInput.trim() && isWebRTCConnected) {
        handleSendMessageWrapper(e as any);
      }
    }
  };

  const stopAllMedia = (): void => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    if (animationFrameRef.current)
      cancelAnimationFrame(animationFrameRef.current);
    if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
      audioCtxRef.current.close();
    }
    setIsRecording(false);
    setRecordingTime(0);
  };

  const drawVisualizer = (): void => {
    if (!analyserRef.current) return;
    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animationFrameRef.current = requestAnimationFrame(draw);
      analyserRef.current!.getByteFrequencyData(dataArray);

      barsRef.current.forEach((bar, index) => {
        if (bar) {
          const value = dataArray[index * 2];
          const height = Math.max(4, (value / 255) * 24);
          bar.style.height = `${height}px`;
        }
      });
    };
    draw();
  };

  const startRecording = async (): Promise<void> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const audioCtx = new (
        window.AudioContext || (window as any).webkitAudioContext
      )();
      const analyser = audioCtx.createAnalyser();
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);
      analyser.fftSize = 128;
      audioCtxRef.current = audioCtx;
      analyserRef.current = analyser;

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      drawVisualizer();

      timerIntervalRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch {
      showToast("Microphone access denied or not available.", "error");
    }
  };

  const sendRecording = (): void => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/webm",
        });
        handleSendAudio(audioBlob);
        stopAllMedia();
      };
      mediaRecorderRef.current.stop();
    }
  };

  const cancelRecording = (): void => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.onstop = null;
      stopAllMedia();
    }
  };

  const handleDocumentUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ): Promise<void> => {
    const file = e.target.files?.[0];
    setShowAttachMenu(false);

    if (!file) return;

    if (file.size > 1048576) {
      showToast("File size limit exceeded. Maximum allowed is 1MB.", "error");
      if (documentInputRef.current) documentInputRef.current.value = "";
      return;
    }

    const isSafe = await isFileSignatureSafe(file);
    if (!isSafe) {
      // FIX: Pesan Error Eksplisit Kalo File Ditolak Magic Numbers
      showToast(
        "Upload Blocked: File signature invalid or corrupted.",
        "error",
      );
      if (documentInputRef.current) documentInputRef.current.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      handleSendDocument(file.name, base64);
    };
    reader.readAsDataURL(file);
  };

  const handleImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ): Promise<void> => {
    const file = e.target.files?.[0];
    setShowAttachMenu(false);

    if (!file) return;

    if (file.size > 1024 * 500) {
      showToast(
        "Image size limit exceeded. Maximum allowed is 500KB.",
        "error",
      );
      if (imageInputRef.current) imageInputRef.current.value = "";
      return;
    }

    const isSafe = await isFileSignatureSafe(file);
    if (!isSafe) {
      showToast("Upload Blocked: Image format invalid or corrupted.", "error");
      if (imageInputRef.current) imageInputRef.current.value = "";
      return;
    }

    // Call context function
    handleSendImage(e);
  };

  return (
    <>
      {isCameraOpen && (
        <CameraModal
          onClose={() => setIsCameraOpen(false)}
          onSend={(base64) => handleSendCameraPhoto(base64)}
        />
      )}
      <div className="shrink-0 p-4 md:p-6 bg-zinc-950 w-full z-20 pb-safe relative">
        <div className="max-w-5xl mx-auto flex flex-col gap-2 relative">
          <ReplyPreview />

          <form
            onSubmit={handleSendMessageWrapper}
            className="flex gap-2.5 items-end w-full relative"
          >
            <input
              type="file"
              accept="image/*"
              ref={imageInputRef}
              onChange={handleImageUpload}
              className="hidden"
            />

            <input
              type="file"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.txt"
              ref={documentInputRef}
              onChange={handleDocumentUpload}
              className="hidden"
            />

            <div
              className={`flex-1 bg-zinc-900 border border-zinc-800 rounded-3xl flex items-end pl-2 pr-2 py-1.5 transition-all shadow-sm ${
                isRecording
                  ? "border-red-500/50 ring-1 ring-red-500/20"
                  : "focus-within:border-indigo-500/50 focus-within:ring-1 focus-within:ring-indigo-500/30"
              }`}
            >
              {!isRecording && (
                <div className="relative flex items-center">
                  <button
                    type="button"
                    onClick={onOpenTransferModal}
                    disabled={!isWebRTCConnected}
                    className="p-2 mb-0.5 text-emerald-500 hover:text-emerald-400 hover:bg-zinc-800 rounded-full transition-colors disabled:opacity-50 shrink-0"
                  >
                    <CryptoIcon className="w-5 h-5" />
                  </button>

                  <div className="relative" ref={attachMenuRef}>
                    <button
                      type="button"
                      onClick={() => setShowAttachMenu(!showAttachMenu)}
                      disabled={!isWebRTCConnected}
                      className="p-2 mb-0.5 text-zinc-400 hover:text-indigo-400 hover:bg-zinc-800 rounded-full transition-colors disabled:opacity-50 shrink-0 mr-1"
                    >
                      <AttachmentIcon className="w-5 h-5" />
                    </button>

                    {showAttachMenu && (
                      <div className="absolute bottom-full left-0 mb-3 bg-zinc-800 border border-zinc-700 rounded-2xl shadow-2xl p-2 w-56 flex flex-col gap-1 z-50 animate-in slide-in-from-bottom-2 fade-in">
                        <button
                          type="button"
                          onClick={() => imageInputRef.current?.click()}
                          className="flex items-center gap-3 w-full p-2.5 hover:bg-zinc-700 rounded-xl transition-colors text-zinc-200 text-sm font-medium"
                        >
                          <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center">
                            <GalleryIcon className="w-4 h-4" />
                          </div>
                          Gallery
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowAttachMenu(false);
                            setIsCameraOpen(true);
                          }}
                          className="flex items-center gap-3 w-full p-2.5 hover:bg-zinc-700 rounded-xl transition-colors text-zinc-200 text-sm font-medium"
                        >
                          <div className="w-8 h-8 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center">
                            <CameraIcon className="w-4 h-4" />
                          </div>
                          Camera
                        </button>
                        <button
                          type="button"
                          onClick={() => documentInputRef.current?.click()}
                          className="flex items-center gap-3 w-full p-2.5 hover:bg-zinc-700 rounded-xl transition-colors text-zinc-200 text-sm font-medium"
                        >
                          <div className="w-8 h-8 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center">
                            <DocumentIcon className="w-4 h-4" />
                          </div>
                          Document (Max 1MB)
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {isRecording ? (
                <div className="flex-1 px-3 py-2.5 mb-0.5 flex items-center justify-between text-zinc-100">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]"></span>
                    <span className="font-mono text-sm">
                      {formatDuration(recordingTime)}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 h-6">
                    {Array.from({ length: 20 }).map((_, i) => (
                      <div
                        key={i}
                        ref={(el) => {
                          barsRef.current[i] = el;
                        }}
                        className="w-1 bg-indigo-400 rounded-full transition-all duration-75"
                        style={{ height: "4px" }}
                      />
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={cancelRecording}
                    className="text-red-400 hover:text-red-300 p-1 transition-colors"
                  >
                    <TrashIcon className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <textarea
                  ref={textareaRef}
                  rows={1}
                  value={messageInput}
                  onChange={(e) => {
                    setMessageInput(e.target.value);
                    handleTyping();
                  }}
                  onKeyDown={handleKeyDown}
                  disabled={!isWebRTCConnected}
                  placeholder={
                    isWebRTCConnected ? "Type a message..." : "Connecting..."
                  }
                  className="flex-1 bg-transparent px-2 py-2.5 mb-0.5 text-sm text-zinc-100 outline-none disabled:opacity-50 transition-all placeholder-zinc-600 resize-none custom-scrollbar min-h-10 max-h-25"
                />
              )}
            </div>

            {!messageInput.trim() && isWebRTCConnected && !isRecording ? (
              <button
                type="button"
                onClick={startRecording}
                className="w-12 h-12 rounded-full flex items-center justify-center transition-all shrink-0 mb-0.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
              >
                <MicIcon className="w-5 h-5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={isRecording ? sendRecording : handleSendMessageWrapper}
                disabled={
                  (!isRecording && !messageInput.trim()) || !isWebRTCConnected
                }
                className={`w-12 h-12 rounded-full transition-all shrink-0 mb-0.5 flex items-center justify-center shadow-lg disabled:opacity-50 disabled:scale-95 disabled:shadow-none ${
                  isRecording
                    ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-500/20"
                    : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/20"
                }`}
              >
                <SendIcon className={`w-5 h-5`} />
              </button>
            )}
          </form>
        </div>
      </div>
    </>
  );
};
