import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { useUIStore } from "@/store";
import { SendIcon } from "../icons/index";

/**
 * Fullscreen camera modal component with capture and preview functionality.
 * Features front/back camera switching and custom toast error handling.
 * @param {Object} props - Component properties.
 * @param {Function} props.onClose - Function to trigger modal closure.
 * @param {Function} props.onSend - Function to process the captured base64 image.
 * @returns {JSX.Element} The React Portal containing the camera interface.
 */
export const CameraModal = ({
  onClose,
  onSend,
}: {
  onClose: () => void;
  onSend: (b64: string) => void;
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [photo, setPhoto] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);

  const { showToast } = useUIStore();

  /**
   * Initializes the camera stream with the specified facing mode.
   * @param {"user" | "environment"} mode - The camera facing mode.
   * @returns {Promise<void>}
   */
  const initCamera = useCallback(
    async (mode: "user" | "environment") => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: mode },
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        showToast("Camera access denied or not available.", "error");
        onClose();
      }
    },
    [onClose, showToast],
  );

  useEffect(() => {
    navigator.mediaDevices.enumerateDevices().then((devices) => {
      const videoInputs = devices.filter(
        (device) => device.kind === "videoinput",
      );
      if (videoInputs.length > 1) {
        setHasMultipleCameras(true);
      }
    });

    initCamera(facingMode);

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, [facingMode, initCamera]);

  /**
   * Toggles between front and rear cameras.
   * @returns {void}
   */
  const handleSwitchCamera = () => {
    setFacingMode((prev) => (prev === "user" ? "environment" : "user"));
  };

  /**
   * Captures the current frame from the video stream onto a canvas.
   * @returns {void}
   */
  const capture = () => {
    if (videoRef.current && canvasRef.current) {
      const ctx = canvasRef.current.getContext("2d");
      const video = videoRef.current;

      canvasRef.current.width = video.videoWidth;
      canvasRef.current.height = video.videoHeight;

      if (ctx) {
        if (facingMode === "user") {
          ctx.translate(canvasRef.current.width, 0);
          ctx.scale(-1, 1);
        }

        ctx.drawImage(video, 0, 0);
        setPhoto(canvasRef.current.toDataURL("image/jpeg", 0.9));
      }
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-99999 bg-black flex flex-col animate-in fade-in duration-200">
      <div className="p-4 flex justify-between items-center z-10 bg-linear-to-b from-black/60 to-transparent absolute top-0 w-full">
        <button
          onClick={onClose}
          className="text-white p-2 hover:bg-white/10 rounded-full transition-colors"
        >
          <svg
            className="w-7 h-7 drop-shadow-md"
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

        {!photo && hasMultipleCameras && (
          <button
            onClick={handleSwitchCamera}
            className="text-white p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <svg
              className="w-7 h-7 drop-shadow-md"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>
        )}
      </div>

      <div className="flex-1 relative flex items-center justify-center overflow-hidden bg-black">
        {!photo ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className={`w-full h-full object-cover ${
              facingMode === "user" ? "scale-x-[-1]" : ""
            }`}
          />
        ) : (
          <img
            src={photo}
            alt="Captured"
            className="w-full h-full object-contain"
          />
        )}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      <div className="p-8 pb-12 flex justify-center items-center h-32 bg-black absolute bottom-0 w-full bg-linear-to-t from-black/80 to-transparent">
        {!photo ? (
          <button
            onClick={capture}
            className="w-19 h-19 rounded-full border-4 border-white/80 flex items-center justify-center hover:scale-95 transition-all group shadow-2xl"
          >
            <div className="w-14.5 h-14.5 bg-white rounded-full flex items-center justify-center group-hover:bg-zinc-200 transition-colors">
              <svg
                className="w-8 h-8 text-zinc-900"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </div>
          </button>
        ) : (
          <div className="relative flex items-center justify-center w-full px-4 md:px-12">
            <button
              onClick={() => setPhoto(null)}
              className="absolute left-4 md:left-12 flex items-center gap-2 text-white font-medium hover:text-zinc-300 py-2 px-4 rounded-xl hover:bg-white/10 transition-colors"
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
                  strokeWidth={2.5}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Retake
            </button>

            <button
              onClick={() => {
                onSend(photo);
                onClose();
              }}
              className="bg-indigo-600 text-white w-16 h-16 rounded-full flex items-center justify-center hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-500/30 hover:scale-105 z-10"
            >
              <SendIcon className="w-7 h-7" />
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
};
