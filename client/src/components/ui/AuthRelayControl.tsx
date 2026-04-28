import React from "react";
import { RelaySelector, RelayStatusBadge } from "@/components/ui";
import { useRelayPing } from "@/hooks/network/useRelayPing";

interface Props {
  activeRelay: string;
  defaultRelays: string[];
  changeRelay: (url: string) => void;
  addCustomRelay: (url: string) => void;
  size?: "sm" | "md" | "lg";
}

export default function AuthRelayControl({
  activeRelay,
  defaultRelays,
  changeRelay,
  addCustomRelay,
  size = "md",
}: Props) {
  const { isRelayAlive, isPinging } = useRelayPing(activeRelay);

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
