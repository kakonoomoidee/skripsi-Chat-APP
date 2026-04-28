import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { useUIStore } from "@/store";
import { SendIcon, XIcon, RefreshIcon, CameraIcon } from "@/components/icons";
import {
  capturePhotoFromVideo,
  detectMultipleCameras,
  requestCameraStream,
  stopMediaStream,
  type CameraFacingMode,
} from "@/utils/media/camera";

/**
 * Fullscreen camera modal component with capture and preview functionality.
 *
 * @param {object} props - Component properties.
 * @param {() => void} props.onClose - Trigger modal closure.
 * @param {(b64: string) => void} props.onSend - Process the captured base64 image.
 * @returns {React.JSX.Element} The React Portal interface.
 */
export const CameraModal = ({
  onClose,
  onSend,
}: {
  onClose: () => void;
  onSend: (b64: string) => void;
}): React.JSX.Element => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [photo, setPhoto] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<CameraFacingMode>("user");
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);

  const { showToast } = useUIStore();

  /**
   * Initializes the device camera stream with the specified facing mode.
   *
   * @param {CameraFacingMode} mode - Camera facing mode.
   * @returns {Promise<void>}
   */
  const initCamera = useCallback(
    async (mode: CameraFacingMode): Promise<void> => {
      stopMediaStream(streamRef.current);

      try {
        const stream = await requestCameraStream(mode);
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch {
        showToast("Camera access denied or not available.", "error");
        onClose();
      }
    },
    [onClose, showToast],
  );

  useEffect(() => {
    detectMultipleCameras().then(setHasMultipleCameras);

    initCamera(facingMode);

    return () => {
      stopMediaStream(streamRef.current);
    };
  }, [facingMode, initCamera]);

  /**
   * Toggles the stream between the front and rear device cameras.
   *
   * @returns {void}
   */
  const handleSwitchCamera = (): void => {
    setFacingMode((prev) => (prev === "user" ? "environment" : "user"));
  };

  /**
   * Captures the current frame from the live video stream onto a 2D canvas and converts it to base64.
   *
   * @returns {void}
   */
  const capture = (): void => {
    if (!videoRef.current || !canvasRef.current) return;

    const capturedPhoto = capturePhotoFromVideo(
      videoRef.current,
      canvasRef.current,
      facingMode,
    );

    if (capturedPhoto) setPhoto(capturedPhoto);
  };

  return createPortal(
    <div className="fixed inset-0 z-99999 bg-black flex flex-col animate-in fade-in duration-200">
      <div className="p-4 flex justify-between items-center z-10 bg-linear-to-b from-black/60 to-transparent absolute top-0 w-full">
        <button
          onClick={onClose}
          className="text-white p-2 hover:bg-white/10 rounded-full transition-colors"
        >
          <XIcon className="w-7 h-7 drop-shadow-md" />
        </button>

        {!photo && hasMultipleCameras && (
          <button
            onClick={handleSwitchCamera}
            className="text-white p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <RefreshIcon className="w-7 h-7 drop-shadow-md" />
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
            alt="Captured preview"
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
              <CameraIcon className="w-8 h-8 text-zinc-900" />
            </div>
          </button>
        ) : (
          <div className="relative flex items-center justify-center w-full px-4 md:px-12">
            <button
              onClick={() => setPhoto(null)}
              className="absolute left-4 md:left-12 flex items-center gap-2 text-white font-medium hover:text-zinc-300 py-2 px-4 rounded-xl hover:bg-white/10 transition-colors"
            >
              <RefreshIcon className="w-5 h-5" />
              Retake
            </button>

            <button
              onClick={() => {
                if (photo) onSend(photo);
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
