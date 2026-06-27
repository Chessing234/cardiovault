// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Groth16Verifier} from "./HealthProofGroth16Verifier.sol";
import {HealthIdentitySBT} from "./HealthIdentitySBT.sol";
import {DataAuditTrail} from "./DataAuditTrail.sol";

/// @title HealthProofVerifier
/// @notice Groth16 verification of CardioVault ``HealthProof.circom`` (Poseidon commitment + bounded risk).
/// @dev Public signals order from Circom: ``[isValid, maxRiskScore, commitment]`` (``isValid`` is always 1 when constraints hold).
contract HealthProofVerifier is Ownable, Groth16Verifier {
    HealthIdentitySBT public immutable identityContract;
    DataAuditTrail public immutable auditTrail;

    mapping(uint256 => bool) public validProofs;
    mapping(uint256 => bytes32) public lastProofCommitment;
    mapping(uint256 => uint256) public verifiedAt;
    uint256 public verificationCount;

    /// @notice Hash of the verification key JSON (or other deployment tag) for versioning.
    bytes32 public vkHash;

    event ProofVerified(uint256 indexed tokenId, bytes32 indexed proofCommitment, bool isValid);
    event VerifierKeyUpdated(bytes32 newVerificationKey);

    error InvalidProof();
    error NotPatient();

    struct Proof {
        uint256[2] a;
        uint256[2][2] b;
        uint256[2] c;
    }

    constructor(address _identity, address _auditTrail, bytes32 _vkHash) Ownable(msg.sender) {
        identityContract = HealthIdentitySBT(_identity);
        auditTrail = DataAuditTrail(_auditTrail);
        vkHash = _vkHash;
    }

    /// @notice Verify a health Groth16 proof off the critical path (e.g. dashboards).
    function verifyHealthProof(uint256 tokenId, uint256 maxRiskScore, uint256 commitment, Proof calldata proof)
        external
        view
        returns (bool)
    {
        tokenId;
        return _verifyGroth16(maxRiskScore, commitment, proof.a, proof.b, proof.c);
    }

    function submitProof(uint256 tokenId, uint256 maxRiskScore, uint256 commitment, bytes calldata proof) external {
        if (identityContract.ownerOf(tokenId) != msg.sender) revert NotPatient();
        _verifyAndRecord(tokenId, maxRiskScore, commitment, proof);
    }

    function verifyAndLog(
        uint256 tokenId,
        uint256 maxRiskScore,
        uint256 commitment,
        bytes calldata proof,
        address accessor,
        string calldata purpose
    ) external {
        if (identityContract.ownerOf(tokenId) != msg.sender) revert NotPatient();
        _verifyAndRecord(tokenId, maxRiskScore, commitment, proof);
        _emitAuditZk(tokenId, accessor, purpose, commitment);
    }

    function _verifyAndRecord(uint256 tokenId, uint256 maxRiskScore, uint256 commitment, bytes calldata proof)
        private
    {
        (uint256[2] memory a, uint256[2][2] memory b, uint256[2] memory c) =
            abi.decode(proof, (uint256[2], uint256[2][2], uint256[2]));
        if (!_verifyGroth16(maxRiskScore, commitment, a, b, c)) revert InvalidProof();
        _recordSuccess(tokenId, commitment);
    }

    function _emitAuditZk(uint256 tokenId, address accessor, string calldata purpose, uint256 commitment) private {
        address patient = identityContract.ownerOf(tokenId);
        auditTrail.recordEvent(
            tokenId,
            patient,
            accessor,
            "read",
            "zk_proof_verification",
            purpose,
            bytes32(commitment)
        );
    }

    function getProofStatus(uint256 tokenId)
        external
        view
        returns (bool isValid, bytes32 commitment, uint256 verifiedAtTimestamp)
    {
        isValid = validProofs[tokenId];
        commitment = lastProofCommitment[tokenId];
        verifiedAtTimestamp = verifiedAt[tokenId];
    }

    /// @notice Legacy accessor name; same value as ``vkHash``.
    function verificationKey() external view returns (bytes32) {
        return vkHash;
    }

    function updateVerificationKey(bytes32 newKey) external onlyOwner {
        vkHash = newKey;
        emit VerifierKeyUpdated(newKey);
    }

    function _recordSuccess(uint256 tokenId, uint256 commitment) internal {
        validProofs[tokenId] = true;
        lastProofCommitment[tokenId] = bytes32(commitment);
        verifiedAt[tokenId] = block.timestamp;
        unchecked {
            verificationCount++;
        }
        emit ProofVerified(tokenId, bytes32(commitment), true);
    }

    function _verifyGroth16(
        uint256 maxRiskScore,
        uint256 commitment,
        uint256[2] memory a,
        uint256[2][2] memory b,
        uint256[2] memory c
    ) internal view returns (bool) {
        uint256[3] memory pubSignals;
        pubSignals[0] = 1;
        pubSignals[1] = maxRiskScore;
        pubSignals[2] = commitment;
        return this.verifyProof(a, b, c, pubSignals);
    }
}
