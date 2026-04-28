import { useEffect, type RefObject } from "react";
import {
  isEventOutsideElement,
  shouldCloseMenuOnEscape,
} from "@/utils/chat/bubble";

type DismissablePointerEvent = MouseEvent | TouchEvent;

interface UseDismissableLayerOptions {
  enabled: boolean;
  ref: RefObject<HTMLElement | null>;
  onDismiss: () => void;
  pointerEvents?: Array<"mousedown" | "touchstart">;
}

export const useDismissableLayer = ({
  enabled,
  ref,
  onDismiss,
  pointerEvents = ["mousedown"],
}: UseDismissableLayerOptions): void => {
  useEffect(() => {
    if (!enabled) return;

    const handlePointerDown = (event: DismissablePointerEvent) => {
      if (isEventOutsideElement(ref.current, event.target)) onDismiss();
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (shouldCloseMenuOnEscape(event.key)) onDismiss();
    };

    pointerEvents.forEach((eventName) => {
      document.addEventListener(eventName, handlePointerDown);
    });
    document.addEventListener("keydown", handleEscape);

    return () => {
      pointerEvents.forEach((eventName) => {
        document.removeEventListener(eventName, handlePointerDown);
      });
      document.removeEventListener("keydown", handleEscape);
    };
  }, [enabled, onDismiss, pointerEvents, ref]);
};
