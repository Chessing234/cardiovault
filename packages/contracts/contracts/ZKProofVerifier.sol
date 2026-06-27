// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {HealthProofVerifier} from "./HealthProofVerifier.sol";

/// @title ZKProofVerifier
/// @notice Backwards-compatible name for ``HealthProofVerifier`` (Groth16 / Circom HealthProof).
contract ZKProofVerifier is HealthProofVerifier {
    constructor(address _identity, address _auditTrail, bytes32 _vkHash) HealthProofVerifier(_identity, _auditTrail, _vkHash) {}
}
