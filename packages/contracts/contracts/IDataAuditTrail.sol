// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @notice Minimal interface consumed by ConsentManager / ZKProofVerifier.
interface IDataAuditTrail {
    function recordEvent(
        uint256 tokenId,
        address patient,
        address accessor,
        string calldata action,
        string calldata dataType,
        string calldata metadata,
        bytes32 zkProofCommitment
    ) external;
}
