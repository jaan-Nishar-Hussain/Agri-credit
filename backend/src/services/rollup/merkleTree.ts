import { MerkleTree } from 'merkletreejs';
import keccak256 from 'keccak256';
import type { ProcessedSensorData } from '../../types/index.js';

/**
 * Merkle Tree Builder Service
 * Creates Merkle trees from data batches for integrity verification
 */
class MerkleTreeBuilder {

    /**
     * Build a Merkle tree from an array of processed sensor data
     * @returns Object containing the root and proofs for each leaf
     */
    buildTree(data: ProcessedSensorData[]): {
        root: string;
        tree: MerkleTree;
        leaves: Buffer[];
        proofs: Map<string, string[]>;
    } {
        // Create leaves from data hashes
        const leaves = data.map(item => {
            // Use the pre-computed data hash or create one
            const hashInput = item.dataHash || this.createDataHash(item);
            return Buffer.from(hashInput.replace('0x', ''), 'hex');
        });

        // Build the Merkle tree
        const tree = new MerkleTree(leaves, keccak256, {
            sortPairs: true,
            hashLeaves: false, // Leaves are already hashed
        });

        // Get the root
        const root = '0x' + tree.getRoot().toString('hex');

        // Generate proofs for each leaf
        const proofs = new Map<string, string[]>();

        data.forEach((item, index) => {
            const leaf = leaves[index];
            const proof = tree.getProof(leaf).map(p => '0x' + p.data.toString('hex'));
            const dataHash = item.dataHash || ('0x' + leaf.toString('hex'));
            proofs.set(dataHash, proof);
        });

        console.log(`[MerkleTree] Built tree with ${leaves.length} leaves, root: ${root.substring(0, 18)}...`);

        return {
            root,
            tree,
            leaves,
            proofs,
        };
    }

    /**
     * Verify a leaf is part of the tree
     */
    verifyProof(
        leaf: string,
        proof: string[],
        root: string
    ): boolean {
        const leafBuffer = Buffer.from(leaf.replace('0x', ''), 'hex');
        const rootBuffer = Buffer.from(root.replace('0x', ''), 'hex');
        const proofBuffers = proof.map(p => Buffer.from(p.replace('0x', ''), 'hex'));

        // Reconstruct proof objects for merkletreejs
        const proofObjects = proofBuffers.map((data, i) => ({
            data,
            position: i % 2 === 0 ? 'right' : 'left' as 'right' | 'left',
        }));

        // Create a temporary tree just for verification
        const isValid = MerkleTree.verify(proofObjects, leafBuffer, rootBuffer, keccak256);

        return isValid;
    }

    /**
     * Create a keccak256 hash of sensor data
     */
    private createDataHash(data: ProcessedSensorData): string {
        const dataString = JSON.stringify({
            serialNumber: data.serialNumber,
            sensorId: data.sensorId,
            timestamp: data.timestamp,
            readings: data.readings,
        });

        const hash = keccak256(dataString);
        return '0x' + hash.toString('hex');
    }
}

// Export singleton instance
export const merkleTreeBuilder = new MerkleTreeBuilder();
