import { useState, useCallback } from "react";

const RELAY_STORAGE_KEY = "securep2p_active_relay";

// 2 default relay for users to choose from
export const DEFAULT_RELAYS = [
  "http://localhost:3001",
  "http://localhost:3002",
];

/**
 * 1. Manage active relay server connection
 * @returns {object} { activeRelay, changeRelay, defaultRelays }
 */
export const useRelay = () => {
  const [activeRelay, setActiveRelay] = useState<string>(() => {
    // Cek local storage dulu, kalo kosong pake server pertama
    const stored = localStorage.getItem(RELAY_STORAGE_KEY);
    return stored || DEFAULT_RELAYS[0];
  });

  /**
   * 2. Switch to a new relay server
   * @param {string} url - The new relay server URL
   */
  const changeRelay = useCallback((url: string) => {
    setActiveRelay(url);
    localStorage.setItem(RELAY_STORAGE_KEY, url);
  }, []);

  return { activeRelay, changeRelay, defaultRelays: DEFAULT_RELAYS };
};
