import React, { useRef, useState, useEffect } from "react";
import { useChatContext } from "@/context/ChatContext";
import { useSessionStore, useUIStore } from "@/store";
import {
  AttachmentIcon,
  CryptoIcon,
  SendIcon,
  MicIcon,
  TrashIcon,
} from "../icons/index";

export interface ChatInputProps {
  onOpenTransferModal: () => void;
}

const formatDuration = (time: number) => {
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
};

export const ChatInput = ({ onOpenTransferModal }: ChatInputProps) => {
  const {
    isWebRTCConnected,
    handleSendMessage,
    handleSendImage,
    handleSendAudio,
  } = useChatContext();

  const { messageInput, setMessageInput } = useSessionStore();
  const { showToast } = useUIStore();

  const imageInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number>(0);
  const barsRef = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height =
        scrollHeight > 100 ? "100px" : `${scrollHeight}px`;
    }
  }, [messageInput]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (messageInput.trim() && isWebRTCConnected) {
        handleSendMessage(e as any);
      }
    }
  };

  const stopAllMedia = () => {
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

  const drawVisualizer = () => {
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

  const startRecording = async () => {
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
    } catch (err) {
      // REFACTORED: Replaced native alert with custom Toast
      showToast("Microphone access denied or not available.", "error");
    }
  };

  const sendRecording = () => {
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

  const cancelRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.onstop = null;
      stopAllMedia();
    }
  };

  return (
    <div className="shrink-0 p-4 md:p-6 bg-zinc-950 w-full z-20 pb-safe">
      <form
        onSubmit={handleSendMessage}
        className="flex gap-2.5 max-w-5xl mx-auto items-end"
      >
        <input
          type="file"
          accept="image/*"
          ref={imageInputRef}
          onChange={handleSendImage}
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
            <>
              <button
                type="button"
                onClick={onOpenTransferModal}
                disabled={!isWebRTCConnected}
                className="p-2 mb-0.5 text-emerald-500 hover:text-emerald-400 hover:bg-zinc-800 rounded-full transition-colors disabled:opacity-50 shrink-0"
              >
                <CryptoIcon className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                disabled={!isWebRTCConnected}
                className="p-2 mb-0.5 text-zinc-400 hover:text-indigo-400 hover:bg-zinc-800 rounded-full transition-colors disabled:opacity-50 shrink-0 mr-1"
              >
                <AttachmentIcon className="w-5 h-5" />
              </button>
            </>
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
              onChange={(e) => setMessageInput(e.target.value)}
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
            onClick={isRecording ? sendRecording : (handleSendMessage as any)}
            disabled={
              (!isRecording && !messageInput.trim()) || !isWebRTCConnected
            }
            className={`w-12 h-12 rounded-full transition-all shrink-0 mb-0.5 flex items-center justify-center shadow-lg disabled:opacity-50 disabled:scale-95 disabled:shadow-none ${
              isRecording
                ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-500/20"
                : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/20"
            }`}
          >
            <SendIcon
              className={`w-5 h-5 ${isRecording ? "ml-0" : "ml-0.5"}`}
            />
          </button>
        )}
      </form>
    </div>
  );
};
