import { useState } from "react";
import { db } from "@/utils/db";
import { useLiveQuery } from "dexie-react-hooks";

/**
 * Interface defining the return properties and methods of the useRelay hook.
 */
export interface UseRelayReturn {
  activeRelay: string;
  changeRelay: (url: string) => void;
  defaultRelays: string[];
  addCustomRelay: (url: string) => Promise<void>;
}

/**
 * Custom hook to manage the active relay server selection and persistence.
 * Handles both default hardcoded relays and user-defined custom relays via IndexedDB.
 *
 * @returns {UseRelayReturn} Relay state and management methods.
 */
export const useRelay = (): UseRelayReturn => {
  const baseUrls = ["http://127.0.0.1:3001", "http://127.0.0.1:3002", "http://10.64.24.248:3001"];

  const [activeRelay, setActiveRelay] = useState<string>(
    localStorage.getItem("active_relay") || baseUrls[0],
  );

  const customRelays = useLiveQuery(() => db.relays.toArray()) || [];
  const defaultRelays = [...baseUrls, ...customRelays.map((r) => r.url)];

  /**
   * Updates the active relay server and persists the choice to local storage.
   *
   * @param {string} url - The URL of the selected relay server.
   * @returns {void}
   */
  const changeRelay = (url: string): void => {
    console.log(
      `[Relay Manager] Switching active relay from ${activeRelay} to ${url}...`,
    );
    setActiveRelay(url);
    localStorage.setItem("active_relay", url);
    console.log("[Relay Manager] Active relay switched and persisted.");
  };

  /**
   * Validates and adds a new custom relay server to the local IndexedDB.
   *
   * @param {string} url - The raw URL of the custom relay to add.
   * @returns {Promise<void>}
   * @throws {Error} Throws if the URL format is invalid or if the relay already exists.
   */
  const addCustomRelay = async (url: string): Promise<void> => {
    console.log(`[Relay Manager] Attempting to add custom relay: ${url}`);

    const formattedUrl = url.trim().replace(/\/$/, "");

    if (!formattedUrl.startsWith("http")) {
      console.warn(
        "[Relay Manager Warning] Invalid URL format rejected. Must start with HTTP/HTTPS.",
      );
      throw new Error("Invalid URL!");
    }

    try {
      await db.relays.add({ url: formattedUrl, name: "Custom Node" });
      console.log(
        `[Relay Manager] Custom relay successfully added to local database: ${formattedUrl}`,
      );
    } catch (error: unknown) {
      console.error(
        "[Relay Manager Error] Failed to add custom relay (possibly a duplicate).",
        error,
      );
      throw new Error("Relay already exists!");
    }
  };

  return {
    activeRelay,
    changeRelay,
    defaultRelays,
    addCustomRelay,
  };
};
