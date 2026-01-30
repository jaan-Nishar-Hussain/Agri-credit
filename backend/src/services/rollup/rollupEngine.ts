import { merkleTreeBuilder } from './merkleTree.js';
import { sepoliaRelayer } from '../blockchain/relayer.js';
import { timeseriesDB } from '../database/timeseries.js';
import type { DataBatch, BatchRegistryEntry } from '../../types/index.js';

/**
 * Rollup Engine Service
 * Batches processed data, builds Merkle trees, and triggers blockchain submission
 */
class RollupEngine {
    private pendingBatches: DataBatch[] = [];
    private isSubmitting: boolean = false;

    constructor() {
        console.log('[RollupEngine] Rollup engine initialized');
    }

    /**
     * Process a data batch through the rollup pipeline
     */
    async processRollup(batch: DataBatch): Promise<void> {
        const startTime = Date.now();

        try {
            console.log(`[RollupEngine] Processing rollup for batch ${batch.batchId}`);

            // 1. Build Merkle tree from batch data
            const { root, proofs } = merkleTreeBuilder.buildTree(batch.data);

            // 2. Attach Merkle data to batch
            batch.merkleRoot = root;
            batch.merkleProofs = proofs;

            // 3. Store batch in time-series database
            await this.storeBatch(batch);

            // 4. Submit to blockchain
            const txResult = await this.submitToBlockchain(batch);

            if (txResult) {
                console.log(`[RollupEngine] Batch ${batch.batchId} submitted to blockchain: ${txResult.txHash}`);

                // Update batch record with tx info
                await timeseriesDB.updateBatchTx(batch.batchId, txResult.txHash);
            }

            console.log(`[RollupEngine] Rollup completed for batch ${batch.batchId} in ${Date.now() - startTime}ms`);

        } catch (error) {
            console.error(`[RollupEngine] Error processing rollup for batch ${batch.batchId}:`, error);

            // Store failed batch for retry
            this.pendingBatches.push(batch);
        }
    }

    /**
     * Store batch data in time-series database
     */
    private async storeBatch(batch: DataBatch): Promise<void> {
        const entry: BatchRegistryEntry = {
            batchId: batch.batchId,
            merkleRoot: batch.merkleRoot || '',
            txHash: '', // Will be updated after blockchain submission
            dataCount: batch.data.length,
            createdAt: batch.createdAt,
            submittedAt: 0,
        };

        await timeseriesDB.saveBatch(entry, batch.data, batch.merkleProofs);

        console.log(`[RollupEngine] Batch ${batch.batchId} stored with ${batch.data.length} data points`);
    }

    /**
     * Submit Merkle root to Avalanche blockchain
     */
    private async submitToBlockchain(batch: DataBatch): Promise<{ txHash: string } | null> {
        if (this.isSubmitting) {
            console.log('[RollupEngine] Already submitting, queueing batch...');
            this.pendingBatches.push(batch);
            return null;
        }

        this.isSubmitting = true;

        try {
            if (!batch.merkleRoot) {
                throw new Error('Merkle root not available for batch');
            }

            const txHash = await sepoliaRelayer.submitMerkleRoot(
                batch.merkleRoot,
                batch.batchId
            );

            return { txHash };

        } catch (error) {
            console.error('[RollupEngine] Blockchain submission failed:', error);
            return null;
        } finally {
            this.isSubmitting = false;

            // Process any pending batches
            if (this.pendingBatches.length > 0) {
                const nextBatch = this.pendingBatches.shift();
                if (nextBatch) {
                    setTimeout(() => this.submitToBlockchain(nextBatch), 1000);
                }
            }
        }
    }

    /**
     * Retry failed batches
     */
    async retryPendingBatches(): Promise<void> {
        const batches = [...this.pendingBatches];
        this.pendingBatches = [];

        for (const batch of batches) {
            await this.processRollup(batch);
        }
    }

    /**
     * Get number of pending batches
     */
    getPendingCount(): number {
        return this.pendingBatches.length;
    }
}

// Export singleton instance
export const rollupEngine = new RollupEngine();
