import type { Area } from "react-easy-crop";

export interface CropImageOptions {
  outputSize?: number;
  mimeType?: string;
  quality?: number;
}

const DEFAULT_OPTIONS: Required<CropImageOptions> = {
  outputSize: 150,
  mimeType: "image/jpeg",
  quality: 0.6,
};

/**
 * Crops an image by pixel coordinates and returns a compressed data URL.
 *
 * @param {string} imageSrc - Source image data URL.
 * @param {Area} pixelCrop - Crop area in pixels.
 * @param {CropImageOptions} options - Output options.
 * @returns {Promise<string>} Cropped image data URL.
 */
export const cropImageToDataUrl = (
  imageSrc: string,
  pixelCrop: Area,
  options: CropImageOptions = DEFAULT_OPTIONS,
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const image = new Image();

    image.onload = () => {
      const { outputSize, mimeType, quality } = {
        ...DEFAULT_OPTIONS,
        ...options,
      };
      const canvas = document.createElement("canvas");
      canvas.width = outputSize;
      canvas.height = outputSize;
      const context = canvas.getContext("2d");

      if (!context) {
        reject(new Error("Canvas 2D context unavailable."));
        return;
      }

      context.drawImage(
        image,
        pixelCrop.x,
        pixelCrop.y,
        pixelCrop.width,
        pixelCrop.height,
        0,
        0,
        outputSize,
        outputSize,
      );

      resolve(canvas.toDataURL(mimeType, quality));
    };

    image.onerror = () => reject(new Error("Failed to load source image."));
    image.src = imageSrc;
  });
};
