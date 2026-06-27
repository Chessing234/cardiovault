// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721Enumerable} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

/// @title HealthIdentitySBT
/// @notice Soulbound ERC721 identity for CardioVault patients (OpenZeppelin v5 — uses {_update} hook; v4 `Counters` removed).
contract HealthIdentitySBT is ERC721Enumerable, AccessControl, Pausable {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant VERIFIER_ROLE = keccak256("VERIFIER_ROLE");

    uint256 private _nextTokenId = 1;

    struct ConsentPreferences {
        bool allowResearch;
        bool allowInsuranceSharing;
        bool allowEmergencyAccess;
        uint256 dataRetentionDays;
    }

    struct HealthProfile {
        address patient;
        string encryptedCid;
        uint256 createdAt;
        uint256 lastUpdatedAt;
        bool isActive;
        ConsentPreferences defaultConsent;
    }

    mapping(uint256 => HealthProfile) public healthProfiles;
    mapping(address => uint256) public patientToTokenId;

    event IdentityMinted(address indexed patient, uint256 indexed tokenId, uint256 timestamp);
    event ProfileUpdated(uint256 indexed tokenId, string newEncryptedCid, uint256 timestamp);
    event IdentityDeactivated(uint256 indexed tokenId, uint256 timestamp);
    event ConsentUpdated(uint256 indexed tokenId, ConsentPreferences newPreferences);

    error SoulboundNonTransferable();
    error AlreadyHasIdentity();
    error InvalidPatient();
    error NotPatientOrMinter();
    error NotPatient();
    error NotPatientOrAdmin();
    error TokenDoesNotExist();

    constructor() ERC721("CardioVault Identity", "CVID") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
    }

    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    function mintIdentity(
        address patient,
        string calldata encryptedCid,
        ConsentPreferences calldata consent
    ) external onlyRole(MINTER_ROLE) whenNotPaused returns (uint256 tokenId) {
        return _createIdentity(patient, encryptedCid, consent);
    }

    /// @notice Patient self-registration — mints a soulbound identity to ``msg.sender``.
    function registerIdentity(
        string calldata encryptedCid,
        ConsentPreferences calldata consent
    ) external whenNotPaused returns (uint256 tokenId) {
        return _createIdentity(msg.sender, encryptedCid, consent);
    }

    function _createIdentity(
        address patient,
        string calldata encryptedCid,
        ConsentPreferences calldata consent
    ) private returns (uint256 tokenId) {
        if (patient == address(0)) revert InvalidPatient();
        if (patientToTokenId[patient] != 0) revert AlreadyHasIdentity();

        tokenId = _nextTokenId;
        unchecked {
            _nextTokenId++;
        }
        _mint(patient, tokenId);

        ConsentPreferences memory prefs = consent;
        if (!prefs.allowEmergencyAccess) {
            prefs.allowEmergencyAccess = true;
        }
        if (prefs.dataRetentionDays == 0) {
            prefs.dataRetentionDays = 365;
        }

        healthProfiles[tokenId] = HealthProfile({
            patient: patient,
            encryptedCid: encryptedCid,
            createdAt: block.timestamp,
            lastUpdatedAt: block.timestamp,
            isActive: true,
            defaultConsent: prefs
        });

        patientToTokenId[patient] = tokenId;

        emit IdentityMinted(patient, tokenId, block.timestamp);
    }

    function updateProfile(uint256 tokenId, string calldata newEncryptedCid)
        external
        whenNotPaused
    {
        address owner = ownerOf(tokenId);
        if (msg.sender != owner && !hasRole(MINTER_ROLE, msg.sender)) {
            revert NotPatientOrMinter();
        }
        HealthProfile storage p = healthProfiles[tokenId];
        if (p.patient == address(0)) revert TokenDoesNotExist();

        p.encryptedCid = newEncryptedCid;
        p.lastUpdatedAt = block.timestamp;

        emit ProfileUpdated(tokenId, newEncryptedCid, block.timestamp);
    }

    function updateConsent(uint256 tokenId, ConsentPreferences calldata newConsent)
        external
        whenNotPaused
    {
        if (ownerOf(tokenId) != msg.sender) revert NotPatient();
        HealthProfile storage p = healthProfiles[tokenId];
        if (p.patient == address(0)) revert TokenDoesNotExist();

        ConsentPreferences memory prefs = newConsent;
        if (!prefs.allowEmergencyAccess) {
            prefs.allowEmergencyAccess = true;
        }
        if (prefs.dataRetentionDays == 0) {
            prefs.dataRetentionDays = 365;
        }

        p.defaultConsent = prefs;
        emit ConsentUpdated(tokenId, prefs);
    }

    function deactivateIdentity(uint256 tokenId) external whenNotPaused {
        address owner = ownerOf(tokenId);
        if (msg.sender != owner && !hasRole(DEFAULT_ADMIN_ROLE, msg.sender)) {
            revert NotPatientOrAdmin();
        }
        HealthProfile storage p = healthProfiles[tokenId];
        if (p.patient == address(0)) revert TokenDoesNotExist();

        p.isActive = false;
        emit IdentityDeactivated(tokenId, block.timestamp);
    }

    function reactivateIdentity(uint256 tokenId) external onlyRole(DEFAULT_ADMIN_ROLE) {
        HealthProfile storage p = healthProfiles[tokenId];
        if (p.patient == address(0)) revert TokenDoesNotExist();
        p.isActive = true;
    }

    function getProfile(uint256 tokenId) external view returns (HealthProfile memory) {
        return healthProfiles[tokenId];
    }

    function getPatientTokenId(address patient) external view returns (uint256) {
        return patientToTokenId[patient];
    }

    /// @notice Same as {hasHealthIdentity} — kept for ABI compatibility with Prompt 02 spec.
    function hasIdentity(address patient) external view returns (bool) {
        return patientToTokenId[patient] != 0;
    }

    function hasHealthIdentity(address patient) external view returns (bool) {
        return patientToTokenId[patient] != 0;
    }

    function isIdentityActive(uint256 tokenId) external view returns (bool) {
        if (_ownerOf(tokenId) == address(0)) {
            return false;
        }
        return healthProfiles[tokenId].isActive;
    }

    function approve(address, uint256) public pure override(ERC721, IERC721) {
        revert SoulboundNonTransferable();
    }

    function setApprovalForAll(address, bool) public pure override(ERC721, IERC721) {
        revert SoulboundNonTransferable();
    }

    function _update(address to, uint256 tokenId, address auth)
        internal
        virtual
        override
        returns (address)
    {
        address from = _ownerOf(tokenId);
        if (from != address(0) && to != address(0)) {
            revert SoulboundNonTransferable();
        }
        return super._update(to, tokenId, auth);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        override(ERC721Enumerable, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
