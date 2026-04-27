import { useEffect, useState } from "react";
import { CALL_DURATION_TICK_MS } from "@/utils/call";

/**
 * Tracks in-call elapsed time in seconds while a call is active.
 *
 * @param {boolean} isInCall - Whether the call session is active.
 * @returns {number} Elapsed duration in seconds.
 */
export const useCallDuration = (isInCall: boolean): number => {
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    if (!isInCall) {
      setDuration(0);
      return;
    }

    const timer = setInterval(() => {
      setDuration((previous) => previous + 1);
    }, CALL_DURATION_TICK_MS);

    return () => clearInterval(timer);
  }, [isInCall]);

  return duration;
};
