export type RelayHealth = "pinging" | "online" | "offline";

/**
 * Determines relay health status from ping and alive flags.
 *
 * @param {boolean} isPinging - Whether relay ping is in progress.
 * @param {boolean} isRelayAlive - Whether relay responded healthy.
 * @returns {RelayHealth} Relay health state.
 */
export const getRelayHealth = (
  isPinging: boolean,
  isRelayAlive: boolean,
): RelayHealth => {
  if (isPinging) return "pinging";
  return isRelayAlive ? "online" : "offline";
};
