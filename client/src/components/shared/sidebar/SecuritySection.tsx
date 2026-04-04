import React from "react";
import Web3Wallet from "./security/Web3Wallet";
import NetworkNode from "./security/NetworkNode";
import DataSecurity from "./security/DataSecurity";

export interface SecuritySectionProps {
  nodeSelector?: React.ReactNode;
}

/**
 * Main orchestrator component for the application's security and settings sidebar.
 * Composes independent components for wallet, network, and data security.
 *
 * @param {SecuritySectionProps} props - The component properties.
 * @returns {React.JSX.Element} The composed Security Section interface.
 */
export default function SecuritySection({
  nodeSelector,
}: SecuritySectionProps): React.JSX.Element {
  return (
    <div className="flex flex-col gap-6 pb-10">
      <Web3Wallet />
      <NetworkNode nodeSelector={nodeSelector} />
      <DataSecurity />
    </div>
  );
}
