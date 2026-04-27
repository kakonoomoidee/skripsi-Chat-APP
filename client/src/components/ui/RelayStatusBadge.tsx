import { getRelayHealth } from "@/utils/relay";

/**
 * Interface for RelayStatusBadge props
 */
export interface RelayStatusBadgeProps {
  isPinging: boolean;
  isRelayAlive: boolean;
}

/**
 * A tiny absolute-positioned badge to indicate the health status of a Relay Server.
 * @param {RelayStatusBadgeProps} props
 * @returns {JSX.Element}
 */
export default function RelayStatusBadge({
  isPinging,
  isRelayAlive,
}: RelayStatusBadgeProps) {
  const relayHealth = getRelayHealth(isPinging, isRelayAlive);

  const indicatorStyles = {
    pinging: "bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.5)] animate-pulse",
    online:
      "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)] animate-pulse",
    offline: "bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.5)]",
  };

  const textStyles = {
    pinging: "text-amber-400",
    online: "text-emerald-400",
    offline: "text-red-400",
  };

  const label = {
    pinging: "Pinging...",
    online: "Online",
    offline: "Offline",
  };

  return (
    <div className="absolute right-0 top-0 flex items-center gap-1.5 bg-zinc-950 px-2 py-1 rounded-md border border-zinc-800/50 z-10 shadow-sm">
      <div
        className={`w-1.5 h-1.5 rounded-full ${indicatorStyles[relayHealth]}`}
      ></div>
      <span
        className={`text-[9px] font-mono uppercase tracking-wider ${textStyles[relayHealth]}`}
      >
        {label[relayHealth]}
      </span>
    </div>
  );
}
