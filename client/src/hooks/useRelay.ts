import { useState } from "react";
import { db } from "@/utils/db";
import { useLiveQuery } from "dexie-react-hooks";

/**
 * Manage relay server selection and persistence.
 * @returns {object} { activeRelay, changeRelay, defaultRelays, addCustomRelay }
 */
export const useRelay = () => {
  const baseUrls = ["http://localhost:3001", "http://localhost:3002"];
  const [activeRelay, setActiveRelay] = useState<string>(
    localStorage.getItem("active_relay") || baseUrls[0],
  );

  const customRelays = useLiveQuery(() => db.relays.toArray()) || [];

  const defaultRelays = [...baseUrls, ...customRelays.map((r) => r.url)];

  const changeRelay = (url: string) => {
    setActiveRelay(url);
    localStorage.setItem("active_relay", url);
  };

  const addCustomRelay = async (url: string) => {
    const formattedUrl = url.trim().replace(/\/$/, "");
    if (!formattedUrl.startsWith("http")) throw new Error("Invalid URL!");
    try {
      await db.relays.add({ url: formattedUrl, name: "Custom Node" });
    } catch {
      throw new Error("Relay already exists!");
    }
  };

  return { activeRelay, changeRelay, defaultRelays, addCustomRelay };
};
