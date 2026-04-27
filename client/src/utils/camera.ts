export type CameraFacingMode = "user" | "environment";

export interface CapturePhotoOptions {
  mimeType?: string;
  quality?: number;
}

const DEFAULT_CAPTURE_OPTIONS: Required<CapturePhotoOptions> = {
  mimeType: "image/jpeg",
  quality: 0.9,
};

/**
 * Stops every track in a media stream when present.
 *
 * @param {MediaStream | null} stream - Active media stream.
 * @returns {void}
 */
export const stopMediaStream = (stream: MediaStream | null): void => {
  stream?.getTracks().forEach((track) => track.stop());
};

/**
 * Requests a camera stream for a specific facing mode.
 *
 * @param {CameraFacingMode} facingMode - Desired camera direction.
 * @returns {Promise<MediaStream>} Requested media stream.
 */
export const requestCameraStream = async (
  facingMode: CameraFacingMode,
): Promise<MediaStream> => {
  return navigator.mediaDevices.getUserMedia({
    video: { facingMode },
  });
};

/**
 * Detects whether the current device has more than one video input.
 *
 * @returns {Promise<boolean>} True when multiple cameras are available.
 */
export const detectMultipleCameras = async (): Promise<boolean> => {
  const devices = await navigator.mediaDevices.enumerateDevices();
  const videoInputs = devices.filter((device) => device.kind === "videoinput");
  return videoInputs.length > 1;
};

/**
 * Captures a frame from a video element and returns it as base64.
 *
 * @param {HTMLVideoElement} video - Source video element.
 * @param {HTMLCanvasElement} canvas - Canvas target element.
 * @param {CameraFacingMode} facingMode - Active camera direction.
 * @param {CapturePhotoOptions} options - Output encoding options.
 * @returns {string | null} Base64 image payload or null when context is unavailable.
 */
export const capturePhotoFromVideo = (
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
  facingMode: CameraFacingMode,
  options: CapturePhotoOptions = DEFAULT_CAPTURE_OPTIONS,
): string | null => {
  const context = canvas.getContext("2d");
  if (!context) return null;

  const { mimeType, quality } = { ...DEFAULT_CAPTURE_OPTIONS, ...options };

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  context.setTransform(1, 0, 0, 1, 0, 0);
  context.clearRect(0, 0, canvas.width, canvas.height);

  if (facingMode === "user") {
    context.translate(canvas.width, 0);
    context.scale(-1, 1);
  }

  context.drawImage(video, 0, 0, canvas.width, canvas.height);
  context.setTransform(1, 0, 0, 1, 0, 0);

  return canvas.toDataURL(mimeType, quality);
};
