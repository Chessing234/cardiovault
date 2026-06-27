// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title DataAuditTrail
/// @notice Append-only cross-system audit log (MDBA / anti-tamper layer).
contract DataAuditTrail {
    struct AccessEvent {
        uint256 indexedTokenId;
        address accessor;
        address patient;
        string action;
        string dataType;
        string metadata;
        uint256 timestamp;
        bytes32 txHash;
        bytes32 zkProofCommitment;
    }

    mapping(bytes32 => bool) public recordedHashes;
    mapping(bytes32 => uint256) private _eventIndexPlusOne;
    AccessEvent[] public allEvents;

    address public immutable consentManager;
    address public immutable zkVerifier;

    event AuditEventRecorded(uint256 indexed tokenId, bytes32 indexed txHash, string action, uint256 timestamp);

    error NotAuthorizedRecorder();
    error DuplicateRecord();
    error EventNotFound();
    error InvalidRange();

    constructor(address _consentManager, address _zkVerifier) {
        consentManager = _consentManager;
        zkVerifier = _zkVerifier;
    }

    function recordEvent(
        uint256 tokenId,
        address patient,
        address accessor,
        string calldata action,
        string calldata dataType,
        string calldata metadata,
        bytes32 zkProofCommitment
    ) external {
        if (msg.sender != consentManager && msg.sender != zkVerifier) {
            revert NotAuthorizedRecorder();
        }

        bytes32 contentHash = keccak256(
            abi.encode(tokenId, patient, accessor, action, dataType, metadata, zkProofCommitment)
        );
        if (recordedHashes[contentHash]) revert DuplicateRecord();
        recordedHashes[contentHash] = true;

        AccessEvent memory ev = AccessEvent({
            indexedTokenId: tokenId,
            accessor: accessor,
            patient: patient,
            action: action,
            dataType: dataType,
            metadata: metadata,
            timestamp: block.timestamp,
            txHash: contentHash,
            zkProofCommitment: zkProofCommitment
        });

        allEvents.push(ev);
        _eventIndexPlusOne[contentHash] = allEvents.length;

        emit AuditEventRecorded(tokenId, contentHash, action, block.timestamp);
    }

    function verifyEvent(bytes32 txHash) external view returns (AccessEvent memory) {
        uint256 idxPlusOne = _eventIndexPlusOne[txHash];
        if (idxPlusOne == 0) revert EventNotFound();
        return allEvents[idxPlusOne - 1];
    }

    function getEventsForPatient(address patient) external view returns (AccessEvent[] memory) {
        uint256 count = 0;
        for (uint256 i = 0; i < allEvents.length; i++) {
            if (allEvents[i].patient == patient) {
                count++;
            }
        }
        AccessEvent[] memory out = new AccessEvent[](count);
        uint256 j = 0;
        for (uint256 i = 0; i < allEvents.length; i++) {
            if (allEvents[i].patient == patient) {
                out[j++] = allEvents[i];
            }
        }
        return out;
    }

    function getEventCount() external view returns (uint256) {
        return allEvents.length;
    }

    function getEventsInRange(uint256 start, uint256 end) external view returns (AccessEvent[] memory) {
        if (allEvents.length == 0) {
            return new AccessEvent[](0);
        }
        if (start > end || end >= allEvents.length) {
            revert InvalidRange();
        }
        uint256 len = end - start + 1;
        AccessEvent[] memory slice = new AccessEvent[](len);
        for (uint256 i = 0; i < len; i++) {
            slice[i] = allEvents[start + i];
        }
        return slice;
    }
}
