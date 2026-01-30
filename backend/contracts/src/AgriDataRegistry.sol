// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title AgriDataRegistry
 * @notice Registry for storing and verifying agricultural sensor data Merkle roots
 * @dev Deployed on Avalanche Fuji testnet for data integrity verification
 */
contract AgriDataRegistry {
    // ============================================
    // State Variables
    // ============================================
    
    /// @notice Mapping from batch ID to Merkle root
    mapping(bytes32 => bytes32) public batchRoots;
    
    /// @notice Mapping from batch ID to registration timestamp
    mapping(bytes32 => uint256) public batchTimestamps;
    
    /// @notice Owner of the contract
    address public owner;
    
    /// @notice Authorized relayers who can submit data
    mapping(address => bool) public authorizedRelayers;
    
    // ============================================
    // Events
    // ============================================
    
    /// @notice Emitted when a new batch is registered
    event BatchRegistered(
        bytes32 indexed batchId,
        bytes32 merkleRoot,
        uint256 timestamp,
        address indexed relayer
    );
    
    /// @notice Emitted when a relayer is authorized
    event RelayerAuthorized(address indexed relayer);
    
    /// @notice Emitted when a relayer is revoked
    event RelayerRevoked(address indexed relayer);
    
    // ============================================
    // Modifiers
    // ============================================
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }
    
    modifier onlyAuthorized() {
        require(
            msg.sender == owner || authorizedRelayers[msg.sender],
            "Not authorized to submit data"
        );
        _;
    }
    
    // ============================================
    // Constructor
    // ============================================
    
    constructor() {
        owner = msg.sender;
        authorizedRelayers[msg.sender] = true;
        emit RelayerAuthorized(msg.sender);
    }
    
    // ============================================
    // External Functions
    // ============================================
    
    /**
     * @notice Register a new data batch with its Merkle root
     * @param batchId Unique identifier for the batch
     * @param merkleRoot Merkle root of all data in the batch
     */
    function registerDataBatch(
        bytes32 batchId,
        bytes32 merkleRoot
    ) external onlyAuthorized {
        require(batchRoots[batchId] == bytes32(0), "Batch already registered");
        require(merkleRoot != bytes32(0), "Invalid Merkle root");
        
        batchRoots[batchId] = merkleRoot;
        batchTimestamps[batchId] = block.timestamp;
        
        emit BatchRegistered(batchId, merkleRoot, block.timestamp, msg.sender);
    }
    
    /**
     * @notice Verify that a data point is included in a registered batch
     * @param batchId The batch to verify against
     * @param leaf The leaf (data hash) to verify
     * @param proof The Merkle proof
     * @return True if the proof is valid
     */
    function verifyDataInclusion(
        bytes32 batchId,
        bytes32 leaf,
        bytes32[] calldata proof
    ) external view returns (bool) {
        bytes32 storedRoot = batchRoots[batchId];
        require(storedRoot != bytes32(0), "Batch not found");
        
        return _verifyMerkleProof(proof, storedRoot, leaf);
    }
    
    /**
     * @notice Get the Merkle root for a batch
     * @param batchId The batch ID to query
     * @return The Merkle root
     */
    function getBatchRoot(bytes32 batchId) external view returns (bytes32) {
        return batchRoots[batchId];
    }
    
    /**
     * @notice Get the registration timestamp for a batch
     * @param batchId The batch ID to query
     * @return The timestamp
     */
    function getBatchTimestamp(bytes32 batchId) external view returns (uint256) {
        return batchTimestamps[batchId];
    }
    
    /**
     * @notice Authorize a relayer to submit data
     * @param relayer The address to authorize
     */
    function authorizeRelayer(address relayer) external onlyOwner {
        require(relayer != address(0), "Invalid address");
        authorizedRelayers[relayer] = true;
        emit RelayerAuthorized(relayer);
    }
    
    /**
     * @notice Revoke a relayer's authorization
     * @param relayer The address to revoke
     */
    function revokeRelayer(address relayer) external onlyOwner {
        authorizedRelayers[relayer] = false;
        emit RelayerRevoked(relayer);
    }
    
    /**
     * @notice Transfer ownership of the contract
     * @param newOwner The new owner address
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid address");
        owner = newOwner;
    }
    
    // ============================================
    // Internal Functions
    // ============================================
    
    /**
     * @notice Verify a Merkle proof
     * @param proof Array of proof elements
     * @param root The expected Merkle root
     * @param leaf The leaf to verify
     * @return True if the proof is valid
     */
    function _verifyMerkleProof(
        bytes32[] memory proof,
        bytes32 root,
        bytes32 leaf
    ) internal pure returns (bool) {
        bytes32 computedHash = leaf;
        
        for (uint256 i = 0; i < proof.length; i++) {
            bytes32 proofElement = proof[i];
            
            if (computedHash <= proofElement) {
                // Hash(current computed hash + current element of the proof)
                computedHash = keccak256(abi.encodePacked(computedHash, proofElement));
            } else {
                // Hash(current element of the proof + current computed hash)
                computedHash = keccak256(abi.encodePacked(proofElement, computedHash));
            }
        }
        
        return computedHash == root;
    }
}
