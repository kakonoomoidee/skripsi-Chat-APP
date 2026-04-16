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
  return (
    <div className="absolute right-0 top-0 flex items-center gap-1.5 bg-zinc-950 px-2 py-1 rounded-md border border-zinc-800/50 z-10 shadow-sm">
      <div
        className={`w-1.5 h-1.5 rounded-full ${
          isPinging
            ? "bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.5)] animate-pulse"
            : isRelayAlive
              ? "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)] animate-pulse"
              : "bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.5)]"
        }`}
      ></div>
      <span
        className={`text-[9px] font-mono uppercase tracking-wider ${
          isPinging
            ? "text-amber-400"
            : isRelayAlive
              ? "text-emerald-400"
              : "text-red-400"
        }`}
      >
        {isPinging ? "Pinging..." : isRelayAlive ? "Online" : "Offline"}
      </span>
    </div>
  );
}
