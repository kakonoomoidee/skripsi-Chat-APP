import React, { useState, useRef, useCallback } from "react";
import { ImageCropModal } from "@/components/ui/ImageCropModal";
import { useChatContext } from "@/context/ChatContext";
import { useUIStore } from "@/store";
import { CameraIcon } from "@/components/icons";
import { getDisplayInitial } from "@/utils/identity";
import {
  getStoredAvatar,
  readFileAsDataUrl,
  setStoredAvatar,
} from "@/utils/profile";

/**
 * ProfileSettings component manages the user's avatar upload,
 * username display, and online status.
 *
 * @returns {React.JSX.Element} The Profile Settings component.
 */
export default function ProfileSettings(): React.JSX.Element {
  const { myUsername, address } = useChatContext();
  const { showToast } = useUIStore();

  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [myAvatar, setMyAvatar] = useState<string | null>(getStoredAvatar);
  const [rawAvatarSrc, setRawAvatarSrc] = useState<string | null>(null);

  /**
   * Opens the crop modal for the selected file by reading it as a data URL.
   *
   * @param {React.ChangeEvent<HTMLInputElement>} e - The file input change event.
   * @returns {void}
   */
  const handleAvatarChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
      const file = e.target.files?.[0];
      if (!file) return;
      const avatarDataUrl = await readFileAsDataUrl(file);
      setRawAvatarSrc(avatarDataUrl);
      if (avatarInputRef.current) avatarInputRef.current.value = "";
    },
    [],
  );

  /**
   * Persists the cropped Base64 avatar returned by the crop modal to
   * localStorage and updates the local UI state.
   *
   * @param {string} croppedBase64 - The compressed Base64 JPEG from ImageCropModal.
   * @returns {void}
   */
  const handleCropConfirm = useCallback(
    (croppedBase64: string): void => {
      setStoredAvatar(croppedBase64);
      setMyAvatar(croppedBase64);
      setRawAvatarSrc(null);
      showToast("Profile picture updated.", "success");
    },
    [showToast],
  );

  return (
    <>
      {rawAvatarSrc && (
        <ImageCropModal
          imageSrc={rawAvatarSrc}
          onConfirm={handleCropConfirm}
          onCancel={() => setRawAvatarSrc(null)}
        />
      )}
      <div className="bg-zinc-900/60 border border-zinc-800/70 rounded-2xl px-5 py-4 flex items-center gap-4">
        <button
          type="button"
          onClick={() => avatarInputRef.current?.click()}
          className="relative w-12 h-12 rounded-full shrink-0 ring-2 ring-indigo-500/20 hover:ring-indigo-500/50 transition-all group focus:outline-none"
          title="Upload avatar"
        >
          {myAvatar ? (
            <img
              src={myAvatar}
              alt="avatar"
              className="w-12 h-12 rounded-full object-cover"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-linear-to-br from-indigo-600 to-purple-700 flex items-center justify-center text-white font-bold text-lg shadow-lg">
              {getDisplayInitial(myUsername)}
            </div>
          )}
          <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
            <CameraIcon className="w-5 h-5 text-white" />
          </div>
        </button>
        <input
          ref={avatarInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleAvatarChange}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-bold text-zinc-100 capitalize">
              {myUsername}
            </p>
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Online
            </span>
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <p className="font-mono text-[10px] text-zinc-500 truncate">
              {address ?? "—"}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => avatarInputRef.current?.click()}
          className="shrink-0 flex items-center gap-1.5 text-xs font-semibold text-zinc-400 border border-zinc-700 hover:border-indigo-500/50 hover:text-indigo-400 px-3 py-2 rounded-xl transition-all"
        >
          <CameraIcon className="w-3.5 h-3.5" />
          Upload Avatar
        </button>
      </div>
    </>
  );
}
