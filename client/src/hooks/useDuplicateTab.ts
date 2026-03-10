import { useState, useEffect } from "react";

/**
 * Detects if the application is opened in multiple browser tabs.
 * @returns {boolean} True if another tab is already active.
 */
export const useDuplicateTab = (): boolean => {
  const [isDuplicateTab, setIsDuplicateTab] = useState(false);

  useEffect(() => {
    const channel = new BroadcastChannel("webrtc_chat_concurrency");
    channel.postMessage({ type: "NEW_TAB_OPENED" });
    channel.onmessage = (event) => {
      if (event.data.type === "NEW_TAB_OPENED") {
        channel.postMessage({ type: "TAB_ALREADY_ACTIVE" });
      } else if (event.data.type === "TAB_ALREADY_ACTIVE") {
        setIsDuplicateTab(true);
      }
    };
    return () => channel.close();
  }, []);

  return isDuplicateTab;
};
