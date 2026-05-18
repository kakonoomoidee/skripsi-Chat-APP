import { useEffect, useState } from "react";
import { RelaySelector, RelayStatusBadge } from "@/components/ui";
import { pingRelayNode } from "@/utils/network/relay";

/**
 * Interface defining the properties for the AuthRelayControl component.
 *
 * @interface AuthRelayControlProps
 * @property {string} activeRelay - The currently active relay URL.
 * @property {string[]} defaultRelays - List of default relay URLs.
 * @property {(url: string) => void} changeRelay - Function to handle relay switching.
 * @property {(url: string) => Promise<void>} addCustomRelay - Function to add a new custom relay asynchronously.
 * @property {"sm" | "md"} [size] - Component size variant.
 */
interface AuthRelayControlProps {
  activeRelay: string;
  defaultRelays: string[];
  changeRelay: (url: string) => void;
  addCustomRelay: (url: string) => Promise<void>;
  size?: "sm" | "md";
}

/**
 * Wrapper component combining the relay status badge and selector.
 *
 * @param {AuthRelayControlProps} props - Component properties.
 * @returns {React.JSX.Element} The rendered relay control component.
 */
export default function AuthRelayControl({
  activeRelay,
  defaultRelays,
  changeRelay,
  addCustomRelay,
  size = "md",
}: AuthRelayControlProps): React.JSX.Element {
  const [isRelayAlive, setIsRelayAlive] = useState<boolean>(false);
  const [isPinging, setIsPinging] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    let intervalId: number | null = null;

    const runPing = (): void => {
      if (!activeRelay) {
        if (!isMounted) return;
        setIsPinging(false);
        setIsRelayAlive(false);
        return;
      }

      if (isMounted) {
        setIsPinging(true);
        setIsRelayAlive(false);
      }

      pingRelayNode(activeRelay)
        .then((isAlive) => {
          if (!isMounted) return;
          setIsRelayAlive(isAlive);
          setIsPinging(false);
        })
        .catch(() => {
          if (!isMounted) return;
          setIsRelayAlive(false);
          setIsPinging(false);
        });
    };

    runPing();
    intervalId = window.setInterval(runPing, 15000);

    return () => {
      isMounted = false;
      if (intervalId !== null) window.clearInterval(intervalId);
    };
  }, [activeRelay]);

  return (
    <div className="relative pt-1">
      <RelayStatusBadge isPinging={isPinging} isRelayAlive={isRelayAlive} />
      <RelaySelector
        activeRelay={activeRelay}
        defaultRelays={defaultRelays}
        changeRelay={changeRelay}
        addCustomRelay={addCustomRelay}
        size={size}
      />
    </div>
  );
}
