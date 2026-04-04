import React from "react";

export interface NetworkNodeProps {
  nodeSelector?: React.ReactNode;
}

/**
 * Renders the network and relay node selection interface.
 *
 * @param {NetworkNodeProps} props - Component properties.
 * @returns {React.JSX.Element | null} The rendered Network Node component.
 */
export default function NetworkNode({
  nodeSelector,
}: NetworkNodeProps): React.JSX.Element | null {
  if (!nodeSelector) return null;

  return <div>{nodeSelector}</div>;
}
