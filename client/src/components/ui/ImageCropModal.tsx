import React, { useState, useCallback } from "react";
import Cropper, { Area } from "react-easy-crop";
import { XIcon } from "@/components/icons";

/**
 * Props for the ImageCropModal component.
 */
interface ImageCropModalProps {
  /** Raw image data URL selected by the user. */
  imageSrc: string;
  /** Called with the compressed Base64 JPEG string when the user confirms. */
  onConfirm: (croppedBase64: string) => void;
  /** Called when the user cancels or closes the modal. */
  onCancel: () => void;
}

/**
 * Draws the cropped region of an image onto a canvas and returns a compressed
 * Base64 JPEG string at 150×150 pixels and 60% quality.
 *
 * @param {string} imageSrc - The source image data URL.
 * @param {Area} pixelCrop - The crop area in pixel coordinates.
 * @returns {Promise<string>} The compressed Base64 data URL.
 */
const getCroppedImg = (imageSrc: string, pixelCrop: Area): Promise<string> => {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      const OUTPUT_SIZE = 150;
      canvas.width = OUTPUT_SIZE;
      canvas.height = OUTPUT_SIZE;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas 2D context unavailable."));
        return;
      }
      ctx.drawImage(
        image,
        pixelCrop.x,
        pixelCrop.y,
        pixelCrop.width,
        pixelCrop.height,
        0,
        0,
        OUTPUT_SIZE,
        OUTPUT_SIZE,
      );
      resolve(canvas.toDataURL("image/jpeg", 0.6));
    };
    image.onerror = reject;
    image.src = imageSrc;
  });
};

/**
 * A centered pop-up modal that presents a pan-and-zoom image cropper powered
 * by `react-easy-crop`. The cropper is constrained inside a fixed-height box
 * so it never occupies the full viewport. Outputs a 150×150 JPEG at 60%
 * quality via `onConfirm`.
 *
 * @param {ImageCropModalProps} props - Component props.
 * @returns {React.JSX.Element} The crop modal overlay.
 */
export const ImageCropModal = ({
  imageSrc,
  onConfirm,
  onCancel,
}: ImageCropModalProps): React.JSX.Element => {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  /**
   * Captures the final crop area in absolute pixel coordinates whenever the
   * user finishes adjusting the crop region.
   *
   * @param {Area} _croppedArea - Relative crop area (unused).
   * @param {Area} croppedPixels - Absolute pixel coordinates of the crop.
   * @returns {void}
   */
  const onCropComplete = useCallback(
    (_croppedArea: Area, croppedPixels: Area): void => {
      setCroppedAreaPixels(croppedPixels);
    },
    [],
  );

  /**
   * Processes the confirmed crop region, compresses the output, and passes
   * the resulting Base64 string back to the parent via `onConfirm`.
   *
   * @returns {Promise<void>}
   */
  const handleConfirm = async (): Promise<void> => {
    if (!croppedAreaPixels) return;
    setIsProcessing(true);
    try {
      const croppedBase64 = await getCroppedImg(imageSrc, croppedAreaPixels);
      onConfirm(croppedBase64);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-lg bg-zinc-900 rounded-2xl border border-zinc-800 shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">

        <div className="shrink-0 flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <div>
            <h3 className="text-sm font-bold text-zinc-100">Crop Avatar</h3>
            <p className="text-[10px] text-zinc-500 mt-0.5">
              Drag to reposition · Scroll to zoom
            </p>
          </div>
          <button
            onClick={onCancel}
            className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-100 hover:bg-zinc-800 transition-all"
            aria-label="Close"
          >
            <XIcon className="w-4 h-4" />
          </button>
        </div>

        <div className="relative w-full h-[350px] sm:h-[400px] bg-black">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </div>

        <div className="shrink-0 px-5 py-4 border-t border-zinc-800 bg-zinc-900/90 space-y-4">
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest w-10 shrink-0">
              Zoom
            </span>
            <input
              type="range"
              min={1}
              max={3}
              step={0.05}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="flex-1 accent-indigo-500 cursor-pointer h-1.5 rounded-full"
            />
            <span className="text-[10px] text-zinc-600 w-8 text-right shrink-0">
              {zoom.toFixed(1)}×
            </span>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-zinc-400 hover:text-zinc-200 border border-zinc-700 hover:border-zinc-600 hover:bg-zinc-800 transition-all"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isProcessing || !croppedAreaPixels}
              className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white transition-colors flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20"
            >
              {isProcessing ? (
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : null}
              {isProcessing ? "Processing…" : "Apply"}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
