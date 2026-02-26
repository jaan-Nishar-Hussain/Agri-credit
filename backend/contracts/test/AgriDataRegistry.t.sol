// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/AgriDataRegistry.sol";

contract AgriDataRegistryTest is Test {
    AgriDataRegistry public registry;
    address public owner;
    address public relayer = address(0x123);

    function setUp() public {
        owner = address(this);
        registry = new AgriDataRegistry();
    }

    function test_InitialState() public {
        assertEq(registry.owner(), owner);
        assertTrue(registry.authorizedRelayers(owner));
    }

    function test_AuthorizeRelayer() public {
        registry.authorizeRelayer(relayer);
        assertTrue(registry.authorizedRelayers(relayer));
    }

    function test_RevokeRelayer() public {
        registry.authorizeRelayer(relayer);
        registry.revokeRelayer(relayer);
        assertFalse(registry.authorizedRelayers(relayer));
    }

    function test_RegisterDataBatch() public {
        bytes32 batchId = keccak256("batch1");
        bytes32 merkleRoot = keccak256("root1");

        vm.expectEmit(true, false, false, true);
        emit AgriDataRegistry.BatchRegistered(batchId, merkleRoot, block.timestamp, owner);
        
        registry.registerDataBatch(batchId, merkleRoot);

        assertEq(registry.getBatchRoot(batchId), merkleRoot);
        assertEq(registry.getBatchTimestamp(batchId), block.timestamp);
    }

    function test_Fail_RegisterDuplicateBatch() public {
        bytes32 batchId = keccak256("batch1");
        bytes32 merkleRoot = keccak256("root1");

        registry.registerDataBatch(batchId, merkleRoot);
        
        vm.expectRevert("Batch already registered");
        registry.registerDataBatch(batchId, merkleRoot);
    }

    function test_Fail_UnauthorizedRegistration() public {
        bytes32 batchId = keccak256("batch1");
        bytes32 merkleRoot = keccak256("root1");

        vm.prank(relayer);
        vm.expectRevert("Not authorized to submit data");
        registry.registerDataBatch(batchId, merkleRoot);
    }

    function test_VerifyDataInclusion() public {
        // Simple case with no proof (single leaf is the root)
        bytes32 batchId = keccak256("batch1");
        bytes32 leaf = keccak256("data1");
        bytes32[] memory proof = new bytes32[](0);

        registry.registerDataBatch(batchId, leaf);
        
        assertTrue(registry.verifyDataInclusion(batchId, leaf, proof));
    }
}
