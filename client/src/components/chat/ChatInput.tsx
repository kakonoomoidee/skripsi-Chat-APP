import { useRef, useState } from "react";
import { useChatContext } from "@/context/ChatContext";
import {
  AttachmentIcon,
  CryptoIcon,
  SendIcon,
  MicIcon,
  StopIcon,
} from "../icons/index";

export interface ChatInputProps {
  onOpenTransferModal: () => void;
}

/**
 * Renders the input form for sending text, images, audio, and triggering crypto transfers.
 * @param {ChatInputProps} props - Properties including modal trigger.
 * @returns {JSX.Element}
 */
export const ChatInput = ({ onOpenTransferModal }: ChatInputProps) => {
  const {
    isWebRTCConnected,
    messageInput,
    setMessageInput,
    handleSendMessage,
    handleSendImage,
    handleSendAudio,
  } = useChatContext();

  const imageInputRef = useRef<HTMLInputElement>(null);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const toggleRecording = async () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) audioChunksRef.current.push(e.data);
        };

        mediaRecorder.onstop = () => {
          const audioBlob = new Blob(audioChunksRef.current, {
            type: "audio/webm",
          });
          handleSendAudio(audioBlob);
          stream.getTracks().forEach((track) => track.stop()); // cleanup mic
        };

        mediaRecorder.start();
        setIsRecording(true);
      } catch (err) {
        alert("Microphone access denied or not available.");
      }
    }
  };

  return (
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
          onClick={onOpenTransferModal}
          disabled={!isWebRTCConnected}
          className="p-3 text-emerald-500 hover:text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-xl border border-emerald-500/20 transition-colors disabled:opacity-50 shrink-0"
          title="Transfer Crypto"
        >
          <CryptoIcon className="w-5 h-5" />
        </button>

        <button
          type="button"
          onClick={() => imageInputRef.current?.click()}
          disabled={!isWebRTCConnected}
          className="p-3 text-zinc-400 hover:text-indigo-400 bg-zinc-900 rounded-xl border border-zinc-800 transition-colors disabled:opacity-50 shrink-0"
        >
          <AttachmentIcon className="w-5 h-5" />
        </button>

        {isRecording ? (
          <div className="flex-1 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-sm flex items-center justify-between animate-pulse">
            <span className="text-red-400 font-medium flex items-center gap-2">
              <span className="w-2.5 h-2.5 bg-red-500 rounded-full"></span>{" "}
              Recording Audio...
            </span>
          </div>
        ) : (
          <input
            type="text"
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            disabled={!isWebRTCConnected}
            placeholder={isWebRTCConnected ? `Message...` : "Connecting..."}
            className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-100 outline-none focus:ring-1 focus:border-indigo-500 focus:ring-indigo-500 disabled:opacity-50 transition-all placeholder-zinc-600 min-w-0"
          />
        )}

        {!messageInput.trim() && isWebRTCConnected ? (
          <button
            type="button"
            onClick={toggleRecording}
            className={`p-3 rounded-xl transition-colors shrink-0 shadow-lg ${
              isRecording
                ? "bg-red-600 hover:bg-red-500 text-white shadow-red-500/20"
                : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/20"
            }`}
          >
            {isRecording ? (
              <StopIcon className="w-5 h-5" />
            ) : (
              <MicIcon className="w-5 h-5" />
            )}
          </button>
        ) : (
          <button
            type="submit"
            disabled={!messageInput.trim() || !isWebRTCConnected}
            className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl px-4 md:px-5 py-3 text-sm font-medium transition-colors disabled:opacity-50 shadow-lg shadow-indigo-500/20 shrink-0 flex items-center justify-center"
          >
            <SendIcon className="w-5 h-5 md:hidden" />
            <span className="hidden md:inline">Send</span>
          </button>
        )}
      </form>
    </div>
  );
};
