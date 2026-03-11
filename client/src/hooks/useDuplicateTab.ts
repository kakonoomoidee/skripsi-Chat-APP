import { useState, useEffect } from "react";

/**
 * Custom hook to detect if the application is currently open in multiple browser tabs.
 * Utilizes the BroadcastChannel API to communicate across tabs and enforce a single-instance policy.
 *
 * @returns {boolean} Returns true if another instance of the application is already active in a different tab.
 */
export const useDuplicateTab = (): boolean => {
  const [isDuplicateTab, setIsDuplicateTab] = useState<boolean>(false);

  useEffect(() => {
    console.log("[BroadcastChannel] Initializing cross-tab communication...");
    const channel = new BroadcastChannel("webrtc_chat_concurrency");

    console.log("[BroadcastChannel] Broadcasting new tab presence...");
    channel.postMessage({ type: "NEW_TAB_OPENED" });

    channel.onmessage = (event: MessageEvent) => {
      if (event.data.type === "NEW_TAB_OPENED") {
        console.log(
          "[BroadcastChannel] Detected new tab opening. Sending active status signal.",
        );
        channel.postMessage({ type: "TAB_ALREADY_ACTIVE" });
      } else if (event.data.type === "TAB_ALREADY_ACTIVE") {
        console.warn(
          "[BroadcastChannel Warning] Another tab is already active. Enforcing single-tab restriction.",
        );
        setIsDuplicateTab(true);
      }
    };

    return () => {
      console.log("[BroadcastChannel] Closing channel connection.");
      channel.close();
    };
  }, []);

  return isDuplicateTab;
};
