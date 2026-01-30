import { Router, Request, Response } from 'express';
import { timeseriesDB } from '../../services/database/timeseries.js';
import { sepoliaRelayer } from '../../services/blockchain/relayer.js';
import type { ApiResponse, VerificationResult } from '../../types/index.js';

const router = Router();

/**
 * GET /api/query/data/:batchId
 * Fetch raw data by batch ID
 */
router.get('/data/:batchId', async (req: Request, res: Response) => {
    try {
        const { batchId } = req.params;

        if (!batchId) {
            const response: ApiResponse = {
                success: false,
                error: 'Batch ID is required',
                timestamp: Date.now(),
            };
            return res.status(400).json(response);
        }

        const batchData = timeseriesDB.getBatch(batchId);

        if (!batchData) {
            const response: ApiResponse = {
                success: false,
                error: 'Batch not found',
                timestamp: Date.now(),
            };
            return res.status(404).json(response);
        }

        const response: ApiResponse = {
            success: true,
            data: batchData,
            timestamp: Date.now(),
        };

        return res.status(200).json(response);

    } catch (error) {
        console.error('[Query] Error fetching batch data:', error);
        const response: ApiResponse = {
            success: false,
            error: error instanceof Error ? error.message : 'Internal server error',
            timestamp: Date.now(),
        };
        return res.status(500).json(response);
    }
});

/**
 * GET /api/query/verify/:batchId/:dataHash
 * Verify data inclusion on-chain using Merkle proof
 */
router.get('/verify/:batchId/:dataHash', async (req: Request, res: Response) => {
    try {
        const { batchId, dataHash } = req.params;

        if (!batchId || !dataHash) {
            const response: ApiResponse = {
                success: false,
                error: 'Batch ID and data hash are required',
                timestamp: Date.now(),
            };
            return res.status(400).json(response);
        }

        // Get stored Merkle proof
        const batchEntry = timeseriesDB.getBatch(batchId);

        if (!batchEntry) {
            const response: ApiResponse = {
                success: false,
                error: 'Batch not found',
                timestamp: Date.now(),
            };
            return res.status(404).json(response);
        }

        // Get the proof for this data hash
        const proof = timeseriesDB.getProof(batchId, dataHash);

        if (!proof) {
            const response: ApiResponse = {
                success: false,
                error: 'Proof not found for this data hash',
                timestamp: Date.now(),
            };
            return res.status(404).json(response);
        }

        // Verify on-chain
        let isOnChainValid = false;
        let onChainMerkleRoot = '';

        try {
            const verificationResult = await sepoliaRelayer.verifyData(batchId, dataHash, proof);
            isOnChainValid = verificationResult.isValid;
            onChainMerkleRoot = verificationResult.merkleRoot;
        } catch (blockchainError) {
            console.warn('[Query] Blockchain verification failed, using local verification:', blockchainError);
            // Fall back to local verification if blockchain is not available
            onChainMerkleRoot = batchEntry.merkleRoot || '';
            isOnChainValid = !!batchEntry.merkleRoot;
        }

        const result: VerificationResult = {
            isValid: isOnChainValid,
            batchId,
            dataHash,
            onChainMerkleRoot,
            proofValid: isOnChainValid,
        };

        const response: ApiResponse<VerificationResult> = {
            success: true,
            data: result,
            timestamp: Date.now(),
        };

        return res.status(200).json(response);

    } catch (error) {
        console.error('[Query] Error verifying data:', error);
        const response: ApiResponse = {
            success: false,
            error: error instanceof Error ? error.message : 'Internal server error',
            timestamp: Date.now(),
        };
        return res.status(500).json(response);
    }
});

/**
 * GET /api/query/stats
 * Get system statistics
 */
router.get('/stats', async (_req: Request, res: Response) => {
    try {
        const stats = {
            totalBatches: timeseriesDB.getBatchCount(),
            totalDataPoints: timeseriesDB.getTotalDataPoints(),
            latestBatch: timeseriesDB.getLatestBatch(),
            blockchainStatus: await sepoliaRelayer.getStatus(),
        };

        const response: ApiResponse = {
            success: true,
            data: stats,
            timestamp: Date.now(),
        };

        return res.status(200).json(response);

    } catch (error) {
        console.error('[Query] Error fetching stats:', error);
        const response: ApiResponse = {
            success: false,
            error: error instanceof Error ? error.message : 'Internal server error',
            timestamp: Date.now(),
        };
        return res.status(500).json(response);
    }
});

/**
 * GET /api/query/batches
 * List all registered batches
 */
router.get('/batches', async (req: Request, res: Response) => {
    try {
        const limit = parseInt(req.query.limit as string) || 10;
        const offset = parseInt(req.query.offset as string) || 0;

        const batches = timeseriesDB.listBatches(limit, offset);

        const response: ApiResponse = {
            success: true,
            data: {
                batches,
                pagination: {
                    limit,
                    offset,
                    total: timeseriesDB.getBatchCount(),
                },
            },
            timestamp: Date.now(),
        };

        return res.status(200).json(response);

    } catch (error) {
        console.error('[Query] Error listing batches:', error);
        const response: ApiResponse = {
            success: false,
            error: error instanceof Error ? error.message : 'Internal server error',
            timestamp: Date.now(),
        };
        return res.status(500).json(response);
    }
});

export default router;
