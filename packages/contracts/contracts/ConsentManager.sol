// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {HealthIdentitySBT} from "./HealthIdentitySBT.sol";
import {IDataAuditTrail} from "./IDataAuditTrail.sol";

/// @title ConsentManager
/// @notice Granular consent and access logging for CardioVault health identities.
contract ConsentManager is Ownable {
    HealthIdentitySBT public immutable identityContract;
    IDataAuditTrail public auditTrail;

    struct DataAccessPermission {
        bool isGranted;
        uint256 expiryTimestamp;
        string purpose;
        string[] allowedDataCategories;
        uint256 grantedAt;
    }

    struct AccessLog {
        address accessor;
        string action;
        string dataCategory;
        string purpose;
        uint256 timestamp;
        bytes32 zkProofHash;
    }

    mapping(uint256 => mapping(address => DataAccessPermission)) public permissions;
    mapping(uint256 => AccessLog[]) private _accessLogs;

    event PermissionGranted(uint256 indexed tokenId, address indexed accessor, uint256 expiry);
    event PermissionRevoked(uint256 indexed tokenId, address indexed accessor);
    event DataAccessed(uint256 indexed tokenId, address indexed accessor, string action, uint256 timestamp);

    error NotTokenOwner();
    error InvalidAccessor();
    error NotPatientOrAccessor();
    error NotAuthorizedService();
    error InactiveIdentity();

    constructor(address _identityContract) Ownable(msg.sender) {
        identityContract = HealthIdentitySBT(_identityContract);
    }

    function setAuditTrail(address _auditTrail) external onlyOwner {
        auditTrail = IDataAuditTrail(_auditTrail);
    }

    function grantPermission(
        uint256 tokenId,
        address accessor,
        uint256 expiry,
        string calldata purpose,
        string[] calldata dataCategories
    ) external {
        if (accessor == address(0)) revert InvalidAccessor();
        if (identityContract.ownerOf(tokenId) != msg.sender) revert NotTokenOwner();
        if (!identityContract.isIdentityActive(tokenId)) revert InactiveIdentity();

        DataAccessPermission storage perm = permissions[tokenId][accessor];
        delete perm.allowedDataCategories;
        for (uint256 i = 0; i < dataCategories.length; i++) {
            perm.allowedDataCategories.push(dataCategories[i]);
        }
        perm.isGranted = true;
        perm.expiryTimestamp = expiry;
        perm.purpose = purpose;
        perm.grantedAt = block.timestamp;

        emit PermissionGranted(tokenId, accessor, expiry);
    }

    function revokePermission(uint256 tokenId, address accessor) external {
        address owner = identityContract.ownerOf(tokenId);
        if (msg.sender != owner && msg.sender != accessor) {
            revert NotPatientOrAccessor();
        }
        delete permissions[tokenId][accessor];
        emit PermissionRevoked(tokenId, accessor);
    }

    function checkPermission(uint256 tokenId, address accessor, string calldata dataCategory)
        external
        view
        returns (bool)
    {
        DataAccessPermission storage perm = permissions[tokenId][accessor];
        if (!perm.isGranted) {
            return false;
        }
        if (perm.expiryTimestamp != 0 && block.timestamp > perm.expiryTimestamp) {
            return false;
        }
        for (uint256 i = 0; i < perm.allowedDataCategories.length; i++) {
            if (keccak256(bytes(perm.allowedDataCategories[i])) == keccak256(bytes(dataCategory))) {
                return true;
            }
        }
        return false;
    }

    function logAccess(
        uint256 tokenId,
        address accessor,
        string calldata action,
        string calldata dataCategory,
        string calldata purpose,
        bytes32 zkProofHash
    ) external {
        if (!identityContract.hasRole(identityContract.MINTER_ROLE(), msg.sender)) {
            revert NotAuthorizedService();
        }

        _accessLogs[tokenId].push(
            AccessLog({
                accessor: accessor,
                action: action,
                dataCategory: dataCategory,
                purpose: purpose,
                timestamp: block.timestamp,
                zkProofHash: zkProofHash
            })
        );

        emit DataAccessed(tokenId, accessor, action, block.timestamp);

        if (address(auditTrail) != address(0)) {
            address patient = identityContract.ownerOf(tokenId);
            auditTrail.recordEvent(
                tokenId,
                patient,
                accessor,
                action,
                dataCategory,
                purpose,
                zkProofHash
            );
        }
    }

    function getAccessLogs(uint256 tokenId) external view returns (AccessLog[] memory) {
        if (identityContract.ownerOf(tokenId) != msg.sender) revert NotTokenOwner();
        return _accessLogs[tokenId];
    }

    function getPermissionDetails(uint256 tokenId, address accessor)
        external
        view
        returns (DataAccessPermission memory)
    {
        address owner = identityContract.ownerOf(tokenId);
        if (msg.sender != owner && msg.sender != accessor) {
            revert NotPatientOrAccessor();
        }
        return permissions[tokenId][accessor];
    }
}
